'use strict'
/**
 * MES 原生化（P3-B）统一分发：
 * 1. 读灰度开关，决定本次请求走 native（内迁实现）还是 forward（旧 façade）。
 * 2. native：checkAuth（含用户表复核）→ scope.profile → handler(db, profile, input) → {code:0,message:'ok',data}。
 * 3. 响应与旧云函数完全一致，前端零改动；错误码 / 文案沿用 ClientError。
 *
 * 注意：本文件只做装配，不写业务逻辑；业务在 util/mes/<模块>.js。
 */
const { checkAuth, ok, fail, ClientError } = require('./common')
const scope = require('./scope')
const { handlers } = require('./handlers')
const routing = require('./routing')
const { WRITE_ACTIONS } = require('../mes-forward.js')

const RESERVED = ['$url', 'uniIdToken', 'uni_id_token', 'vk', 'context', 'action']

/** vk router 参数可能在 event.data，也可能平铺在 event 上，两种都兼容。 */
function payloadOf(event) {
    const source = event && event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event || {}
    const data = { ...source }
    RESERVED.forEach(key => { delete data[key] })
    return data
}

/** 延迟 require，避免本地单测在只走 native 时加载 uniCloud 依赖。 */
function forwardByDefault(event, options) {
    return require('../mes-forward.js').forward(event, options)
}

/**
 * @param {Object} event vk router 事件（含 data、uniIdToken、util）
 * @param {Object} options { target?, action, mode?: 'native'|'forward', forward?: Function }（mode/forward 仅测试用）
 */
async function dispatch(event, options = {}) {
    const action = options.action
    const target = options.target || 'operations'

    // P2 批 5：多目标函数（orders/ocr/materials）只做「登录 + 精确白名单 + 转发」，
    // 不读灰度开关、不做 native；权限与业务校验仍由旧云函数负责。
    if (target !== 'operations') {
        if (!event || typeof event.uniIdToken !== 'string' || !event.uniIdToken) return fail(401, '未登录')
        return (options.forward || forwardByDefault)(event, { target, action, readOnly: false })
    }

    const util = (event && event.util) || {}
    const { db, uniID } = util
    if (!db) return fail(500, 'MES 服务未就绪，请稍后重试')

    // P2 批 3-4：白名单写操作固定 forward（旧实现做权限/scope/冲突校验），不参与灰度开关。
    if (WRITE_ACTIONS.includes(action)) {
        if (!event || typeof event.uniIdToken !== 'string' || !event.uniIdToken) return fail(401, '未登录')
        return (options.forward || forwardByDefault)(event, { action, readOnly: false })
    }

    let mode
    try {
        mode = await routing.resolveMode(db, action, options)
    } catch (error) {
        console.warn('[mes-native] 灰度开关解析失败，回退 forward：', error && error.message)
        mode = 'forward'
    }
    if (mode !== 'native') return (options.forward || forwardByDefault)(event, { action, readOnly: options.readOnly === true })

    try {
        const auth = await checkAuth(db, event.uniIdToken, uniID)
        if (auth.errCode) return fail(auth.errCode, auth.message)
        const profile = await scope.profile(db, auth)
        const handler = handlers[action]
        if (typeof handler !== 'function') return fail(500, 'MES 原生化未登记操作：' + action)
        return ok(await handler(db, profile, payloadOf(event)))
    } catch (error) {
        if (error instanceof ClientError) return fail(error.code, error.message)
        console.error('[mes-native]', action, error && (error.stack || error.message))
        return fail(500, '生产服务暂时不可用，请稍后重试')
    }
}

module.exports = { dispatch, payloadOf }

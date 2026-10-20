'use strict'
/**
 * MES 原生化（P3-B）统一分发：
 * 1. 读灰度开关，决定本次请求走 native（内迁实现）还是 forward（旧 façade）。
 * 2. native：checkAuth（含用户表复核）→ scope.profile → handler(db, profile, input) → {code:0,message:'ok',data}。
 *    auth-only action（认领申请/查询）在 checkAuth 后直接 handler(db, auth, input)，不要求已绑定人员档案。
 * 3. 响应与旧云函数完全一致，前端零改动；错误码 / 文案沿用 ClientError。
 *
 * 注意：本文件只做装配，不写业务逻辑；业务在 util/mes/<模块>.js。
 */
const { checkAuth, ok, fail, ClientError } = require('./common')
const scope = require('./scope')
const { handlers } = require('./handlers')
const routing = require('./routing')

const RESERVED = ['$url', 'uniIdToken', 'uni_id_token', 'vk', 'context', 'action']

/**
 * P3-B4：auth-only action（与旧 mes-operations 的 UNBOUND_ACTIONS 对齐）：
 * 未绑定人员档案的账号也必须能申请/查询认领，因此不经过 scope.profile。
 */
const AUTH_ONLY_ACTIONS = ['claimCandidates', 'requestPersonnelClaim', 'myPersonnelClaim']

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

    // P2 批 3-4 的写操作已在 P3-B2 全部并入可切换写（不再有「固定 forward 写」白名单）。
    let mode
    // P3-C1：导入写链路 native-only —— router 内调下游函数有约 10s 硬超时，forward 必然失败，
    // 因此不读灰度开关、不给 forward 分支（mes-switch 也不暴露这些 key）。
    const nativeOnly = routing.NATIVE_ONLY_ACTIONS.includes(action)
    const switchableWrite = routing.SWITCHABLE_WRITE_ACTIONS.includes(action)
    if (nativeOnly) {
        mode = 'native'
    } else if (switchableWrite) {
        // P3-B1/B2：可切换写 action 跟随灰度开关；先 forward（可回退旧实现）后 native。
        // forward 时按写处理，不传 readOnly。
        if (!event || typeof event.uniIdToken !== 'string' || !event.uniIdToken) return fail(401, '未登录')
        try {
            mode = await routing.resolveMode(db, action, options)
        } catch (error) {
            console.warn('[mes-native] 灰度开关解析失败，回退 forward：', error && error.message)
            mode = 'forward'
        }
        if (mode !== 'native') return (options.forward || forwardByDefault)(event, { action, readOnly: false })
    } else {
        try {
            mode = await routing.resolveMode(db, action, options)
        } catch (error) {
            console.warn('[mes-native] 灰度开关解析失败，回退 forward：', error && error.message)
            mode = 'forward'
        }
        if (mode !== 'native') return (options.forward || forwardByDefault)(event, { action, readOnly: options.readOnly === true })
    }

    try {
        const auth = await checkAuth(db, event.uniIdToken, uniID)
        if (auth.errCode) return fail(auth.errCode, auth.message)
        const handler = handlers[action]
        if (typeof handler !== 'function') return fail(500, 'MES 原生化未登记操作：' + action)
        const payload = payloadOf(event)
        if (AUTH_ONLY_ACTIONS.includes(action)) return ok(await handler(db, auth, payload))
        const profile = await scope.profile(db, auth)
        return ok(await handler(db, profile, payload))
    } catch (error) {
        if (error instanceof ClientError) return fail(error.code, error.message)
        console.error('[mes-native]', action, error && (error.stack || error.message))
        return fail(500, '生产服务暂时不可用，请稍后重试')
    }
}

module.exports = { dispatch, payloadOf, AUTH_ONLY_ACTIONS, NATIVE_ONLY_ACTIONS: routing.NATIVE_ONLY_ACTIONS }

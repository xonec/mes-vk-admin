// MES 原生化（P3-B）分发与鉴权回归：响应形状、401/403、灰度开关、forward 回退、错误映射。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { dispatch, payloadOf } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const common = require('../uniCloud-alipay/cloudfunctions/router/util/mes/common.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')

function makeDb() {
    const db = createMemoryDb()
    db.command.neq = db.command.neq || ((value) => ({ op: 'neq', value }))
    return db
}

function makeUniID(valid = 'good') {
    return { checkToken: async (token) => (token === valid || String(token).startsWith('x.') ? { code: 0, uid: 'u-admin' } : { code: 30204, errMsg: 'invalid signature' }) }
}
/** 带 iat 的假 token（issuer 已验签，checkAuth 只用 iat 对比改密时间）。 */
const tokenWithIat = (seconds) => 'x.' + Buffer.from(JSON.stringify({ iat: seconds })).toString('base64') + '.y'

/** 管理员账号 + 基础目录种子数据。 */
function seed(db) {
    db.ensure('uni-id-users').set('u-admin', { _id: 'u-admin', username: 'hogar', nickname: '管理员', role: ['admin'], status: 0, valid_token_date: 0, token: ['good'] })
    db.ensure('mes_ops_workshops').set('w1', { _id: 'w1', name: '一车间', enabled: true })
    db.ensure('mes_ops_processes').set('proc:fill', { _id: 'proc:fill', name: '灌装', workshopId: 'w1', enabled: true })
    db.ensure('mes_ops_shifts').set('shift:early', { _id: 'shift:early', name: '早班', enabled: true })
    db.ensure('mes_ops_personnel').set('p1', { _id: 'p1', name: '张三', workshopId: 'w1', enabled: true, scopeRole: 'operator' })
    return db
}

let passed = 0
let failed = 0
async function test(name, fn) {
    try {
        await fn()
        passed += 1
        console.log('  ✓ ' + name)
    } catch (error) {
        failed += 1
        console.error('  ✗ ' + name)
        console.error('    ' + ((error && error.message) || error))
    }
}

;(async () => {
    console.log('\nMES 原生化 dispatch / 鉴权测试')

    await test('无需登录的请求返回 401 {code,message}（与旧云函数一致）', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const result = await dispatch({ data: {}, util: { db, uniID: makeUniID() } }, { action: 'bootstrap' })
        assert.deepEqual(Object.keys(result).sort(), ['code', 'message'])
        assert.equal(result.code, 401)
        assert.equal(result.message, '未登录')
    })

    await test('无效 token 返回 401，不进入业务 handler', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const result = await dispatch({ data: {}, uniIdToken: 'bad', util: { db, uniID: makeUniID() } }, { action: 'bootstrap' })
        assert.equal(result.code, 401)
        assert.match(result.message, /登录失效/)
    })

    await test('封禁账号与改密后旧 token 均 401（用户表复核保留）', async () => {
        const blocked = seed(makeDb())
        blocked.ensure('uni-id-users').set('u-admin', { ...blocked.ensure('uni-id-users').get('u-admin'), status: 1 })
        const authBlocked = await common.checkAuth(blocked, 'good', makeUniID())
        assert.equal(authBlocked.errCode, 401)
        assert.match(authBlocked.message, /账号已失效/)

        const changed = seed(makeDb())
        changed.ensure('uni-id-users').set('u-admin', { ...changed.ensure('uni-id-users').get('u-admin'), valid_token_date: Date.now() })
        const authChanged = await common.checkAuth(changed, tokenWithIat(1000), makeUniID())
        assert.equal(authChanged.errCode, 401)
        assert.match(authChanged.message, /密码已变更/)
    })

    await test('native bootstrap 成功响应形状 {code:0,message:"ok",data}，data 含 profile+catalogs', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const result = await dispatch({ data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'bootstrap' })
        assert.deepEqual(Object.keys(result).sort(), ['code', 'data', 'message'])
        assert.equal(result.code, 0)
        assert.equal(result.message, 'ok')
        assert.deepEqual(Object.keys(result.data).sort(), ['catalogs', 'profile'])
        assert.equal(result.data.profile.uid, undefined, 'profile 不向前端暴露 uid')
        assert.equal(result.data.profile.name, '管理员')
        assert.equal(result.data.catalogs.workshops.length, 1)
        assert.equal(result.data.catalogs.processes.length, 1)
    })

    await test('forward 模式原样返回 façade 结果（可切回旧实现）', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const result = await dispatch(
            { data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } },
            { action: 'bootstrap', mode: 'forward', forward: async () => ({ code: 0, message: 'ok', data: { from: 'forward' } }) }
        )
        assert.deepEqual(result, { code: 0, message: 'ok', data: { from: 'forward' } })
        // 默认（无配置）已迁移模块走 native，不应调用 forward
        let called = false
        const native = await dispatch(
            { data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } },
            { action: 'bootstrap', forward: async () => { called = true; return { code: 0, message: 'ok', data: { from: 'unexpected' } } } }
        )
        assert.equal(called, false)
        assert.equal(native.data.profile.name, '管理员')
    })

    await test('灰度开关：配置 actions 后按配置切换，且缓存可清', async () => {
        const db = seed(makeDb())
        db.ensure('vk-global-data').set('mes-native-switch', { _id: 'mes-native-switch', actions: { bootstrap: 'forward' } })
        routing.clearCache()
        let forwarded = false
        const result = await dispatch(
            { data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } },
            { action: 'bootstrap', forward: async () => { forwarded = true; return { code: 0, message: 'ok', data: { from: 'config-forward' } } } }
        )
        assert.equal(forwarded, true)
        assert.equal(result.data.from, 'config-forward')
        db.ensure('vk-global-data').set('mes-native-switch', { _id: 'mes-native-switch', actions: { bootstrap: 'native' } })
        routing.clearCache()
        const native = await dispatch({ data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'bootstrap' })
        assert.equal(native.code, 0)
        assert.equal(native.data.profile.name, '管理员')
        routing.clearCache()
    })

    await test('业务错误映射：非法日期返回 {code:400,message}', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const result = await dispatch({ data: { dateFrom: '2026-13-01', dateTo: '2026-06-02' }, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'listSchedules' })
        assert.equal(result.code, 400)
        assert.match(result.message, /开始日期/)
        assert.equal(Object.keys(result).includes('data'), false)
    })

    await test('未登记 action 在 native 分支明确报错，不影响已迁移 action', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const result = await dispatch({ data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'saveSchedule', mode: 'native' })
        assert.equal(result.code, 500)
        assert.match(result.message, /未登记/)
    })

    await test('payloadOf：兼容 event.data 与平铺参数，并剔除路由保留字段', () => {
        const dataPayload = payloadOf({ data: { month: '2026-06', $url: 'mes/pub/x', uniIdToken: 't1' }, uniIdToken: 't2' })
        assert.deepEqual(dataPayload, { month: '2026-06' })
        const flat = payloadOf({ month: '2026-06', source: 'flat' })
        assert.deepEqual(flat, { month: '2026-06', source: 'flat' })
    })

    await test('checkAuth：缺 uniID 组件时 fail-closed 返回 503', async () => {
        const db = seed(makeDb())
        const result = await common.checkAuth(db, 'good', null)
        assert.equal(result.errCode, 503)
    })

    console.log('\nMES 原生化 dispatch：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

// MES 原生化（P3-B）分发与鉴权回归：响应形状、401/403、灰度开关、forward 回退、错误映射。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { dispatch, payloadOf } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const common = require('../uniCloud-alipay/cloudfunctions/router/util/mes/common.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')
const { forward, FUNCTIONS } = require('../uniCloud-alipay/cloudfunctions/router/util/mes-forward.js')
const operationEntry = require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/operation.js')

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
        const result = await dispatch({ data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'saveAttendance', mode: 'native' })
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

    await test('可切换写常量：P3-B1/B2 共 8 个 action；FUNCTIONS 已登记 P2-5/6 业务函数名', () => {
        assert.deepEqual([...routing.SWITCHABLE_WRITE_ACTIONS].sort(), ['createJob', 'handoverCommand', 'jobCommand', 'resolveException', 'saveCatalog', 'saveException', 'saveHandover', 'saveSchedule'])
        assert.equal(FUNCTIONS.operations, 'production-operations')
        assert.equal(FUNCTIONS.orders, 'production-orders')
        assert.equal(FUNCTIONS.ocr, 'doc-ocr')
        assert.equal(FUNCTIONS.materials, 'product-materials')
        assert.equal(FUNCTIONS.records, 'production-records')
        assert.equal(FUNCTIONS.batches, 'batch-buckets')
    })

    await test('可切换写 action：默认（开关未配置）forward（readOnly=false）并原样透传结果', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const calls = []
        const result = await dispatch(
            { data: { id: 'job:1', command: 'start', expectedVersion: 1 }, uniIdToken: 'good', util: { db, uniID: makeUniID() } },
            { action: 'jobCommand', forward: async (event, options) => { calls.push({ action: options.action, readOnly: options.readOnly }); return { code: 0, message: 'ok', data: { job: { _id: 'job:1', state: 'running' } } } } }
        )
        assert.equal(result.code, 0)
        assert.equal(result.data.job.state, 'running')
        assert.deepEqual(calls, [{ action: 'jobCommand', readOnly: false }])
    })

    await test('白名单写 action：缺 token 返回 401 未登录，不调用 forward', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        let called = false
        for (const action of routing.SWITCHABLE_WRITE_ACTIONS) {
            const result = await dispatch({ data: {}, util: { db, uniID: makeUniID() } }, { action, forward: async () => { called = true; return { code: 0 } } })
            assert.equal(result.code, 401)
            assert.equal(result.message, '未登录')
        }
        assert.equal(called, false)
    })

    await test('非白名单写 action：仍返回 403「P0 适配层只开放只读操作」', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const result = await dispatch({ data: { period: '2026-06' }, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'saveAttendance', readOnly: true, forward })
        assert.equal(result.code, 403)
        assert.match(result.msg || result.message, /P0 适配层只开放只读操作/)
    })

    await test('白名单写 action：forward 返回非 0 错误码/文案原样透传', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const upstream = { code: 409, message: '工单已被他人操作，请刷新后核对' }
        const result = await dispatch(
            { data: { id: 'job:1' }, uniIdToken: 'good', util: { db, uniID: makeUniID() } },
            { action: 'jobCommand', forward: async () => upstream }
        )
        assert.deepEqual(result, upstream)
    })

    await test('灰度开关=native：原批 3/4 写 action 走 native（不再固定 forward）', async () => {
        const db = seed(makeDb())
        db.ensure('vk-global-data').set('mes-native-switch', { _id: 'mes-native-switch', actions: { jobCommand: 'native', saveHandover: 'native' } })
        routing.clearCache()
        const calls = []
        const result = await dispatch(
            { data: { id: 'job:not-exist' }, uniIdToken: 'good', util: { db, uniID: makeUniID() } },
            { action: 'jobCommand', forward: async (event, options) => { calls.push(options.action); return { code: 0, message: 'ok', data: { via: 'forward' } } } }
        )
        assert.deepEqual(calls, [], 'native 不应调用 forward')
        assert.equal(result.code, 404, 'native handler 真实执行（工单不存在返回 404）')
        routing.clearCache()
    })

    await test('只读 action 行为未变：trace 仍 forward(readOnly=true)，bootstrap 仍 native', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const seen = []
        const traceResult = await dispatch(
            { data: { batchNo: 'APDD26X1006' }, uniIdToken: 'good', util: { db, uniID: makeUniID() } },
            { action: 'trace', readOnly: true, forward: async (event, options) => { seen.push(options.readOnly); return { code: 0, message: 'ok', data: { jobs: [] } } } }
        )
        assert.equal(traceResult.code, 0)
        assert.deepEqual(seen, [true])
        routing.clearCache()
        const bootstrap = await dispatch({ data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'bootstrap' })
        assert.equal(bootstrap.code, 0)
        assert.equal(bootstrap.data.profile.name, '管理员')
    })

    await test('本地端到端转发（mock uniCloud）：白名单写 action 实际调用 production-operations 并透传', async () => {
        const db = seed(makeDb())
        routing.clearCache()
        const captured = {}
        const original = global.uniCloud
        global.uniCloud = {
            callFunction: async (options) => {
                captured.name = options.name
                captured.data = options.data
                return { result: { code: 0, message: 'ok', data: { forwarded: true } } }
            },
        }
        try {
            const result = await dispatch(
                { data: { id: 'job:1', command: 'start', expectedVersion: 2, uniIdToken: 'should-be-dropped' }, uniIdToken: 'good', util: { db, uniID: makeUniID() } },
                { action: 'jobCommand' }
            )
            assert.equal(captured.name, 'production-operations')
            assert.equal(captured.data.action, 'jobCommand')
            assert.equal(captured.data.id, 'job:1')
            assert.equal(captured.data.expectedVersion, 2)
            assert.equal(captured.data.uniIdToken, 'good', '使用顶层 uniIdToken，不把 data 内的同名字段带出去')
            assert.deepEqual(result, { code: 0, message: 'ok', data: { forwarded: true } })
        } finally {
            global.uniCloud = original
        }
    })

    await test('operation 入口：缺 action 400；非白名单写 403；白名单写缺 token 401', async () => {
        const util = { db: seed(makeDb()), uniID: makeUniID() }
        const missing = await operationEntry.main({ data: {}, uniIdToken: 'good', util })
        assert.equal(missing.code, 400)
        const forbidden = await operationEntry.main({ data: { action: 'saveAttendance' }, uniIdToken: 'good', util })
        assert.equal(forbidden.code, 403)
        assert.match(forbidden.msg || forbidden.message, /只开放只读操作/)
        const unauthenticated = await operationEntry.main({ data: { action: 'jobCommand', id: 'job:1' }, util })
        assert.equal(unauthenticated.code, 401)
        assert.equal(unauthenticated.message, '未登录')
    })

    console.log('\nMES 原生化 dispatch：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

// P2 批 3/4 写操作（P3-B2 起并入可切换写）：forward 通道 action 级用例（参数透传、token、错误透传、边界）。
const assert = require('node:assert/strict')
const path = require('node:path')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { dispatch } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')
const { forward, SWITCHABLE_WRITE_ACTIONS, READ_ACTIONS, FUNCTIONS } = require('../uniCloud-alipay/cloudfunctions/router/util/mes-forward.js')
const operationEntry = require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/operation.js')

function makeDb() {
    const db = createMemoryDb()
    db.command.neq = db.command.neq || ((value) => ({ op: 'neq', value }))
    return db
}
function makeUniID(valid = 'good') {
    return { checkToken: async (token) => (token === valid ? { code: 0, uid: 'u-admin' } : { code: 30204 }) }
}

/** 安装 uniCloud mock，捕获转发参数并返回给定结果（或抛错）。 */
function withMockUniCloud(result, fn) {
    const original = global.uniCloud
    const captured = { calls: [] }
    global.uniCloud = {
        callFunction: async (options) => {
            captured.calls.push(options)
            if (result instanceof Error) throw result
            return { result }
        },
    }
    return Promise.resolve()
        .then(() => fn(captured))
        .finally(() => { global.uniCloud = original })
}

const CASES = [
    {
        action: 'jobCommand',
        data: { id: 'job:1', command: 'start', expectedVersion: 3, payload: { note: '联调开工' } },
        expect: { id: 'job:1', command: 'start', expectedVersion: 3, payload: { note: '联调开工' } },
        upstream: { code: 0, message: 'ok', data: { job: { _id: 'job:1', state: 'running' }, events: 2 } },
        error: { code: 409, message: '工单已被他人操作，请刷新后核对' },
    },
    {
        action: 'saveHandover',
        data: { record: { date: '2026-06-01', content: '联调交班' }, expectedVersion: 0, requestId: 'test-request-0001' },
        expect: { record: { date: '2026-06-01', content: '联调交班' }, expectedVersion: 0, requestId: 'test-request-0001' },
        upstream: { code: 0, message: 'ok', data: { _id: 'handover:x', status: 'draft', version: 1 } },
        error: { code: 403, message: '只有交班本人可以修改尚未提交的草稿' },
    },
    {
        action: 'handoverCommand',
        data: { id: 'handover:x', command: 'submit', expectedVersion: 1, requestId: 'test-request-0002', note: '提交交班' },
        expect: { id: 'handover:x', command: 'submit', expectedVersion: 1, requestId: 'test-request-0002', note: '提交交班' },
        upstream: { code: 0, message: 'ok', data: { _id: 'handover:x', status: 'submitted', version: 2 } },
        error: { code: 409, message: '只有已提交的交班记录可以接班' },
    },
    {
        action: 'saveException',
        data: { record: { jobId: 'job:1', category: '设备', description: '联调异常' }, expectedVersion: 0, requestId: 'test-request-0003' },
        expect: { record: { jobId: 'job:1', category: '设备', description: '联调异常' }, expectedVersion: 0, requestId: 'test-request-0003' },
        upstream: { code: 0, message: 'ok', data: { _id: 'exception:x', status: 'open', version: 1 } },
        error: { code: 400, message: '请填写异常分类和情况描述' },
    },
]

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
    console.log('\n写操作 forward 通道（action 级）测试')

    await test('可切换写清单与只读白名单不重叠（P3-B1/B2/B3/B4/C1 共 15 个）', () => {
        assert.deepEqual([...SWITCHABLE_WRITE_ACTIONS].sort(), ['bindPersonnelAccounts', 'createJob', 'handoverCommand', 'jobCommand', 'prepareScheduleImport', 'requestPersonnelClaim', 'resolveAttendanceConflict', 'resolveException', 'reviewPersonnelClaim', 'saveAttendance', 'saveCatalog', 'saveException', 'saveHandover', 'saveSchedule', 'syncAttendance'])
        const overlap = SWITCHABLE_WRITE_ACTIONS.filter((action) => READ_ACTIONS.includes(action))
        assert.deepEqual(overlap, [])
    })

    for (const item of CASES) {
        await test(item.action + '：参数与 token 原样转发到 production-operations，结果透传', async () => {
            await withMockUniCloud(item.upstream, async (captured) => {
                const db = makeDb()
                routing.clearCache()
                const result = await dispatch(
                    { data: item.data, uniIdToken: 'good', util: { db, uniID: makeUniID() } },
                    { action: item.action, forward }
                )
                assert.equal(captured.calls.length, 1)
                const call = captured.calls[0]
                assert.equal(call.name, 'production-operations')
                assert.equal(call.data.action, item.action)
                for (const [key, value] of Object.entries(item.expect)) assert.deepEqual(call.data[key], value, '字段 ' + key + ' 应原样透传')
                assert.equal(call.data.uniIdToken, 'good')
                assert.deepEqual(result, item.upstream)
            })
        })

        await test(item.action + '：缺 token 401 未登录且不发起转发', async () => {
            await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
                const db = makeDb()
                routing.clearCache()
                const result = await dispatch({ data: item.data, util: { db, uniID: makeUniID() } }, { action: item.action, forward })
                assert.equal(result.code, 401)
                assert.equal(result.message, '未登录')
                assert.equal(captured.calls.length, 0)
            })
        })

        await test(item.action + '：旧实现业务错误码/文案原样透传', async () => {
            await withMockUniCloud(item.error, async () => {
                const db = makeDb()
                routing.clearCache()
                const result = await dispatch({ data: item.data, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: item.action, forward })
                assert.deepEqual(result, item.error)
            })
        })
    }

    await test('forward 调用失败：返回 500 且文案含「调用业务云函数失败」', async () => {
        await withMockUniCloud(new Error('cloud function timeout'), async () => {
            const db = makeDb()
            routing.clearCache()
            const result = await dispatch({ data: { id: 'job:1' }, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'jobCommand', forward })
            assert.equal(result.code, 500)
            assert.match(result.msg, /调用业务云函数失败/)
        })
    })

    await test('业务函数返回结构异常（无数字 code）：500 结构异常', async () => {
        await withMockUniCloud({ data: {} }, async () => {
            const db = makeDb()
            routing.clearCache()
            const result = await dispatch({ data: { id: 'job:1' }, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'jobCommand', forward })
            assert.equal(result.code, 500)
            assert.match(result.msg, /返回结构异常/)
        })
    })

    await test('直接以 readOnly 通道转发写 action 仍 403（只读入口兜底未被绕过）', async () => {
        const db = makeDb()
        routing.clearCache()
        const result = await forward({ data: { action: 'jobCommand', id: 'job:1' }, uniIdToken: 'good' }, { action: 'jobCommand', readOnly: true })
        assert.equal(result.code, 403)
        assert.match(result.msg, /只开放只读操作/)
    })

    await test('非白名单近似命名（jobCommands / saveHandoverV2）仍 403', async () => {
        const db = makeDb()
        routing.clearCache()
        for (const action of ['jobCommands', 'saveHandoverV2', 'saveExceptionDraft']) {
            const result = await dispatch({ data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action, readOnly: true, forward })
            assert.equal(result.code, 403, action + ' 应拒绝')
            assert.match(result.msg, /只开放只读操作/)
        }
    })

    await test('operation 入口：白名单写带 token 时真实走 forward（mock uniCloud）', async () => {
        await withMockUniCloud({ code: 0, message: 'ok', data: { via: 'forward' } }, async (captured) => {
            routing.clearCache()
            const result = await operationEntry.main({ data: { action: 'saveException', record: { jobId: 'job:1' } }, uniIdToken: 'good', util: { db: makeDb(), uniID: makeUniID() } })
            assert.equal(captured.calls.length, 1)
            assert.equal(captured.calls[0].name, 'production-operations')
            assert.equal(captured.calls[0].data.action, 'saveException')
            assert.equal(result.code, 0)
            assert.equal(result.data.via, 'forward')
        })
    })

    console.log('\nP2 写操作白名单：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

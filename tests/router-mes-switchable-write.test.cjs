// P3-B1/B2 灰度：可切换写 action（catalogs/schedules + jobs/handovers/exceptions）跟随 mes-native-switch；
// 不再有固定 forward 的写白名单，native/forward 两组逻辑分别验证。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const { dispatch } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')
const forwardModule = require('../uniCloud-alipay/cloudfunctions/router/util/mes-forward.js')

const { SWITCHABLE_WRITE_ACTIONS, READ_ACTIONS } = { SWITCHABLE_WRITE_ACTIONS: routing.SWITCHABLE_WRITE_ACTIONS, READ_ACTIONS: forwardModule.READ_ACTIONS }
const EXPECTED = ['bindPersonnelAccounts', 'createJob', 'handoverCommand', 'jobCommand', 'prepareScheduleImport', 'requestPersonnelClaim', 'resolveAttendanceConflict', 'resolveException', 'reviewPersonnelClaim', 'saveAttendance', 'saveCatalog', 'saveException', 'saveHandover', 'saveSchedule', 'syncAttendance']

function makeUniID(uid) {
    return { checkToken: async (token) => (token === 'tok-' + uid ? { code: 0, uid } : { code: 30204 }) }
}
function captureForward(result) {
    const calls = []
    const forward = async (event, options) => { calls.push({ event, options }); return result }
    return { calls, forward }
}
async function seedUser(db, id, role) {
    db.ensure('uni-id-users').set(id, { _id: id, status: 0, role: role || [] })
}
function seedJob(db) {
    db.ensure('mes_ops_jobs').set(IDS.job, {
        _id: IDS.job, batchNo: 'TEST261020A', productCode: '9900000001', productName: 'TEST-测试产品',
        orderNo: '20261020', orderVersion: 1, processId: IDS.process, processName: '罐装机',
        workshopId: IDS.workshop, workshopName: '301', personIds: [IDS.supPerson], personNames: ['于家园'],
        targetQty: 100, unit: 'case', plannedDate: '2026-10-21', state: 'planned',
        goodQty: 0, defectQty: 0, inboundQty: 0, workHours: 0, version: 1,
    })
}
const COMMON_EVENT = (db, uid) => ({ data: {}, uniIdToken: 'tok-' + uid, util: { db, uniID: makeUniID(uid) } })

let passed = 0
let failed = 0
async function test(name, fn) {
    try { await fn(); passed += 1; console.log('  ✓ ' + name) }
    catch (error) { failed += 1; console.error('  ✗ ' + name); console.error('    ' + ((error && error.stack) || error)) }
}

;(async () => {
    console.log('\nP3 可切换写灰度（P3-B1/B2/B3/B4/C1 共 15 项）')

    await test('常量：8 个可切换写 action，且不再导出固定 WRITE_ACTIONS、与只读白名单不重叠', () => {
        assert.deepEqual([...SWITCHABLE_WRITE_ACTIONS].sort(), EXPECTED)
        assert.equal(forwardModule.WRITE_ACTIONS, undefined, '旧固定写白名单应已移除')
        assert.deepEqual(SWITCHABLE_WRITE_ACTIONS.filter(action => READ_ACTIONS.includes(action)), [])
    })

    await test('开关=forward：saveCatalog 走 forward（readOnly=false，不按只读拦截）', async () => {
        const db = createMemoryDb()
        await seedUser(db, IDS.admin, ['admin'])
        const { calls, forward } = captureForward({ code: 0, message: 'ok', data: { via: 'forward' } })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { saveCatalog: 'forward' } })
        const result = await dispatch({ data: { type: 'workshops', record: { code: 'W1', name: 'x' }, expectedVersion: 0 }, uniIdToken: 'tok-' + IDS.admin, util: { db, uniID: makeUniID(IDS.admin) } }, { action: 'saveCatalog', forward })
        assert.equal(result.code, 0)
        assert.equal(calls.length, 1)
        assert.equal(calls[0].options.action, 'saveCatalog')
        assert.equal(calls[0].options.readOnly, false, '写回退 forward 时不能按只读拦截')
    })

    await test('开关=native：saveCatalog 走原生 handler 并真实写入 fake DB', async () => {
        const { db } = createWriteDb()
        await seedUser(db, IDS.admin, ['admin'])
        const { calls, forward } = captureForward({ code: 0, message: 'ok' })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { saveCatalog: 'native' } })
        const result = await dispatch({ data: { type: 'workshops', record: { code: 'W1', name: '原生车间' }, expectedVersion: 0 }, uniIdToken: 'tok-' + IDS.admin, util: { db, uniID: makeUniID(IDS.admin) } }, { action: 'saveCatalog', forward })
        assert.equal(calls.length, 0, 'native 不应调用 forward')
        assert.equal(result.code, 0)
        assert.equal(result.data.version, 1)
        assert.equal(db.ensure('mes_ops_workshops').get('ops:workshops:W1').name, '原生车间')
    })

    await test('开关=native：saveSchedule 走原生并同步考勤', async () => {
        const { db } = createWriteDb()
        await seedUser(db, IDS.sup, [])
        const { calls, forward } = captureForward({ code: 0, message: 'ok' })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { saveSchedule: 'native' } })
        const result = await dispatch({ data: { expectedVersion: 0, record: { date: '2026-10-21', shiftId: IDS.shift, processId: IDS.process, personId: IDS.supPerson, kind: 'work', batchNos: [] } }, uniIdToken: 'tok-' + IDS.sup, util: { db, uniID: makeUniID(IDS.sup) } }, { action: 'saveSchedule', forward })
        assert.equal(calls.length, 0)
        assert.equal(result.code, 0)
        assert.equal(result.data.version, 1)
        assert.equal(db.ensure('mes_ops_attendance').size, 1)
    })

    await test('开关=native：jobCommand 走原生 handler（不再固定 forward）并写库', async () => {
        const { db } = createWriteDb()
        await seedUser(db, IDS.sup, [])
        seedJob(db)
        const { calls, forward } = captureForward({ code: 0, message: 'ok', data: { via: 'forward' } })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { jobCommand: 'native' } })
        const result = await dispatch({ data: { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-b2-request-0001', payload: { note: '原生开工' } }, uniIdToken: 'tok-' + IDS.sup, util: { db, uniID: makeUniID(IDS.sup) } }, { action: 'jobCommand', forward })
        assert.equal(calls.length, 0, 'native 不应调用 forward')
        assert.equal(result.code, 0)
        assert.equal(result.data.state, 'running')
        assert.equal(result.data.version, 2)
        assert.equal(db.ensure('mes_ops_jobs').get(IDS.job).state, 'running')
    })

    await test('开关=native：saveAttendance 走原生 handler 并写库', async () => {
        const { db } = createWriteDb()
        await seedUser(db, IDS.sup, [])
        const { calls, forward } = captureForward({ code: 0, message: 'ok' })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { saveAttendance: 'native' } })
        const result = await dispatch({ data: { expectedVersion: 0, requestId: 'test-b3-attendance-0001', record: { date: '2026-10-22', kind: 'work', shiftId: IDS.shift, processIds: [IDS.process], note: 'TEST-P3B3' } }, uniIdToken: 'tok-' + IDS.sup, util: { db, uniID: makeUniID(IDS.sup) } }, { action: 'saveAttendance', forward })
        assert.equal(calls.length, 0, 'native 不应调用 forward')
        assert.equal(result.code, 0)
        assert.equal(result.data.version, 1)
        assert.equal(result.data.source, 'manual')
        assert.equal(db.ensure('mes_ops_attendance').size, 1)
    })

    await test('开关=forward：jobCommand/saveHandover 走 forward（readOnly=false）且不写库', async () => {
        const db = createMemoryDb()
        await seedUser(db, IDS.sup, [])
        const { calls, forward } = captureForward({ code: 0, message: 'ok', data: { via: 'forward' } })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { jobCommand: 'forward', saveHandover: 'forward' } })
        for (const action of ['jobCommand', 'saveHandover']) {
            const result = await dispatch(COMMON_EVENT(db, IDS.sup), { action, forward })
            assert.equal(result.code, 0)
        }
        assert.equal(calls.length, 2)
        assert.deepEqual(calls.map(call => call.options.action), ['jobCommand', 'saveHandover'])
        assert.deepEqual(calls.map(call => call.options.readOnly), [false, false])
        assert.equal(db.ensure('mes_ops_jobs').size, 0)
        assert.equal(db.ensure('mes_ops_handovers').size, 0)
    })

    await test('15 个可切换写 action 缺 token 全部 401，且不 forward/不 native', async () => {
        const db = createMemoryDb()
        const { calls, forward } = captureForward({ code: 0 })
        routing.clearCache()
        for (const action of EXPECTED) {
            const result = await dispatch({ data: {}, util: { db, uniID: makeUniID(IDS.admin) } }, { action, forward })
            assert.equal(result.code, 401, action)
            assert.equal(result.message, '未登录')
        }
        assert.equal(calls.length, 0)
    })

    await test('只读 action 开关=forward：仍按 readOnly=true forward（旧行为不变）', async () => {
        const db = createMemoryDb()
        const { calls, forward } = captureForward({ code: 0, message: 'ok', data: {} })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { bootstrap: 'forward' } })
        await dispatch({ data: {}, uniIdToken: 'tok-x', util: { db, uniID: makeUniID('x') } }, { action: 'bootstrap', readOnly: true, forward })
        assert.equal(calls.length, 1)
        assert.equal(calls[0].options.readOnly, true)
    })

    console.log('\nP3 可切换写灰度：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

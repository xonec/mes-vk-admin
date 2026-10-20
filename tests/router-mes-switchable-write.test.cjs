// P3-B1 灰度：可切换写 action（saveCatalog/saveSchedule）走 mes-native-switch；
// 批 3/4 的 WRITE_ACTIONS 仍固定 forward、不参与开关（两组逻辑分开验证）。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const dispatchModule = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')
const forwardModule = require('../uniCloud-alipay/cloudfunctions/router/util/mes-forward.js')

const { dispatch } = dispatchModule
const { SWITCHABLE_WRITE_ACTIONS, WRITE_ACTIONS } = { SWITCHABLE_WRITE_ACTIONS: routing.SWITCHABLE_WRITE_ACTIONS, WRITE_ACTIONS: forwardModule.WRITE_ACTIONS }

function makeUniID(uid, role) {
    return { checkToken: async (token) => (token === 'tok-' + uid ? { code: 0, uid, role } : { code: 30204 }) }
}
function captureForward(result) {
    const calls = []
    const forward = async (event, options) => { calls.push({ event, options }); return result }
    return { calls, forward }
}
async function seedUser(db, id, role) {
    const users = db.ensure('uni-id-users')
    users.set(id, { _id: id, status: 0, role: role || [] })
}

let passed = 0
let failed = 0
async function test(name, fn) {
    try { await fn(); passed += 1; console.log('  ✓ ' + name) }
    catch (error) { failed += 1; console.error('  ✗ ' + name); console.error('    ' + ((error && error.stack) || error)) }
}

;(async () => {
    console.log('\nP3-B1 可切换写灰度与批 3/4 固定写分离')

    await test('常量：saveCatalog/saveSchedule 属于可切换写，不在固定 WRITE_ACTIONS', () => {
        assert.deepEqual([...SWITCHABLE_WRITE_ACTIONS].sort(), ['saveCatalog', 'saveSchedule'])
        const overlap = SWITCHABLE_WRITE_ACTIONS.filter(action => WRITE_ACTIONS.includes(action))
        assert.deepEqual(overlap, [], '两组写白名单不应重叠')
    })

    await test('开关=forward：saveCatalog 走 forward（readOnly=false，不按只读拦截）', async () => {
        const db = createMemoryDb()
        await seedUser(db, IDS.admin, ['admin'])
        const { calls, forward } = captureForward({ code: 0, message: 'ok', data: { via: 'forward' } })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { saveCatalog: 'forward' } })
        const result = await dispatch({ data: { type: 'workshops', record: { code: 'W1', name: 'x' }, expectedVersion: 0 }, uniIdToken: 'tok-' + IDS.admin, util: { db, uniID: makeUniID(IDS.admin, ['admin']) } }, { action: 'saveCatalog', forward })
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
        const result = await dispatch({ data: { type: 'workshops', record: { code: 'W1', name: '原生车间' }, expectedVersion: 0 }, uniIdToken: 'tok-' + IDS.admin, util: { db, uniID: makeUniID(IDS.admin, ['admin']) } }, { action: 'saveCatalog', forward })
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
        const result = await dispatch({ data: { expectedVersion: 0, record: { date: '2026-10-21', shiftId: IDS.shift, processId: IDS.process, personId: IDS.supPerson, kind: 'work', batchNos: [] } }, uniIdToken: 'tok-' + IDS.sup, util: { db, uniID: makeUniID(IDS.sup, []) } }, { action: 'saveSchedule', forward })
        assert.equal(calls.length, 0)
        assert.equal(result.code, 0)
        assert.equal(result.data.version, 1)
        assert.equal(db.ensure('mes_ops_attendance').size, 1)
    })

    await test('可切换写缺 token：401 且不 forward/不 native', async () => {
        const db = createMemoryDb()
        const { calls, forward } = captureForward({ code: 0 })
        routing.clearCache()
        const result = await dispatch({ data: {}, util: { db, uniID: makeUniID(IDS.admin, ['admin']) } }, { action: 'saveCatalog', forward })
        assert.equal(result.code, 401)
        assert.equal(result.message, '未登录')
        assert.equal(calls.length, 0)
    })

    await test('批 3/4 固定写仍不参与开关：jobCommand 开关为 native 时也走 forward', async () => {
        const db = createMemoryDb()
        const { calls, forward } = captureForward({ code: 0, message: 'ok', data: { via: 'forward' } })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { jobCommand: 'native' } })
        const result = await dispatch({ data: { id: 'job:1', command: 'start' }, uniIdToken: 'tok-x', util: { db, uniID: makeUniID('x', []) } }, { action: 'jobCommand', forward })
        assert.equal(calls.length, 1)
        assert.equal(calls[0].options.readOnly, false)
        assert.equal(result.code, 0)
    })

    await test('只读 action 开关=forward：仍按 readOnly=true forward（旧行为不变）', async () => {
        const db = createMemoryDb()
        const { calls, forward } = captureForward({ code: 0, message: 'ok', data: {} })
        routing.clearCache()
        db.ensure('vk-global-data').set(routing.CONFIG_ID, { _id: routing.CONFIG_ID, actions: { bootstrap: 'forward' } })
        await dispatch({ data: {}, uniIdToken: 'tok-x', util: { db, uniID: makeUniID('x', []) } }, { action: 'bootstrap', readOnly: true, forward })
        assert.equal(calls.length, 1)
        assert.equal(calls[0].options.readOnly, true)
    })

    console.log('\nP3-B1 可切换写灰度：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

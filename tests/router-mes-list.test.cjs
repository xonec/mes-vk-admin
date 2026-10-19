// MES 原生化（P3-B）listSchedules 回归：权限、日期/关键字/状态筛选、新增 processId/shiftId 服务端筛选。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { listSchedules } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/schedules-read.js')

/** 内存 db 补 db.command.gte().and() 链式（真实 uniCloud 支持，helper 只支持组合式）。 */
function makeDb() {
    const db = createMemoryDb()
    const gte = db.command.gte
    db.command.gte = (value) => {
        const node = gte(value)
        node.and = (other) => db.command.and([node, other])
        return node
    }
    const rows = [
        { _id: 's1', date: '2026-06-01', personId: 'p1', personName: '张三', processId: 'proc:fill', processName: '灌装', shiftId: 'shift:early', shiftName: '早班', workshopId: 'w1', enabled: true, updatedAt: 10 },
        { _id: 's2', date: '2026-06-01', personId: 'p2', personName: '李四', processId: 'proc:label', processName: '贴标', shiftId: 'shift:middle', shiftName: '中班', workshopId: 'w1', enabled: true, updatedAt: 20 },
        { _id: 's3', date: '2026-06-02', personId: 'p1', personName: '张三', processId: 'proc:fill', processName: '灌装', shiftId: 'shift:early', shiftName: '早班', workshopId: 'w1', enabled: false, updatedAt: 30 },
        { _id: 's4', date: '2026-05-31', personId: 'p1', personName: '张三', processId: 'proc:fill', processName: '灌装', shiftId: 'shift:early', shiftName: '早班', workshopId: 'w1', enabled: true, updatedAt: 40 },
    ]
    for (const row of rows) db.ensure('mes_ops_schedules').set(row._id, row)
    return db
}

const ADMIN = { uid: 'u-admin', isAdmin: true, personId: '', workshopId: '', processIds: [], scopeRole: 'admin' }
const OPERATOR = { uid: 'u1', isAdmin: false, personId: 'p1', workshopId: 'w1', processIds: [], scopeRole: 'operator' }

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
const rejectsWith = async (promise, code, pattern) => {
    try {
        await promise
    } catch (error) {
        assert.equal(error.code, code, '错误码应为 ' + code)
        if (pattern) assert.match(error.message, pattern)
        return
    }
    assert.fail('应当抛错但成功返回')
}

;(async () => {
    console.log('\nMES 原生化 listSchedules 测试')

    await test('管理员按日期范围查询：只返回范围内记录并带分页元信息', async () => {
        const data = await listSchedules(makeDb(), ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02' })
        assert.equal(data.total, 2)
        assert.equal(data.page, 1)
        assert.equal(data.pageSize, 20)
        assert.deepEqual(data.list.map((row) => row._id).sort(), ['s1', 's2'])
    })

    await test('默认排除停用排班；includeDisabled + 管理员可查看', async () => {
        const db = makeDb()
        const active = await listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02' })
        assert.equal(active.list.some((row) => row._id === 's3'), false)
        const all = await listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02', includeDisabled: true })
        assert.equal(all.list.some((row) => row._id === 's3'), true)
    })

    await test('新增 processId / shiftId 服务端筛选，可组合使用', async () => {
        const db = makeDb()
        const byProcess = await listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02', processId: 'proc:label' })
        assert.deepEqual(byProcess.list.map((row) => row._id), ['s2'])
        const byShift = await listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02', shiftId: 'shift:early' })
        assert.equal(byShift.total, 1)
        const combined = await listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02', processId: 'proc:fill', shiftId: 'shift:middle' })
        assert.equal(combined.total, 0)
    })

    await test('关键字按人员/工序/车间/批号字面量匹配', async () => {
        const db = makeDb()
        const byPerson = await listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02', keyword: '张三' })
        assert.equal(byPerson.total, 1)
        const byProcess = await listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02', keyword: '贴标' })
        assert.deepEqual(byProcess.list.map((row) => row._id), ['s2'])
    })

    await test('普通人员只看本人排班，管理员看全部', async () => {
        const db = makeDb()
        const own = await listSchedules(db, OPERATOR, { dateFrom: '2026-06-01', dateTo: '2026-06-02' })
        assert.deepEqual(own.list.map((row) => row._id), ['s1'])
        const all = await listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02' })
        assert.equal(all.total, 2)
    })

    await test('分页：page/pageSize 生效且 pageSize 上限 50', async () => {
        const db = makeDb()
        const page2 = await listSchedules(db, ADMIN, { dateFrom: '2026-05-01', dateTo: '2026-06-30', page: 2, pageSize: 1 })
        assert.equal(page2.page, 2)
        assert.equal(page2.pageSize, 1)
        assert.equal(page2.total, 3)
        assert.equal(page2.list.length, 1)
        const capped = await listSchedules(db, ADMIN, { dateFrom: '2026-05-01', dateTo: '2026-06-30', pageSize: 999 })
        assert.equal(capped.pageSize, 50)
    })

    await test('非法参数：日期非法、processId/shiftId 非字符串都返回 400', async () => {
        const db = makeDb()
        await rejectsWith(listSchedules(db, ADMIN, { dateFrom: '2026-13-01', dateTo: '2026-06-02' }), 400, /开始日期/)
        await rejectsWith(listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02', processId: 123 }), 400, /工序/)
        await rejectsWith(listSchedules(db, ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02', shiftId: {} }), 400, /班次/)
    })

    console.log('\nrouter 内迁 listSchedules：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

// MES 原生化（P3-B 第 3 模块）reports 回归：dashboard 计数/范围/排序，report 汇总/归档版本/去重/参数校验。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { report, dashboard } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/reports-read.js')

const ADMIN = { uid: 'u-admin', isAdmin: true, personId: '', workshopId: '', processIds: [], scopeRole: 'admin' }
const OPERATOR = { uid: 'u-emp', isAdmin: false, personId: 'p1', workshopId: 'w1', processIds: [], scopeRole: 'operator' }

function makeDb() {
    const db = createMemoryDb()
    const seed = (name, rows) => { for (const row of rows) db.ensure(name).set(row._id, row) }
    seed('mes_ops_workshops', [{ _id: 'w1', name: '一车间', enabled: true }, { _id: 'w2', name: '二车间', enabled: true }])
    seed('mes_ops_personnel', [
        { _id: 'p1', name: '张三', workshopId: 'w1', uid: 'u-emp', enabled: true, scopeRole: 'operator' },
        { _id: 'p2', name: '李四', workshopId: 'w1', enabled: true, scopeRole: 'operator' },
    ])
    seed('mes_ops_jobs', [
        { _id: 'job:1', state: 'running', plannedDate: '2026-06-01', workshopId: 'w1', personIds: ['p1'], processId: 'proc:fill', processName: '灌装', batchNo: 'APDD26X1006', productCode: '1306008144', productName: '产品A', unit: 'case', updatedAt: 100, version: 3, event: { type: 'report', date: '2026-06-01', requestId: 'r1', shiftId: 'shift:early', shiftName: '早班', goodQty: 10, defectQty: 0, workHours: 8 } },
        { _id: 'job:2', state: 'completed', plannedDate: '2026-06-01', workshopId: 'w1', personIds: ['p1'], processId: 'proc:fill', processName: '灌装', batchNo: 'APDD26X1007', unit: 'case', updatedAt: 200, version: 2, event: { type: 'report', date: '2026-06-01', requestId: 'r2', shiftId: 'shift:early', shiftName: '早班', goodQty: 5, defectQty: 1, workHours: 8 } },
        { _id: 'job:3', state: 'planned', plannedDate: '2026-06-02', workshopId: 'w1', personIds: ['p2'], batchNo: 'APDD26X1010', unit: 'case', updatedAt: 50, version: 1, event: { type: 'report', date: '2026-06-02', requestId: 'r3', shiftId: 'shift:early', shiftName: '早班', goodQty: 99, defectQty: 0, workHours: 8 } },
        { _id: 'job:4', state: 'paused', plannedDate: '2026-05-20', workshopId: 'w1', personIds: ['p1'], batchNo: 'APDD26X1011', unit: 'case', updatedAt: 400, version: 1 },
        { _id: 'job:5', state: 'running', plannedDate: '2026-06-01', workshopId: 'w2', personIds: ['p2'], batchNo: 'APDD26X1009', unit: 'case', updatedAt: 300, version: 1, event: { type: 'report', date: '2026-06-01', requestId: 'r5', shiftId: 'shift:early', shiftName: '早班', goodQty: 7, defectQty: 0, workHours: 8 } },
        { _id: 'job:6', state: 'completed', plannedDate: '2026-06-01', workshopId: 'w1', personIds: ['p2'], batchNo: 'APDD26X1008', unit: 'bottle', updatedAt: 250, version: 1, event: { type: 'inbound', date: '2026-06-01', requestId: 'r6', qty: 20 } },
    ])
    // 归档版本：job:1 的 v1（旧事件 r0），version < 当前 3 → 计入报表
    seed('mes_ops_versions', [
        { _id: 'ver:job:1:1', entityId: 'job:1', version: 1, snapshot: { _id: 'job:1', entityType: 'jobs', version: 1, workshopId: 'w1', personIds: ['p1'], processId: 'proc:fill', processName: '灌装', batchNo: 'APDD26X1006', unit: 'case', event: { type: 'report', date: '2026-06-01', requestId: 'r0', shiftId: 'shift:early', shiftName: '早班', goodQty: 3, defectQty: 0, workHours: 4 } } },
    ])
    seed('mes_ops_exceptions', [
        { _id: 'e1', status: 'open', workshopId: 'w1', personIds: ['p1'], updatedAt: 100 },
        { _id: 'e2', status: 'open', workshopId: 'w2', personIds: ['p2'], updatedAt: 200 },
        { _id: 'e3', status: 'resolved', workshopId: 'w1', personIds: ['p1'], updatedAt: 300 },
    ])
    seed('mes_ops_handovers', [
        { _id: 'h1', status: 'submitted', workshopId: 'w1', authorId: 'u-emp', receiverUid: 'u2', updatedAt: 100 },
        { _id: 'h2', status: 'submitted', workshopId: 'w2', authorId: 'u3', receiverUid: 'u4', updatedAt: 200 },
        { _id: 'h3', status: 'received', workshopId: 'w1', authorId: 'u-emp', receiverUid: 'u2', updatedAt: 300 },
    ])
    seed('mes_ops_schedules', [
        { _id: 's1', date: '2026-06-01', personId: 'p1', workshopId: 'w1', enabled: true, kind: 'work' },
        { _id: 's2', date: '2026-06-01', personId: 'p2', workshopId: 'w1', enabled: false, kind: 'work' },
        { _id: 's3', date: '2026-06-02', personId: 'p1', workshopId: 'w1', enabled: true, kind: 'work' },
    ])
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
    console.log('\nMES 原生化 reports（dashboard/report）测试')

    await test('dashboard 管理员：当日工单/运行中/完工、待处理异常、待接班、当日排班计数正确', async () => {
        const data = await dashboard(makeDb(), ADMIN, { date: '2026-06-01' })
        assert.equal(data.date, '2026-06-01')
        assert.deepEqual(data.counts, { jobs: 5, running: 2, completed: 2, openExceptions: 2, pendingHandovers: 2 })
        assert.equal(data.schedules.length, 1)
        assert.equal(data.schedules[0]._id, 's1')
        assert.deepEqual(data.jobs.map((job) => job._id), ['job:4', 'job:5', 'job:6', 'job:2', 'job:1'])
        assert.deepEqual(data.exceptions.map((row) => row._id), ['e2', 'e1'])
    })

    await test('dashboard 普通人员：只看本人车间与本人记录，计数与列表同步收窄', async () => {
        const data = await dashboard(makeDb(), OPERATOR, { date: '2026-06-01' })
        assert.equal(data.counts.jobs, 3)
        assert.equal(data.counts.running, 1)
        assert.equal(data.counts.completed, 1)
        assert.equal(data.counts.openExceptions, 1)
        assert.equal(data.counts.pendingHandovers, 1)
        assert.deepEqual(data.jobs.map((job) => job._id), ['job:4', 'job:2', 'job:1'])
        assert.deepEqual(data.exceptions.map((row) => row._id), ['e1'])
        assert.deepEqual(data.schedules.map((row) => row._id), ['s1'])
    })

    await test('dashboard 非法日期返回 400', async () => {
        await rejectsWith(dashboard(makeDb(), ADMIN, { date: '2026-13-01' }), 400, /日期/)
        await rejectsWith(dashboard(makeDb(), ADMIN, {}), 400, /日期/)
    })

    await test('report 管理员：当前事件 + 归档版本按请求去重后汇总，按单位合计与工时正确', async () => {
        const data = await report(makeDb(), ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-01' })
        assert.equal(data.rows.length, 4)
        const caseRows = data.rows.filter((row) => row.unit === 'case')
        assert.equal(caseRows.length, 3)
        const job1 = data.rows.find((row) => row.jobId === 'job:1')
        assert.equal(job1.goodQty, 13, '归档 r0(3) + 当前 r1(10)')
        assert.equal(job1.workHours, 12)
        const job2 = data.rows.find((row) => row.jobId === 'job:2')
        assert.equal(job2.goodQty, 5)
        assert.equal(job2.defectQty, 1)
        const inbound = data.rows.find((row) => row.jobId === 'job:6')
        assert.equal(inbound.inboundQty, 20)
        assert.equal(data.rows.find((row) => row.jobId === 'job:5').goodQty, 7)
        const caseTotal = data.totals.find((row) => row.unit === 'case')
        assert.deepEqual(caseTotal, { unit: 'case', goodQty: 25, defectQty: 1, inboundQty: 0 })
        const bottleTotal = data.totals.find((row) => row.unit === 'bottle')
        assert.deepEqual(bottleTotal, { unit: 'bottle', goodQty: 0, defectQty: 0, inboundQty: 20 })
        assert.equal(data.workHours, 28)
    })

    await test('report 普通人员：只汇总本人可见工单，不越权统计他人', async () => {
        const data = await report(makeDb(), OPERATOR, { dateFrom: '2026-06-01', dateTo: '2026-06-01' })
        assert.deepEqual(data.rows.map((row) => row.jobId).sort(), ['job:1', 'job:2'])
        assert.equal(data.rows.find((row) => row.jobId === 'job:1').goodQty, 13)
        const caseTotal = data.totals.find((row) => row.unit === 'case')
        assert.deepEqual(caseTotal, { unit: 'case', goodQty: 18, defectQty: 1, inboundQty: 0 })
        assert.equal(data.workHours, 20)
    })

    await test('report 日期范围过滤：范围外事件不参与汇总', async () => {
        const data = await report(makeDb(), ADMIN, { dateFrom: '2026-06-02', dateTo: '2026-06-02' })
        assert.deepEqual(data.rows.map((row) => row.jobId), ['job:3'])
        assert.equal(data.rows[0].goodQty, 99)
    })

    await test('report 参数校验：必须传日期、范围不超过 31 天、非法日期 400', async () => {
        await rejectsWith(report(makeDb(), ADMIN, {}), 400, /开始和结束日期/)
        await rejectsWith(report(makeDb(), ADMIN, { dateFrom: '2026-05-01', dateTo: '2026-06-30' }), 400, /最多 31 天/)
        await rejectsWith(report(makeDb(), ADMIN, { dateFrom: '2026-06-31', dateTo: '2026-06-31' }), 400, /开始日期/)
    })

    await test('report 输出按日期+批号排序', async () => {
        const data = await report(makeDb(), ADMIN, { dateFrom: '2026-06-01', dateTo: '2026-06-02' })
        const keys = data.rows.map((row) => row.date + '|' + row.batchNo)
        assert.deepEqual(keys, [...keys].sort((a, b) => a.localeCompare(b)))
    })

    console.log('\nMES 原生化 reports：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

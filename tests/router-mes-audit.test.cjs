// MES 原生化（P3-B 第 6 模块）audit 回归：权限、类型白名单、关键字、分页、新增日期范围（业务日预筛 + at 过滤）。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const auditRead = require('../uniCloud-alipay/cloudfunctions/router/util/mes/audit-read.js')

const ADMIN = { uid: 'u-admin', isAdmin: true, personId: '', workshopId: '', processIds: [], scopeRole: 'admin' }
const MANAGER = { uid: 'u-manager', isAdmin: false, personId: '', workshopId: 'w1', processIds: [], scopeRole: 'workshop_manager' }
const OPERATOR = { uid: 'u-emp', isAdmin: false, personId: 'p1', workshopId: 'w1', processIds: [], scopeRole: 'operator' }
const at = (textDate) => Date.parse(textDate + 'T12:00:00+08:00')

function makeDb() {
    const db = createMemoryDb()
    const seed = (name, rows) => { for (const row of rows) db.ensure(name).set(row._id, row) }
    seed('mes_ops_jobs', [
        { _id: 'job:1', workshopId: 'w1', personIds: ['p1'], batchNo: 'APDD26X1006', version: 2, audit: { at: at('2026-06-01'), actorName: '张三', action: 'update', version: 2 } },
        { _id: 'job:2', workshopId: 'w1', personIds: ['p1'], batchNo: 'APDD26X1007', version: 1, audit: { at: at('2026-06-05'), actorName: '李四', action: 'create', version: 1 } },
        { _id: 'job:3', workshopId: 'w2', personIds: ['p2'], batchNo: 'APDD26X1008', version: 1, audit: { at: at('2026-05-20'), actorName: '王五', action: 'create', version: 1 } },
    ])
    seed('mes_ops_versions', [
        { _id: 'ver:job:1:1', entityId: 'job:1', version: 1, snapshot: { _id: 'job:1', version: 1, audit: { at: at('2026-05-31'), actorName: '张三', action: 'create', version: 1 } } },
        { _id: 'ver:job:2:1', entityId: 'job:2', version: 1, snapshot: { _id: 'job:2', version: 1, audit: { at: at('2026-06-05'), actorName: '李四', action: 'create', version: 1 } } },
    ])
    seed('mes_ops_schedules', [
        { _id: 's1', date: '2026-06-02', workshopId: 'w1', personId: 'p1', version: 1, audit: { at: at('2026-06-02'), actorName: '张三', action: 'create', version: 1 } },
        { _id: 's2', date: '2026-04-02', workshopId: 'w1', personId: 'p1', version: 1, audit: { at: at('2026-04-02'), actorName: '张三', action: 'create', version: 1 } },
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
    console.log('\nMES 原生化 audit 测试')

    await test('管理员：当前版本 + 归档版本合并，按 at 倒序并分页', async () => {
        const data = await auditRead.audit(makeDb(), ADMIN, { type: 'jobs', page: 1, pageSize: 20 })
        assert.equal(data.total, 4)
        assert.deepEqual(data.list.map((row) => row._id), ['job:2:1', 'job:1:2', 'job:1:1', 'job:3:1'])
        const first = data.list[0]
        assert.equal(first.entityType, 'jobs')
        assert.equal(first.label, 'APDD26X1007')
        const page2 = await auditRead.audit(makeDb(), ADMIN, { type: 'jobs', page: 2, pageSize: 2 })
        assert.equal(page2.list.length, 2)
        assert.equal(page2.page, 2)
    })

    await test('类型白名单：非法类型 400；普通人员 403；主管基础资料 403、业务类型可查', async () => {
        await rejectsWith(auditRead.audit(makeDb(), ADMIN, { type: 'bad' }), 400, /类型非法/)
        await rejectsWith(auditRead.audit(makeDb(), OPERATOR, { type: 'jobs' }), 403, /仅主管或管理员/)
        await rejectsWith(auditRead.audit(makeDb(), MANAGER, { type: 'workshops' }), 403, /基础资料审计仅管理员/)
        const manager = await auditRead.audit(makeDb(), MANAGER, { type: 'jobs' })
        assert.ok(manager.total > 0)
    })

    await test('关键字按实体字段过滤（批号/名称等）', async () => {
        const data = await auditRead.audit(makeDb(), ADMIN, { type: 'jobs', keyword: 'APDD26X1006' })
        assert.deepEqual(data.list.map((row) => row.entityId), ['job:1', 'job:1'])
        const none = await auditRead.audit(makeDb(), ADMIN, { type: 'jobs', keyword: '不存在' })
        assert.equal(none.total, 0)
    })

    await test('新增日期范围：schedule 业务日预筛 + at 过滤，含首尾日', async () => {
        const range = await auditRead.audit(makeDb(), ADMIN, { type: 'schedules', dateFrom: '2026-06-01', dateTo: '2026-06-30' })
        assert.deepEqual(range.list.map((row) => row.entityId), ['s1'])
        assert.equal(range.from, '2026-06-01')
        assert.equal(range.to, '2026-06-30')
        const outside = await auditRead.audit(makeDb(), ADMIN, { type: 'schedules', dateFrom: '2026-05-01', dateTo: '2026-05-31' })
        assert.equal(outside.total, 0)
        const boundary = await auditRead.audit(makeDb(), ADMIN, { type: 'schedules', dateFrom: '2026-06-02', dateTo: '2026-06-02' })
        assert.deepEqual(boundary.list.map((row) => row.entityId), ['s1'])
    })

    await test('业务日期类型：日期范围按业务日筛选，不受审计时间 at（导入时间）影响', async () => {
        const db = createMemoryDb()
        // 6 月业务日，但审计发生在 10 月（导入时间），带 6 月范围仍应返回
        db.ensure('mes_ops_schedules').set('s1', { _id: 's1', date: '2026-06-02', version: 1, workshopId: 'w1', audit: { at: Date.parse('2026-10-19T12:00:00+08:00'), actorName: '张三', action: 'create', version: 1 } })
        const ranged = await auditRead.audit(db, ADMIN, { type: 'schedules', dateFrom: '2026-06-01', dateTo: '2026-06-07' })
        assert.equal(ranged.total, 1)
        assert.equal(ranged.list[0].entityType, 'schedules')
        const outside = await auditRead.audit(db, ADMIN, { type: 'schedules', dateFrom: '2026-05-01', dateTo: '2026-05-31' })
        assert.equal(outside.total, 0)
    })

    await test('日期范围下推到查询：整表超 1000 条时带日期范围可查、不带才 413', async () => {
        const db = createMemoryDb()
        const atText = (index) => Date.parse('2026-06-' + String((index % 28) + 1).padStart(2, '0') + 'T12:00:00+08:00')
        for (let index = 0; index < 1200; index++) {
            const june = index < 600
            const date = june ? '2026-06-' + String((index % 28) + 1).padStart(2, '0') : '2026-07-' + String((index % 28) + 1).padStart(2, '0')
            db.ensure('mes_ops_schedules').set('s' + index, { _id: 's' + index, date, version: 1, workshopId: 'w1', audit: { at: atText(index), actorName: '张三', action: 'create', version: 1 } })
        }
        const ranged = await auditRead.audit(db, ADMIN, { type: 'schedules', dateFrom: '2026-06-01', dateTo: '2026-06-30', page: 1, pageSize: 20 })
        assert.equal(ranged.total, 600, '日期条件下推后只统计 6 月记录')
        assert.equal(ranged.from, '2026-06-01')
        assert.equal(ranged.to, '2026-06-30')
        await rejectsWith(auditRead.audit(db, ADMIN, { type: 'schedules' }), 413, /结果过多/)
    })

    await test('日期范围对非日期类型按 at 过滤（jobs）', async () => {
        const data = await auditRead.audit(makeDb(), ADMIN, { type: 'jobs', dateFrom: '2026-06-01', dateTo: '2026-06-03' })
        assert.deepEqual(data.list.map((row) => row.entityId), ['job:1'])
        const june = await auditRead.audit(makeDb(), ADMIN, { type: 'jobs', dateFrom: '2026-06-01', dateTo: '2026-06-30' })
        assert.deepEqual([...new Set(june.list.map((row) => row.entityId))].sort(), ['job:1', 'job:2'])
    })

    await test('日期参数校验：开始晚于结束 400；跨度超过 366 天 400；非法日期 400', async () => {
        await rejectsWith(auditRead.audit(makeDb(), ADMIN, { type: 'jobs', dateFrom: '2026-06-10', dateTo: '2026-06-01' }), 400, /不能晚于/)
        await rejectsWith(auditRead.audit(makeDb(), ADMIN, { type: 'jobs', dateFrom: '2024-01-01', dateTo: '2026-01-01' }), 400, /最多 366 天/)
        await rejectsWith(auditRead.audit(makeDb(), ADMIN, { type: 'jobs', dateFrom: '2026-13-01' }), 400, /开始日期/)
    })

    await test('无 audit 的记录不产生审计行；空结果返回 total 0', async () => {
        const db = createMemoryDb()
        db.ensure('mes_ops_jobs').set('job:x', { _id: 'job:x', workshopId: 'w1', version: 1 })
        const data = await auditRead.audit(db, ADMIN, { type: 'jobs' })
        assert.equal(data.total, 0)
        assert.deepEqual(data.list, [])
    })

    await test('分页上限：pageSize 最大 50，page 最小 1', async () => {
        const data = await auditRead.audit(makeDb(), ADMIN, { type: 'jobs', page: 0, pageSize: 999 })
        assert.equal(data.page, 1)
        assert.equal(data.pageSize, 50)
    })

    await test('日期范围工具函数：withinRange 本地日界判断', () => {
        assert.equal(auditRead.withinRange({ at: at('2026-06-01') }, { from: '', to: '' }), true)
        assert.equal(auditRead.withinRange({ at: at('2026-06-01') }, { from: '2026-06-01', to: '2026-06-01' }), true)
        assert.equal(auditRead.withinRange({ at: at('2026-06-02') }, { from: '2026-06-01', to: '2026-06-01' }), false)
    })

    console.log('\nMES 原生化 audit：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

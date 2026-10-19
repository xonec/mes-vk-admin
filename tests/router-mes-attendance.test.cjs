// MES 原生化（P3-B 第 4 模块）attendance 读回归：汇总口径、权限范围、分页排序、冲突筛选、版本历史。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const attendance = require('../uniCloud-alipay/cloudfunctions/router/util/mes/attendance-read.js')

const ADMIN = { uid: 'u-admin', isAdmin: true, personId: '', workshopId: '', processIds: [], scopeRole: 'admin' }
const OPERATOR = { uid: 'u-emp', isAdmin: false, personId: 'p1', workshopId: 'w1', processIds: [], scopeRole: 'operator' }
const MANAGER = { uid: 'u-manager', isAdmin: false, personId: '', workshopId: 'w1', processIds: [], scopeRole: 'workshop_manager' }

function makeDb() {
    const db = createMemoryDb()
    const seed = (name, rows) => { for (const row of rows) db.ensure(name).set(row._id, row) }
    seed('mes_ops_attendance', [
        { _id: 'a1', personId: 'p1', personName: '张三', workshopId: 'w1', date: '2026-06-01', kind: 'work', absenceType: '', shiftName: '早班', startTime: '08:00', workHours: 8, processIds: ['proc:fill'], processNames: ['灌装'], version: 2, conflict: null },
        { _id: 'a2', personId: 'p1', personName: '张三', workshopId: 'w1', date: '2026-06-01', kind: 'rest', absenceType: 'rest', shiftName: '', startTime: '00:00', workHours: 0, processIds: [], processNames: [], version: 1, conflict: null },
        { _id: 'a3', personId: 'p1', personName: '张三', workshopId: 'w1', date: '2026-06-02', kind: 'rest', absenceType: 'leave', shiftName: '', startTime: '00:00', workHours: 0, processIds: [], processNames: [], version: 1, conflict: null },
        { _id: 'a4', personId: 'p2', personName: '李四', workshopId: 'w1', date: '2026-06-01', kind: 'work', absenceType: '', shiftName: '早班', startTime: '08:00', workHours: 8, processIds: ['proc:fill', 'proc:label'], processNames: ['灌装', '贴标'], version: 1, conflict: { retained: {}, incoming: {} } },
        { _id: 'a5', personId: 'p2', personName: '李四', workshopId: 'w1', date: '2026-06-03', kind: 'rest', absenceType: 'rest', shiftName: '', startTime: '00:00', workHours: 0, processIds: [], processNames: [], version: 1, conflict: null },
        { _id: 'a6', personId: 'p1', personName: '张三', workshopId: 'w1', date: '2025-05-31', kind: 'work', shiftName: '早班', startTime: '08:00', workHours: 8, processIds: [], processNames: [], version: 1, conflict: null },
    ])
    seed('mes_ops_versions', [
        { _id: 'ver:attendance:a1:1', entityId: 'a1', version: 1, snapshot: { _id: 'a1', version: 1, date: '2026-06-01', kind: 'rest', absenceType: 'rest' } },
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
    console.log('\nMES 原生化 attendance（只读）测试')

    await test('attendanceSummary 管理员：出勤日去重、休息/请假不重复计、工时与工序次数正确', async () => {
        const data = await attendance.attendanceSummary(makeDb(), ADMIN, { period: '2026-06' })
        assert.equal(data.from, '2026-06-01')
        assert.equal(data.to, '2026-06-30')
        assert.equal(data.attendanceDays, 2)
        assert.equal(data.restDays, 1)
        assert.equal(data.leaveDays, 1)
        assert.equal(data.workHours, 16)
        assert.equal(data.conflictCount, 1)
        const p1 = data.persons.find((row) => row.personId === 'p1')
        assert.deepEqual({ days: p1.attendanceDays, rest: p1.restDays, leave: p1.leaveDays, hours: p1.workHours, records: p1.recordCount }, { days: 1, rest: 0, leave: 1, hours: 8, records: 3 })
        const p2 = data.persons.find((row) => row.personId === 'p2')
        assert.equal(p2.conflictCount, 1)
        assert.deepEqual(data.processes.map((row) => [row.name, row.count]), [['灌装', 2], ['贴标', 1]])
    })

    await test('attendanceSummary 按年/按人/本人 own 范围正确', async () => {
        const year = await attendance.attendanceSummary(makeDb(), ADMIN, { period: '2026', periodType: 'year' })
        assert.equal(year.from, '2026-01-01')
        assert.equal(year.to, '2026-12-31')
        const own = await attendance.attendanceSummary(makeDb(), OPERATOR, { period: '2026-06', own: true })
        assert.deepEqual(own.persons.map((row) => row.personId), ['p1'])
        assert.equal(own.attendanceDays, 1)
        const filtered = await attendance.attendanceSummary(makeDb(), ADMIN, { period: '2026-06', personId: 'p2' })
        assert.deepEqual(filtered.persons.map((row) => row.personId), ['p2'])
    })

    await test('attendanceSummary 普通人员查他人 403；主管按车间范围可查', async () => {
        await rejectsWith(attendance.attendanceSummary(makeDb(), OPERATOR, { period: '2026-06' }), 403, /无权查询/)
        const manager = await attendance.attendanceSummary(makeDb(), MANAGER, { period: '2026-06' })
        assert.equal(manager.attendanceDays, 2)
    })

    await test('listAttendance 管理员分页 + conflictOnly 只返回冲突记录', async () => {
        const page = await attendance.listAttendance(makeDb(), ADMIN, { period: '2026-06', page: 1, pageSize: 20 })
        assert.equal(page.total, 5)
        assert.equal(page.list.length, 5)
        const conflicts = await attendance.listAttendance(makeDb(), ADMIN, { period: '2026-06', conflictOnly: true })
        assert.deepEqual(conflicts.list.map((row) => row._id), ['a4'])
    })

    await test('myAttendance 本人记录：生产日倒序、同日按开始时间倒序、分页', async () => {
        const data = await attendance.myAttendance(makeDb(), OPERATOR, { period: '2026-06', page: 1, pageSize: 20 })
        assert.equal(data.total, 3)
        assert.deepEqual(data.list.map((row) => row._id), ['a3', 'a1', 'a2'])
        const small = await attendance.myAttendance(makeDb(), OPERATOR, { period: '2026-06', page: 2, pageSize: 2 })
        assert.deepEqual(small.list.map((row) => row._id), ['a2'])
        await rejectsWith(attendance.myAttendance(makeDb(), MANAGER, { period: '2026-06' }), 403, /绑定人员/)
    })

    await test('attendanceHistory 返回归档+当前版本，按版本升序', async () => {
        const data = await attendance.attendanceHistory(makeDb(), ADMIN, { id: 'a1' })
        assert.deepEqual(data.versions.map((row) => row.version), [1, 2])
        const own = await attendance.attendanceHistory(makeDb(), OPERATOR, { id: 'a3' })
        assert.deepEqual(own.versions.map((row) => row._id), ['a3'])
    })

    await test('attendanceHistory 越权 403，非法 id 400/404', async () => {
        await rejectsWith(attendance.attendanceHistory(makeDb(), OPERATOR, { id: 'a4' }), 403, /无权访问/)
        await rejectsWith(attendance.attendanceHistory(makeDb(), ADMIN, { id: 'missing' }), 404, /记录不存在/)
    })

    await test('周期参数校验：非法月份/年份 400', async () => {
        await rejectsWith(attendance.attendanceSummary(makeDb(), ADMIN, { period: '2026-13' }), 400, /月份/)
        await rejectsWith(attendance.attendanceSummary(makeDb(), ADMIN, { period: '26', periodType: 'year' }), 400, /年份/)
    })

    console.log('\nMES 原生化 attendance：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

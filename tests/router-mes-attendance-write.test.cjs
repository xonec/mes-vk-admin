// P3-B3 考勤写：saveAttendance / resolveAttendanceConflict / syncAttendance 行为回归 + 冲突链路。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const { saveAttendance, resolveAttendanceConflict, syncAttendance } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/attendance-write.js')
const { saveSchedule } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/schedules-write.js')
const scope = require('../uniCloud-alipay/cloudfunctions/router/util/mes/scope.js')

const profile = (db, uid, role) => scope.profile(db, { uid, role: role || [] })
const admin = db => profile(db, IDS.admin, ['admin'])
const sup = db => profile(db, IDS.sup)
const operator = db => profile(db, IDS.operator)

const ATT = over => ({
    personId: IDS.supPerson, personName: '于家园', workshopId: IDS.workshop, workshopName: '301',
    date: '2026-10-22', kind: 'work', shiftId: IDS.shift, shiftName: '早班（8小时）',
    processIds: [IDS.process], processNames: ['罐装机'],
    startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, plannedHours: 8, workHours: 8,
    source: 'manual', sourceShiftId: '', sourceSignature: '', status: 'recorded', edited: true, conflict: null, version: 1, ...over,
})
const SCHEDULE = over => ({
    personId: IDS.supPerson, personName: '于家园', workshopId: IDS.workshop, workshopName: '301',
    date: '2026-10-22', kind: 'work', shiftId: IDS.shift, shiftName: '早班（8小时）',
    processId: IDS.process, processName: '罐装机',
    startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, plannedHours: 8, enabled: true, version: 1, ...over,
})
const WORK = over => ({ date: '2026-10-22', kind: 'work', shiftId: IDS.shift, processIds: [IDS.process], note: 'TEST-P3B3', ...over })
const REQ = 'test-b3-attendance-0001'

function seedAttendance(db, id, over) { db.ensure('mes_ops_attendance').set(id, { _id: id, ...ATT(over) }) }
function seedSchedule(db, id, over) { db.ensure('mes_ops_schedules').set(id, { _id: id, ...SCHEDULE(over) }) }

async function run(fn, ...args) {
    try { return { code: 0, message: 'ok', data: await fn(...args) } }
    catch (error) { return { code: error.code || 500, message: error.message || String(error) } }
}

let passed = 0
let failed = 0
async function test(name, fn) {
    try { await fn(); passed += 1; console.log('  ✓ ' + name) }
    catch (error) { failed += 1; console.error('  ✗ ' + name); console.error('    ' + ((error && error.stack) || error)) }
}

;(async () => {
    console.log('\nP3-B3 考勤写（saveAttendance / resolveConflict / syncAttendance）')

    await test('saveAttendance 本人新建出勤 v1：source=manual、edited、审计事件', async () => {
        const { db } = createWriteDb()
        const result = await run(saveAttendance, db, await sup(db), { expectedVersion: 0, requestId: REQ, record: WORK() })
        assert.equal(result.code, 0)
        assert.equal(result.data.version, 1)
        assert.equal(result.data.source, 'manual')
        assert.equal(result.data.edited, true)
        assert.equal(result.data.status, 'recorded')
        assert.equal(result.data.personName, '于家园')
        assert.equal(result.data.audit.action, 'create')
        assert.equal(result.data.event.type, 'save_attendance')
        assert.equal(db.ensure('mes_ops_attendance').size, 1)
    })

    await test('saveAttendance 本人新建休息（leave）：0 工时、无班次', async () => {
        const { db } = createWriteDb()
        const result = await run(saveAttendance, db, await sup(db), { expectedVersion: 0, requestId: REQ, record: { date: '2026-10-23', kind: 'rest', absenceType: 'leave', note: 'TEST-P3B3 请假' } })
        assert.equal(result.code, 0)
        assert.equal(result.data.absenceType, 'leave')
        assert.equal(result.data.plannedHours, 0)
        assert.equal(result.data.shiftId, '')
        assert.equal(result.data.processIds.length, 0)
    })

    await test('saveAttendance 更新本人记录：版本 +1、保留原 source', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:manual:self1')
        const result = await run(saveAttendance, db, await sup(db), { expectedVersion: 1, requestId: 'test-b3-attendance-0002', record: { _id: 'attendance:manual:self1', date: '2026-10-22', kind: 'work', shiftId: IDS.shift, processIds: [IDS.process], note: 'TEST-P3B3 更新' } })
        assert.equal(result.code, 0)
        assert.equal(result.data.version, 2)
        assert.equal(result.data.source, 'manual')
        assert.equal(result.data.note, 'TEST-P3B3 更新')
        const record = db.ensure('mes_ops_attendance').get('attendance:manual:self1')
        assert.equal(record.audit.action, 'update')
    })

    await test('saveAttendance 版本冲突 409 / 时间重叠 409 / 冲突记录 409', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:manual:self2')
        const stale = await run(saveAttendance, db, await sup(db), { expectedVersion: 0, requestId: 'test-b3-attendance-0003', record: { _id: 'attendance:manual:self2', ...WORK() } })
        assert.equal(stale.code, 409)
        seedAttendance(db, 'attendance:manual:overlap', { date: '2026-10-22', startTime: '08:00', endTime: '16:00' })
        const overlap = await run(saveAttendance, db, await sup(db), { expectedVersion: 0, requestId: 'test-b3-attendance-0004', record: WORK({ date: '2026-10-22' }) })
        assert.equal(overlap.code, 409)
        assert.match(overlap.message, /时间重叠/)
        seedAttendance(db, 'attendance:manual:conflict', { conflict: { retained: { kind: 'work' }, incoming: { kind: 'work' } } })
        const conflict = await run(saveAttendance, db, await sup(db), { expectedVersion: 1, requestId: 'test-b3-attendance-0005', record: { _id: 'attendance:manual:conflict', ...WORK() } })
        assert.equal(conflict.code, 409)
        assert.match(conflict.message, /存在排班冲突/)
    })

    await test('saveAttendance 权限：非管理员代他人 403；管理员改他人无原因 400；跨车间工序 403', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:manual:other1')
        const other = await run(saveAttendance, db, await operator(db), { expectedVersion: 1, requestId: 'test-b3-attendance-0006', record: { _id: 'attendance:manual:other1', ...WORK() } })
        assert.equal(other.code, 403)
        seedAttendance(db, 'attendance:manual:admin1')
        const noReason = await run(saveAttendance, db, await admin(db), { expectedVersion: 1, requestId: 'test-b3-attendance-0007', record: { _id: 'attendance:manual:admin1', ...WORK() } })
        assert.equal(noReason.code, 400)
        assert.match(noReason.message, /管理员修改考勤请填写原因/)
        const cross = await run(saveAttendance, db, await sup(db), { expectedVersion: 0, requestId: 'test-b3-attendance-0008', record: WORK({ processIds: [IDS.processOther] }) })
        assert.equal(cross.code, 403)
        assert.match(cross.message, /只能选择人员所在车间的工序/)
    })

    await test('saveAttendance 管理员代建他人成功；管理员代改带原因成功', async () => {
        const { db } = createWriteDb()
        const created = await run(saveAttendance, db, await admin(db), { expectedVersion: 0, requestId: 'test-b3-attendance-0009', record: WORK({ personId: IDS.operatorPerson }) })
        assert.equal(created.code, 0)
        assert.equal(created.data.personName, '操作员')
        const updated = await run(saveAttendance, db, await admin(db), { expectedVersion: 1, requestId: 'test-b3-attendance-0010', record: WORK({ _id: created.data._id, personId: IDS.operatorPerson, changeReason: 'TEST-P3B3 管理员更正' }) })
        assert.equal(updated.code, 0)
        assert.equal(updated.data.version, 2)
    })

    await test('saveAttendance 新建幂等（同 requestId 同内容返回原记录；不同内容 409）', async () => {
        const { db } = createWriteDb()
        const first = await saveAttendance(db, await sup(db), { expectedVersion: 0, requestId: REQ, record: WORK() })
        const replay = await saveAttendance(db, await sup(db), { expectedVersion: 0, requestId: REQ, record: WORK() })
        assert.equal(replay._id, first._id)
        assert.equal(replay.version, 1)
        assert.equal(db.ensure('mes_ops_attendance').size, 1)
        const conflict = await run(saveAttendance, db, await sup(db), { expectedVersion: 0, requestId: REQ, record: WORK({ note: '不同内容' }) })
        assert.equal(conflict.code, 409)
        assert.match(conflict.message, /同一新增请求内容不同/)
    })

    await test('saveAttendance 编辑排班来源记录：日期保留原值（不随表单改期）', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:schedule:1', { source: 'schedule', date: '2026-10-21', sourceShiftId: IDS.shift })
        const result = await run(saveAttendance, db, await sup(db), { expectedVersion: 1, requestId: 'test-b3-attendance-0011', record: { _id: 'attendance:schedule:1', date: '2026-10-25', kind: 'work', shiftId: IDS.shift, processIds: [IDS.process], note: 'TEST-P3B3' } })
        assert.equal(result.code, 0)
        assert.equal(result.data.date, '2026-10-21')
        assert.equal(result.data.source, 'schedule')
    })

    await test('resolveAttendanceConflict 本人 choice=schedule：清冲突、采用新排班、edited=false', async () => {
        const { db } = createWriteDb()
        const incoming = { kind: 'work', date: '2026-10-22', shiftId: IDS.shiftNight, processNames: ['罐装机'], shiftName: '夜班（8小时）', workHours: 8, startTime: '22:00', endTime: '06:00', startDayOffset: 0, endDayOffset: 1 }
        seedAttendance(db, 'attendance:conflict:1', { conflict: { retained: ATT({ note: '原修改' }), incoming, detectedAt: 1, previousVersion: 1 } })
        const result = await run(resolveAttendanceConflict, db, await sup(db), { id: 'attendance:conflict:1', expectedVersion: 1, requestId: 'test-b3-resolve-0001', choice: 'schedule' })
        assert.equal(result.code, 0)
        assert.equal(result.data.conflict, null)
        assert.equal(result.data.edited, false)
        assert.equal(result.data.shiftId, IDS.shiftNight)
        assert.equal(result.data.version, 2)
        assert.equal(result.data.event.type, 'resolve_attendance')
        assert.equal(result.data.event.choice, 'schedule')
        assert.match(result.data.audit.reason, /员工选择新排班/)
    })

    await test('resolveAttendanceConflict 本人 choice=retained：保留原修改、edited=true', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:conflict:2', { conflict: { retained: { kind: 'work', date: '2026-10-22', shiftId: IDS.shift, processIds: [IDS.process], startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, note: '原修改' }, incoming: { kind: 'work', date: '2026-10-22', shiftId: IDS.shiftNight }, detectedAt: 1, previousVersion: 1 } })
        const result = await run(resolveAttendanceConflict, db, await sup(db), { id: 'attendance:conflict:2', expectedVersion: 1, requestId: 'test-b3-resolve-0002', choice: 'retained' })
        assert.equal(result.code, 0)
        assert.equal(result.data.conflict, null)
        assert.equal(result.data.edited, true)
        assert.equal(result.data.shiftId, IDS.shift)
        assert.match(result.data.audit.reason, /保留原修改/)
    })

    await test('resolveAttendanceConflict 错误：无冲突 409、非法 choice 400、非本人非管理员 403', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:conflict:3')
        const none = await run(resolveAttendanceConflict, db, await sup(db), { id: 'attendance:conflict:3', expectedVersion: 1, requestId: 'test-b3-resolve-0003', choice: 'schedule' })
        assert.equal(none.code, 409)
        assert.match(none.message, /此冲突已处理/)
        seedAttendance(db, 'attendance:conflict:4', { conflict: { retained: { kind: 'work' }, incoming: { kind: 'work' }, detectedAt: 1, previousVersion: 1 } })
        const invalid = await run(resolveAttendanceConflict, db, await sup(db), { id: 'attendance:conflict:4', expectedVersion: 1, requestId: 'test-b3-resolve-0004', choice: 'boom' })
        assert.equal(invalid.code, 400)
        assert.match(invalid.message, /请选择新排班或原修改/)
        const forbidden = await run(resolveAttendanceConflict, db, await operator(db), { id: 'attendance:conflict:4', expectedVersion: 1, requestId: 'test-b3-resolve-0005', choice: 'schedule' })
        assert.equal(forbidden.code, 403)
    })

    await test('resolveAttendanceConflict 管理员代他人处理；requestId 幂等且不重复升版', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:conflict:5', { conflict: { retained: { kind: 'work', date: '2026-10-22', shiftId: IDS.shift, processIds: [IDS.process], startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0 }, incoming: { kind: 'work', date: '2026-10-22', shiftId: IDS.shiftNight }, detectedAt: 1, previousVersion: 1 } })
        const first = await resolveAttendanceConflict(db, await admin(db), { id: 'attendance:conflict:5', expectedVersion: 1, requestId: 'test-b3-resolve-0006', choice: 'schedule' })
        assert.equal(first.version, 2)
        assert.match(first.audit.reason, /管理员处理冲突：新排班/)
        const replay = await resolveAttendanceConflict(db, await admin(db), { id: 'attendance:conflict:5', expectedVersion: 1, requestId: 'test-b3-resolve-0006', choice: 'schedule' })
        assert.equal(replay.version, 2)
        assert.equal(db.ensure('mes_ops_attendance').get('attendance:conflict:5').version, 2)
        seedAttendance(db, 'attendance:conflict:6', { date: '2026-10-23', conflict: { retained: { kind: 'work' }, incoming: { kind: 'work' }, detectedAt: 1, previousVersion: 1 } })
        await resolveAttendanceConflict(db, await admin(db), { id: 'attendance:conflict:6', expectedVersion: 1, requestId: 'test-b3-resolve-0007', choice: 'schedule' })
        const conflict = await run(resolveAttendanceConflict, db, await admin(db), { id: 'attendance:conflict:6', expectedVersion: 1, requestId: 'test-b3-resolve-0007', choice: 'retained' })
        assert.equal(conflict.code, 409)
        assert.match(conflict.message, /同一请求标识已提交不同内容/)
    })

    await test('syncAttendance 权限与周期校验：非管理员 403、年份 400', async () => {
        const { db } = createWriteDb()
        const forbidden = await run(syncAttendance, db, await sup(db), { periodType: 'month', period: '2026-10' })
        assert.equal(forbidden.code, 403)
        const year = await run(syncAttendance, db, await admin(db), { periodType: 'year', period: '2026' })
        assert.equal(year.code, 400)
        assert.match(year.message, /按月执行/)
    })

    await test('syncAttendance 按月按 personId 收窄：只同步该人、重复执行不升版本', async () => {
        const { db } = createWriteDb()
        seedSchedule(db, 'schedule:sync:1', { date: '2026-10-22' })
        seedSchedule(db, 'schedule:sync:2', { date: '2026-10-22', personId: IDS.operatorPerson, personName: '操作员' })
        const first = await run(syncAttendance, db, await admin(db), { periodType: 'month', period: '2026-10', personId: IDS.supPerson })
        assert.equal(first.code, 0)
        assert.equal(first.data.synced, 1)
        assert.equal(first.data.nextCursor, '')
        assert.equal(db.ensure('mes_ops_attendance').size, 1)
        const version = [...db.ensure('mes_ops_attendance').values()][0].version
        const second = await run(syncAttendance, db, await admin(db), { periodType: 'month', period: '2026-10', personId: IDS.supPerson })
        assert.equal(second.code, 0)
        assert.equal(second.data.synced, 1)
        assert.equal([...db.ensure('mes_ops_attendance').values()][0].version, version, '重复同步不产生新版本')
    })

    await test('syncAttendance 分页：25 组先 20 再 5，cursor 续跑', async () => {
        const { db } = createWriteDb()
        for (let day = 1; day <= 25; day++) {
            const date = '2026-10-' + String(day).padStart(2, '0')
            seedSchedule(db, 'schedule:sync:page:' + day, { date })
        }
        const first = await run(syncAttendance, db, await admin(db), { periodType: 'month', period: '2026-10', personId: IDS.supPerson })
        assert.equal(first.code, 0)
        assert.equal(first.data.synced, 20)
        assert.ok(first.data.nextCursor)
        const second = await run(syncAttendance, db, await admin(db), { periodType: 'month', period: '2026-10', personId: IDS.supPerson, cursor: first.data.nextCursor })
        assert.equal(second.code, 0)
        assert.equal(second.data.synced, 5)
        assert.equal(second.data.nextCursor, '')
        assert.equal(db.ensure('mes_ops_attendance').size, 25)
    })

    await test('冲突链路：manual + saveSchedule → conflict → 本人 resolve（retained）', async () => {
        const { db } = createWriteDb()
        const manual = await saveAttendance(db, await sup(db), { expectedVersion: 0, requestId: 'test-b3-chain-0001', record: WORK() })
        assert.equal(manual.edited, true)
        // 管理员先排早班（同班次不冲突），再改夜班触发 schedule_removed/conflict 转移
        const schedule = await saveSchedule(db, await admin(db), { expectedVersion: 0, record: { date: '2026-10-22', shiftId: IDS.shift, processId: IDS.process, personId: IDS.supPerson, kind: 'work', batchNos: [] } })
        assert.equal(schedule.version, 1)
        // 员工修改排班同步出的考勤（edited=true），随后管理员改班次，旧修改需要员工选择 → 产生 conflict
        const synced = [...db.ensure('mes_ops_attendance').values()].find(row => row.source === 'schedule')
        assert.ok(synced, '排班保存后应有同步出的考勤')
        const edited = await saveAttendance(db, await sup(db), { expectedVersion: synced.version, requestId: 'test-b3-chain-0003', record: { _id: synced._id, date: synced.date, kind: 'work', shiftId: IDS.shift, processIds: [IDS.process], note: 'TEST-P3B3 员工修改' } })
        assert.equal(edited.edited, true)
        const changed = await run(saveSchedule, db, await admin(db), { expectedVersion: 1, record: { _id: schedule._id, date: '2026-10-22', shiftId: IDS.shiftNight, processId: IDS.process, personId: IDS.supPerson, kind: 'work', batchNos: [], changeReason: 'TEST-P3B3 改班制造冲突' } })
        assert.equal(changed.code, 0)
        const rows = [...db.ensure('mes_ops_attendance').values()]
        const conflicted = rows.find(row => row.conflict)
        assert.ok(conflicted, '改班后应产生冲突记录')
        const resolved = await run(resolveAttendanceConflict, db, await sup(db), { id: conflicted._id, expectedVersion: conflicted.version, requestId: 'test-b3-chain-0002', choice: 'retained' })
        assert.equal(resolved.code, 0)
        assert.equal(resolved.data.conflict, null)
        assert.equal(resolved.data.edited, true)
        assert.equal(resolved.data.kind, 'work')
    })

    console.log('\nP3-B3 考勤写：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

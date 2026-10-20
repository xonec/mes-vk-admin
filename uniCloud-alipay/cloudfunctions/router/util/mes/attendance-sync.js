'use strict'
/**
 * P3-B1：从 mes-operations/attendance.js 摘出「排班保存后的考勤同步」部分（1:1）。
 * 只包含 scheduleSnapshot / content / syncPersonAttendance，供 native 版 saveSchedule 复用；
 * 考勤自身的查询/写接口仍走 forward（B3 周期再迁）。
 */
const { ClientError } = require('./common')
const { collection, digest, get, all, save, event } = require('./shared')
const { shiftPeriod } = require('./shift-time')

/** 一组日期、班次和人员对应一条考勤，多工序不重复计算工时。 */
function scheduleSnapshot(rows) {
    const first = rows[0]
    const works = rows.filter(row => (row.kind || 'work') === 'work')
    const current = works[0] || first
    const period = works.length ? shiftPeriod({}, current) : { startTime: '00:00', endTime: '00:00', startDayOffset: 0, endDayOffset: 1, plannedHours: 0 }
    const processIds = [...new Set(works.map(row => row.processId))].sort()
    return { date: first.date, personId: first.personId, personName: first.personName, workshopId: first.workshopId, shiftId: first.shiftId || '', shiftName: first.shiftName || '', kind: works.length ? 'work' : 'rest', absenceType: works.length ? '' : rows.some(row => row.absenceType === 'leave') ? 'leave' : 'rest', processIds, processNames: processIds.map(id => (works.find(row => row.processId === id) || {}).processName || id), ...period, workHours: period.plannedHours, sourceRows: rows.map(row => ({ id: row._id, version: row.version })).sort((a, b) => a.id.localeCompare(b.id)), note: [...new Set(rows.map(row => row.note).filter(Boolean))].join('\n') }
}
/** 只比较业务排班内容，不因备注、版本号或重试重新制造冲突。 */
function content(row) { return { kind: row.kind, absenceType: row.kind === 'rest' ? row.absenceType || 'rest' : '', date: row.date, shiftId: row.shiftId, processIds: [...(row.processIds || [])].sort(), startTime: row.startTime, endTime: row.endTime, startDayOffset: row.startDayOffset, endDayOffset: row.endDayOffset } }
/** 排班保存后同步本人考勤；与排班共用人员租约，所有结果均带历史版本。 */
async function syncPersonAttendance(db, profile, personId, productionDate, preload = null) {
    // 批量导入已在内存里准备好当天排班与考勤，避免同一人员每日重复查询。
    const schedules = preload && preload.schedules ? preload.schedules : await all(db, collection('schedules'), { personId, date: productionDate, enabled: db.command.neq(false) }, 500)
    const manual = preload ? preload.manual : await all(db, collection('attendance'), { personId, date: productionDate, source: 'manual' }, 500)
    const minutes = row => {
        const value = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
        return { start: (Number(row.startDayOffset) || 0) * 1440 + value(row.startTime), end: Number(row.endDayOffset) * 1440 + value(row.endTime) }
    }
    const groups = new Map()
    for (const row of schedules) { const key = row.shiftId || ''; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row) }
    const existing = preload ? preload.existing : await all(db, collection('attendance'), { personId, date: productionDate, source: 'schedule' }, 500)
    const available = new Set()
    for (const [slot, rows] of groups) {
        const snapshot = scheduleSnapshot(rows)
        let id = (existing.find(row => row.sourceShiftId === slot) || {})._id || 'attendance:' + digest([personId, productionDate, slot])
        let old = preload ? preload.byId.get(id) || null : await get(db, 'attendance', id, false)
        const incomingPeriod = minutes(snapshot)
        const matching = manual.filter(row => !available.has(row._id) && (snapshot.kind === 'rest' || row.kind === 'rest' || incomingPeriod.start < minutes(row).end && incomingPeriod.end > minutes(row).start))
        // 无排班时自行录入的记录随后出现在排班中，沿用原记录及其历史，不额外累计一份工时。
        if (matching.length > 1 || old && matching.length) throw new ClientError('新排班与多条既有考勤重叠，请先核对这些记录后重试同步', 409)
        if (!old && matching.length === 1) { old = matching[0]; id = old._id }
        available.add(id)
        const signature = digest(content(snapshot))
        if (old && old.sourceSignature === signature && !old.scheduleRemoved) continue
        const edited = old && (old.edited || old.conflict)
        const conflict = edited && digest(content(old.conflict ? old.conflict.retained : old)) !== signature ? { retained: old.conflict ? old.conflict.retained : { ...content(old), processNames: old.processNames, shiftName: old.shiftName, workHours: old.workHours, note: old.note }, incoming: snapshot, detectedAt: Date.now(), previousVersion: old.version } : null
        const record = { ...snapshot, source: 'schedule', sourceShiftId: slot, sourceSignature: signature, scheduleSnapshot: snapshot, originalSnapshot: old ? old.originalSnapshot || old.scheduleSnapshot || { ...content(old), processNames: old.processNames, shiftName: old.shiftName, workHours: old.workHours, note: old.note } : snapshot, status: 'recorded', edited: false, scheduleRemoved: false, conflict, event: event(profile, 'schedule_sync', 'sync-' + digest([id, signature, old ? old.version : 0]), signature) }
        await save(db, 'attendance', id, record, profile, old ? old.version : 0, conflict ? '新排班与已有修改冲突，等待员工选择整条记录' : '按排班更新考勤', undefined, preload ? { current: old || null, skipReread: true } : undefined)
    }
    for (const old of existing) {
        if (available.has(old._id) || old.scheduleRemoved) continue
        const record = { ...old, kind: 'rest', absenceType: 'rest', processIds: [], processNames: [], workHours: 0, plannedHours: 0, startTime: '00:00', endTime: '00:00', startDayOffset: 0, endDayOffset: 1, edited: false, conflict: null, scheduleRemoved: true, status: 'recorded', event: event(profile, 'schedule_removed', 'remove-' + digest([old._id, old.version]), digest(old._id)) }
        if (old.edited || old.conflict) {
            const retained = old.conflict ? old.conflict.retained : { ...content(old), processNames: old.processNames, shiftName: old.shiftName, workHours: old.workHours, note: old.note }
            // 单班次变更将原修改转到新班次，避免旧组停用时丢失员工选择机会。
            const target = available.size === 1 ? await get(db, 'attendance', [...available][0]) : null
            if (target && !target.conflict && !target.edited) {
                const conflict = { retained, incoming: target.scheduleSnapshot, detectedAt: Date.now(), previousVersion: old.version, retainedRecordId: old._id }
                await save(db, 'attendance', target._id, { ...target, conflict }, profile, target.version, '班次变更，保留原考勤修改供员工选择')
            } else {
                record.conflict = { retained, incoming: { ...content(record), processNames: [], shiftName: record.shiftName, workHours: 0, note: record.note }, detectedAt: Date.now(), previousVersion: old.version }
            }
        }
        await save(db, 'attendance', old._id, record, profile, old.version, record.conflict ? '原班次移除，保留修改等待员工选择' : '新排班移除人员或班次，自动记休息并归零工时', undefined, preload ? { current: old || null, skipReread: true } : undefined)
    }
}

module.exports = { scheduleSnapshot, content, syncPersonAttendance }

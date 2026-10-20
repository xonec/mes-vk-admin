'use strict'
/**
 * P3-B3：从 mes-operations/attendance.js 1:1 内迁考勤写操作。
 * 范围：saveAttendance（本人/管理员代改）、resolveAttendanceConflict（本人或管理员）、
 * syncAttendance（管理员按月补齐，cursor 分页）。
 * 版本 CAS、requestId 幂等、冲突记录、人员租约、时间重叠、审计与旧实现完全一致（本地双跑 diff=0）。
 * 排班保存后的 syncPersonAttendance 复用 P3-B1 已迁的 attendance-sync.js（同一份 1:1 实现）。
 */
const { ClientError } = require('./common')
const { collection, identifier, date, text, ids, get, all, and, save, digest, requestId, expectedVersion, priorRequest, event, withScheduleLock } = require('./shared')
const { active, visible, admin } = require('./scope')
const { shiftPeriod } = require('./shift-time')
const { syncPersonAttendance } = require('./attendance-sync')
const { attendanceRange } = require('./attendance-read')

/** 允许本人修改及管理员代改；用户原因可选，管理员变更必须留原因。 */
async function saveAttendance(db, profile, input) {
    const source = input.record || {}, version = expectedVersion(input.expectedVersion)
    const old = source._id ? await get(db, 'attendance', identifier(source._id)) : null
    const personId = old ? old.personId : identifier(profile.isAdmin ? source.personId : profile.personId, '人员')
    if (personId !== profile.personId) admin(profile)
    const person = await active(db, 'personnel', personId)
    const request = requestId(input.requestId), signature = digest({ source, actorId: profile.uid })
    if (old) { const accepted = await priorRequest(db, 'attendance', old, request, signature); if (accepted) return accepted }
    if (old && old.conflict) throw new ClientError('这条记录存在排班冲突，请员工先选择采用哪份', 409)
    const kind = source.kind || 'work'
    if (!['work', 'rest'].includes(kind)) throw new ClientError('请选择出勤或休息', 400)
    const shift = kind === 'work' ? await active(db, 'shifts', identifier(source.shiftId, '班次')) : null
    const processIds = kind === 'work' ? ids(source.processIds, '工序', 50) : []
    if (kind === 'work' && !processIds.length) throw new ClientError('出勤至少选择一个工序', 400)
    const processNames = []
    for (const id of processIds) { const process = await active(db, 'processes', id); if (process.workshopId !== person.workshopId) throw new ClientError('只能选择人员所在车间的工序', 403); processNames.push(process.name) }
    const period = kind === 'work' ? shiftPeriod(source, shift) : { startTime: '00:00', endTime: '00:00', startDayOffset: 0, endDayOffset: 1, plannedHours: 0 }
    const reason = text(source.changeReason, 1000)
    if (profile.isAdmin && old && !reason) throw new ClientError('管理员修改考勤请填写原因', 400)
    const id = old ? old._id : 'attendance:manual:' + digest([profile.uid, request])
    const already = !old ? await get(db, 'attendance', id, false) : null
    if (already) { if (already.event.actorId !== profile.uid || already.event.signature !== signature) throw new ClientError('同一新增请求内容不同', 409); return already }
    const record = { ...(old || {}), absenceType: kind === 'rest' && (source.absenceType == null && old ? old.absenceType : source.absenceType) === 'leave' ? 'leave' : kind === 'rest' ? 'rest' : '', date: old && old.source === 'schedule' ? old.date : date(source.date), personId, personName: person.name, workshopId: person.workshopId, kind, shiftId: shift ? shift._id : '', shiftName: shift ? shift.name : '', processIds, processNames, ...period, workHours: period.plannedHours, source: old ? old.source || 'manual' : 'manual', status: 'recorded', edited: true, note: text(source.note, 1000), event: event(profile, 'save_attendance', request, signature) }
    return withScheduleLock(db, personId, async () => {
        await checkOverlap(db, record, id)
        return save(db, 'attendance', id, record, profile, version, reason || '员工保存考勤（未填写原因）')
    })
}
/** 多班次可以同日记录，实际时间不能重叠；工序共用时间只计一次。 */
async function checkOverlap(db, record, id) {
    if (record.kind !== 'work') return
    const base = Date.parse(record.date + 'T00:00:00Z')
    const others = await all(db, collection('attendance'), { personId: record.personId, kind: 'work', date: db.command.gte(new Date(base - 86400000).toISOString().slice(0, 10)).and(db.command.lte(new Date(base + 86400000).toISOString().slice(0, 10))) }, 500)
    const interval = row => ({ start: Date.parse(row.date + 'T' + row.startTime + ':00+08:00') + (Number(row.startDayOffset) || 0) * 86400000, end: Date.parse(row.date + 'T' + row.endTime + ':00+08:00') + Number(row.endDayOffset) * 86400000 })
    const current = interval(record)
    if (others.some(row => row._id !== id && current.start < interval(row).end && current.end > interval(row).start)) throw new ClientError('与该人员其他考勤时间重叠，请调整', 409)
}
/** 冲突只由本人整条选择；新排班及保留的修改都进入历史。 */
async function resolveAttendanceConflict(db, profile, input) {
    const old = await get(db, 'attendance', identifier(input.id))
    const isSelf = old.personId === profile.personId
    // 本人可处理自己的冲突；管理员可处理权限范围内的他人冲突（后台处理入口），其他人仍 403。
    if (!isSelf) admin(profile)
    const request = requestId(input.requestId), signature = digest({ id: input.id, choice: input.choice, actorId: profile.uid })
    const accepted = await priorRequest(db, 'attendance', old, request, signature); if (accepted) return accepted
    if (!old.conflict) throw new ClientError('此冲突已处理，请刷新', 409)
    if (!['schedule', 'retained'].includes(input.choice)) throw new ClientError('请选择新排班或原修改', 400)
    const chosen = input.choice === 'schedule' ? old.conflict.incoming : old.conflict.retained
    const record = { ...old, ...chosen, edited: input.choice === 'retained', conflict: null, event: event(profile, 'resolve_attendance', request, signature, { choice: input.choice }) }
    const reason = (isSelf ? '员工选择' : '管理员处理冲突：') + (input.choice === 'schedule' ? '新排班' : '保留原修改')
    return withScheduleLock(db, old.personId, async () => { await checkOverlap(db, record, old._id); return save(db, 'attendance', old._id, record, profile, expectedVersion(input.expectedVersion), reason) })
}
/** 显式同步旧排班，用于首次部署和中断后的修复；只由管理员执行。 */
async function syncAttendance(db, profile, input) {
    admin(profile)
    const range = attendanceRange(db, input)
    if (input.periodType === 'year') throw new ClientError('补齐考勤请按月执行', 400)
    const rows = await all(db, collection('schedules'), and(db, range.condition, input.workshopId ? { workshopId: identifier(input.workshopId) } : {}, input.personId ? { personId: identifier(input.personId) } : {}), 20000)
    const cursor = text(input.cursor, 260)
    const groups = [...new Map(rows.map(row => [row.personId + ':' + row.date, row])).entries()].sort(([a], [b]) => a.localeCompare(b)).filter(([key]) => !cursor || key.localeCompare(cursor) > 0)
    const page = groups.slice(0, 20)
    for (const [, row] of page) await withScheduleLock(db, row.personId, () => syncPersonAttendance(db, profile, row.personId, row.date))
    return { synced: page.length, nextCursor: groups.length > page.length ? page[page.length - 1][0] : '' }
}

module.exports = { saveAttendance, checkOverlap, resolveAttendanceConflict, syncAttendance }

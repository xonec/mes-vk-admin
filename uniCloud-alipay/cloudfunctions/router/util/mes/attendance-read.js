'use strict'
/**
 * MES 原生化（P3-B 第 4 模块）：考勤只读查询，从 mes-operations/attendance.js 内迁。
 * 范围：attendanceSummary / listAttendance / myAttendance / attendanceHistory；
 * 写入（saveAttendance / resolveAttendanceConflict / syncAttendance）留到写模块阶段。
 */
const { ClientError } = require('./common')
const { collection, identifier, date, text, get, all, and, list, history } = require('./shared')
const { where, visible } = require('./scope')

/** 月或年使用完整自然周期，包含未来预排；不将年汇总限制到一个月。 */
function attendanceRange(db, input) {
    const period = text(input.period, 10)
    let from, to
    if (input.periodType === 'year') {
        if (!/^\d{4}$/.test(period) || Number(period) < 1900 || Number(period) > 2200) throw new ClientError('请选择有效年份', 400)
        from = period + '-01-01'; to = period + '-12-31'
    } else {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new ClientError('请选择月份 YYYY-MM', 400)
        from = period + '-01'; to = period + '-' + new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5)), 0)).getUTCDate()
    }
    return { from: date(from), to: date(to), condition: { date: db.command.gte(from).and(db.command.lte(to)) } }
}

/** 查询只读已同步考勤，管理员和主管的查看范围由服务端决定。 */
function attendanceScope(db, profile, input, own = false) {
    if (own) { if (!profile.personId) throw new ClientError('请先绑定人员档案', 403); return { personId: profile.personId } }
    if (!profile.isAdmin && profile.scopeRole !== 'workshop_manager') throw new ClientError('无权查询其他人员考勤', 403)
    return and(db, where(db, profile, 'attendance'), input.personId ? { personId: identifier(input.personId) } : {}, input.workshopId ? { workshopId: identifier(input.workshopId) } : {})
}

/** 统计出勤日去重、工时合计及工序参与次数，不输出无法确定的工序工时。 */
async function attendanceSummary(db, profile, input) {
    const range = attendanceRange(db, input)
    const rows = await all(db, collection('attendance'), and(db, attendanceScope(db, profile, input, input.own === true), range.condition), 100000)
    const people = new Map(), processes = new Map()
    for (const row of rows) {
        if (!people.has(row.personId)) people.set(row.personId, { personId: row.personId, personName: row.personName, days: new Set(), restDates: new Set(), leaveDates: new Set(), workHours: 0, processCounts: {}, recordCount: 0, conflictCount: 0 })
        const person = people.get(row.personId); person.recordCount++; if (row.conflict) person.conflictCount++
        if (row.kind !== 'work') {
            // 同一天既有出勤又有休息时按出勤日计，休息/请假只统计没有出勤的日子。
            if (row.absenceType === 'leave') person.leaveDates.add(row.date)
            else person.restDates.add(row.date)
            continue
        }
        person.days.add(row.date); person.workHours += Number(row.workHours) || 0
        for (const id of [...new Set(row.processIds || [])]) { const index = row.processIds.indexOf(id); const name = (row.processNames || [])[index] || id; person.processCounts[name] = (person.processCounts[name] || 0) + 1; if (!processes.has(id)) processes.set(id, { processId: id, name, count: 0 }); processes.get(id).count++ }
    }
    const persons = [...people.values()].map(row => ({
        personId: row.personId, personName: row.personName,
        attendanceDays: row.days.size,
        restDays: [...row.restDates].filter(date => !row.days.has(date)).length,
        leaveDays: [...row.leaveDates].filter(date => !row.days.has(date)).length,
        workHours: Math.round(row.workHours * 100) / 100, processCounts: row.processCounts,
        recordCount: row.recordCount, conflictCount: row.conflictCount
    }))
    return {
        from: range.from, to: range.to, persons,
        processes: [...processes.values()].sort((a, b) => b.count - a.count),
        attendanceDays: persons.reduce((sum, row) => sum + row.attendanceDays, 0),
        restDays: persons.reduce((sum, row) => sum + row.restDays, 0),
        leaveDays: persons.reduce((sum, row) => sum + row.leaveDays, 0),
        workHours: Math.round(persons.reduce((sum, row) => sum + row.workHours, 0) * 100) / 100,
        conflictCount: persons.reduce((sum, row) => sum + row.conflictCount, 0)
    }
}

/** 主管及管理员按周期分页查看权限范围内的考勤。 */
async function listAttendance(db, profile, input) {
    const range = attendanceRange(db, input)
    return list(db, 'attendance', input, attendanceScope(db, profile, input), ['personName', 'shiftName', 'processNames'], and(db, range.condition, input.conflictOnly ? { conflict: db.command.neq(null) } : {}))
}

/** 员工本人按月份或年份查看记录：生产日倒序，同一天按开始时间倒序；分页规则保持不变。 */
async function myAttendance(db, profile, input) {
    const range = attendanceRange(db, input)
    const page = Math.max(1, Math.floor(Number(input.page) || 1))
    const pageSize = Math.min(50, Math.max(1, Math.floor(Number(input.pageSize) || 20)))
    const where = and(db, attendanceScope(db, profile, input, true), range.condition)
    const counted = await db.collection(collection('attendance')).where(where).count()
    const rows = (await db.collection(collection('attendance')).where(where)
        .orderBy('date', 'desc').orderBy('startTime', 'desc').orderBy('_id', 'asc')
        .skip((page - 1) * pageSize).limit(pageSize).get()).data || []
    return { list: rows, total: counted.total || 0, page, pageSize }
}

/** 原排班、人工修改和冲突处理均通过版本历史追溯。 */
async function attendanceHistory(db, profile, input) {
    const record = await get(db, 'attendance', identifier(input.id))
    if (record.personId !== profile.personId) visible(profile, 'attendance', record)
    return { versions: await history(db, 'attendance', record) }
}

module.exports = { attendanceRange, attendanceScope, attendanceSummary, listAttendance, myAttendance, attendanceHistory }

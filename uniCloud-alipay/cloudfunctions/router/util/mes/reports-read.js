'use strict'
/**
 * MES 原生化（P3-B 第 3 模块）：生产报表与工作台（只读），从 mes-operations/reports.js 内迁。
 * 范围：report / dashboard；trace / audit 排在后续模块（audit 会同时补日期范围参数）。
 */
const { ClientError } = require('./common')
const { collection, VERSIONS, all, and, get, date, plus } = require('./shared')
const { where, visible } = require('./scope')
const { dateRange } = require('./schedules-read')

/** 汇总来自实际已接受的事件，历史快照的预写入不算成功报工。 */
async function report(db, profile, input) {
    const range = dateRange(db, input, true, 31)
    const inRange = value => value && value >= range.from && value <= range.to
    const scope = profile.isAdmin ? {} : profile.scopeRole === 'workshop_manager' ? { 'snapshot.workshopId': profile.workshopId } : { 'snapshot.workshopId': profile.workshopId, 'snapshot.personIds': db.command.in([profile.personId]) }
    const eventDate = db.command.gte(range.from).and(db.command.lte(range.to))
    const archived = await all(db, VERSIONS, and(db, scope, { 'snapshot.entityType': 'jobs', 'snapshot.event.date': eventDate }), 4000)
    const currents = await all(db, collection('jobs'), and(db, where(db, profile, 'jobs'), { 'event.date': eventDate }), 1000)
    const currentMap = new Map(currents.map(row => [row._id, row]))
    const ids = [...new Set(archived.map(row => row.entityId))]
    if (ids.length > 500) throw new ClientError('涉及工单过多，请缩小日期范围', 413)
    for (const id of ids) if (!currentMap.has(id)) currentMap.set(id, visible(profile, 'jobs', await get(db, 'jobs', id)))
    const snapshots = archived.filter(row => currentMap.has(row.entityId) && row.version < currentMap.get(row.entityId).version).map(row => row.snapshot)
    snapshots.push(...currentMap.values())
    const grouped = new Map(), seen = new Set(), totals = new Map()
    let workHours = 0
    for (const job of snapshots) {
        visible(profile, 'jobs', job)
        const event = job.event
        if (!event || !inRange(event.date) || !['report', 'inbound'].includes(event.type)) continue
        const eventKey = job._id + ':' + event.requestId
        if (seen.has(eventKey)) continue
        seen.add(eventKey)
        const key = [job._id, event.date, event.shiftId || '', job.unit].join('|')
        if (!grouped.has(key)) grouped.set(key, { date: event.date, shiftId: event.shiftId || '', shiftName: event.shiftName || '未指定班次', processId: job.processId, processName: job.processName, jobId: job._id, batchNo: job.batchNo, productCode: job.productCode, productName: job.productName, unit: job.unit, goodQty: 0, defectQty: 0, workHours: 0, inboundQty: 0 })
        const row = grouped.get(key)
        if (!totals.has(job.unit)) totals.set(job.unit, { unit: job.unit, goodQty: 0, defectQty: 0, inboundQty: 0 })
        const total = totals.get(job.unit)
        if (event.type === 'report') {
            for (const field of ['goodQty', 'defectQty', 'workHours']) row[field] = plus(row[field], event[field])
            total.goodQty = plus(total.goodQty, event.goodQty); total.defectQty = plus(total.defectQty, event.defectQty); workHours = plus(workHours, event.workHours)
        } else { row.inboundQty = plus(row.inboundQty, event.qty); total.inboundQty = plus(total.inboundQty, event.qty) }
    }
    return { rows: [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date) || a.batchNo.localeCompare(b.batchNo)), totals: [...totals.values()], workHours }
}

/** 工作台显示真实状态计数与当日排班，操作范围由服务端确定。 */
async function dashboard(db, profile, input) {
    const day = date(input.date)
    const jobs = await all(db, collection('jobs'), where(db, profile, 'jobs'), 2000)
    const schedules = await all(db, collection('schedules'), and(db, where(db, profile, 'schedules'), { date: day, enabled: db.command.neq(false) }), 2000)
    const exceptions = await all(db, collection('exceptions'), and(db, where(db, profile, 'exceptions'), { status: 'open' }), 2000)
    const pending = await db.collection(collection('handovers')).where(and(db, where(db, profile, 'handovers'), { status: 'submitted' })).count()
    const current = jobs.filter(row => row.plannedDate === day || ['running', 'paused'].includes(row.state))
    return { date: day, counts: { jobs: current.length, running: current.filter(row => row.state === 'running').length, completed: current.filter(row => row.state === 'completed').length, openExceptions: exceptions.length, pendingHandovers: pending.total || 0 }, jobs: current.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5), schedules: schedules.slice(0, 5), exceptions: exceptions.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5) }
}

module.exports = { report, dashboard }

'use strict'
/**
 * MES 原生化（P3-B 第 6 模块）：操作审计，从 mes-operations/reports.js 内迁。
 * 相对旧实现新增 dateFrom/dateTo 日期范围（backlog 收敛）：
 * - schedules / attendance 先按实体业务日期收窄，避免整表扫描触发 413；
 * - 其它类型按审计时间 at 过滤（本地日界：+08:00 当天 00:00 ~ 23:59:59.999）。
 */
const { ClientError } = require('./common')
const { collection, VERSIONS, all, and, text, date } = require('./shared')
const { where } = require('./scope')

const TYPES = ['workshops', 'teams', 'processes', 'shifts', 'personnel', 'resources', 'jobs', 'schedules', 'handovers', 'exceptions', 'attendance', 'claims']
const SCOPED_TYPES = ['jobs', 'schedules', 'handovers', 'exceptions', 'attendance']
const MAX_SPAN_DAYS = 366

/** 校验可选日期范围：闭区间、开始不晚于结束、最多 366 天。 */
function auditDateRange(input) {
    const from = input.dateFrom ? date(input.dateFrom, '开始日期') : ''
    const to = input.dateTo ? date(input.dateTo, '结束日期') : ''
    if (from && to) {
        if (from > to) throw new ClientError('开始日期不能晚于结束日期', 400)
        if ((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000 > MAX_SPAN_DAYS) throw new ClientError('日期范围最多 ' + MAX_SPAN_DAYS + ' 天，请缩小范围', 400)
    }
    return { from, to }
}

/** 审计记录时间过滤（at 为毫秒时间戳，按 +08:00 日界）。 */
function withinRange(record, range) {
    if (!range.from && !range.to) return true
    const at = Number(record.at) || 0
    const start = range.from ? Date.parse(range.from + 'T00:00:00+08:00') : -Infinity
    const end = range.to ? Date.parse(range.to + 'T23:59:59.999+08:00') : Infinity
    return at >= start && at <= end
}

/** 操作审计分页包含当前版本及已归档版本，仅主管或管理员可查阅。 */
async function audit(db, profile, input) {
    if (!profile.isAdmin && profile.scopeRole !== 'workshop_manager') throw new ClientError('仅主管或管理员可查阅操作审计', 403)
    const type = input.type || 'jobs'
    if (!TYPES.includes(type)) throw new ClientError('审计类型非法', 400)
    if (!profile.isAdmin && !SCOPED_TYPES.includes(type)) throw new ClientError('基础资料审计仅管理员可查看', 403)
    const range = auditDateRange(input)
    // 有业务日期的类型把日期条件下推到查询里，避免 all() 先在整表上限触发 413。
    // 注意：不能先 all() 再 filter——那样 1000 条上限会先生效，日期范围就失效了。
    const dated = type === 'schedules' || type === 'attendance'
    const dateCondition = range.from && range.to
        ? { date: db.command.gte(range.from).and(db.command.lte(range.to)) }
        : range.from ? { date: db.command.gte(range.from) } : range.to ? { date: db.command.lte(range.to) } : {}
    const query = dated && (range.from || range.to) ? and(db, where(db, profile, type), dateCondition) : where(db, profile, type)
    const current = await all(db, collection(type), query, 1000)
    const selected = input.keyword ? current.filter(row => JSON.stringify([row.name, row.batchNo, row.personName, row.authorName, row.productName]).includes(text(input.keyword, 80))) : current
    // 版本按实体分批预取（每批 200 个 id），避免逐行查询；版本上限与结果上限保持一致。
    const versionsByEntity = new Map()
    for (let offset = 0; offset < selected.length; offset += 200) {
        const ids = selected.slice(offset, offset + 200).map(row => row._id)
        const versions = await all(db, VERSIONS, { entityId: db.command.in(ids) }, 4000)
        for (const version of versions) {
            if (!versionsByEntity.has(version.entityId)) versionsByEntity.set(version.entityId, [])
            versionsByEntity.get(version.entityId).push(version)
        }
    }
    const records = []
    for (const row of selected) {
        const versions = (versionsByEntity.get(row._id) || []).filter(item => item.version < row.version)
        for (const snapshot of [...versions.map(item => item.snapshot), row]) if (snapshot && snapshot.audit) records.push({ _id: row._id + ':' + snapshot.version, entityId: row._id, entityType: type, label: row.name || row.batchNo || row.personName || row.authorName || row._id, ...snapshot.audit })
        if (records.length > 4000) throw new ClientError('审计记录过多，请按日期范围或关键字缩小范围', 413)
    }
    // 业务日期类型（schedules/attendance）的日期范围表示业务日，已下推到查询；
    // 不能再按审计时间 at 过滤（导入时间晚于业务日），否则结果恒为空。
    const filterByAuditTime = !(dated && (range.from || range.to))
    const filtered = range.from || range.to ? records.filter(record => (filterByAuditTime ? withinRange(record, range) : true)) : records
    filtered.sort((a, b) => b.at - a.at)
    const page = Math.max(1, Math.floor(Number(input.page) || 1)), pageSize = Math.min(50, Math.max(1, Math.floor(Number(input.pageSize) || 20)))
    return { list: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, from: range.from, to: range.to }
}

module.exports = { audit, auditDateRange, withinRange, MAX_SPAN_DAYS }

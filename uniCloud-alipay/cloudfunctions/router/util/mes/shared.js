'use strict'
/**
 * MES 原生化（P3-B）：只读模块需要的共享 helper，从 mes-operations/shared.js 内迁。
 * 当前只搬了 bootstrap / 列表 / 月历用到的部分；写模块（版本 CAS、租约、审计）在下一阶段再搬。
 */
const { ClientError } = require('./common')
const { text } = require('./trace')

const TYPES = ['workshops', 'processes', 'shifts', 'personnel', 'resources']
const MAX_READ = 4000
const VERSIONS = 'mes_ops_versions'

/** 只允许模块维护的集合类型，避免客户端指定任意集合。 */
function collection(type) {
    const allowed = [...TYPES, 'teams', 'schedules', 'jobs', 'handovers', 'exceptions', 'attendance', 'claims']
    if (!allowed.includes(type)) throw new ClientError('资料类型非法', 400)
    return 'mes_ops_' + type
}

/** 校验长度有限的实际标识，拒绝对象和模糊匹配。 */
function identifier(value, label = '记录标识', required = true) {
    if (typeof value !== 'string' || !value.trim() || value.length > 220) {
        if (!required && (value == null || value === '')) return ''
        throw new ClientError(label + '缺失或非法', 400)
    }
    return value.trim()
}

/** 校验真实公历日期，原始业务日期不接受宽松转换。 */
function date(value, label = '日期') {
    const valueText = text(value, 20)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText)) throw new ClientError(label + '须为 YYYY-MM-DD', 400)
    const instant = new Date(valueText + 'T00:00:00Z')
    if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 10) !== valueText) throw new ClientError(label + '不是有效日期', 400)
    return valueText
}

/** 查询主键记录，数据不存在时给出可处理的业务错误。 */
async function get(db, type, id, required = true) {
    const rows = (await db.collection(collection(type)).doc(identifier(id)).get()).data || []
    if (!rows[0] && required) throw new ClientError('记录不存在，请刷新', 404)
    return rows[0] || null
}

/** 有上限地读取完整结果；超限明确报错，不把截断当作完整汇总。 */
async function all(db, name, where = {}, maximum = MAX_READ, orderField = '_id') {
    const result = []
    for (let offset = 0; offset <= maximum; offset += 200) {
        let query = db.collection(name).where(where).orderBy(orderField, 'asc')
        if (orderField !== '_id') query = query.orderBy('_id', 'asc')
        const page = (await query.skip(offset).limit(Math.min(200, maximum + 1 - offset)).get()).data || []
        result.push(...page)
        if (result.length > maximum) throw new ClientError('结果过多，请缩小日期范围或筛选条件后重试', 413)
        if (page.length < Math.min(200, maximum + 1 - offset)) break
    }
    return result
}

/** 累计数字限制精度，避免浮点误差逐次放大（与 mes-operations 一致）。 */
function plus(left, right) {
    return Math.round((Number(left || 0) + Number(right || 0)) * 1000000) / 1000000
}

/** 集合查询条件只由服务端组装，独立条件使用 AND 组合。 */
function and(db, ...conditions) {
    const values = conditions.filter(value => value && Object.keys(value).length)
    return values.length > 1 ? db.command.and(values) : values[0] || {}
}

/** 保留分页元信息，关键字按字面量匹配，权限条件始终参与查询。 */
async function list(db, type, event, scope = {}, fields = ['name'], filters = {}) {
    const page = Math.max(1, Math.floor(Number(event.page) || 1))
    const pageSize = Math.max(1, Math.min(50, Math.floor(Number(event.pageSize) || 20)))
    const keyword = text(event.keyword, 80)
    const search = keyword ? db.command.or(fields.map(field => ({ [field]: db.RegExp({ regexp: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' }) }))) : {}
    const where = and(db, scope, filters, search)
    const coll = db.collection(collection(type))
    const counted = await coll.where(where).count()
    const rows = (await coll.where(where).orderBy('updatedAt', 'desc').orderBy('_id', 'asc').skip((page - 1) * pageSize).limit(pageSize).get()).data || []
    return { list: rows, total: counted.total || 0, page, pageSize }
}

/** 读取某条记录的完整版本历史（归档快照 + 当前记录），按版本升序。 */
async function history(db, type, record) {
    const archived = await all(db, VERSIONS, { entityId: record._id, version: db.command.lt(record.version) }, 2000, 'version')
    return [...archived.map(item => item.snapshot).filter(Boolean), record].sort((left, right) => left.version - right.version)
}

module.exports = { TYPES, MAX_READ, VERSIONS, collection, identifier, date, text, get, all, and, list, plus, history }

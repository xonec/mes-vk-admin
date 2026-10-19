'use strict'
/**
 * MES 原生化（P3-B）：排班只读查询（listSchedules），从 mes-operations/schedules.js 内迁。
 * 相对旧版新增 processId / shiftId 服务端筛选（backlog 收敛，旧接口不认识这两个参数，回退时自动忽略）。
 */
const { ClientError } = require('./common')
const { identifier, date, list, and } = require('./shared')
const { where } = require('./scope')

/** 日期筛选区间为闭区间，有需要完整汇总时额外限制天数。 */
function dateRange(db, input, required = false, maximumDays = 366) {
    if (required && (!input.dateFrom || !input.dateTo)) throw new ClientError('请填写开始和结束日期', 400)
    const from = input.dateFrom ? date(input.dateFrom, '开始日期') : ''
    const to = input.dateTo ? date(input.dateTo, '结束日期') : ''
    if (from && to && (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 >= maximumDays)) throw new ClientError('日期范围须为最多 ' + maximumDays + ' 天，且开始不晚于结束', 400)
    // 组合式 AND 与旧实现的链式 .and() 等价，同时兼容只实现组合命令的测试/驱动层。
    const condition = from && to ? db.command.and([{ date: db.command.gte(from) }, { date: db.command.lte(to) }]) : from ? { date: db.command.gte(from) } : to ? { date: db.command.lte(to) } : {}
    return { from, to, condition }
}

/** 分页排班查询按照实际权限和日期范围筛选；工序/班次为服务端精确筛选。 */
async function listSchedules(db, profile, input) {
    const range = dateRange(db, input)
    const extra = {}
    if (input.processId) extra.processId = identifier(input.processId, '工序')
    if (input.shiftId) extra.shiftId = identifier(input.shiftId, '班次')
    const enabled = input.includeDisabled && profile.isAdmin ? {} : { enabled: db.command.neq(false) }
    return list(db, 'schedules', input, where(db, profile, 'schedules'), ['personName', 'processName', 'workshopName', 'batchNos'], and(db, range.condition, enabled, extra))
}

module.exports = { dateRange, listSchedules }

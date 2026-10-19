'use strict'
/**
 * MES 原生化（P3-B 第 5 模块）：交接班/异常只读，从 mes-operations/handovers.js 内迁。
 * 范围：listHandovers / getHandover / listExceptions；写操作留到写模块阶段。
 */
const { ClientError } = require('./common')
const { identifier, get, list } = require('./shared')
const { where, visible } = require('./scope')
const { dateRange } = require('./schedules-read')

/** 交班列表遵循车间权限，操作员仅见本人交班和待本人接班。 */
async function listHandovers(db, profile, input) {
    if (input.status && !['draft', 'submitted', 'received'].includes(input.status)) throw new ClientError('交班状态非法', 400)
    const range = dateRange(db, input)
    const filters = { ...range.condition, ...(input.status ? { status: input.status } : {}) }
    return list(db, 'handovers', input, where(db, profile, 'handovers'), ['authorName', 'receiverName', 'processName', 'batchNos'], filters)
}

/** 交班详情读取同样校验实际车间和作者、接收人范围。 */
async function getHandover(db, profile, input) {
    return visible(profile, 'handovers', await get(db, 'handovers', identifier(input.id)))
}

/** 异常列表仅查询可见工单范围内的实际异常。 */
async function listExceptions(db, profile, input) {
    if (input.status && !['open', 'resolved'].includes(input.status)) throw new ClientError('异常状态非法', 400)
    return list(db, 'exceptions', input, where(db, profile, 'exceptions'), ['batchNo', 'productName', 'category', 'description'], { enabled: db.command.neq(false), ...(input.status ? { status: input.status } : {}) })
}

module.exports = { listHandovers, getHandover, listExceptions }

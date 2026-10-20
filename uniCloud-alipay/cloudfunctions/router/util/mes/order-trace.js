'use strict'
/**
 * MES 原生化（P3-B2）：按完整批号读取订单（从 mes-document-store/order-trace 内迁）。
 * 排班（P3-B1）与派工（P3-B2）共用；行为与旧实现一致：不截断、不猜测、多单冲突 409。
 */
const { ClientError } = require('./common')
const { batchIsValid } = require('./rules')
const { text } = require('./shared')

/** 与 mes-document-store/order-trace.getOrderByBatch 一致：按完整批号取订单，不截断不猜测。 */
async function getOrderByBatch(db, batchNo) {
    const code = text(batchNo, 40).toUpperCase()
    if (!batchIsValid(code)) throw new ClientError('批号须为11 位字母数字或其后的 B 单后缀', 400)
    const rows = (await db.collection('production_orders').where({ batchNo: code }).limit(2).get()).data || []
    if (rows.length > 1) throw new ClientError('此批号关联多个早期订单，请管理员先核对', 409)
    return rows[0] || null
}

module.exports = { getOrderByBatch }

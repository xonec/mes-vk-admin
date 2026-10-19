'use strict'
/** MES 原生化（P3-B）：从 mes-document-store/trace-fields 内迁的只读小工具。 */

/** 有界文本保留空值，不用猜测值替代缺失数据。 */
function text(value, max = 500) {
    return value == null ? '' : String(value).trim().slice(0, max)
}

/** 服务端记录实际操作人显示名，仅读取姓名字段。 */
async function actorName(db, uid) {
    const user = ((await db.collection('uni-id-users').doc(uid).field({ nickname: true, username: true }).get()).data || [])[0] || {}
    return text(user.nickname || user.username || uid, 120)
}

module.exports = { text, actorName }

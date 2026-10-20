'use strict'
/**
 * P3-B1：从 mes-document-store（index.js / source-store.js / trace-fields.js）内迁的写路径基建。
 * 1:1 复制 saveVersioned / addImmutable / duplicate / stableKey / updatedCount / changes，
 * 行为、错误码、错误文案必须与旧公共模块一致（双跑 diff=0 验收）。
 */
const { ClientError } = require('./common')

/** 获取云数据库条件更新的实际写入数（兼容各厂商返回形状）。 */
function updatedCount(result) {
    for (const r of [result, result && result.result, result && result.res, result && result.stats, result && result.data]) {
        if (r && typeof r.updated === 'number') return r.updated
        if (r && typeof r.affectedDocs === 'number') return r.affectedDocs
    }
    throw new Error('数据库未返回更新计数')
}

/**
 * 更新载荷归一：顶层字段值为对象/数组时用 `db.command.set(...)` 整体赋值。
 * 原因：支付宝云 SDK 会把嵌套对象展开成点路径（`$set {"conflict.detectedAt": ...}`），
 * 目标字段历史值为 `null` 时 Mongo 报 100104「Cannot create field in element {conflict: null}」；
 * 整体赋值可覆盖 null→对象/数组、旧数组、嵌套对象等全部场景。
 * `db.command.set` 不存在时回退原写法（兼容其它环境/测试驱动）。
 * 标量与 null 保持原样（null→对象由对象侧的 set 处理；对象→null 仍是标量赋值，安全）。
 */
function literalUpdate(db, data) {
    const set = db && db.command && db.command.set
    if (typeof set !== 'function') return data
    const out = {}
    for (const key of Object.keys(data)) {
        const value = data[key]
        out[key] = value && typeof value === 'object' ? set(value) : value
    }
    return out
}

/** 以稳定键序比较业务内容，忽略服务端版本和审计字段。 */
function stableKey(value) {
    if (Array.isArray(value)) return '[' + value.map(stableKey).join(',') + ']'
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableKey(value[key])).join(',') + '}'
    return JSON.stringify(value == null ? null : value)
}

/** 判断数据库主键重复；其他错误必须继续上抛。 */
function duplicate(error) { return /duplicate|already.*exist|document.*exist|重复|已存在|E11000/i.test(String(error && (error.message || error.errMsg) || error)) }

/** 只通过新增写入不可变记录，重复主键时读取已存在记录。 */
async function addImmutable(db, collection, document) {
    try { await db.collection(collection).add(document); return document }
    catch (error) { if (!duplicate(error)) throw error }
    const rows = (await db.collection(collection).doc(document._id).get()).data || []
    if (!rows[0]) throw new ClientError('来源记录暂时无法保存，请重试', 503)
    return rows[0]
}

/** 固定主键写入；版本条件保证并发修改不会覆盖已确认之后的新数据。 */
async function saveVersioned(db, options) {
    const { collection, versions, id, key, record, uid, expectedVersion, signature = stableKey } = options
    if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) throw new ClientError('版本号非法', 400)
    for (let attempt = 0; attempt < 4; attempt++) {
        // 批量导入已经预取到当前记录，首次尝试不再重复读取；重试仍回源，保证并发下的版本正确。
        const old = attempt === 0 && options.current !== undefined ? options.current : ((await db.collection(collection).doc(id).get()).data || [])[0] || null
        const previousVersion = old ? Number(old.version) || 1 : 0
        if (expectedVersion !== undefined && expectedVersion !== previousVersion) throw new ClientError('数据已被修改，请重新加载并核对后保存', 409)
        if (options.authorizeChange) options.authorizeChange(old, record)
        if (old && signature(old) === signature(record)) return { _id: id, version: previousVersion, unchanged: true }
        const version = previousVersion + 1
        const data = { ...record, version, updatedAt: Date.now(), updatedBy: uid,
            ...(options.audit ? { audit: options.audit(old, version) } : {}) }
        if (!old) {
            try {
                await db.collection(collection).add({ ...data, _id: id })
                return { _id: id, version, unchanged: false, record: { ...data, _id: id } }
            } catch (error) {
                if (!/duplicate|exist|already/i.test(String(error.message || error.errMsg || error))) throw error
                if (expectedVersion !== undefined) throw new ClientError('此编码已存在，请重新加载并核对后保存', 409)
                continue
            }
        }
        // 快照失败即终止；只有历史安全落库后才允许修改主记录。
        const archived = await addImmutable(db, versions, { _id: 'ver:' + key + ':' + previousVersion,
            [options.keyField]: key,
            version: previousVersion,
            savedAt: new Date(old.updatedAt || old.savedAt || Date.now()).toISOString(),
            updatedBy: old.updatedBy || old.savedBy || '',
            snapshot: old
        })
        if (stableKey(archived.snapshot) !== stableKey(old)) throw new ClientError('历史版本与当前记录不一致，请重新加载后核对', 409)
        const where = { _id: id, version: old.version === undefined ? db.command.exists(false) : old.version }
        if (updatedCount(await db.collection(collection).where(where).update(literalUpdate(db, data)))) return { _id: id, version, unchanged: false, record: { ...data, _id: id } }
        if (expectedVersion !== undefined) throw new ClientError('数据已被修改，请重新加载并核对后保存', 409)
    }
    throw new ClientError('并发保存冲突，请稍后重试', 409)
}

/** 对已保存的业务字段生成逐字段差异（与旧 trace-fields.changes 一致）。 */
function changes(before, after, stableKeyFn) {
    return Object.keys(after).filter(key => !['audit', 'updatedAt', 'updatedBy', 'version', '_id', 'changeReason'].includes(key) && stableKeyFn(before && before[key]) !== stableKeyFn(after[key]))
        .map(field => ({ field, before: before && before[field] !== undefined ? before[field] : null, after: after[field] === undefined ? null : after[field] }))
}

module.exports = { updatedCount, stableKey, duplicate, addImmutable, saveVersioned, changes, literalUpdate }

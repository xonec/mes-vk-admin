'use strict'
/**
 * P3-C1：从 mes-operations/schedules.js 内迁批量导入写入 importSchedules（1:1）。
 * 一次请求最多 200 行：预取缓存 → 逐行 native saveSchedule（importMeta 幂等签名）→
 * 人员租约按人复用 → 每人员每日只重算一次考勤。
 * 本 action 为 NATIVE_ONLY：router→旧下游函数有 10s 硬超时，导入链路不走 forward。
 */
const { ClientError } = require('./common')
const { admin } = require('./scope')
const { createImportCache } = require('./import-cache')
const { saveSchedule } = require('./schedules-write')
const { syncPersonAttendance } = require('./attendance-sync')
const { digest, digestText, identifier, date, expectedVersion, requestId, all, get, stableKey, acquireScheduleLock } = require('./shared')

/** 预取本次导入涉及的人员/日期考勤，供每日一次同步直接复用；超限时回退逐人查询。 */
async function prefetchAttendance(db, cache, keys) {
    const result = new Map()
    if (!keys.length) return result
    const pairs = keys.map(item => { const separator = item.indexOf('\u0000'); return { key: item, personId: item.slice(0, separator), date: item.slice(separator + 1) } })
    const buckets = new Map(pairs.map(pair => [pair.key, { schedules: null, manual: [], existing: [], byId: new Map() }]))
    const personIds = [...new Set(pairs.map(pair => pair.personId))]
    const dates = pairs.map(pair => pair.date).sort()
    let rows = []
    try {
        rows = await all(db, 'mes_ops_attendance', { personId: db.command.in(personIds), date: db.command.gte(dates[0]).and(db.command.lte(dates[dates.length - 1])) }, 4000)
    } catch (error) { if (!(error && error.code === 413)) throw error; return result }
    for (const row of rows) {
        const bucket = buckets.get(row.personId + '\u0000' + row.date)
        if (!bucket) continue
        bucket.byId.set(row._id, row)
        if (row.source === 'schedule') bucket.existing.push(row)
        else if (row.source === 'manual') bucket.manual.push(row)
    }
    for (const pair of pairs) {
        const window = cache.personSchedules(pair.personId)
        if (!window) continue
        const bucket = buckets.get(pair.key)
        bucket.schedules = window.filter(row => row.date === pair.date)
        result.set(pair.key, bucket)
    }
    return result
}

/** 批量导入逐行反馈，重试沿用同一请求标识，不隐藏部分成功。 */
async function importSchedules(db, profile, input) {
    if (!Array.isArray(input.rows) || !input.rows.length || input.rows.length > 200) throw new ClientError('一次导入须为 1～200 行', 400)
    const id = requestId(input.requestId)
    const sessionId = input.sessionId ? requestId(input.sessionId) : id
    const replacement = input.replacePrevious || []
    if (!Array.isArray(replacement) || replacement.length > 2000) throw new ClientError('完整表旧排班快照格式不正确', 400)
    if (replacement.length) admin(profile)
    for (const row of replacement) { identifier(row.id); expectedVersion(row.version) }
    // 一次预取：目录资料、已有排班、人员排班窗口、批次订单都只查询一次；租约按人复用，考勤按人员/日期收敛。
    const batch = { cache: await createImportCache(db, { rows: input.rows }), locks: new Map(), attendance: new Set() }
    // 同一请求内旧排班快照相同，按原摘要口径预计算一次，避免逐行序列化大数组。
    const replacementKey = stableKey(replacement), sessionKey = stableKey(sessionId)
    const results = []
    try {
        for (let index = 0; index < input.rows.length; index++) {
            const source = input.rows[index] || {}
            try {
                const meta = { requestId: id, row: index + 1, signature: digestText('{"replacement":' + replacementKey + ',"sessionId":' + sessionKey + ',"source":' + stableKey(source) + '}'), actorId: profile.uid, sessionId }
                const rest = source.kind === 'rest'
                const generated = 'schedule:' + digest([date(source.date), identifier(source.shiftId, '班次', !rest), identifier(source.processId, '工序', !rest), identifier(source.personId), source.kind || 'work'])
                const old = await cachedSchedule(db, batch.cache, source._id || generated)
                // 已有排班只能在传入当前版本后修改，不能由导入悄悄覆盖。
                const version = source.expectedVersion !== undefined ? source.expectedVersion : old && old.importMeta && old.importMeta.requestId === id && old.importMeta.row === index + 1 ? old.version : 0
                const record = await saveSchedule(db, profile, { record: source, expectedVersion: version }, meta, replacement, batch)
                results.push({ row: index + 1, ok: true, record })
            } catch (error) {
                if (!(error instanceof ClientError)) throw error
                results.push({ row: index + 1, ok: false, message: error.message, code: error.code })
            }
        }
        // 同一人员同一生产日的多道工序只重算一次考勤，结果与逐行同步一致。
        const preloads = await prefetchAttendance(db, batch.cache, [...batch.attendance])
        for (const item of batch.attendance) {
            const separator = item.indexOf('\u0000')
            const personId = item.slice(0, separator), productionDate = item.slice(separator + 1)
            if (!batch.locks.has(personId)) batch.locks.set(personId, await acquireScheduleLock(db, personId))
            await syncPersonAttendance(db, profile, personId, productionDate, preloads.get(item) || null)
        }
    } finally {
        for (const release of batch.locks.values()) await release()
    }
    const successCount = results.filter(result => result.ok).length
    return { results, successCount, failureCount: results.length - successCount }
}

/** 预取命中时读取已有排班；未命中回退单条读取（与 saveSchedule 内部同口径）。 */
async function cachedSchedule(db, cache, id) {
    const found = cache ? cache.schedule(id) : { hit: false }
    if (found.hit) return found.record
    return get(db, 'schedules', id, false)
}

module.exports = { importSchedules, prefetchAttendance, cachedSchedule }

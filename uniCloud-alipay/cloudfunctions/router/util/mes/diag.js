'use strict'
/**
 * P3-B3 诊断工具（临时，admin-only，不参与灰度开关）：
 * - syncPerson：对指定人员/日期直接调用 native `syncPersonAttendance`，**原样吐出**异常
 *   （name/message/stack/errCode/detail），用于定位「排班保存后考勤同步 500」的真实错误；
 * - inspect（别名 old-shift-row）：只读查看某人员某天的考勤行、排班、版本、人员锁，便于与日志对照。
 * 注意：本入口只做诊断/复核，不是业务路径；根因定性、修复完成后应移除或下线。
 */
const { ClientError } = require('./common')
const { identifier, date, all, collection, digest } = require('./shared')
const { syncPersonAttendance } = require('./attendance-sync')

const MAX_RANGE_DAYS = 31

/** 错误对象可序列化的附加属性（DB 错误常带 errCode/errMsg/requestId）。 */
function safeDetail(error) {
    try {
        const out = {}
        for (const key of Object.keys(error || {})) {
            if (['stack', 'message', 'name'].indexOf(key) >= 0) continue
            const value = error[key]
            out[key] = value && typeof value === 'object' ? JSON.stringify(value).slice(0, 500) : value
        }
        return JSON.stringify(out).slice(0, 2000)
    } catch (_) {
        return ''
    }
}

/** 统一异常形状：给诊断调用方看真实 name/message/stack/errCode，而不是被 dispatch 吞成 500。 */
function describeError(error, extra) {
    return {
        code: 900,
        name: (error && error.name) || 'Error',
        message: (error && (error.message || error.errMsg)) || String(error),
        stack: String((error && error.stack) || '').slice(0, 4000),
        errCode: error && (error.errCode !== undefined ? error.errCode : error.code),
        detail: safeDetail(error),
        ...(extra || {}),
    }
}

async function attendanceRows(db, personId, day) {
    return (await db.collection(collection('attendance')).where({ personId, date: day }).limit(100).get()).data || []
}

/** 逐日调用 native 考勤同步，异常原样返回（含出错日期与已完成日期）。 */
async function syncPerson(db, profile, input) {
    const personId = identifier(input.personId, '人员')
    let dates = []
    if (input.date) {
        dates = [date(input.date, '日期')]
    } else {
        if (!input.dateFrom || !input.dateTo) throw new ClientError('请提供 date 或 dateFrom/dateTo', 400)
        const from = date(input.dateFrom, '开始日期'), to = date(input.dateTo, '结束日期')
        if (from > to) throw new ClientError('开始日期不能晚于结束日期', 400)
        if ((Date.parse(to) - Date.parse(from)) / 86400000 > MAX_RANGE_DAYS) throw new ClientError('诊断日期范围最多 ' + MAX_RANGE_DAYS + ' 天', 400)
        for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) dates.push(new Date(t).toISOString().slice(0, 10))
    }
    const results = []
    for (const day of dates) {
        try {
            await syncPersonAttendance(db, profile, personId, day)
        } catch (error) {
            return describeError(error, { personId, date: day, previous: results })
        }
        const rows = await attendanceRows(db, personId, day)
        results.push({
            date: day,
            attendance: rows.map(row => ({
                _id: row._id, version: row.version, kind: row.kind, source: row.source,
                sourceShiftId: row.sourceShiftId, edited: row.edited,
                conflict: row.conflict ? { retainedShiftId: (row.conflict.retained || {}).shiftId, incomingShiftId: (row.conflict.incoming || {}).shiftId } : null,
                scheduleRemoved: row.scheduleRemoved,
            })),
        })
    }
    return { personId, dates, results }
}

/** 只读检查：某人员某天的考勤行、排班、版本归档与人员锁，用于与异常日志对照。 */
async function inspect(db, input) {
    const personId = identifier(input.personId, '人员')
    const day = date(input.date, '日期')
    const attendance = await all(db, collection('attendance'), { personId, date: day }, 500)
    const schedules = await all(db, collection('schedules'), { personId, date: day }, 500)
    const scheduleIds = schedules.map(row => row._id)
    let scheduleVersions = []
    if (scheduleIds.length) {
        try {
            scheduleVersions = ((await db.collection('mes_ops_versions').where({ entityId: db.command.in(scheduleIds) }).limit(100).get()).data || []).map(row => ({
                _id: row._id, entityId: row.entityId, version: row.version, savedAt: row.savedAt,
                shiftId: row.snapshot && row.snapshot.shiftId, snapshotVersion: row.snapshot && row.snapshot.version,
            }))
        } catch (error) {
            scheduleVersions = [{ error: String(error && (error.message || error.errMsg)) }]
        }
    }
    const lockId = 'schedule-person:' + digest(personId)
    let lock = null
    try {
        lock = ((await db.collection('mes_ops_locks').doc(lockId).get()).data || [])[0] || null
    } catch (error) {
        lock = { error: String(error && (error.message || error.errMsg)) }
    }
    return {
        personId,
        date: day,
        attendance: attendance.map(row => ({
            _id: row._id, version: row.version, kind: row.kind, source: row.source,
            sourceShiftId: row.sourceShiftId, sourceSignature: row.sourceSignature, edited: row.edited,
            conflict: row.conflict || null, scheduleRemoved: row.scheduleRemoved,
            startTime: row.startTime, endTime: row.endTime, startDayOffset: row.startDayOffset, endDayOffset: row.endDayOffset,
            plannedHours: row.plannedHours, processIds: row.processIds, note: row.note,
            audit: row.audit, event: row.event,
        })),
        schedules: schedules.map(row => ({
            _id: row._id, version: row.version, shiftId: row.shiftId, shiftName: row.shiftName,
            startTime: row.startTime, endTime: row.endTime, startDayOffset: row.startDayOffset, endDayOffset: row.endDayOffset,
            processId: row.processId, enabled: row.enabled, note: row.note, audit: row.audit,
        })),
        scheduleVersions,
        lock: lock ? { _id: lock._id, owner: lock.owner, expiresAt: lock.expiresAt } : null,
    }
}

/** 这些字段在本组 TEST 行上做实验；示例 conflict 与真实结构一致。 */
const SAMPLE_CONFLICT = {
    retained: { kind: 'work', absenceType: '', date: '2026-10-22', shiftId: 'ops:shifts:E8', processIds: [], startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0 },
    incoming: { kind: 'work', absenceType: '', date: '2026-10-22', shiftId: 'ops:shifts:N8', processIds: [], startTime: '00:00', endTime: '08:00', startDayOffset: 1, endDayOffset: 1 },
    detectedAt: Date.now(),
    previousVersion: 1,
}

/**
 * 写入形式探针（临时，只允许 TEST 行 attendance、2026-10-22）：
 * 对照「null→对象」在支付宝云 SDK 下的各种写法的可行性，实验后恢复原 conflict 值（version 不变）。
 * 返回每个 form 的 {ok,name,message,errCode,updated,state}，供选择修复方案。
 */
async function writeProbe(db, input) {
    const id = identifier(input.id, '考勤记录')
    if (id.indexOf('attendance:') !== 0) throw new ClientError('写入探针仅允许 attendance 记录', 400)
    const rows = (await db.collection(collection('attendance')).doc(id).get()).data || []
    const row = rows[0]
    if (!row) throw new ClientError('记录不存在', 404)
    if (row.date !== '2026-10-22') throw new ClientError('写入探针仅允许 2026-10-22 的 TEST 行', 400)
    const original = JSON.parse(JSON.stringify(row))
    const results = []
    const attempt = async (form, fn) => {
        try { results.push({ form, ok: true, ...(await fn()) }) }
        catch (error) { results.push({ form, ok: false, name: (error && error.name) || 'Error', message: (error && (error.message || error.errMsg)) || String(error), errCode: error && (error.errCode !== undefined ? error.errCode : error.code), detail: safeDetail(error).slice(0, 500) }) }
    }
    const coll = () => db.collection(collection('attendance'))
    const restore = async () => {
        try { await coll().doc(id).update({ conflict: original.conflict }); return true }
        catch (_) { try { await coll().doc(id).set(original); return true } catch (__) { return false } }
    }
    const state = async () => {
        const current = ((await coll().doc(id).get()).data || [])[0] || {}
        return { conflict: current.conflict === undefined ? '<undefined>' : current.conflict, edited: current.edited, version: current.version }
    }
    const updatedOf = res => (res && (res.updated !== undefined ? res.updated : (res.affectedDocs !== undefined ? res.affectedDocs : (res.result && res.result.updated)))) 
    const setCommand = db.command && db.command.set
    try {
        // A：对照 —— 直接对 null 字段写嵌套对象（预期 100104）
        await restore()
        await attempt('A-plain-null-to-object', async () => {
            const res = await coll().where({ _id: id, version: original.version }).update({ conflict: SAMPLE_CONFLICT })
            return { updated: updatedOf(res), state: await state() }
        })
        await restore()
        // B：两步 —— 先写 {}，再写子字段
        await attempt('B-two-step-empty-then-fields', async () => {
            const first = await coll().where({ _id: id }).update({ conflict: {} })
            const second = await coll().where({ _id: id }).update({ conflict: SAMPLE_CONFLICT })
            return { firstUpdated: updatedOf(first), secondUpdated: updatedOf(second), state: await state() }
        })
        await restore()
        // C：db.command.set 整体赋值（带版本 CAS 条件）
        await attempt('C-command-set-with-cas', async () => {
            if (typeof setCommand !== 'function') throw new ClientError('SDK 不支持 db.command.set', 400)
            const res = await coll().where({ _id: id, version: original.version }).update({ conflict: setCommand(SAMPLE_CONFLICT) })
            return { updated: updatedOf(res), state: await state() }
        })
        await restore()
        // C2：db.command.set 但版本不匹配（预期 updated=0，证明 CAS 可人工保证）
        await attempt('C2-command-set-wrong-version', async () => {
            if (typeof setCommand !== 'function') throw new ClientError('SDK 不支持 db.command.set', 400)
            const res = await coll().where({ _id: id, version: original.version + 99 }).update({ conflict: setCommand(SAMPLE_CONFLICT) })
            return { updated: updatedOf(res), state: await state() }
        })
        await restore()
        // D：doc(id).set 全量替换
        await attempt('D-doc-set-full-replace', async () => {
            const res = await coll().doc(id).set({ ...original, conflict: SAMPLE_CONFLICT })
            return { updated: updatedOf(res), state: await state() }
        })
        await restore()
        // E：command.set 与普通字段混合 + 版本条件
        await attempt('E-command-set-mixed-with-cas', async () => {
            if (typeof setCommand !== 'function') throw new ClientError('SDK 不支持 db.command.set', 400)
            const res = await coll().where({ _id: id, version: original.version }).update({ conflict: setCommand(SAMPLE_CONFLICT), edited: original.edited })
            return { updated: updatedOf(res), state: await state() }
        })
    } finally {
        const restored = await restore()
        results.push({ form: 'restore', ok: restored, state: await state() })
    }
    return { id, date: row.date, version: original.version, hadConflict: !!(original.conflict), results }
}

/** 默认只读抽查项：显式 null 字段（数据库层面判断，不依赖代码扫描）。 */
const MES_OPS_COLLECTIONS = ['workshops', 'processes', 'shifts', 'personnel', 'resources', 'teams', 'schedules', 'jobs', 'handovers', 'exceptions', 'attendance', 'claims']
const DEFAULT_DB_CHECKS = [
    { collection: 'mes_ops_attendance', field: 'conflict' },
    { collection: 'production_orders', field: 'pallet' },
    { collection: 'production_orders', field: 'materials' },
    { collection: 'production_orders', field: 'audit' },
    { collection: 'packaging_plans', field: 'pallet' },
    { collection: 'production_records', field: 'buckets' },
    ...MES_OPS_COLLECTIONS.map(type => ({ collection: 'mes_ops_' + type, field: 'audit' })),
]
const COLLECTION_RE = /^[A-Za-z0-9_]{1,60}$/
const FIELD_RE = /^[A-Za-z0-9_.]{1,120}$/

/** 单字段 null 统计：total / exists / nonNull / explicitNull / nullOrMissing + 样本 id。 */
async function countNullField(db, collection, field) {
    const coll = () => db.collection(collection)
    const out = { collection, field }
    try { out.total = (await coll().where({}).count()).total } catch (error) { return { ...out, error: 'total: ' + String(error && (error.message || error.errMsg)) } }
    try { out.exists = (await coll().where({ [field]: db.command.exists(true) }).count()).total } catch (error) { out.exists = null; out.existsError = String(error && (error.message || error.errMsg)) }
    try { out.nonNull = (await coll().where({ [field]: db.command.neq(null) }).count()).total } catch (error) { return { ...out, error: 'nonNull: ' + String(error && (error.message || error.errMsg)) } }
    out.nullOrMissing = out.total - out.nonNull
    out.explicitNull = out.exists === null ? null : out.exists - out.nonNull
    if (out.explicitNull) {
        try {
            const rows = (await coll().where({ [field]: db.command.exists(true) }).limit(200).get()).data || []
            out.samples = rows.filter(row => row[field] === null).slice(0, 5).map(row => row._id)
            if (out.samples.length < out.explicitNull && out.explicitNull > 200) out.samplesPartial = true
        } catch (error) { out.samplesError = String(error && (error.message || error.errMsg)) }
    }
    return out
}

/** 只读抽查多个字段；允许自定义 checks（受集合/字段白名单正则限制）。 */
async function dbCheck(db, input) {
    let checks = DEFAULT_DB_CHECKS
    if (Array.isArray(input.checks) && input.checks.length) {
        if (input.checks.length > 40) throw new ClientError('抽查项最多 40 个', 400)
        checks = input.checks.map(item => {
            const collection = String((item && item.collection) || '')
            const field = String((item && item.field) || '')
            if (!COLLECTION_RE.test(collection) || !FIELD_RE.test(field)) throw new ClientError('抽查集合/字段非法', 400)
            return { collection, field }
        })
    }
    const results = []
    for (const item of checks) results.push(await countNullField(db, item.collection, item.field))
    return { at: new Date().toISOString(), results }
}

module.exports = { syncPerson, inspect, writeProbe, dbCheck, describeError, safeDetail }

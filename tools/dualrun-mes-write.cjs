/**
 * P3-B1 写模块本地双跑：旧实现（mes-uniapp/common/mes-operations）vs native 实现（router/util/mes）。
 *
 * 用法：node tools/dualrun-mes-write.cjs
 * - 每个 case 建两份完全相同的内存 DB（fake DB），旧/新各跑一次；
 * - 归一化时间戳/随机租约字段后比较：① 响应 {code,message,data}；② 全库最终状态；
 * - 输出 diff 数；diff>0 退出码 1。
 *
 * 说明：写操作不做云端影子双跑，本脚本是写模块唯一的双跑入口。
 */
'use strict'
const path = require('node:path')
const Module = require('node:module')
const assert = require('node:assert/strict')

const ROOT = path.join(__dirname, '..')
const UNIAPP = path.join(ROOT, '../mes-uniapp/uniCloud-alipay/cloudfunctions')
const ROUTER = path.join(ROOT, 'uniCloud-alipay/cloudfunctions/router')

// ---- 让旧公共模块按 mes-uniapp 目录解析（与 mes-uniapp 现有单测同一套 stub 方式） ----
const resolve = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
    if (request === 'uni-id-common') return path.join(ROOT, 'tests/helpers/uni-id-common-stub.cjs')
    if (request === 'mes-common') return path.join(UNIAPP, 'common/mes-common/index.js')
    if (/^mes-document-store(?:\/|$)/.test(request)) {
        const suffix = request === 'mes-document-store' ? 'index.js' : request.slice('mes-document-store/'.length) + '.js'
        return path.join(UNIAPP, 'common/mes-document-store', suffix)
    }
    return resolve.call(this, request, ...args)
}

const { createWriteDb, IDS } = require(path.join(ROOT, 'tests/helpers/mes-write-fixture.cjs'))
const nativeScope = require(path.join(ROUTER, 'util/mes/scope.js'))
const nativeCatalogs = require(path.join(ROUTER, 'util/mes/catalogs-write.js'))
const nativeSchedules = require(path.join(ROUTER, 'util/mes/schedules-write.js'))
const oldScope = require(path.join(UNIAPP, 'common/mes-operations/scope.js'))
const oldCatalogs = require(path.join(UNIAPP, 'common/mes-operations/catalogs.js'))
const oldSchedules = require(path.join(UNIAPP, 'common/mes-operations/schedules.js'))

// 旧模块可能访问全局 uniCloud；具体 DB 由调用参数决定，这里只兜底。
global.uniCloud = global.uniCloud || { database: () => ({ command: {}, collection: () => ({}) }) }

/** 与旧 CLI 一样：直接调用模块函数，返回 {code,message,data} 或抛错归一。 */
async function run(fn, ...args) {
    try {
        const data = await fn(...args)
        return { code: 0, message: 'ok', data }
    } catch (error) {
        return { code: error.code || 500, message: error.message || String(error) }
    }
}

const TIME_KEYS = new Set(['updatedAt', 'savedAt', 'createdAt', 'at', 'detectedAt', 'expiresAt', 'updatedBy'])
const RANDOM_KEYS = new Set(['owner'])
/** 归一化时间戳/随机值，保留业务结构与版本。 */
function normalize(value) {
    if (Array.isArray(value)) return value.map(normalize)
    if (value && typeof value === 'object') {
        const out = {}
        for (const key of Object.keys(value).sort()) {
            if (TIME_KEYS.has(key)) continue
            if (RANDOM_KEYS.has(key)) { out[key] = 'RANDOM'; continue }
            if (key === 'requestId' && /^create:|^sync-|^remove-/.test(String(value[key] || ''))) { out[key] = 'DETERMINISTIC'; continue }
            out[key] = normalize(value[key])
        }
        return out
    }
    if (typeof value === 'number' && value > 1e12) return 'TIMESTAMP'
    return value
}
function dump(db) {
    const out = {}
    for (const [name, rows] of db.store) {
        out[name] = [...rows.entries()].map(([id, doc]) => ({ id, doc: normalize(doc) })).sort((a, b) => a.id.localeCompare(b.id))
    }
    return out
}
function diff(a, b) {
    try { assert.deepEqual(normalize(a), normalize(b)); return null }
    catch (error) { return error.message.slice(0, 1600) }
}

const WORK = over => ({ date: '2026-10-21', shiftId: IDS.shift, processId: IDS.process, personId: IDS.supPerson, kind: 'work', batchNos: [], ...over })
const REST = over => ({ date: '2026-10-21', kind: 'rest', personId: IDS.otherPerson, absenceType: 'rest', ...over })

const CASES = [
    { name: 'catalog 新建车间', setup: () => ({}), run: async (db, impl) => run(impl.catalog, db, (await impl.admin(db)), { type: 'workshops', expectedVersion: 0, record: { code: 'W1', name: '测试车间' } }) },
    { name: 'catalog 更新（版本+审计）', setup: (db) => { db.ensure('mes_ops_workshops').set('ops:workshops:W1', { _id: 'ops:workshops:W1', code: 'W1', name: '测试车间', enabled: true, version: 1 }) }, run: async (db, impl) => run(impl.catalog, db, (await impl.admin(db)), { type: 'workshops', expectedVersion: 1, record: { code: 'W1', name: '测试车间改', changeReason: '改名' } }) },
    { name: 'catalog 版本冲突 409', setup: (db) => { db.ensure('mes_ops_workshops').set('ops:workshops:W1', { _id: 'ops:workshops:W1', code: 'W1', name: '测试车间', enabled: true, version: 2 }) }, run: async (db, impl) => run(impl.catalog, db, (await impl.admin(db)), { type: 'workshops', expectedVersion: 1, record: { code: 'W1', name: 'x', changeReason: 'x' } }) },
    { name: 'catalog 人员绑定（唯一预留）', setup: (db) => { db.ensure('uni-id-users').set('u-new', { _id: 'u-new', status: 0, role: [] }) }, run: async (db, impl) => run(impl.catalog, db, (await impl.admin(db)), { type: 'personnel', expectedVersion: 0, record: { code: 'P-9', name: '新人员', workshopId: IDS.workshop, processIds: [IDS.process], scopeRole: 'operator', uid: 'u-new' } }) },
    { name: 'catalog 非管理员 403', run: async (db, impl) => run(impl.catalog, db, (await impl.sup(db)), { type: 'workshops', expectedVersion: 0, record: { code: 'W2', name: 'x' } }) },
    { name: 'schedule 新建出勤 + 考勤同步', run: async (db, impl) => run(impl.schedule, db, (await impl.sup(db)), { expectedVersion: 0, record: WORK() }) },
    { name: 'schedule 新建休息', run: async (db, impl) => run(impl.schedule, db, (await impl.sup(db)), { expectedVersion: 0, record: REST() }) },
    { name: 'schedule 批号关联 linked/pending', run: async (db, impl) => run(impl.schedule, db, (await impl.sup(db)), { expectedVersion: 0, record: WORK({ batchNos: ['TEST261020A', 'AP9Z26X9999'] }) }) },
    { name: 'schedule 时间重叠 409', setup: (db) => { db.ensure('mes_ops_schedules').set('schedule:existing', { _id: 'schedule:existing', date: '2026-10-21', shiftId: IDS.shift, processId: IDS.process, personId: IDS.supPerson, kind: 'work', startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, workshopId: IDS.workshop, enabled: true, version: 1 }); const shift = db.ensure('mes_ops_shifts').get(IDS.shiftNight); Object.assign(shift, { startTime: '15:00', endTime: '23:00', endDayOffset: 0 }) }, run: async (db, impl) => run(impl.schedule, db, (await impl.sup(db)), { expectedVersion: 0, record: WORK({ shiftId: IDS.shiftNight }) }) },
    { name: 'schedule 版本冲突 409', run: async (db, impl) => { const saved = await impl.schedule(db, (await impl.sup(db)), { expectedVersion: 0, record: WORK() }); return run(impl.schedule, db, (await impl.sup(db)), { expectedVersion: 0, record: WORK({ _id: saved._id, note: 'x', changeReason: 'x' }) }) } },
    { name: 'schedule 无原因修改 400', run: async (db, impl) => { const saved = await impl.schedule(db, (await impl.sup(db)), { expectedVersion: 0, record: WORK() }); return run(impl.schedule, db, (await impl.sup(db)), { expectedVersion: 1, record: WORK({ _id: saved._id, note: '改' }) }) } },
    { name: 'schedule 改日期 + 旧考勤归休息', run: async (db, impl) => { const saved = await impl.schedule(db, (await impl.sup(db)), { expectedVersion: 0, record: WORK() }); return run(impl.schedule, db, (await impl.sup(db)), { expectedVersion: 1, record: WORK({ _id: saved._id, date: '2026-10-22', changeReason: '改期' }) }) } },
    { name: 'schedule 停用 + 考勤归休息', run: async (db, impl) => { const saved = await impl.schedule(db, (await impl.sup(db)), { expectedVersion: 0, record: WORK() }); return run(impl.schedule, db, (await impl.sup(db)), { expectedVersion: 1, record: WORK({ _id: saved._id, enabled: false, changeReason: '停用' }) }) } },
    { name: 'schedule 非主管 403', run: async (db, impl) => run(impl.schedule, db, (await impl.operator(db)), { expectedVersion: 0, record: WORK({ personId: IDS.operatorPerson }) }) },
]

async function runCase(item) {
    const left = createWriteDb(); const right = createWriteDb()
    const oldImpl = { catalog: oldCatalogs.saveCatalog, schedule: oldSchedules.saveSchedule, admin: db => oldScope.profile(db, { uid: IDS.admin, role: ['admin'] }), sup: db => oldScope.profile(db, { uid: IDS.sup, role: [] }), operator: db => oldScope.profile(db, { uid: IDS.operator, role: [] }) }
    const newImpl = { catalog: nativeCatalogs.saveCatalog, schedule: nativeSchedules.saveSchedule, admin: db => nativeScope.profile(db, { uid: IDS.admin, role: ['admin'] }), sup: db => nativeScope.profile(db, { uid: IDS.sup, role: [] }), operator: db => nativeScope.profile(db, { uid: IDS.operator, role: [] }) }
    if (item.setup) { item.setup(left.db); item.setup(right.db) }
    const oldResult = await item.run(left.db, oldImpl)
    const newResult = await item.run(right.db, newImpl)
    const resultDiff = diff(oldResult, newResult)
    const dbDiff = diff(dump(left.db), dump(right.db))
    return { name: item.name, resultDiff, dbDiff }
}

;(async () => {
    let failed = 0
    for (const item of CASES) {
        const result = await runCase(item)
        if (result.resultDiff || result.dbDiff) {
            failed += 1
            console.error('✗ ' + item.name)
            if (result.resultDiff) console.error('  响应差异：' + result.resultDiff)
            if (result.dbDiff) console.error('  落库差异：' + result.dbDiff)
        } else {
            console.log('✓ ' + item.name)
        }
    }
    console.log('\ndualrun-mes-write: ' + (CASES.length - failed) + '/' + CASES.length + ' diff=0')
    process.exit(failed ? 1 : 0)
})().catch(error => { console.error(error); process.exit(1) })

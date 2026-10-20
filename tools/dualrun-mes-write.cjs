/**
 * P3-B1/B2 写模块本地双跑：旧实现（mes-uniapp/common/mes-operations）vs native 实现（router/util/mes）。
 * 覆盖 catalogs/schedules（B1）与 jobs/handovers/exceptions（B2）。
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
const nativeJobs = require(path.join(ROUTER, 'util/mes/jobs-write.js'))
const nativeHandovers = require(path.join(ROUTER, 'util/mes/handovers-write.js'))
const oldScope = require(path.join(UNIAPP, 'common/mes-operations/scope.js'))
const oldCatalogs = require(path.join(UNIAPP, 'common/mes-operations/catalogs.js'))
const oldSchedules = require(path.join(UNIAPP, 'common/mes-operations/schedules.js'))
const oldJobs = require(path.join(UNIAPP, 'common/mes-operations/jobs.js'))
const oldHandovers = require(path.join(UNIAPP, 'common/mes-operations/handovers.js'))

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
    // ---- P3-B2：工单写 ----
    { name: 'job 派工新建（订单快照/审计/事件）', run: async (db, impl) => run(impl.createJob, db, (await impl.sup(db)), { expectedVersion: 0, record: { batchNo: 'TEST261020A', processId: IDS.process, personIds: [IDS.supPerson], unit: 'case', targetQty: 100, plannedDate: '2026-10-21' } }) },
    { name: 'job 派工重复 409', run: async (db, impl) => { await impl.createJob(db, (await impl.sup(db)), { expectedVersion: 0, record: { batchNo: 'TEST261020A', processId: IDS.process, personIds: [IDS.supPerson], unit: 'case', targetQty: 100, plannedDate: '2026-10-21' } }); return run(impl.createJob, db, (await impl.sup(db)), { expectedVersion: 0, record: { batchNo: 'TEST261020A', processId: IDS.process, personIds: [IDS.supPerson], unit: 'case', targetQty: 100, plannedDate: '2026-10-21' } }) } },
    { name: 'job 派工单位非法 400', run: async (db, impl) => run(impl.createJob, db, (await impl.sup(db)), { expectedVersion: 0, record: { batchNo: 'TEST261020A', processId: IDS.process, personIds: [IDS.supPerson], unit: 'box', targetQty: 100, plannedDate: '2026-10-21' } }) },
    { name: 'job 派工非主管 403', run: async (db, impl) => run(impl.createJob, db, (await impl.operator(db)), { expectedVersion: 0, record: { batchNo: 'TEST261020A', processId: IDS.process, personIds: [IDS.operatorPerson], unit: 'case', targetQty: 100, plannedDate: '2026-10-21' } }) },
    { name: 'jobCommand 开工（设备校验/事件 v2）', run: async (db, impl) => run(impl.jobCommand, db, (await impl.sup(db)), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'dualrun-start-0001', payload: { note: '开工', equipmentId: IDS.equipment } }) },
    { name: 'jobCommand 开工后暂停/继续', run: async (db, impl) => { await impl.jobCommand(db, (await impl.sup(db)), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'dualrun-state-0001', payload: {} }); const paused = await impl.jobCommand(db, (await impl.sup(db)), { id: IDS.job, command: 'pause', expectedVersion: 2, requestId: 'dualrun-state-0002', payload: { note: '等料' } }); return run(impl.jobCommand, db, (await impl.sup(db)), { id: IDS.job, command: 'resume', expectedVersion: paused.version, requestId: 'dualrun-state-0003', payload: { note: '继续' } }) } },
    { name: 'jobCommand 报产累计 + 入库 + 完工', run: async (db, impl) => { await impl.jobCommand(db, (await impl.sup(db)), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'dualrun-flow-0001', payload: {} }); await impl.jobCommand(db, (await impl.sup(db)), { id: IDS.job, command: 'report', expectedVersion: 2, requestId: 'dualrun-flow-0002', payload: { shiftId: IDS.shift, date: '2026-10-21', goodQty: 10, defectQty: 1, workHours: 4 } }); await impl.jobCommand(db, (await impl.sup(db)), { id: IDS.job, command: 'inbound', expectedVersion: 3, requestId: 'dualrun-flow-0003', payload: { qty: 4 } }); return run(impl.jobCommand, db, (await impl.sup(db)), { id: IDS.job, command: 'complete', expectedVersion: 4, requestId: 'dualrun-flow-0004', payload: { note: '完工' } }) } },
    { name: 'jobCommand 幂等重放（同 requestId）', run: async (db, impl) => { await impl.jobCommand(db, (await impl.sup(db)), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'dualrun-idem-0001', payload: { note: '开工' } }); return run(impl.jobCommand, db, (await impl.sup(db)), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'dualrun-idem-0001', payload: { note: '开工' } }) } },
    { name: 'jobCommand 版本冲突 409', run: async (db, impl) => run(impl.jobCommand, db, (await impl.sup(db)), { id: IDS.job, command: 'start', expectedVersion: 0, requestId: 'dualrun-conflict-0001', payload: {} }) },
    { name: 'jobCommand 非法命令 400', run: async (db, impl) => run(impl.jobCommand, db, (await impl.sup(db)), { id: IDS.job, command: 'boom', expectedVersion: 1, requestId: 'dualrun-invalid-0001', payload: {} }) },
    // ---- P3-B2：交接班 / 异常写 ----
    { name: 'handover 草稿新建（工单快照/接班账号）', run: async (db, impl) => run(impl.saveHandover, db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-handover-0001', record: { date: '2026-10-21', nextDate: '2026-10-21', shiftId: IDS.shift, nextShiftId: IDS.shiftNight, processId: IDS.process, receiverId: IDS.receiverPerson, jobIds: [IDS.job], content: '交班内容' } }) },
    { name: 'handover 新建幂等重放', run: async (db, impl) => { await impl.saveHandover(db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-handover-0002', record: { date: '2026-10-21', nextDate: '2026-10-21', shiftId: IDS.shift, nextShiftId: IDS.shiftNight, processId: IDS.process, receiverId: IDS.receiverPerson, jobIds: [IDS.job], content: '交班内容' } }); return run(impl.saveHandover, db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-handover-0002', record: { date: '2026-10-21', nextDate: '2026-10-21', shiftId: IDS.shift, nextShiftId: IDS.shiftNight, processId: IDS.process, receiverId: IDS.receiverPerson, jobIds: [IDS.job], content: '交班内容' } }) } },
    { name: 'handover 草稿更新（版本+1）', run: async (db, impl) => { const draft = await impl.saveHandover(db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-handover-0003', record: { date: '2026-10-21', nextDate: '2026-10-21', shiftId: IDS.shift, nextShiftId: IDS.shiftNight, processId: IDS.process, receiverId: IDS.receiverPerson, jobIds: [IDS.job], content: '交班内容' } }); return run(impl.saveHandover, db, (await impl.sup(db)), { expectedVersion: 1, requestId: 'dualrun-handover-0004', record: { _id: draft._id, date: '2026-10-21', nextDate: '2026-10-21', shiftId: IDS.shift, nextShiftId: IDS.shiftNight, processId: IDS.process, receiverId: IDS.receiverPerson, jobIds: [IDS.job], content: '更新交班', changeReason: '补充' } }) } },
    { name: 'handover submit + receive（接收人权限）', run: async (db, impl) => { const draft = await impl.saveHandover(db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-handover-0005', record: { date: '2026-10-21', nextDate: '2026-10-21', shiftId: IDS.shift, nextShiftId: IDS.shiftNight, processId: IDS.process, receiverId: IDS.receiverPerson, jobIds: [IDS.job], content: '交班内容' } }); await impl.handoverCommand(db, (await impl.sup(db)), { id: draft._id, command: 'submit', expectedVersion: 1, requestId: 'dualrun-handover-0006', note: '提交交班' }); return run(impl.handoverCommand, db, (await impl.receiver(db)), { id: draft._id, command: 'receive', expectedVersion: 2, requestId: 'dualrun-handover-0007', note: '已核对' }) } },
    { name: 'handover 非接班本人 receive 403', run: async (db, impl) => { const draft = await impl.saveHandover(db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-handover-0008', record: { date: '2026-10-21', nextDate: '2026-10-21', shiftId: IDS.shift, nextShiftId: IDS.shiftNight, processId: IDS.process, receiverId: IDS.receiverPerson, jobIds: [IDS.job], content: '交班内容' } }); await impl.handoverCommand(db, (await impl.sup(db)), { id: draft._id, command: 'submit', expectedVersion: 1, requestId: 'dualrun-handover-0009', note: '提交交班' }); return run(impl.handoverCommand, db, (await impl.sup(db)), { id: draft._id, command: 'receive', expectedVersion: 2, requestId: 'dualrun-handover-0010', note: '代收' }) } },
    { name: 'exception 新建 + 幂等重放', run: async (db, impl) => { await impl.saveException(db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-exception-0001', record: { jobId: IDS.job, category: '设备', description: '异响' } }); return run(impl.saveException, db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-exception-0001', record: { jobId: IDS.job, category: '设备', description: '异响' } }) } },
    { name: 'exception 描述必填 400', run: async (db, impl) => run(impl.saveException, db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-exception-0002', record: { jobId: IDS.job, category: '设备', description: '' } }) },
    { name: 'exception resolve（主管/处置结果）', run: async (db, impl) => { const created = await impl.saveException(db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-exception-0003', record: { jobId: IDS.job, category: '设备', description: '异响' } }); return run(impl.resolveException, db, (await impl.sup(db)), { id: created._id, expectedVersion: 1, resolution: '更换轴承，已恢复' }) } },
    { name: 'exception resolve 非主管 403', run: async (db, impl) => { const created = await impl.saveException(db, (await impl.sup(db)), { expectedVersion: 0, requestId: 'dualrun-exception-0004', record: { jobId: IDS.job, category: '设备', description: '异响' } }); return run(impl.resolveException, db, (await impl.operator(db)), { id: created._id, expectedVersion: 1, resolution: '已处理' }) } },
]

async function runCase(item) {
    const left = createWriteDb(); const right = createWriteDb()
    const oldImpl = {
        catalog: oldCatalogs.saveCatalog, schedule: oldSchedules.saveSchedule,
        createJob: oldJobs.createJob, jobCommand: oldJobs.jobCommand,
        saveHandover: oldHandovers.saveHandover, handoverCommand: oldHandovers.handoverCommand,
        saveException: oldHandovers.saveException, resolveException: oldHandovers.resolveException,
        admin: db => oldScope.profile(db, { uid: IDS.admin, role: ['admin'] }),
        sup: db => oldScope.profile(db, { uid: IDS.sup, role: [] }),
        operator: db => oldScope.profile(db, { uid: IDS.operator, role: [] }),
        receiver: db => oldScope.profile(db, { uid: IDS.receiver, role: [] }),
    }
    const newImpl = {
        catalog: nativeCatalogs.saveCatalog, schedule: nativeSchedules.saveSchedule,
        createJob: nativeJobs.createJob, jobCommand: nativeJobs.jobCommand,
        saveHandover: nativeHandovers.saveHandover, handoverCommand: nativeHandovers.handoverCommand,
        saveException: nativeHandovers.saveException, resolveException: nativeHandovers.resolveException,
        admin: db => nativeScope.profile(db, { uid: IDS.admin, role: ['admin'] }),
        sup: db => nativeScope.profile(db, { uid: IDS.sup, role: [] }),
        operator: db => nativeScope.profile(db, { uid: IDS.operator, role: [] }),
        receiver: db => nativeScope.profile(db, { uid: IDS.receiver, role: [] }),
    }
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

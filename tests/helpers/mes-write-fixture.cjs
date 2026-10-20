// P3-B1 写模块测试夹具：fake DB + 基础目录/人员/订单种子，供 catalogs/schedules 单测与双跑复用。
const { createMemoryDb } = require('./router-memory-db.cjs')

const IDS = {
    workshop: 'ops:workshops:301',
    workshopOther: 'ops:workshops:302',
    process: 'ops:processes:P1',
    processOther: 'ops:processes:P2',
    shift: 'ops:shifts:E8',
    shiftNight: 'ops:shifts:N8',
    supPerson: 'ops:personnel:YG-SUP',
    otherPerson: 'ops:personnel:YG-1',
    operatorPerson: 'ops:personnel:YG-OP',
    receiverPerson: 'ops:personnel:YG-RECV',
    admin: 'admin',
    sup: 'u-sup',
    operator: 'u-op',
    receiver: 'u-recv',
    order: 'order:20261020',
    job: 'job:test-b2',
    equipment: 'ops:resources:EQ1',
}

/** 生成一份带基础种子的内存 DB；每次调用都是全新库。 */
function createWriteDb() {
    const db = createMemoryDb()
    const seed = (name, rows) => { const m = db.ensure(name); for (const row of rows) m.set(row._id, JSON.parse(JSON.stringify(row))) }
    seed('uni-id-users', [
        { _id: IDS.admin, status: 0, role: ['admin'], username: 'hogar', nickname: 'hogar' },
        { _id: IDS.sup, status: 0, role: [], username: '于家园', nickname: '于家园' },
        { _id: IDS.operator, status: 0, role: [], username: '操作员', nickname: '操作员' },
        { _id: IDS.receiver, status: 0, role: [], username: '朱钊', nickname: '朱钊' },
    ])
    seed('mes_ops_workshops', [
        { _id: IDS.workshop, code: '301', name: '301', enabled: true, version: 1 },
        { _id: IDS.workshopOther, code: '302', name: '302', enabled: true, version: 1 },
    ])
    seed('mes_ops_processes', [
        { _id: IDS.process, code: 'P1', name: '罐装机', workshopId: IDS.workshop, workshopName: '301', posts: ['操作', '复核'], enabled: true, version: 1 },
        { _id: IDS.processOther, code: 'P2', name: '包装线', workshopId: IDS.workshopOther, workshopName: '302', posts: [], enabled: true, version: 1 },
    ])
    seed('mes_ops_shifts', [
        { _id: IDS.shift, code: 'E8', name: '早班（8小时）', startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, plannedHours: 8, systemHours: 8, shiftSlot: 'early', enabled: true, version: 1 },
        { _id: IDS.shiftNight, code: 'N8', name: '夜班（8小时）', startTime: '22:00', endTime: '06:00', startDayOffset: 0, endDayOffset: 1, plannedHours: 8, systemHours: 8, shiftSlot: 'night', enabled: true, version: 1 },
    ])
    seed('mes_ops_personnel', [
        { _id: IDS.supPerson, code: 'YG-SUP', name: '于家园', workshopId: IDS.workshop, workshopName: '301', processIds: [IDS.process], processNames: ['罐装机'], scopeRole: 'workshop_manager', enabled: true, uid: IDS.sup, version: 1 },
        { _id: IDS.otherPerson, code: 'YG-1', name: '朱钊', workshopId: IDS.workshop, workshopName: '301', processIds: [IDS.process], processNames: ['罐装机'], scopeRole: 'operator', enabled: true, uid: '', version: 1 },
        { _id: IDS.operatorPerson, code: 'YG-OP', name: '操作员', workshopId: IDS.workshop, workshopName: '301', processIds: [IDS.process], processNames: ['罐装机'], scopeRole: 'operator', enabled: true, uid: IDS.operator, version: 1 },
        { _id: IDS.receiverPerson, code: 'YG-RECV', name: '朱钊', workshopId: IDS.workshop, workshopName: '301', processIds: [IDS.process], processNames: ['罐装机'], scopeRole: 'operator', enabled: true, uid: IDS.receiver, version: 1 },
    ])
    seed('mes_ops_resources', [
        { _id: IDS.equipment, code: 'EQ1', name: '灌装机1号', kind: 'equipment', workshopId: IDS.workshop, workshopName: '301', processId: IDS.process, processName: '罐装机', parameters: '', enabled: true, version: 1 },
    ])
    seed('production_orders', [
        { _id: IDS.order, orderNo: '20261020', batchNo: 'TEST261020A', productCode: '9900000001', productName: 'TEST-测试产品', orderStatus: 'confirmed', enabled: true, version: 1 },
    ])
    // P3-B2：工单写测试用的待开工工单（派工/状态机用例的基线）
    seed('mes_ops_jobs', [
        {
            _id: IDS.job, batchNo: 'TEST261020A', productCode: '9900000001', productName: 'TEST-测试产品',
            orderNo: '20261020', orderVersion: 1, processId: IDS.process, processName: '罐装机',
            workshopId: IDS.workshop, workshopName: '301', personIds: [IDS.supPerson], personNames: ['于家园'],
            targetQty: 100, unit: 'case', plannedDate: '2026-10-21', state: 'planned',
            goodQty: 0, defectQty: 0, inboundQty: 0, workHours: 0, version: 1,
        },
    ])
    return { db, IDS }
}

module.exports = { createWriteDb, IDS }

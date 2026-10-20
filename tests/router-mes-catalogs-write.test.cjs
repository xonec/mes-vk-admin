// P3-B1 catalogs 写模块（saveCatalog）原生实现单测：权限、校验、版本 CAS、审计、唯一预留。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const scope = require('../uniCloud-alipay/cloudfunctions/router/util/mes/scope.js')
const { saveCatalog } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/catalogs-write.js')

const store = (db, name) => db.ensure(name)
const doc = (db, name, id) => store(db, name).get(id)

async function profiles(db) {
    const admin = await scope.profile(db, { uid: IDS.admin, role: ['admin'] })
    const sup = await scope.profile(db, { uid: IDS.sup, role: [] })
    const operator = await scope.profile(db, { uid: IDS.operator, role: [] })
    return { admin, sup, operator }
}

async function expectError(fn, code, text) {
    try {
        await fn()
    } catch (error) {
        assert.equal(error.code, code, '期望 code ' + code + '，实际 ' + error.code + '：' + error.message)
        if (text) assert.ok(String(error.message).includes(text), '期望文案包含「' + text + '」，实际「' + error.message + '」')
        return error
    }
    assert.fail('应抛出业务错误')
}

let passed = 0
let failed = 0
async function test(name, fn) {
    try {
        await fn()
        passed += 1
        console.log('  ✓ ' + name)
    } catch (error) {
        failed += 1
        console.error('  ✗ ' + name)
        console.error('    ' + ((error && error.message) || error))
    }
}

;(async () => {
    console.log('\nP3-B1 catalogs 写模块（saveCatalog）')

    await test('非管理员保存资料 403', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        await expectError(() => saveCatalog(db, sup, { type: 'workshops', expectedVersion: 0, record: { code: 'W1', name: '车间1' } }), 403, '仅管理员')
    })

    await test('非法资料类型 400', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        await expectError(() => saveCatalog(db, admin, { type: 'orders', expectedVersion: 0, record: { code: 'X', name: 'x' } }), 400, '基础资料类型非法')
    })

    await test('代码/名称非法 400', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        await expectError(() => saveCatalog(db, admin, { type: 'workshops', expectedVersion: 0, record: { code: 'W 1', name: 'x' } }), 400, '代码须为')
        await expectError(() => saveCatalog(db, admin, { type: 'workshops', expectedVersion: 0, record: { code: 'W1', name: '  ' } }), 400, '请填写资料名称')
    })

    await test('新建车间：写主表 + 版本 1 + create 审计 + 无历史版本', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const result = await saveCatalog(db, admin, { type: 'workshops', expectedVersion: 0, record: { code: 'W1', name: '新车间', enabled: true } })
        assert.equal(result._id, 'ops:workshops:W1')
        assert.equal(result.version, 1)
        assert.equal(result.audit.action, 'create')
        assert.equal(result.audit.actorId, IDS.admin)
        assert.equal(doc(db, 'mes_ops_workshops', 'ops:workshops:W1').name, '新车间')
        assert.equal(store(db, 'mes_ops_versions').size, 0)
    })

    await test('更新资料：版本 +1、归档旧版本、changedFields 正确', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        await saveCatalog(db, admin, { type: 'workshops', expectedVersion: 0, record: { code: 'W1', name: '新车间' } })
        const result = await saveCatalog(db, admin, { type: 'workshops', expectedVersion: 1, record: { code: 'W1', name: '新车间改', changeReason: '改名' } })
        assert.equal(result.version, 2)
        assert.equal(result.audit.action, 'update')
        assert.deepEqual(result.audit.changedFields, ['name'])
        const archived = doc(db, 'mes_ops_versions', 'ver:ops:workshops:W1:1')
        assert.equal(archived.snapshot.name, '新车间')
        assert.equal(archived.entityId, 'ops:workshops:W1')
    })

    await test('更新内容变化但未填修改原因 400', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        await saveCatalog(db, admin, { type: 'workshops', expectedVersion: 0, record: { code: 'W1', name: '新车间' } })
        await expectError(() => saveCatalog(db, admin, { type: 'workshops', expectedVersion: 1, record: { code: 'W1', name: '改名' } }), 400, '修改资料请填写原因')
    })

    await test('版本冲突 409 / 版本号非法 409', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        await saveCatalog(db, admin, { type: 'workshops', expectedVersion: 0, record: { code: 'W1', name: '新车间' } })
        await expectError(() => saveCatalog(db, admin, { type: 'workshops', expectedVersion: 0, record: { code: 'W1', name: '新车间改', changeReason: 'x' } }), 409, '资料已被修改')
        await expectError(() => saveCatalog(db, admin, { type: 'workshops', record: { code: 'W1', name: 'x' } }), 409, '当前版本')
    })

    await test('内容无变化保持原版本（幂等）', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        await saveCatalog(db, admin, { type: 'workshops', expectedVersion: 0, record: { code: 'W1', name: '新车间' } })
        const same = await saveCatalog(db, admin, { type: 'workshops', expectedVersion: 1, record: { code: 'W1', name: '新车间' } })
        assert.equal(same.version, 1)
        assert.equal(store(db, 'mes_ops_versions').size, 0)
    })

    await test('资料代码创建后不可修改 400', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        await expectError(() => saveCatalog(db, admin, { type: 'workshops', expectedVersion: 0, record: { _id: 'ops:workshops:OLD', code: 'NEW', name: 'x' } }), 400, '资料代码创建后不能修改')
    })

    await test('工序：岗位数组校验（非数组/空项/重复/超 50）', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const base = { type: 'processes', expectedVersion: 0 }
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'PX', name: '工序X', workshopId: IDS.workshop, posts: 'x' } }), 400, '岗位须为数组')
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'PX', name: '工序X', workshopId: IDS.workshop, posts: [''] } }), 400, '岗位名称不能为空或重复')
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'PX', name: '工序X', workshopId: IDS.workshop, posts: ['a', 'a'] } }), 400, '岗位名称不能为空或重复')
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'PX', name: '工序X', workshopId: IDS.workshop, posts: Array.from({ length: 51 }, (_, i) => 'p' + i) } }), 400, '不超过 50 项')
    })

    await test('工序：车间不存在/停用 404/400，成功冻结车间名', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        await expectError(() => saveCatalog(db, admin, { type: 'processes', expectedVersion: 0, record: { code: 'PX', name: '工序X', workshopId: 'ops:workshops:NONE', posts: [] } }), 404, '记录不存在')
        store(db, 'mes_ops_workshops').get(IDS.workshopOther).enabled = false
        await expectError(() => saveCatalog(db, admin, { type: 'processes', expectedVersion: 0, record: { code: 'PX', name: '工序X', workshopId: IDS.workshopOther, posts: [] } }), 400, '所选资料已停用')
        const ok = await saveCatalog(db, admin, { type: 'processes', expectedVersion: 0, record: { code: 'PX', name: '工序X', workshopId: IDS.workshop, posts: ['操作'] } })
        assert.equal(ok.workshopName, '301')
        assert.deepEqual(ok.posts, ['操作'])
    })

    await test('班次：班制/班别/时间组合校验与成功保存', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const base = { type: 'shifts', expectedVersion: 0 }
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'SX', name: '班次X', startTime: '08:00', endTime: '16:00', systemHours: 12, shiftSlot: 'early', startDayOffset: 0, endDayOffset: 0 } }), 400, '班次时间与所选班制时长不一致')
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'SX', name: '班次X', startTime: '08:00', endTime: '16:00', systemHours: 8, shiftSlot: 'bad', startDayOffset: 0, endDayOffset: 0 } }), 400, '班别须为早、中或夜')
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'SX', name: '班次X', startTime: '08:00', endTime: '16:00', systemHours: 8, startDayOffset: 0, endDayOffset: 0 } }), 400, '标准班制与班别须同时选择')
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'SX', name: '班次X', startTime: '08:00', endTime: '08:00', startDayOffset: 0, endDayOffset: 0 } }), 400, '实际排班时长须大于 0')
        const ok = await saveCatalog(db, admin, { ...base, record: { code: 'SX', name: '班次X', startTime: '08:00', endTime: '16:00', systemHours: 8, shiftSlot: 'early', startDayOffset: 0, endDayOffset: 0 } })
        assert.equal(ok.plannedHours, 8)
        assert.equal(ok.systemHours, 8)
    })

    await test('人员：工序必须同车间；职责归一（team_lead→operator）', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const base = { type: 'personnel', expectedVersion: 0 }
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'P-1', name: '人员1', workshopId: IDS.workshop, processIds: [IDS.processOther], scopeRole: 'operator' } }), 400, '人员工序必须属于同一车间')
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'P-1', name: '人员1', workshopId: IDS.workshop, processIds: [], scopeRole: 'bad' } }), 400, '人员职责非法')
        const ok = await saveCatalog(db, admin, { ...base, record: { code: 'P-2', name: '人员2', workshopId: IDS.workshop, processIds: [IDS.process], scopeRole: 'team_lead' } })
        assert.equal(ok.scopeRole, 'operator')
        assert.deepEqual(ok.processNames, ['罐装机'])
    })

    await test('人员：账号不存在/失效 400；绑定成功写唯一预留', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const base = { type: 'personnel', expectedVersion: 0, record: { code: 'P-1', name: '人员1', workshopId: IDS.workshop, processIds: [], scopeRole: 'operator' } }
        await expectError(() => saveCatalog(db, admin, { ...base, record: { ...base.record, uid: 'nouser' } }), 400, '登录账号不存在或已失效')
        store(db, 'uni-id-users').get(IDS.operator).status = 1
        await expectError(() => saveCatalog(db, admin, { ...base, record: { ...base.record, uid: IDS.operator } }), 400, '登录账号不存在或已失效')
        store(db, 'uni-id-users').get(IDS.operator).status = 0
        const ok = await saveCatalog(db, admin, { ...base, record: { ...base.record, uid: IDS.operator } })
        assert.equal(ok.uid, IDS.operator)
        assert.equal(doc(db, 'mes_ops_bindings', 'uid:' + IDS.operator).personId, 'ops:personnel:P-1')
    })

    await test('人员：同一账号不能绑定第二人 409；已绑定账号不能替换 409', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const record = (code, uid) => ({ type: 'personnel', expectedVersion: 0, record: { code, name: code, workshopId: IDS.workshop, processIds: [], scopeRole: 'operator', uid } })
        await saveCatalog(db, admin, record('P-1', IDS.operator))
        await expectError(() => saveCatalog(db, admin, record('P-2', IDS.operator)), 409, '此账号已关联其他人员')
        await expectError(() => saveCatalog(db, admin, { type: 'personnel', expectedVersion: 1, record: { code: 'P-1', name: 'P-1', workshopId: IDS.workshop, processIds: [], scopeRole: 'operator', uid: '', changeReason: '解绑' } }), 409, '已绑定账号不能替换或清空')
    })

    await test('人员：企业工号唯一预留（重复 409，换人保留）', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const record = (code, no) => ({ type: 'personnel', expectedVersion: 0, record: { code, name: code, workshopId: IDS.workshop, processIds: [], scopeRole: 'operator', enterpriseEmployeeNo: no } })
        await saveCatalog(db, admin, record('P-1', 'E-001'))
        assert.equal(doc(db, 'mes_ops_bindings', 'employee-no:' + require('crypto').createHash('sha256').update(require('../uniCloud-alipay/cloudfunctions/router/util/mes/versioned.js').stableKey('E-001')).digest('hex')).personId, 'ops:personnel:P-1')
        await expectError(() => saveCatalog(db, admin, record('P-2', 'E-001')), 409, '企业工号已被其他人员使用')
    })

    await test('设备/模具：类型与工序车间一致性校验', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const base = { type: 'resources', expectedVersion: 0 }
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'R1', name: '设备1', kind: 'bad', workshopId: IDS.workshop, processId: IDS.process } }), 400, '资源类型须为设备或模具')
        await expectError(() => saveCatalog(db, admin, { ...base, record: { code: 'R1', name: '设备1', kind: 'equipment', workshopId: IDS.workshop, processId: IDS.processOther } }), 400, '资源工序与车间不一致')
        const ok = await saveCatalog(db, admin, { ...base, record: { code: 'R1', name: '设备1', kind: 'equipment', workshopId: IDS.workshop, processId: IDS.process, parameters: '380V' } })
        assert.equal(ok.workshopName, '301')
        assert.equal(ok.processName, '罐装机')
    })

    console.log('\nP3-B1 catalogs 写：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

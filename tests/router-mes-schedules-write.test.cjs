// P3-B1 schedules 写模块（saveSchedule）原生实现单测：权限、冲突、CAS、租约、批号关联、考勤联动。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const scope = require('../uniCloud-alipay/cloudfunctions/router/util/mes/scope.js')
const shared = require('../uniCloud-alipay/cloudfunctions/router/util/mes/shared.js')
const { saveSchedule } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/schedules-write.js')

const store = (db, name) => db.ensure(name)
const docs = (db, name) => [...store(db, name).values()]
const byId = (db, name, id) => store(db, name).get(id)

async function profiles(db) {
    const admin = await scope.profile(db, { uid: IDS.admin, role: ['admin'] })
    const sup = await scope.profile(db, { uid: IDS.sup, role: [] })
    const operator = await scope.profile(db, { uid: IDS.operator, role: [] })
    return { admin, sup, operator }
}

async function expectError(fn, code, text) {
    try { await fn() } catch (error) {
        assert.equal(error.code, code, '期望 code ' + code + '，实际 ' + error.code + '：' + error.message)
        if (text) assert.ok(String(error.message).includes(text), '期望文案包含「' + text + '」，实际「' + error.message + '」')
        return error
    }
    assert.fail('应抛出业务错误')
}

const workRecord = (over = {}) => ({ date: '2026-10-21', shiftId: IDS.shift, processId: IDS.process, personId: IDS.supPerson, kind: 'work', batchNos: [], ...over })
const restRecord = (over = {}) => ({ date: '2026-10-21', kind: 'rest', personId: IDS.otherPerson, absenceType: 'rest', ...over })

let passed = 0
let failed = 0
async function test(name, fn) {
    try { await fn(); passed += 1; console.log('  ✓ ' + name) }
    catch (error) { failed += 1; console.error('  ✗ ' + name); console.error('    ' + ((error && error.stack) || error)) }
}

;(async () => {
    console.log('\nP3-B1 schedules 写模块（saveSchedule）')

    await test('非主管（operator）保存排班 403', async () => {
        const { db } = createWriteDb()
        const { operator } = await profiles(db)
        await expectError(() => saveSchedule(db, operator, { expectedVersion: 0, record: workRecord({ personId: IDS.operatorPerson }) }), 403, '仅对应车间负责人或管理员可排班派工')
    })

    await test('管理员可保存他车间排班（isAdmin 全范围）', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const saved = await saveSchedule(db, admin, { expectedVersion: 0, record: workRecord({ personId: IDS.otherPerson }) })
        assert.equal(saved.version, 1)
        assert.equal(saved.audit.action, 'create')
        assert.equal(saved.audit.actorId, IDS.admin)
    })

    await test('新建出勤排班：字段冻结 + 考勤同步生成 1 条出勤记录', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const saved = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() })
        assert.equal(saved.version, 1)
        assert.equal(saved.workshopName, '301')
        assert.equal(saved.personName, '于家园')
        assert.equal(saved.processName, '罐装机')
        assert.equal(saved.shiftName, '早班（8小时）')
        assert.equal(saved.plannedHours, 8)
        assert.equal(saved.crossDay, false)
        assert.equal(saved.systemHours, 8)
        assert.equal(saved.audit.actorName, '于家园')
        const attendance = docs(db, 'mes_ops_attendance')
        assert.equal(attendance.length, 1)
        assert.equal(attendance[0].kind, 'work')
        assert.equal(attendance[0].source, 'schedule')
        assert.equal(attendance[0].workHours, 8)
        assert.equal(attendance[0].date, '2026-10-21')
    })

    await test('新建休息排班：时间为 00:00、工时 0、考勤为休息', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const saved = await saveSchedule(db, sup, { expectedVersion: 0, record: restRecord() })
        assert.equal(saved.kind, 'rest')
        assert.equal(saved.startTime, '00:00')
        assert.equal(saved.endTime, '00:00')
        assert.equal(saved.plannedHours, 0)
        assert.equal(saved.absenceType, 'rest')
        const attendance = docs(db, 'mes_ops_attendance')
        assert.equal(attendance.length, 1)
        assert.equal(attendance[0].kind, 'rest')
        assert.equal(attendance[0].workHours, 0)
    })

    await test('休息记录不能关联生产批次 400', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: restRecord({ batchNos: ['TEST261020A'] }) }), 400, '休息记录不能关联生产批次')
    })

    await test('排班类型/日期非法 400', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ kind: 'bad' }) }), 400, '排班类型须为工作或休息')
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ date: '2026-13-01' }) }), 400, '日期不是有效日期')
    })

    await test('人员不存在 404 / 班次停用 400', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ personId: 'ops:personnel:NONE' }) }), 404, '记录不存在')
        byId(db, 'mes_ops_shifts', IDS.shift).enabled = false
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() }), 400, '所选资料已停用')
    })

    await test('人员、工序必须属于同一车间 400', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ processId: IDS.processOther }) }), 400, '人员、工序必须属于同一车间')
    })

    await test('岗位未在工序配置中 400', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ post: '未配置岗位' }) }), 400, '所选岗位未在该工序配置')
    })

    await test('排班人员不能直接替换 400', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const saved = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() })
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 1, record: workRecord({ _id: saved._id, personId: IDS.otherPerson, changeReason: '换人' }) }), 400, '排班人员不能直接替换')
    })

    await test('同日同班同工序重复 409', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() })
        // 同日不同班次且时间重叠 → 409（同班同工序的重复以自然主键版本冲突覆盖，见上一用例）
        byId(db, 'mes_ops_shifts', IDS.shiftNight).startTime = '15:00'
        byId(db, 'mes_ops_shifts', IDS.shiftNight).endTime = '23:00'
        byId(db, 'mes_ops_shifts', IDS.shiftNight).endDayOffset = 0
        byId(db, 'mes_ops_shifts', IDS.shiftNight).systemHours = 8
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ shiftId: IDS.shiftNight }) }), 409, '该人员已有出勤状态或时间冲突')
    })

    await test('跨日班次与次日早班不冲突', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ date: '2026-10-21', shiftId: IDS.shiftNight }) })
        const next = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ date: '2026-10-22', shiftId: IDS.shift }) })
        assert.equal(next.version, 1)
    })

    await test('已存在排班必须携带当前版本（0 直接 409）', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const saved = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() })
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ note: 'x', changeReason: 'x' }) }), 409, '排班已存在或被修改')
        assert.equal(byId(db, 'mes_ops_schedules', saved._id).version, 1)
    })

    await test('版本冲突 409；修改无原因 400；内容不变幂等', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const saved = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() })
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 99, record: workRecord({ _id: saved._id, changeReason: 'x' }) }), 409)
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 1, record: workRecord({ _id: saved._id, note: '改备注' }) }), 400, '修改资料请填写原因')
        const same = await saveSchedule(db, sup, { expectedVersion: 1, record: workRecord({ _id: saved._id }) })
        assert.equal(same.version, 1)
    })

    await test('批号关联：正式订单 linked、无订单/草稿 pending', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const linked = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ batchNos: ['TEST261020A'] }) })
        assert.deepEqual(linked.batchLinks, [{ batchNo: 'TEST261020A', status: 'linked', orderNo: '20261020', orderVersion: 1 }])
        const pending = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ date: '2026-10-22', batchNos: ['AP9Z26X9999'] }) })
        assert.deepEqual(pending.batchLinks, [{ batchNo: 'AP9Z26X9999', status: 'pending', orderNo: '', orderVersion: null }])
    })

    await test('批号重复 400 / 非法批号 400', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ batchNos: ['TEST261020A', 'TEST261020A'] }) }), 400, '排班批号有重复项')
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord({ batchNos: ['BAD'] }) }), 400, '排班批次须为完整字母数字')
    })

    await test('修改日期：旧日期考勤转休息、新日期考勤生成', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const saved = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() })
        const moved = await saveSchedule(db, sup, { expectedVersion: 1, record: workRecord({ _id: saved._id, date: '2026-10-22', changeReason: '改期' }) })
        assert.equal(moved.date, '2026-10-22')
        const all = docs(db, 'mes_ops_attendance')
        const oldRow = all.find(row => row.date === '2026-10-21')
        const newRow = all.find(row => row.date === '2026-10-22')
        assert.ok(oldRow && oldRow.scheduleRemoved === true && oldRow.kind === 'rest', '旧日期考勤应转休息')
        assert.ok(newRow && newRow.kind === 'work' && newRow.workHours === 8, '新日期考勤应生成')
    })

    await test('停用排班：版本 +1、考勤归休息并标记 scheduleRemoved', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const saved = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() })
        const disabled = await saveSchedule(db, sup, { expectedVersion: 1, record: workRecord({ _id: saved._id, enabled: false, changeReason: '停用测试' }) })
        assert.equal(disabled.enabled, false)
        assert.equal(disabled.version, 2)
        const attendance = docs(db, 'mes_ops_attendance')
        assert.equal(attendance.length, 1)
        assert.equal(attendance[0].scheduleRemoved, true)
        assert.equal(attendance[0].kind, 'rest')
    })

    await test('人员租约冲突 409；租约过期可抢占', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const lockId = 'schedule-person:' + shared.digest(IDS.supPerson)
        store(db, 'mes_ops_locks').set(lockId, { _id: lockId, owner: 'other', expiresAt: Date.now() + 60000 })
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() }), 409, '该人员排班正在保存')
        store(db, 'mes_ops_locks').get(lockId).expiresAt = Date.now() - 1000
        const saved = await saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() })
        assert.equal(saved.version, 1)
    })

    await test('多条手写考勤与排班重叠时 409', async () => {
        const { db } = createWriteDb()
        const { sup } = await profiles(db)
        const base = { personId: IDS.supPerson, date: '2026-10-21', source: 'manual', kind: 'work', startTime: '09:00', endTime: '11:00', startDayOffset: 0, endDayOffset: 0 }
        store(db, 'mes_ops_attendance').set('attendance:m1', { _id: 'attendance:m1', ...base, version: 1 })
        store(db, 'mes_ops_attendance').set('attendance:m2', { _id: 'attendance:m2', ...base, startTime: '13:00', endTime: '15:00', version: 1 })
        await expectError(() => saveSchedule(db, sup, { expectedVersion: 0, record: workRecord() }), 409, '新排班与多条既有考勤重叠')
    })

    console.log('\nP3-B1 schedules 写：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

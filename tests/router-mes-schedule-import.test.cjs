// P3-C1 排班导入三件套 + 批量导入写原生实现单测：
// scope 分页 / prepare 自动建档与版本 / importSchedules 幂等与考勤收敛 / finish 分页与整表停用。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const scope = require('../uniCloud-alipay/cloudfunctions/router/util/mes/scope.js')
const { prepareScheduleImport, finishScheduleImport, scheduleImportScope } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/schedule-import.js')
const { importSchedules } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/import-schedules.js')

const store = (db, name) => db.ensure(name)
const doc = (db, name, id) => store(db, name).get(id)
const DATE = '2026-11-30'
const RULE = { importRuleVersion: 3 }

async function profiles(db) {
    const admin = await scope.profile(db, { uid: IDS.admin, role: ['admin'] })
    const sup = await scope.profile(db, { uid: IDS.sup, role: [] })
    return { admin, sup }
}
function baseRow(person, index) {
    return { date: DATE, shiftId: IDS.shift, processId: IDS.process, personId: person, kind: 'work', note: 'TEST-P3C1 导入 ' + index }
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
        console.error('    ' + ((error && error.stack) || error))
    }
}

;(async () => {
    console.log('\nP3-C1 排班导入（scope / prepare / import / finish）')

    // ---------- scheduleImportScope ----------
    await test('scope：personnel 分页返回启用人员与游标；非管理员 403；旧规则 409', async () => {
        const { db } = createWriteDb()
        const { admin, sup } = await profiles(db)
        await expectError(() => scheduleImportScope(db, sup, { workshopId: IDS.workshop, ...RULE, scopeType: 'personnel' }), 403)
        await expectError(() => scheduleImportScope(db, admin, { workshopId: IDS.workshop, importRuleVersion: 2, scopeType: 'personnel' }), 409, '排班导入规则已更新')
        await expectError(() => scheduleImportScope(db, admin, { workshopId: IDS.workshop, importRuleVersion: 3, teamId: 't1', scopeType: 'personnel' }), 409)
        const page = await scheduleImportScope(db, admin, { workshopId: IDS.workshop, ...RULE, scopeType: 'personnel', paged: true })
        assert.ok(page.rows.length >= 4)
        assert.equal(page.importRuleVersion, 3)
        assert.equal(page.paginationVersion, 1)
        assert.ok(page.rows.every(row => row.enabled === true && row._id))
        assert.equal(page.nextCursor, '', '不足 200 条时游标为空')
    })

    await test('scope：目标日旧排班分页返回版本快照（paged）与旧兼容简表', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        store(db, 'mes_ops_schedules').set('schedule:old-1', { _id: 'schedule:old-1', date: DATE, personId: IDS.supPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', workshopId: IDS.workshop, personName: '于家园', shiftName: '早班', processName: '罐装机', startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, enabled: true, version: 7 })
        const paged = await scheduleImportScope(db, admin, { workshopId: IDS.workshop, ...RULE, date: DATE, paged: true })
        assert.equal(paged.rows.length, 1)
        assert.equal(paged.rows[0].id, 'schedule:old-1')
        assert.equal(paged.rows[0].version, 7)
        const legacy = await scheduleImportScope(db, admin, { workshopId: IDS.workshop, ...RULE, date: DATE })
        assert.equal(legacy.rows.length, 1)
        assert.equal(legacy.rows[0].id, 'schedule:old-1')
        assert.equal(legacy.paginationVersion, undefined, '旧兼容模式不带分页字段')
    })

    // ---------- prepareScheduleImport ----------
    await test('prepare：已有人员直接返回 personId/expectedVersion；新姓名自动建档且第二次幂等', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const payload = { workshopId: IDS.workshop, rows: [baseRow(IDS.supPerson, 1), { date: DATE, shiftId: IDS.shift, processId: IDS.process, personName: 'TEST-P3C1-A', kind: 'work', note: 'TEST-P3C1 新人员' }], ...RULE }
        const first = await prepareScheduleImport(db, admin, payload)
        assert.equal(first.rows.length, 2)
        assert.equal(first.created, 1)
        assert.equal(first.createdPeople.length, 1)
        assert.match(first.createdPeople[0].code, /^YG-[0-9A-F]{16}$/)
        const createdPerson = doc(db, 'mes_ops_personnel', first.createdPeople[0].personId)
        assert.equal(createdPerson.autoCreated, true)
        assert.equal(createdPerson.uid, '')
        assert.equal(createdPerson.enabled, true)
        assert.equal(createdPerson.workshopId, IDS.workshop)
        assert.equal(createdPerson.version, 1)
        assert.ok(first.rows.every(row => row.personId && row._id && row.expectedVersion === 0))
        const second = await prepareScheduleImport(db, admin, payload)
        assert.equal(second.created, 0, '第二次不再建档')
        assert.deepEqual(second.rows.map(row => row.personId), first.rows.map(row => row.personId))
    })

    await test('prepare：同名多义 409 / 停用档案 400 / 跨车间 400 / 人员不存在 404 / 行数上限 400', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        store(db, 'mes_ops_personnel').set('ops:personnel:DUP-1', { _id: 'ops:personnel:DUP-1', name: '同名', code: 'YG-D1', workshopId: IDS.workshop, enabled: true, version: 1 })
        store(db, 'mes_ops_personnel').set('ops:personnel:DUP-2', { _id: 'ops:personnel:DUP-2', name: '同名', code: 'YG-D2', workshopId: IDS.workshop, enabled: true, version: 1 })
        store(db, 'mes_ops_personnel').set('ops:personnel:OFF', { _id: 'ops:personnel:OFF', name: '停用人员', code: 'YG-OFF', workshopId: IDS.workshop, enabled: false, version: 1 })
        await expectError(() => prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [{ date: DATE, shiftId: IDS.shift, processId: IDS.process, personName: '同名', kind: 'work' }], ...RULE }), 409, '存在同名人员')
        await expectError(() => prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [{ date: DATE, shiftId: IDS.shift, processId: IDS.process, personId: 'ops:personnel:OFF', kind: 'work' }], ...RULE }), 400, '已停用')
        await expectError(() => prepareScheduleImport(db, admin, { workshopId: IDS.workshopOther, rows: [baseRow(IDS.supPerson, 1)], ...RULE }), 400, '不属于选定的车间')
        await expectError(() => prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [{ date: DATE, shiftId: IDS.shift, processId: IDS.process, personId: 'ops:personnel:NOPE', kind: 'work' }], ...RULE }), 404)
        const many = Array.from({ length: 201 }, (_, index) => baseRow(IDS.supPerson, index))
        await expectError(() => prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: many, ...RULE }), 400, '200')
        await expectError(() => prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [], ...RULE }), 400)
    })

    await test('prepare：replaceDay 时预览版本不一致 409，一致则带出已有排班版本', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const row = baseRow(IDS.supPerson, 1)
        const prepared = await prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [row], ...RULE })
        store(db, 'mes_ops_schedules').set(prepared.rows[0]._id, { _id: prepared.rows[0]._id, date: DATE, personId: IDS.supPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', workshopId: IDS.workshop, startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, enabled: true, version: 3 })
        await expectError(() => prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [row], replaceDay: true, previousRows: [{ id: prepared.rows[0]._id, version: 2 }], ...RULE }), 409, '请重新生成预览')
        const matched = await prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [row], replaceDay: true, previousRows: [{ id: prepared.rows[0]._id, version: 3 }], ...RULE })
        assert.equal(matched.rows[0].expectedVersion, 3)
    })

    // ---------- importSchedules ----------
    await test('import：写入 3 人排班并带 importMeta 幂等签名，考勤按人每日同步一次', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const persons = [IDS.supPerson, IDS.otherPerson, IDS.operatorPerson]
        const prepared = await prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: persons.map((person, index) => baseRow(person, index)), ...RULE })
        const result = await importSchedules(db, admin, { rows: prepared.rows, requestId: 'p3c1-t1:0', sessionId: 'p3c1-session1' })
        assert.equal(result.successCount, 3)
        assert.equal(result.failureCount, 0)
        assert.ok(result.results.every(item => item.ok && item.record.version === 1))
        const first = doc(db, 'mes_ops_schedules', prepared.rows[0]._id)
        assert.equal(first.importMeta.requestId, 'p3c1-t1:0')
        assert.equal(first.importMeta.sessionId, 'p3c1-session1')
        assert.equal(first.importMeta.actorId, IDS.admin)
        assert.equal(first.importMeta.row, 1)
        assert.match(first.importMeta.signature, /^[a-f0-9]{64}$/)
        assert.equal(store(db, 'mes_ops_attendance').size, 3, '每人每天一条考勤')
        for (const person of persons) {
            const row = [...store(db, 'mes_ops_attendance').values()].find(item => item.personId === person && item.date === DATE)
            assert.ok(row, '应生成考勤：' + person)
            assert.equal(row.source, 'schedule')
            assert.equal(row.shiftId, IDS.shift)
            assert.equal(row.plannedHours, 8)
        }
        const lock = [...store(db, 'mes_ops_locks').values()].find(item => /^schedule-person:/.test(item._id))
        assert.ok(!lock || lock.expiresAt === 0, '租约已释放（删除或过期标记）')
    })

    await test('import：同 requestId 原样重放幂等（版本不变、考勤不重复），改内容重放 409 签名', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const prepared = await prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [baseRow(IDS.supPerson, 1), baseRow(IDS.otherPerson, 2)], ...RULE })
        const payload = { rows: prepared.rows, requestId: 'p3c1-t2:0', sessionId: 'p3c1-session2' }
        const first = await importSchedules(db, admin, payload)
        assert.equal(first.successCount, 2)
        const versions = prepared.rows.map(row => doc(db, 'mes_ops_schedules', row._id).version)
        const attendanceCount = store(db, 'mes_ops_attendance').size
        const replay = await importSchedules(db, admin, payload)
        assert.equal(replay.successCount, 2, '重放不重复失败')
        assert.deepEqual(prepared.rows.map(row => doc(db, 'mes_ops_schedules', row._id).version), versions, '重放不升版本')
        assert.equal(store(db, 'mes_ops_attendance').size, attendanceCount, '重放不新增考勤')
        const changed = { rows: [prepared.rows[0], { ...prepared.rows[1], note: 'TEST-P3C1 改了内容' }], requestId: 'p3c1-t2:0', sessionId: 'p3c1-session2' }
        const conflict = await importSchedules(db, admin, changed)
        assert.equal(conflict.results[0].ok, true, '第一行未变化仍幂等')
        assert.equal(conflict.results[1].ok, false)
        assert.equal(conflict.results[1].code, 409)
        assert.match(conflict.results[1].message, /同一导入标识中的行内容已改变/)
    })

    await test('import：行级失败不隐藏部分成功（第二行同班同工序重复 409）', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const prepared = await prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [baseRow(IDS.supPerson, 1), baseRow(IDS.supPerson, 2)], ...RULE })
        // 同一人同日同班同工序两行：第二行 id 相同，按 409 重复处理并被行级捕获
        const result = await importSchedules(db, admin, { rows: prepared.rows, requestId: 'p3c1-t3:0', sessionId: 'p3c1-session3' })
        assert.equal(result.results.length, 2)
        assert.equal(result.successCount, 1)
        assert.equal(result.failureCount, 1)
        assert.equal(result.results[1].code, 409)
    })

    await test('import：参数校验（行数 0/201、requestId 非法、replacePrevious 非管理员 403）', async () => {
        const { db } = createWriteDb()
        const { admin, sup } = await profiles(db)
        await expectError(() => importSchedules(db, admin, { rows: [], requestId: 'p3c1-t4:0' }), 400, '1～200')
        await expectError(() => importSchedules(db, admin, { rows: Array.from({ length: 201 }, () => baseRow(IDS.supPerson, 1)), requestId: 'p3c1-t4:0' }), 400, '1～200')
        await expectError(() => importSchedules(db, admin, { rows: [baseRow(IDS.supPerson, 1)], requestId: 'x' }), 400, '请求标识')
        await expectError(() => importSchedules(db, sup, { rows: [baseRow(IDS.supPerson, 1)], requestId: 'p3c1-t4:0', replacePrevious: [{ id: 'schedule:x', version: 1 }] }), 403, '仅管理员')
    })

    // ---------- finishScheduleImport ----------
    await test('finish paged：仅处理本次 session 的旧排班，停用并同步考勤；重复调用幂等', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        store(db, 'mes_ops_schedules').set('schedule:old-a', { _id: 'schedule:old-a', date: DATE, personId: IDS.receiverPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', workshopId: IDS.workshop, personName: '朱钊', shiftName: '早班', startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, enabled: true, version: 5 })
        const prepared = await prepareScheduleImport(db, admin, { workshopId: IDS.workshop, rows: [baseRow(IDS.supPerson, 1)], ...RULE })
        await importSchedules(db, admin, { rows: prepared.rows, requestId: 'p3c1-t5:0', sessionId: 'p3c1-session5' })
        const payload = { workshopId: IDS.workshop, ...RULE, date: DATE, paged: true, sessionId: 'p3c1-session5', previousRows: [{ id: 'schedule:old-a', version: 5 }] }
        const first = await finishScheduleImport(db, admin, payload)
        assert.equal(first.removed, 1)
        assert.equal(first.paginationVersion, 1)
        assert.equal(doc(db, 'mes_ops_schedules', 'schedule:old-a').enabled, false)
        const restRow = [...store(db, 'mes_ops_attendance').values()].find(item => item.personId === IDS.receiverPerson && item.date === DATE)
        assert.equal(restRow, undefined, '原本没有考勤的旧排班停用后不凭空造考勤')
        const replay = await finishScheduleImport(db, admin, payload)
        assert.equal(replay.removed, 0, '第二次不再重复停用')
    })

    await test('finish paged：未找到本次导入 409 / 快照 1~20 条 400 / sessionId 非法 400', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        await expectError(() => finishScheduleImport(db, admin, { workshopId: IDS.workshop, ...RULE, date: DATE, paged: true, sessionId: 'p3c1-none', previousRows: [{ id: 'schedule:old-a', version: 1 }] }), 409, '未找到本次成功导入的排班')
        await expectError(() => finishScheduleImport(db, admin, { workshopId: IDS.workshop, ...RULE, date: DATE, paged: true, sessionId: 'p3c1-session6', previousRows: [] }), 400, '1～20')
        await expectError(() => finishScheduleImport(db, admin, { workshopId: IDS.workshop, ...RULE, date: DATE, paged: true, sessionId: 'x', previousRows: [{ id: 'schedule:old-a', version: 1 }] }), 400, '请求标识')
    })

    await test('finish legacy：停用未保留的旧排班并分页返回 cursor；范围外 409 / 版本不符 409', async () => {
        const { db } = createWriteDb()
        const { admin } = await profiles(db)
        const rows = db.ensure('mes_ops_schedules')
        for (let index = 0; index < 25; index++) rows.set('schedule:legacy-' + String(index).padStart(2, '0'), { _id: 'schedule:legacy-' + String(index).padStart(2, '0'), date: DATE, personId: IDS.receiverPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', workshopId: IDS.workshop, personName: '朱钊', startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, enabled: true, version: 1 })
        const keep = 'schedule:keep-1'
        rows.set(keep, { _id: keep, date: DATE, personId: IDS.supPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', workshopId: IDS.workshop, personName: '于家园', startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, enabled: true, version: 1 })
        const previousRows = [...rows.values()].filter(row => row._id !== keep).map(row => ({ id: row._id, version: 1 }))
        await expectError(() => finishScheduleImport(db, admin, { workshopId: IDS.workshop, ...RULE, date: DATE, keepIds: [keep], previousRows: previousRows.map(row => ({ ...row, version: 9 })) }), 409, '发生变更')
        await expectError(() => finishScheduleImport(db, admin, { workshopId: IDS.workshop, ...RULE, date: DATE, keepIds: ['schedule:not-in-scope'], previousRows }), 409, '不属于完整表的目标范围')
        const first = await finishScheduleImport(db, admin, { workshopId: IDS.workshop, ...RULE, date: DATE, keepIds: [keep], previousRows })
        assert.equal(first.removed, 20)
        assert.ok(first.nextCursor, '超过一页时返回 cursor')
        const second = await finishScheduleImport(db, admin, { workshopId: IDS.workshop, ...RULE, date: DATE, keepIds: [keep], previousRows, cursor: first.nextCursor })
        assert.equal(second.removed, 5)
        assert.equal(second.nextCursor, '')
    })

    console.log('\nP3-C1 排班导入：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

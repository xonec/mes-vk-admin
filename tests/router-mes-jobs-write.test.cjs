// P3-B2 工单写：createJob / jobCommand 从 mes-operations/jobs.js 1:1 内迁的行为回归。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const { createJob, jobCommand } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/jobs-write.js')
const scope = require('../uniCloud-alipay/cloudfunctions/router/util/mes/scope.js')

const profile = (db, uid, role) => scope.profile(db, { uid, role: role || [] })
const admin = db => profile(db, IDS.admin, ['admin'])
const sup = db => profile(db, IDS.sup)
const operator = db => profile(db, IDS.operator)
const receiver = db => profile(db, IDS.receiver)

const JOB_RECORD = over => ({
    batchNo: 'TEST261020A', processId: IDS.process, personIds: [IDS.supPerson],
    unit: 'case', targetQty: 100, plannedDate: '2026-10-21', ...over,
})

/** 直接调用 handler 并归一为 {code,message,data}。 */
async function run(fn, ...args) {
    try { return { code: 0, message: 'ok', data: await fn(...args) } }
    catch (error) { return { code: error.code || 500, message: error.message || String(error) } }
}

let passed = 0
let failed = 0
async function test(name, fn) {
    try { await fn(); passed += 1; console.log('  ✓ ' + name) }
    catch (error) { failed += 1; console.error('  ✗ ' + name); console.error('    ' + ((error && error.stack) || error)) }
}

;(async () => {
    console.log('\nP3-B2 工单写（createJob / jobCommand）')

    await test('createJob：主管派工成功，冻结订单快照、state=planned、v1 + 审计', async () => {
        const { db } = createWriteDb()
        const result = await run(createJob, db, await sup(db), { expectedVersion: 0, record: JOB_RECORD({ processId: IDS.process }) })
        assert.equal(result.code, 0)
        assert.equal(result.data.version, 1)
        assert.equal(result.data.state, 'planned')
        assert.equal(result.data.productCode, '9900000001')
        assert.equal(result.data.orderNo, '20261020')
        assert.equal(result.data.personNames[0], '于家园')
        assert.equal(result.data.audit.action, 'create')
        assert.equal(result.data.audit.actorName, '于家园')
        assert.ok(result.data.event.requestId.startsWith('create:'))
    })

    await test('createJob：重复派工 409；非主管 403', async () => {
        const { db } = createWriteDb()
        await createJob(db, await sup(db), { expectedVersion: 0, record: JOB_RECORD() })
        const duplicate = await run(createJob, db, await sup(db), { expectedVersion: 0, record: JOB_RECORD() })
        assert.equal(duplicate.code, 409)
        const forbidden = await run(createJob, db, await operator(db), { expectedVersion: 0, record: JOB_RECORD() })
        assert.equal(forbidden.code, 403)
        assert.match(forbidden.message, /仅对应车间负责人或管理员可排班派工/)
    })

    await test('createJob：批号/单位/计划数/人员/订单状态校验与旧实现一致', async () => {
        const { db } = createWriteDb()
        db.ensure('mes_ops_personnel').set('ops:personnel:YG-NOP', { _id: 'ops:personnel:YG-NOP', code: 'YG-NOP', name: '无工序人员', workshopId: IDS.workshop, workshopName: '301', processIds: [], processNames: [], scopeRole: 'operator', enabled: true, uid: '', version: 1 })
        const cases = [
            [{ batchNo: '123' }, 400, /完整生产批号/],
            [{ unit: 'box' }, 400, /瓶、箱或件/],
            [{ targetQty: 0 }, 400, /计划数/],
            [{ personIds: [] }, 400, /至少分配/],
            [{ personIds: ['ops:personnel:YG-NOP'] }, 400, /车间且具备此工序/],
            [{ processId: IDS.processOther }, 403, /仅对应车间负责人或管理员可排班派工/],
        ]
        for (const [over, code, message] of cases) {
            const result = await run(createJob, db, await sup(db), { expectedVersion: 0, record: JOB_RECORD(over) })
            assert.equal(result.code, code, JSON.stringify(over))
            assert.match(result.message, message)
        }
        const order = db.ensure('production_orders').get(IDS.order)
        order.orderStatus = 'draft'
        const draft = await run(createJob, db, await sup(db), { expectedVersion: 0, record: JOB_RECORD() })
        assert.equal(draft.code, 400)
        assert.match(draft.message, /没有启用的正式生产订单/)
    })

    await test('createJob：版本非 0 返回 409', async () => {
        const { db } = createWriteDb()
        const result = await run(createJob, db, await sup(db), { expectedVersion: 3, record: JOB_RECORD() })
        assert.equal(result.code, 409)
    })

    await test('jobCommand start：planned→running v2，设备匹配校验并写入事件', async () => {
        const { db } = createWriteDb()
        const result = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-start-0001', payload: { note: '开工', equipmentId: IDS.equipment, parameters: '温度 80' } })
        assert.equal(result.code, 0)
        assert.equal(result.data.state, 'running')
        assert.equal(result.data.version, 2)
        assert.equal(result.data.equipmentName, '灌装机1号')
        assert.equal(result.data.startParameters, '温度 80')
        assert.equal(result.data.event.type, 'start')
        assert.equal(result.data.event.actorName, '于家园')
    })

    await test('jobCommand start：非 planned 409；设备不匹配 400', async () => {
        const { db } = createWriteDb()
        db.ensure('mes_ops_resources').set('ops:resources:EQ-BAD', { _id: 'ops:resources:EQ-BAD', code: 'EQ-BAD', name: '错线设备', kind: 'equipment', workshopId: IDS.workshop, processId: IDS.processOther, enabled: true, version: 1 })
        const bad = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-start-0002', payload: { equipmentId: 'ops:resources:EQ-BAD' } })
        assert.equal(bad.code, 400)
        assert.match(bad.message, /开工设备或模具与工单工序、车间不一致/)
        await jobCommand(db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-start-0003', payload: {} })
        const again = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 2, requestId: 'test-start-0004', payload: {} })
        assert.equal(again.code, 409)
    })

    await test('jobCommand pause/resume：必须原因、状态严格', async () => {
        const { db } = createWriteDb()
        await jobCommand(db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-pause-0001', payload: {} })
        const noNote = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'pause', expectedVersion: 2, requestId: 'test-pause-0002', payload: {} })
        assert.equal(noNote.code, 400)
        assert.match(noNote.message, /请填写暂停原因/)
        const paused = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'pause', expectedVersion: 2, requestId: 'test-pause-0003', payload: { note: '等料' } })
        assert.equal(paused.code, 0)
        assert.equal(paused.data.state, 'paused')
        const resumed = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'resume', expectedVersion: 3, requestId: 'test-pause-0004', payload: { note: '继续' } })
        assert.equal(resumed.code, 0)
        assert.equal(resumed.data.state, 'running')
        const again = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'resume', expectedVersion: 4, requestId: 'test-pause-0005', payload: { note: '继续' } })
        assert.equal(again.code, 409)
    })

    await test('jobCommand report：累计产量/工时，未来日期与全零拒绝', async () => {
        const { db } = createWriteDb()
        await jobCommand(db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-report-0001', payload: {} })
        const allZero = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'report', expectedVersion: 2, requestId: 'test-report-0002', payload: { shiftId: IDS.shift, date: '2026-10-21', goodQty: 0, defectQty: 0, workHours: 0 } })
        assert.equal(allZero.code, 400)
        const future = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'report', expectedVersion: 2, requestId: 'test-report-0003', payload: { shiftId: IDS.shift, date: '2026-10-30', goodQty: 1, defectQty: 0, workHours: 1 } })
        assert.equal(future.code, 400)
        assert.match(future.message, /未来日期/)
        const first = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'report', expectedVersion: 2, requestId: 'test-report-0004', payload: { shiftId: IDS.shift, date: '2026-10-21', goodQty: 10, defectQty: 1, workHours: 4 } })
        assert.equal(first.code, 0)
        assert.equal(first.data.goodQty, 10)
        assert.equal(first.data.defectQty, 1)
        const second = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'report', expectedVersion: 3, requestId: 'test-report-0005', payload: { shiftId: IDS.shift, date: '2026-10-21', goodQty: 5, defectQty: 0, workHours: 2 } })
        assert.equal(second.code, 0)
        assert.equal(second.data.goodQty, 15)
        assert.equal(second.data.workHours, 6)
        assert.equal(second.data.event.shiftName, '早班（8小时）')
    })

    await test('jobCommand inbound：不能超已报合格数；累计正确；未来日期拒绝', async () => {
        const { db } = createWriteDb()
        await jobCommand(db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-inbound-0001', payload: {} })
        await jobCommand(db, await sup(db), { id: IDS.job, command: 'report', expectedVersion: 2, requestId: 'test-inbound-0002', payload: { shiftId: IDS.shift, date: '2026-10-21', goodQty: 10, defectQty: 0, workHours: 2 } })
        const tooMuch = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'inbound', expectedVersion: 3, requestId: 'test-inbound-0003', payload: { qty: 11 } })
        assert.equal(tooMuch.code, 400)
        assert.match(tooMuch.message, /不能超过已报合格数/)
        const ok = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'inbound', expectedVersion: 3, requestId: 'test-inbound-0004', payload: { qty: 4, documentNo: 'RK-001' } })
        assert.equal(ok.code, 0)
        assert.equal(ok.data.inboundQty, 4)
        const future = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'inbound', expectedVersion: 4, requestId: 'test-inbound-0005', payload: { qty: 1, date: '2026-10-30' } })
        assert.equal(future.code, 400)
    })

    await test('jobCommand complete：需说明与已报产量，完成后状态 closed', async () => {
        const { db } = createWriteDb()
        await jobCommand(db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-complete-0001', payload: {} })
        const noQty = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'complete', expectedVersion: 2, requestId: 'test-complete-0002', payload: { note: '完工' } })
        assert.equal(noQty.code, 400)
        assert.match(noQty.message, /请先报实际产量/)
        await jobCommand(db, await sup(db), { id: IDS.job, command: 'report', expectedVersion: 2, requestId: 'test-complete-0003', payload: { shiftId: IDS.shift, date: '2026-10-21', goodQty: 10, defectQty: 0, workHours: 2 } })
        const noNote = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'complete', expectedVersion: 3, requestId: 'test-complete-0004', payload: {} })
        assert.equal(noNote.code, 400)
        assert.match(noNote.message, /完工说明/)
        const done = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'complete', expectedVersion: 3, requestId: 'test-complete-0005', payload: { note: '完工' } })
        assert.equal(done.code, 0)
        assert.equal(done.data.state, 'completed')
        const reportAfter = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'report', expectedVersion: 4, requestId: 'test-complete-0006', payload: { shiftId: IDS.shift, date: '2026-10-21', goodQty: 1, defectQty: 0, workHours: 1 } })
        assert.equal(reportAfter.code, 409)
    })

    await test('jobCommand 幂等：同一 requestId 重放返回原结果，不重复累计', async () => {
        const { db } = createWriteDb()
        const first = await jobCommand(db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-idem-0001', payload: { note: '开工' } })
        const replay = await jobCommand(db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-idem-0001', payload: { note: '开工' } })
        assert.equal(replay.version, first.version)
        assert.equal(replay._id, first._id)
        assert.equal(db.ensure('mes_ops_jobs').get(IDS.job).version, 2)
        const conflict = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-idem-0001', payload: { note: '不同内容' } })
        assert.equal(conflict.code, 409)
    })

    await test('jobCommand 版本冲突 409 / 非法命令 400 / 请求标识非法 400', async () => {
        const { db } = createWriteDb()
        const stale = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 0, requestId: 'test-guard-0001', payload: {} })
        assert.equal(stale.code, 409)
        const invalid = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'boom', expectedVersion: 1, requestId: 'test-guard-0002', payload: {} })
        assert.equal(invalid.code, 400)
        const badRequest = await run(jobCommand, db, await sup(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'x', payload: {} })
        assert.equal(badRequest.code, 400)
        assert.match(badRequest.message, /请求标识/)
    })

    await test('jobCommand 权限：无该工序权限 403；工单不存在 404', async () => {
        const { db } = createWriteDb()
        const person = db.ensure('mes_ops_personnel').get(IDS.operatorPerson)
        person.processIds = []
        db.ensure('mes_ops_jobs').get(IDS.job).personIds = [IDS.operatorPerson]
        const forbidden = await run(jobCommand, db, await operator(db), { id: IDS.job, command: 'start', expectedVersion: 1, requestId: 'test-perm-0001', payload: {} })
        assert.equal(forbidden.code, 403)
        assert.match(forbidden.message, /已不具备此工序权限/)
        const missing = await run(jobCommand, db, await sup(db), { id: 'job:none', command: 'start', expectedVersion: 1, requestId: 'test-perm-0002', payload: {} })
        assert.equal(missing.code, 404)
    })

    console.log('\nP3-B2 工单写：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

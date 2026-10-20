// P3-B2 交接班/异常写：saveHandover / handoverCommand / saveException / resolveException 行为回归。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const { saveHandover, handoverCommand, saveException, resolveException } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/handovers-write.js')
const scope = require('../uniCloud-alipay/cloudfunctions/router/util/mes/scope.js')

const profile = (db, uid) => scope.profile(db, { uid, role: [] })
const sup = db => profile(db, IDS.sup)
const receiver = db => profile(db, IDS.receiver)
const operator = db => profile(db, IDS.operator)

const HANDOVER = over => ({
    date: '2026-10-21', nextDate: '2026-10-21',
    shiftId: IDS.shift, nextShiftId: IDS.shiftNight, processId: IDS.process,
    receiverId: IDS.receiverPerson, jobIds: [IDS.job], content: '交班内容', ...over,
})
const REQUEST = 'test-b2-handover-0001'

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
    console.log('\nP3-B2 交接班 / 异常写')

    await test('saveHandover：本人草稿创建 v1，冻结工单快照与接班账号', async () => {
        const { db } = createWriteDb()
        const result = await run(saveHandover, db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER() })
        assert.equal(result.code, 0)
        assert.equal(result.data.status, 'draft')
        assert.equal(result.data.version, 1)
        assert.equal(result.data.authorId, IDS.sup)
        assert.equal(result.data.receiverUid, IDS.receiver)
        assert.equal(result.data.jobSnapshots.length, 1)
        assert.equal(result.data.jobSnapshots[0]._id, IDS.job)
        assert.equal(result.data.jobSnapshots[0].state, 'planned')
        assert.deepEqual(result.data.batchNos, ['TEST261020A'])
        assert.equal(result.data.audit.action, 'create')
    })

    await test('saveHandover：新建幂等（同 requestId 同内容返回原记录，不同内容 409）', async () => {
        const { db } = createWriteDb()
        const first = await saveHandover(db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER() })
        const replay = await saveHandover(db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER() })
        assert.equal(replay._id, first._id)
        assert.equal(replay.version, 1)
        assert.equal(db.ensure('mes_ops_handovers').size, 1)
        const conflict = await run(saveHandover, db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER({ content: '改了内容' }) })
        assert.equal(conflict.code, 409)
        assert.match(conflict.message, /同一新建请求已提交不同内容/)
    })

    await test('saveHandover：内容/班次/日期/接班人员校验与旧实现一致', async () => {
        const { db } = createWriteDb()
        const cases = [
            [{ content: '' }, 400, /请填写交班内容/],
            [{ receiverId: IDS.otherPerson }, 400, /接班人员须绑定实际登录账号/],
            [{ nextShiftId: IDS.shift }, 400, /交班与接班班次不能相同/],
            [{ nextDate: '2026-10-20' }, 400, /接班日期不能早于交班日期/],
        ]
        for (const [over, code, message] of cases) {
            const result = await run(saveHandover, db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER(over) })
            assert.equal(result.code, code, JSON.stringify(over))
            assert.match(result.message, message)
        }
        const supProfile = await sup(db)
        db.ensure('mes_ops_personnel').get(IDS.receiverPerson).uid = IDS.sup
        const selfResult = await run(saveHandover, db, supProfile, { expectedVersion: 0, requestId: REQUEST, record: HANDOVER() })
        assert.equal(selfResult.code, 400)
        assert.match(selfResult.message, /不能为交班本人/)
    })

    await test('saveHandover：工单须属于所选车间/工序', async () => {
        const { db } = createWriteDb()
        db.ensure('mes_ops_jobs').get(IDS.job).processId = IDS.processOther
        const result = await run(saveHandover, db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER() })
        assert.equal(result.code, 400)
        assert.match(result.message, /交班工单须属于所选车间和工序/)
    })

    await test('saveHandover：草稿更新版本 +1；非本人不能改（无可见范围 403）', async () => {
        const { db } = createWriteDb()
        const draft = await saveHandover(db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER() })
        const updated = await run(saveHandover, db, await sup(db), { expectedVersion: 1, requestId: 'test-b2-handover-0002', record: HANDOVER({ _id: draft._id, content: '更新后的交班', changeReason: '补充内容' }) })
        assert.equal(updated.code, 0)
        assert.equal(updated.data.version, 2)
        assert.equal(updated.data.content, '更新后的交班')
        const other = await run(saveHandover, db, await operator(db), { expectedVersion: 2, requestId: 'test-b2-handover-0003', record: HANDOVER({ _id: draft._id, content: 'x', changeReason: 'x' }) })
        assert.equal(other.code, 403)
    })

    await test('handoverCommand submit：作者提交 draft→submitted；非草稿 409；重放幂等', async () => {
        const { db } = createWriteDb()
        const draft = await saveHandover(db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER() })
        const submit = await run(handoverCommand, db, await sup(db), { id: draft._id, command: 'submit', expectedVersion: 1, requestId: 'test-b2-submit-0001', note: '提交交班' })
        assert.equal(submit.code, 0)
        assert.equal(submit.data.status, 'submitted')
        assert.equal(submit.data.version, 2)
        const replay = await handoverCommand(db, await sup(db), { id: draft._id, command: 'submit', expectedVersion: 1, requestId: 'test-b2-submit-0001', note: '提交交班' })
        assert.equal(replay.version, 2)
        const again = await run(handoverCommand, db, await sup(db), { id: draft._id, command: 'submit', expectedVersion: 2, requestId: 'test-b2-submit-0002', note: '再提交' })
        assert.equal(again.code, 409)
    })

    await test('handoverCommand receive：只有指定接班本人可以签收；第三人 403', async () => {
        const { db } = createWriteDb()
        const draft = await saveHandover(db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER() })
        await handoverCommand(db, await sup(db), { id: draft._id, command: 'submit', expectedVersion: 1, requestId: 'test-b2-recv-0001', note: '提交交班' })
        const third = await run(handoverCommand, db, await sup(db), { id: draft._id, command: 'receive', expectedVersion: 2, requestId: 'test-b2-recv-0002', note: '代收' })
        assert.equal(third.code, 403)
        assert.match(third.message, /只有指定的接班本人可以确认接班/)
        const received = await run(handoverCommand, db, await receiver(db), { id: draft._id, command: 'receive', expectedVersion: 2, requestId: 'test-b2-recv-0003', note: '已核对' })
        assert.equal(received.code, 0)
        assert.equal(received.data.status, 'received')
        assert.equal(received.data.version, 3)
        assert.equal(received.data.receivedBy, IDS.receiver)
        assert.equal(received.data.receiveNote, '已核对')
        const again = await run(handoverCommand, db, await receiver(db), { id: draft._id, command: 'receive', expectedVersion: 3, requestId: 'test-b2-recv-0004', note: '再收' })
        assert.equal(again.code, 409)
    })

    await test('handoverCommand：非法命令 400 / 版本过期 409', async () => {
        const { db } = createWriteDb()
        const draft = await saveHandover(db, await sup(db), { expectedVersion: 0, requestId: REQUEST, record: HANDOVER() })
        const invalid = await run(handoverCommand, db, await sup(db), { id: draft._id, command: 'boom', expectedVersion: 1, requestId: 'test-b2-cmd-0001', note: '' })
        assert.equal(invalid.code, 400)
        const stale = await run(handoverCommand, db, await sup(db), { id: draft._id, command: 'submit', expectedVersion: 0, requestId: 'test-b2-cmd-0002', note: '提交' })
        assert.equal(stale.code, 409)
    })

    await test('saveException：从可见工单创建 v1/open，冻结工单信息', async () => {
        const { db } = createWriteDb()
        const result = await run(saveException, db, await sup(db), { expectedVersion: 0, requestId: 'test-b2-exc-0001', record: { jobId: IDS.job, category: '设备', description: '灌装机异响' } })
        assert.equal(result.code, 0)
        assert.equal(result.data.status, 'open')
        assert.equal(result.data.version, 1)
        assert.equal(result.data.jobId, IDS.job)
        assert.equal(result.data.jobVersion, 1)
        assert.equal(result.data.batchNo, 'TEST261020A')
        assert.equal(result.data.audit.action, 'create')
    })

    await test('saveException：分类/描述必填；不可见工单 403；新建幂等', async () => {
        const { db } = createWriteDb()
        for (const [record, message] of [[{ jobId: IDS.job, category: '', description: 'x' }, /异常分类和情况描述/], [{ jobId: IDS.job, category: '设备', description: '' }, /异常分类和情况描述/]]) {
            const result = await run(saveException, db, await sup(db), { expectedVersion: 0, requestId: 'test-b2-exc-0002', record })
            assert.equal(result.code, 400)
            assert.match(result.message, message)
        }
        const invisible = await run(saveException, db, await operator(db), { expectedVersion: 0, requestId: 'test-b2-exc-0003', record: { jobId: IDS.job, category: '设备', description: 'x' } })
        assert.equal(invisible.code, 403)
        const first = await saveException(db, await sup(db), { expectedVersion: 0, requestId: 'test-b2-exc-0004', record: { jobId: IDS.job, category: '设备', description: '异响' } })
        const replay = await saveException(db, await sup(db), { expectedVersion: 0, requestId: 'test-b2-exc-0004', record: { jobId: IDS.job, category: '设备', description: '异响' } })
        assert.equal(replay._id, first._id)
        assert.equal(replay.version, 1)
        assert.equal(db.ensure('mes_ops_exceptions').size, 1)
    })

    await test('saveException：open 状态可更正但版本+1；不能改挂工单', async () => {
        const { db } = createWriteDb()
        const created = await saveException(db, await sup(db), { expectedVersion: 0, requestId: 'test-b2-exc-0005', record: { jobId: IDS.job, category: '设备', description: '异响' } })
        const updated = await run(saveException, db, await sup(db), { expectedVersion: 1, requestId: 'test-b2-exc-0006', record: { _id: created._id, jobId: IDS.job, category: '设备', description: '异响（补充）', changeReason: '补充描述' } })
        assert.equal(updated.code, 0)
        assert.equal(updated.data.version, 2)
        db.ensure('mes_ops_jobs').set('job:other', { _id: 'job:other', batchNo: 'TEST261020A', productCode: '9900000001', productName: 'TEST-测试产品', processId: IDS.process, processName: '罐装机', workshopId: IDS.workshop, workshopName: '301', personIds: [IDS.supPerson], personNames: ['于家园'], version: 1 })
        const move = await run(saveException, db, await sup(db), { expectedVersion: 2, requestId: 'test-b2-exc-0007', record: { _id: created._id, jobId: 'job:other', category: '设备', description: 'x', changeReason: '改挂' } })
        assert.equal(move.code, 400)
        assert.match(move.message, /不能改挂其他工单/)
    })

    await test('resolveException：仅对应主管可解决，resolution 必填，二次解决 409', async () => {
        const { db } = createWriteDb()
        const created = await saveException(db, await sup(db), { expectedVersion: 0, requestId: 'test-b2-res-0001', record: { jobId: IDS.job, category: '设备', description: '异响' } })
        const empty = await run(resolveException, db, await sup(db), { id: created._id, expectedVersion: 1, resolution: '' })
        assert.equal(empty.code, 400)
        assert.match(empty.message, /请填写异常处置结果/)
        const forbidden = await run(resolveException, db, await operator(db), { id: created._id, expectedVersion: 1, resolution: '已处理' })
        assert.equal(forbidden.code, 403)
        const resolved = await run(resolveException, db, await sup(db), { id: created._id, expectedVersion: 1, resolution: '更换轴承，已恢复' })
        assert.equal(resolved.code, 0)
        assert.equal(resolved.data.status, 'resolved')
        assert.equal(resolved.data.version, 2)
        assert.equal(resolved.data.resolution, '更换轴承，已恢复')
        assert.equal(resolved.data.resolvedBy, IDS.sup)
        const again = await run(resolveException, db, await sup(db), { id: created._id, expectedVersion: 2, resolution: '再处理' })
        assert.equal(again.code, 409)
    })

    await test('saveException：已解决异常不能覆盖', async () => {
        const { db } = createWriteDb()
        const created = await saveException(db, await sup(db), { expectedVersion: 0, requestId: 'test-b2-res-0002', record: { jobId: IDS.job, category: '设备', description: '异响' } })
        await resolveException(db, await sup(db), { id: created._id, expectedVersion: 1, resolution: '已处理' })
        const overwrite = await run(saveException, db, await sup(db), { expectedVersion: 2, requestId: 'test-b2-res-0003', record: { _id: created._id, jobId: IDS.job, category: '设备', description: '改', changeReason: 'x' } })
        assert.equal(overwrite.code, 403)
        assert.match(overwrite.message, /已解决异常不能修改/)
    })

    console.log('\nP3-B2 交接班 / 异常写：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

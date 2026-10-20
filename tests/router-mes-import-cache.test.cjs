// P3-C1 导入预取缓存（import-cache）单测：命中/未命中回退、窗口同步、批次订单、413 降级。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const { createImportCache } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/import-cache.js')

const store = (db, name) => db.ensure(name)
const localDate = (offsetDays) => new Date(Date.parse('2026-11-30T00:00:00Z') + offsetDays * 86400000).toISOString().slice(0, 10)

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
    console.log('\nP3-C1 导入预取缓存（import-cache）')

    await test('目录资料：命中返回记录、已确认不存在返回 null、未预取返回 hit:false', async () => {
        const { db } = createWriteDb()
        const cache = await createImportCache(db, { rows: [{ personId: IDS.supPerson, date: '2026-11-30' }, { personId: 'ops:personnel:NOT-EXIST', date: '2026-11-30' }] })
        const hit = cache.catalog('personnel', IDS.supPerson)
        assert.equal(hit.hit, true)
        assert.equal(hit.record.name, '于家园')
        const absent = cache.catalog('personnel', 'ops:personnel:NOT-EXIST')
        assert.equal(absent.hit, true)
        assert.equal(absent.record, null)
        // 未出现在 rows 里的键不预取，调用方回退单条读取
        assert.equal(cache.catalog('personnel', IDS.otherPerson).hit, false)
        assert.equal(cache.catalog('processes', IDS.process).hit, true, '工序目录整表预取')
        assert.equal(cache.catalog('shifts', IDS.shift).record.code, 'E8')
    })

    await test('已有排班：按 _id 预取命中、未命中返回 hit:false；写入后 putSchedule 同步缓存', async () => {
        const { db } = createWriteDb()
        const scheduleId = 'schedule:exists-1'
        store(db, 'mes_ops_schedules').set(scheduleId, { _id: scheduleId, date: '2026-11-30', personId: IDS.supPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', enabled: true, version: 2 })
        const cache = await createImportCache(db, { rows: [{ _id: scheduleId, personId: IDS.supPerson, date: '2026-11-30' }, { _id: 'schedule:absent-1', personId: IDS.supPerson, date: '2026-11-30' }] })
        assert.equal(cache.schedule(scheduleId).record.version, 2)
        assert.equal(cache.schedule('schedule:absent-1').hit, true)
        assert.equal(cache.schedule('schedule:absent-1').record, null)
        assert.equal(cache.schedule('schedule:not-in-batch').hit, false)
        cache.putSchedule({ _id: 'schedule:absent-1', date: '2026-11-30', personId: IDS.supPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', enabled: true, version: 1 })
        assert.equal(cache.schedule('schedule:absent-1').record.version, 1)
    })

    await test('人员排班窗口：完整预取后返回同人窗口并用写入同步；超限降级为 null', async () => {
        const { db } = createWriteDb()
        store(db, 'mes_ops_schedules').set('schedule:window-1', { _id: 'schedule:window-1', date: localDate(-1), personId: IDS.supPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', enabled: true, version: 1 })
        const cache = await createImportCache(db, { rows: [{ personId: IDS.supPerson, date: '2026-11-30' }] })
        const window = cache.personSchedules(IDS.supPerson)
        assert.ok(Array.isArray(window), '窗口应完整预取')
        assert.equal(window.length, 1)
        cache.putSchedule({ _id: 'schedule:window-2', date: '2026-11-30', personId: IDS.supPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', enabled: true, version: 1 })
        assert.equal(cache.personSchedules(IDS.supPerson).length, 2, '写入后窗口同步')
        cache.putSchedule({ _id: 'schedule:window-2', date: '2026-11-30', personId: IDS.supPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', enabled: false, version: 2 })
        assert.equal(cache.personSchedules(IDS.supPerson).length, 1, '停用后从窗口移除')

        // 超过 MAX_WINDOW 时 all() 抛 413 → 窗口降级为 null（调用方回退区间查询）
        const big = createWriteDb()
        const rows = big.db.ensure('mes_ops_schedules')
        for (let index = 0; index < 4005; index++) rows.set('schedule:big-' + index, { _id: 'schedule:big-' + index, date: '2026-11-30', personId: IDS.supPerson, shiftId: IDS.shift, processId: IDS.process, kind: 'work', enabled: true, version: 1 })
        const degraded = await createImportCache(big.db, { rows: [{ personId: IDS.supPerson, date: '2026-11-30' }] })
        assert.equal(degraded.personSchedules(IDS.supPerson), null)
    })

    await test('批次订单：命中返回订单数组，无订单返回空数组，未预取返回 null；重复批号原样保留两条', async () => {
        const { db } = createWriteDb()
        store(db, 'production_orders').set('order:dup', { _id: 'order:dup', orderNo: '20261099', batchNo: 'TEST261099A', orderStatus: 'confirmed', enabled: true, version: 1 })
        store(db, 'production_orders').set('order:dup2', { _id: 'order:dup2', orderNo: '20261098', batchNo: 'TEST261099A', orderStatus: 'confirmed', enabled: true, version: 1 })
        const cache = await createImportCache(db, { rows: [{ personId: IDS.supPerson, date: '2026-11-30', batchNos: ['TEST261020A'] }, { personId: IDS.supPerson, date: '2026-11-30', batchNos: ['test261099a'] }, { personId: IDS.supPerson, date: '2026-11-30', batchNos: ['TEST-NONE'] }] })
        assert.equal(cache.orders('TEST261020A').length, 1)
        assert.equal(cache.orders('TEST261020A')[0].orderNo, '20261020')
        assert.equal(cache.orders('TEST261099A').length, 2, '重复批号保留两条，由调用方按原逻辑报 409')
        assert.deepEqual(cache.orders('TEST-NONE'), [])
        assert.equal(cache.orders('TEST-NOT-IN-BATCH'), null)
    })

    console.log('\nP3-C1 导入预取缓存：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

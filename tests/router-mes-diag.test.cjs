// P3-B3 诊断入口（admin-only）：权限、参数校验、native 考勤同步异常原样透传、只读检查。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const diagEntry = require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/diag.js')

function makeUniID() {
    return { checkToken: async (token) => (String(token).startsWith('tok-') ? { code: 0, uid: String(token).slice(4) } : { code: 30204 }) }
}
function call(db, uid, data, options = {}) {
    const event = {
        data: { $url: 'mes/pub/diag', ...data },
        uniIdToken: options.token === undefined ? 'tok-' + uid : options.token,
        util: { db, uniID: makeUniID() },
    }
    return diagEntry.main(event)
}
const SCHEDULE = over => ({
    personId: IDS.supPerson, personName: '于家园', workshopId: IDS.workshop, workshopName: '301',
    date: '2026-10-22', kind: 'work', shiftId: IDS.shift, shiftName: '早班（8小时）',
    processId: IDS.process, processName: '罐装机',
    startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, plannedHours: 8, enabled: true, version: 1, ...over,
})
const seedSchedule = (db, id, over) => db.ensure('mes_ops_schedules').set(id, { _id: id, ...SCHEDULE(over) })
const seedAttendance = (db, id, over) => db.ensure('mes_ops_attendance').set(id, { _id: id, personId: IDS.supPerson, personName: '于家园', workshopId: IDS.workshop, date: '2026-10-22', kind: 'work', shiftId: IDS.shift, shiftName: '早班（8小时）', processIds: [IDS.process], processNames: ['罐装机'], startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0, plannedHours: 8, workHours: 8, source: 'schedule', version: 2, edited: true, conflict: null, scheduleRemoved: false, ...over })

let passed = 0
let failed = 0
async function test(name, fn) {
    try { await fn(); passed += 1; console.log('  ✓ ' + name) }
    catch (error) { failed += 1; console.error('  ✗ ' + name); console.error('    ' + ((error && error.stack) || error)) }
}

;(async () => {
    console.log('\nP3-B3 诊断入口 mes/pub/diag')

    await test('缺 token 401；缺 action 400；不支持的 action 400', async () => {
        const { db } = createWriteDb()
        const noToken = await call(db, IDS.admin, { action: 'inspect', personId: IDS.supPerson, date: '2026-10-22' }, { token: '' })
        assert.equal(noToken.code, 401)
        const missing = await call(db, IDS.admin, {})
        assert.equal(missing.code, 400)
        assert.equal(missing.message, '缺少 action 参数')
        const unknown = await call(db, IDS.admin, { action: 'delete-all' })
        assert.equal(unknown.code, 400)
        assert.equal(unknown.message, '不支持的 action 参数')
    })

    await test('非管理员 403；普通操作员不能调用诊断入口', async () => {
        const { db } = createWriteDb()
        for (const action of ['sync-person', 'inspect', 'old-shift-row', 'write-probe', 'db-check', 'safety-scan']) {
            const result = await call(db, IDS.operator, { action, personId: IDS.supPerson, date: '2026-10-22' })
            assert.equal(result.code, 403, action)
            assert.equal(result.message, '仅管理员可以使用诊断入口')
        }
    })

    await test('sync-person 参数校验：缺 personId / 非法 date / 范围颠倒 / 范围超限', async () => {
        const { db } = createWriteDb()
        const cases = [
            [{ action: 'sync-person', date: '2026-10-22' }, 400, /人员缺失或非法/],
            [{ action: 'sync-person', personId: IDS.supPerson, date: '2026-13-01' }, 400, /不是有效日期/],
            [{ action: 'sync-person', personId: IDS.supPerson }, 400, /请提供 date 或 dateFrom\/dateTo/],
            [{ action: 'sync-person', personId: IDS.supPerson, dateFrom: '2026-10-22', dateTo: '2026-10-21' }, 400, /开始日期不能晚于结束日期/],
            [{ action: 'sync-person', personId: IDS.supPerson, dateFrom: '2026-01-01', dateTo: '2026-12-31' }, 400, /最多 31 天/],
        ]
        for (const [data, code, message] of cases) {
            const result = await call(db, IDS.admin, data)
            assert.equal(result.code, code, JSON.stringify(data))
            assert.match(result.message, message)
        }
    })

    await test('sync-person 成功：返回每日考勤行，真实写入 source=schedule', async () => {
        const { db } = createWriteDb()
        seedSchedule(db, 'schedule:diag:1')
        const result = await call(db, IDS.admin, { action: 'sync-person', personId: IDS.supPerson, date: '2026-10-22' })
        assert.equal(result.code, 0)
        assert.equal(result.data.personId, IDS.supPerson)
        assert.equal(result.data.dates[0], '2026-10-22')
        const day = result.data.results[0]
        assert.equal(day.attendance.length, 1)
        assert.equal(day.attendance[0].source, 'schedule')
        assert.equal(db.ensure('mes_ops_attendance').size, 1)
    })

    await test('sync-person 区间模式：逐日同步并返回结果列表', async () => {
        const { db } = createWriteDb()
        seedSchedule(db, 'schedule:diag:r1', { date: '2026-10-21' })
        seedSchedule(db, 'schedule:diag:r2', { date: '2026-10-22' })
        const result = await call(db, IDS.admin, { action: 'sync-person', personId: IDS.supPerson, dateFrom: '2026-10-21', dateTo: '2026-10-22' })
        assert.equal(result.code, 0)
        assert.deepEqual(result.data.dates, ['2026-10-21', '2026-10-22'])
        assert.equal(result.data.results.length, 2)
        assert.equal(db.ensure('mes_ops_attendance').size, 2)
    })

    await test('sync-person 异常原样透传：code 900 + name/message/stack/date（不被吞成 500）', async () => {
        const { db } = createWriteDb()
        seedSchedule(db, 'schedule:diag:err')
        db.failWrite = 'mes_ops_attendance'
        const originalError = console.error
        try {
            const result = await call(db, IDS.admin, { action: 'sync-person', personId: IDS.supPerson, date: '2026-10-22' })
            assert.equal(result.code, 900)
            assert.equal(result.name, 'Error')
            assert.equal(result.message, 'write failed')
            assert.ok(result.stack && result.stack.length > 0, '应返回 stack')
            assert.equal(result.date, '2026-10-22')
        } finally { console.error = originalError; db.failWrite = null }
    })

    await test('inspect：返回考勤行/排班/版本/人员锁，只读不写库', async () => {
        const { db } = createWriteDb()
        seedSchedule(db, 'schedule:diag:inspect')
        seedAttendance(db, 'attendance:diag:inspect')
        db.ensure('mes_ops_versions').set('ver:schedule:diag:inspect:1', { _id: 'ver:schedule:diag:inspect:1', entityId: 'schedule:diag:inspect', entityType: 'schedules', version: 1, savedAt: '2026-10-21T00:00:00.000Z', snapshot: { shiftId: IDS.shift, version: 1 } })
        db.ensure('mes_ops_locks').set('schedule-person:lock', { _id: 'schedule-person:lock', owner: 'abc', expiresAt: Date.now() + 1000 })
        const before = db.ensure('mes_ops_attendance').size
        const result = await call(db, IDS.admin, { action: 'inspect', personId: IDS.supPerson, date: '2026-10-22' })
        assert.equal(result.code, 0)
        assert.equal(result.data.attendance.length, 1)
        assert.equal(result.data.attendance[0]._id, 'attendance:diag:inspect')
        assert.equal(result.data.schedules.length, 1)
        assert.equal(result.data.schedules[0]._id, 'schedule:diag:inspect')
        assert.equal(result.data.scheduleVersions.length, 1)
        assert.equal(result.data.scheduleVersions[0].shiftId, IDS.shift)
        assert.ok('lock' in result.data)
        assert.equal(db.ensure('mes_ops_attendance').size, before, 'inspect 不应写库')
    })

    await test('write-probe：仅 2026-10-22 TEST 行；输出 A/B/C/C2/D/E 结果并恢复 conflict', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:diag:probe', { version: 3, conflict: null })
        const result = await call(db, IDS.admin, { action: 'write-probe', id: 'attendance:diag:probe' })
        assert.equal(result.code, 0)
        const forms = result.data.results.map(item => item.form)
        for (const form of ['A-plain-null-to-object', 'B-two-step-empty-then-fields', 'C-command-set-with-cas', 'C2-command-set-wrong-version', 'D-doc-set-full-replace', 'E-command-set-mixed-with-cas', 'restore']) {
            assert.ok(forms.includes(form), '缺少实验项 ' + form)
        }
        const restore = result.data.results.find(item => item.form === 'restore')
        assert.equal(restore.ok, true)
        assert.equal(restore.state.conflict, null, '实验后应恢复 conflict 原值 null')
        assert.equal(restore.state.version, 3, 'raw 实验不应改版本号')
    })

    await test('write-probe：非 attendance / 非 2026-10-22 / 不存在 均拒绝', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:diag:probe2', { date: '2026-10-21' })
        const notAttendance = await call(db, IDS.admin, { action: 'write-probe', id: 'schedule:x' })
        assert.equal(notAttendance.code, 400)
        assert.match(notAttendance.message, /仅允许 attendance/)
        const wrongDate = await call(db, IDS.admin, { action: 'write-probe', id: 'attendance:diag:probe2' })
        assert.equal(wrongDate.code, 400)
        assert.match(wrongDate.message, /2026-10-22/)
        const missing = await call(db, IDS.admin, { action: 'write-probe', id: 'attendance:none' })
        assert.equal(missing.code, 404)
    })

    await test('db-check/safety-scan：显式 null 统计正确（含样本 id），支持自定义 checks 与非法校验', async () => {
        const { db } = createWriteDb()
        db.ensure('mes_ops_attendance').set('a1', { _id: 'a1', conflict: null })
        db.ensure('mes_ops_attendance').set('a2', { _id: 'a2' })
        db.ensure('mes_ops_attendance').set('a3', { _id: 'a3', conflict: { detectedAt: 1 } })
        db.ensure('mes_ops_workshops').set('w1', { _id: 'w1', audit: null })
        db.ensure('mes_ops_workshops').set('w2', { _id: 'w2', audit: { action: 'create' } })
        const checks = [{ collection: 'mes_ops_attendance', field: 'conflict' }, { collection: 'mes_ops_workshops', field: 'audit' }]
        const result = await call(db, IDS.admin, { action: 'db-check', checks })
        assert.equal(result.code, 0)
        const attendance = result.data.results.find(item => item.collection === 'mes_ops_attendance')
        assert.equal(attendance.total, 3)
        assert.equal(attendance.exists, 2)
        assert.equal(attendance.nonNull, 1)
        assert.equal(attendance.explicitNull, 1)
        assert.equal(attendance.nullOrMissing, 2)
        assert.deepEqual(attendance.samples, ['a1'])
        const workshops = result.data.results.find(item => item.collection === 'mes_ops_workshops')
        assert.equal(workshops.explicitNull, 1)
        assert.deepEqual(workshops.samples, ['w1'])
        const alias = await call(db, IDS.admin, { action: 'safety-scan', checks })
        assert.equal(alias.code, 0)
        assert.equal(alias.data.results.length, 2)
        const invalid = await call(db, IDS.admin, { action: 'db-check', checks: [{ collection: 'bad-name!', field: 'x' }] })
        assert.equal(invalid.code, 400)
        assert.match(invalid.message, /抽查集合\/字段非法/)
    })

    await test('inspect 别名 old-shift-row 可用；参数校验与权限一致', async () => {
        const { db } = createWriteDb()
        seedAttendance(db, 'attendance:diag:alias')
        const result = await call(db, IDS.admin, { action: 'old-shift-row', personId: IDS.supPerson, date: '2026-10-22' })
        assert.equal(result.code, 0)
        assert.equal(result.data.attendance.length, 1)
        const bad = await call(db, IDS.admin, { action: 'inspect', personId: IDS.supPerson })
        assert.equal(bad.code, 400)
    })

    console.log('\nP3-B3 诊断入口：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

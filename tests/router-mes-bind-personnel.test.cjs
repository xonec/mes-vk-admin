// P3-B4 bindPersonnelAccounts：按员工档案绑人员账号（dryRun/唯一姓名/同名多义跳过/归档审计/幂等/literalUpdate）。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const { bindPersonnelAccounts } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/bind-personnel.js')
const scope = require('../uniCloud-alipay/cloudfunctions/router/util/mes/scope.js')
const { dispatch } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')

const profile = (db, uid, role) => scope.profile(db, { uid, role: role || [] })
const admin = db => profile(db, IDS.admin, ['admin'])
const operator = db => profile(db, IDS.operator)

function seedEmployee(db, id, name, uid, over) {
    db.ensure('mes_employee_accounts').set(id, { _id: id, state: 'ready', name, uid, employeeNo: id, ...over })
}
function seedPerson(db, id, name, over) {
    db.ensure('mes_ops_personnel').set(id, { _id: id, code: id.split(':').pop(), name, workshopId: IDS.workshop, workshopName: '301', processIds: [], processNames: [], scopeRole: 'operator', enabled: true, uid: '', version: 1, ...over })
}
function makeUniID(validUids) {
    return { checkToken: async (token) => (validUids.indexOf(String(token).replace('tok-', '')) >= 0 ? { code: 0, uid: String(token).replace('tok-', '') } : { code: 30204 }) }
}
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
    console.log('\nP3-B4 人员账号绑定（bindPersonnelAccounts）')

    await test('dryRun：只出计划，不写库、不升版本、不归档', async () => {
        const { db } = createWriteDb()
        seedEmployee(db, 'emp:1', '甲', 'u-1')
        seedPerson(db, 'ops:personnel:YG-A', '甲')
        const result = await run(bindPersonnelAccounts, db, await admin(db), { dryRun: true })
        assert.equal(result.code, 0)
        assert.equal(result.data.dryRun, true)
        assert.equal(result.data.bound, 1)
        assert.equal(result.data.skipped.find(item => item.reason.indexOf('dryRun') >= 0).planUid, 'u-1')
        const person = db.ensure('mes_ops_personnel').get('ops:personnel:YG-A')
        assert.equal(person.uid, '')
        assert.equal(person.version, 1)
        assert.equal(db.ensure('mes_ops_versions').size, 0)
    })

    await test('真实绑定：uid 写入、版本 +1、audit、旧快照归档', async () => {
        const { db } = createWriteDb()
        seedEmployee(db, 'emp:1', '甲', 'u-1')
        seedPerson(db, 'ops:personnel:YG-A', '甲')
        const result = await run(bindPersonnelAccounts, db, await admin(db), {})
        assert.equal(result.code, 0)
        assert.equal(result.data.bound, 1)
        const person = db.ensure('mes_ops_personnel').get('ops:personnel:YG-A')
        assert.equal(person.uid, 'u-1')
        assert.equal(person.version, 2)
        assert.equal(person.audit.action, 'update')
        assert.equal(person.audit.reason, '按员工档案绑定登录账号')
        assert.deepEqual(person.audit.changedFields, ['uid'])
        const archive = db.ensure('mes_ops_versions').get('ver:ops:personnel:YG-A:1')
        assert.ok(archive, '旧快照应归档')
        assert.equal(archive.snapshot.uid, '')
        assert.equal(archive.entityType, 'personnel')
    })

    await test('同名多义：员工侧/人员侧同名都跳过并记 ambiguous', async () => {
        const { db } = createWriteDb()
        seedEmployee(db, 'emp:1', '乙', 'u-1')
        seedEmployee(db, 'emp:2', '乙', 'u-2')
        seedPerson(db, 'ops:personnel:YG-B', '乙')
        const employeeSide = await bindPersonnelAccounts(db, await admin(db), { dryRun: true })
        assert.equal(employeeSide.bound, 0)
        assert.ok(employeeSide.ambiguous.includes('乙'))
        const { db: db2 } = createWriteDb()
        seedEmployee(db2, 'emp:1', '丙', 'u-1')
        seedPerson(db2, 'ops:personnel:YG-C1', '丙')
        seedPerson(db2, 'ops:personnel:YG-C2', '丙')
        const personSide = await bindPersonnelAccounts(db2, await admin(db2), { dryRun: true })
        assert.equal(personSide.bound, 0)
        assert.ok(personSide.ambiguous.includes('丙'))
    })

    await test('已绑不同账号/已绑相同账号/找不到同名：均跳过', async () => {
        const { db } = createWriteDb()
        seedEmployee(db, 'emp:1', '丁', 'u-1')
        seedEmployee(db, 'emp:2', '戊', 'u-2')
        seedPerson(db, 'ops:personnel:YG-D', '丁', { uid: 'u-other', version: 3 })
        seedPerson(db, 'ops:personnel:YG-E', '戊', { uid: 'u-2', version: 2 })
        seedPerson(db, 'ops:personnel:YG-F', '己')
        const result = await bindPersonnelAccounts(db, await admin(db), {})
        assert.equal(result.bound, 0)
        assert.ok(result.skipped.find(item => item.reason === '人员档案已绑定其他账号，需人工核对'))
        assert.ok(result.skipped.find(item => item.reason === '已绑定相同账号，无需重复'))
        assert.ok(result.skipped.find(item => item.reason === '员工档案中找不到同名账号'))
        assert.equal(db.ensure('mes_ops_personnel').get('ops:personnel:YG-D').uid, 'u-other')
        assert.equal(db.ensure('mes_ops_personnel').get('ops:personnel:YG-E').uid, 'u-2')
    })

    await test('幂等：第二次执行 bound=0，版本/归档不新增', async () => {
        const { db } = createWriteDb()
        seedEmployee(db, 'emp:1', '甲', 'u-1')
        seedPerson(db, 'ops:personnel:YG-A', '甲')
        await bindPersonnelAccounts(db, await admin(db), {})
        const versionsBefore = db.ensure('mes_ops_versions').size
        const second = await bindPersonnelAccounts(db, await admin(db), {})
        assert.equal(second.bound, 0)
        assert.equal(db.ensure('mes_ops_personnel').get('ops:personnel:YG-A').version, 2)
        assert.equal(db.ensure('mes_ops_versions').size, versionsBefore)
    })

    await test('非管理员 403；人员姓名为空/无员工档案 skip', async () => {
        const { db } = createWriteDb()
        seedEmployee(db, 'emp:1', '甲', 'u-1')
        seedPerson(db, 'ops:personnel:YG-A', '甲')
        seedPerson(db, 'ops:personnel:YG-EMPTY', '')
        const forbidden = await run(bindPersonnelAccounts, db, await operator(db), {})
        assert.equal(forbidden.code, 403)
        assert.match(forbidden.message, /仅管理员可执行人员账号绑定/)
        const result = await bindPersonnelAccounts(db, await admin(db), { dryRun: true })
        assert.ok(result.skipped.find(item => item.reason === '人员姓名为空'))
    })

    await test('历史 audit:null 人员行也能绑定（literalUpdate 兼容）', async () => {
        const { db } = createWriteDb()
        seedEmployee(db, 'emp:1', '庚', 'u-7')
        seedPerson(db, 'ops:personnel:YG-G', '庚', { audit: null, version: 5 })
        const result = await run(bindPersonnelAccounts, db, await admin(db), {})
        assert.equal(result.code, 0)
        assert.equal(result.data.bound, 1)
        const person = db.ensure('mes_ops_personnel').get('ops:personnel:YG-G')
        assert.equal(person.uid, 'u-7')
        assert.equal(person.version, 6)
        assert.equal(person.audit.actorId, IDS.admin)
    })

    await test('dispatch：admin native bindPersonnelAccounts dryRun 成功；缺 token 401', async () => {
        const { db } = createWriteDb()
        seedEmployee(db, 'emp:1', '甲', 'u-1')
        seedPerson(db, 'ops:personnel:YG-A', '甲')
        routing.clearCache()
        db.ensure('vk-global-data').set('mes-native-switch', { _id: 'mes-native-switch', actions: { bindPersonnelAccounts: 'native' } })
        const uniID = makeUniID([IDS.admin])
        const result = await dispatch({ data: { dryRun: true }, uniIdToken: 'tok-' + IDS.admin, util: { db, uniID } }, { action: 'bindPersonnelAccounts' })
        assert.equal(result.code, 0, JSON.stringify(result))
        assert.equal(result.data.bound, 1)
        assert.equal(db.ensure('mes_ops_personnel').get('ops:personnel:YG-A').uid, '', 'dryRun 不写库')
        const missing = await dispatch({ data: { dryRun: true }, util: { db, uniID } }, { action: 'bindPersonnelAccounts' })
        assert.equal(missing.code, 401)
        routing.clearCache()
    })

    console.log('\nP3-B4 人员账号绑定：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

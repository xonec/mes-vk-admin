// P3-B4 claims：claimCandidates / myPersonnelClaim / listPersonnelClaims（读）+ requestPersonnelClaim / reviewPersonnelClaim（写，可切换）。
const assert = require('node:assert/strict')
const { createWriteDb, IDS } = require('./helpers/mes-write-fixture.cjs')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const claimsRead = require('../uniCloud-alipay/cloudfunctions/router/util/mes/claims-read.js')
const { requestPersonnelClaim, reviewPersonnelClaim } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/claims-write.js')
const scope = require('../uniCloud-alipay/cloudfunctions/router/util/mes/scope.js')
const { dispatch } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')

const profile = (db, uid, role) => scope.profile(db, { uid, role: role || [] })
const admin = db => profile(db, IDS.admin, ['admin'])
const sup = db => profile(db, IDS.sup)
const operator = db => profile(db, IDS.operator)

const FREE = 'ops:personnel:YG-FREE'
const FREE2 = 'ops:personnel:YG-FREE2'
const NEW_UID = 'u-new'
const NEW_UID2 = 'u-new-2'

function seedUser(db, uid) { db.ensure('uni-id-users').set(uid, { _id: uid, status: 0, role: [], nickname: uid }) }
function seedFreePerson(db, id, name, over) {
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
    console.log('\nP3-B4 人员认领（claims）')

    await test('claimCandidates：未绑定账号可按关键字查候选；空关键字返回空；已绑定账号 409', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        seedFreePerson(db, FREE2, '自由人乙')
        const empty = await claimsRead.claimCandidates(db, { uid: NEW_UID }, {})
        assert.deepEqual(empty.list, [])
        const result = await claimsRead.claimCandidates(db, { uid: NEW_UID }, { keyword: '自由人' })
        assert.equal(result.list.length, 2)
        assert.equal(result.total, 2)
        assert.deepEqual(Object.keys(result.list[0]).sort(), ['_id', 'code', 'name', 'workshopName'])
        const bound = await run(claimsRead.claimCandidates, db, { uid: IDS.sup }, { keyword: '自由人' })
        assert.equal(bound.code, 409)
        assert.match(bound.message, /已绑定人员档案/)
    })

    await test('requestPersonnelClaim：成功 pending v1 + 审计；同人幂等；换人 409', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        seedFreePerson(db, FREE2, '自由人乙')
        const first = await run(requestPersonnelClaim, db, { uid: NEW_UID }, { personId: FREE })
        assert.equal(first.code, 0)
        assert.equal(first.data.status, 'pending')
        assert.equal(first.data.version, 1)
        assert.equal(first.data.personId, FREE)
        assert.equal(first.data.accountName, NEW_UID)
        assert.equal(first.data.audit.action, 'create')
        const replay = await requestPersonnelClaim(db, { uid: NEW_UID }, { personId: FREE })
        assert.equal(replay.version, 1)
        assert.equal(db.ensure('mes_ops_claims').size, 1)
        const other = await run(requestPersonnelClaim, db, { uid: NEW_UID }, { personId: FREE2 })
        assert.equal(other.code, 409)
        assert.match(other.message, /已有待审核申请/)
    })

    await test('requestPersonnelClaim：档案已绑 409；账号已绑 409', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        const claimed = db.ensure('mes_ops_personnel').get(FREE)
        claimed.uid = 'u-other'
        const personBound = await run(requestPersonnelClaim, db, { uid: NEW_UID }, { personId: FREE })
        assert.equal(personBound.code, 409)
        assert.match(personBound.message, /档案已绑定账号/)
        seedFreePerson(db, FREE2, '自由人乙')
        const accountBound = await run(requestPersonnelClaim, db, { uid: IDS.sup }, { personId: FREE2 })
        assert.equal(accountBound.code, 409)
        assert.match(accountBound.message, /当前账号已绑定人员档案/)
    })

    await test('myPersonnelClaim：本人返回申请；无申请返回 null', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        assert.equal((await claimsRead.myPersonnelClaim(db, { uid: NEW_UID })).record, null)
        await requestPersonnelClaim(db, { uid: NEW_UID }, { personId: FREE })
        const mine = await claimsRead.myPersonnelClaim(db, { uid: NEW_UID })
        assert.equal(mine.record.personId, FREE)
        assert.equal(mine.record.status, 'pending')
    })

    await test('listPersonnelClaims：管理员分页/状态筛选；非管理员 403', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        await requestPersonnelClaim(db, { uid: NEW_UID }, { personId: FREE })
        const all = await claimsRead.listPersonnelClaims(db, await admin(db), {})
        assert.equal(all.total, 1)
        assert.equal(all.list[0].personName, '自由人甲')
        const pending = await claimsRead.listPersonnelClaims(db, await admin(db), { status: 'pending' })
        assert.equal(pending.total, 1)
        const approved = await claimsRead.listPersonnelClaims(db, await admin(db), { status: 'approved' })
        assert.equal(approved.total, 0)
        const forbidden = await run(claimsRead.listPersonnelClaims, db, await operator(db), {})
        assert.equal(forbidden.code, 403)
    })

    await test('reviewPersonnelClaim approve：申请 v2 approved + 人员 uid 绑定（版本+1、审计）', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        const claim = await requestPersonnelClaim(db, { uid: NEW_UID }, { personId: FREE })
        const result = await run(reviewPersonnelClaim, db, await admin(db), { id: claim._id, decision: 'approved', expectedVersion: 1 })
        assert.equal(result.code, 0)
        assert.equal(result.data.status, 'approved')
        assert.equal(result.data.version, 2)
        assert.equal(result.data.reviewedBy, IDS.admin)
        const person = db.ensure('mes_ops_personnel').get(FREE)
        assert.equal(person.uid, NEW_UID)
        assert.equal(person.version, 2)
        assert.equal(person.audit.reason, '审核通过员工认领申请')
        const replay = await reviewPersonnelClaim(db, await admin(db), { id: claim._id, decision: 'approved', expectedVersion: 1 })
        assert.equal(replay.version, 2)
    })

    await test('reviewPersonnelClaim reject：原因必填；拒绝后状态 rejected', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        const claim = await requestPersonnelClaim(db, { uid: NEW_UID }, { personId: FREE })
        const noReason = await run(reviewPersonnelClaim, db, await admin(db), { id: claim._id, decision: 'rejected', expectedVersion: 1 })
        assert.equal(noReason.code, 400)
        assert.match(noReason.message, /拒绝认领请填写原因/)
        const rejected = await run(reviewPersonnelClaim, db, await admin(db), { id: claim._id, decision: 'rejected', expectedVersion: 1, reason: '档案信息不符' })
        assert.equal(rejected.code, 0)
        assert.equal(rejected.data.status, 'rejected')
        assert.equal(rejected.data.version, 2)
        assert.equal(db.ensure('mes_ops_personnel').get(FREE).uid, '', '拒绝不得绑定账号')
    })

    await test('reviewPersonnelClaim：非管理员 403、版本冲突 409、非法 decision 400、档案已绑其他账号 409', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        const claim = await requestPersonnelClaim(db, { uid: NEW_UID }, { personId: FREE })
        const forbidden = await run(reviewPersonnelClaim, db, await operator(db), { id: claim._id, decision: 'approved', expectedVersion: 1 })
        assert.equal(forbidden.code, 403)
        const stale = await run(reviewPersonnelClaim, db, await admin(db), { id: claim._id, decision: 'approved', expectedVersion: 99 })
        assert.equal(stale.code, 409)
        const invalid = await run(reviewPersonnelClaim, db, await admin(db), { id: claim._id, decision: 'maybe', expectedVersion: 1 })
        assert.equal(invalid.code, 400)
        db.ensure('mes_ops_personnel').get(FREE).uid = 'u-other'
        const conflict = await run(reviewPersonnelClaim, db, await admin(db), { id: claim._id, decision: 'approved', expectedVersion: 1 })
        assert.equal(conflict.code, 409)
        assert.match(conflict.message, /已被其他账号绑定/)
    })

    await test('dispatch auth-only：未绑定账号调 claimCandidates 不经 scope.profile；缺 token 401；已绑定账号走 handler 409', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        routing.clearCache()
        const uniID = makeUniID([NEW_UID, IDS.sup])
        const okResult = await dispatch({ data: { keyword: '自由人' }, uniIdToken: 'tok-' + NEW_UID, util: { db, uniID } }, { action: 'claimCandidates' })
        assert.equal(okResult.code, 0, JSON.stringify(okResult))
        assert.equal(okResult.data.list.length, 1)
        const missing = await dispatch({ data: {}, util: { db, uniID } }, { action: 'claimCandidates' })
        assert.equal(missing.code, 401)
        const boundUser = await dispatch({ data: { keyword: '自由人' }, uniIdToken: 'tok-' + IDS.sup, util: { db, uniID } }, { action: 'claimCandidates' })
        assert.equal(boundUser.code, 409, '已绑定账号应进入 handler 返回 409，而不是 profile 403')
    })

    await test('dispatch auth-only + 可切换写：requestPersonnelClaim native 用 auth 调用并写库', async () => {
        const { db } = createWriteDb()
        seedUser(db, NEW_UID)
        seedFreePerson(db, FREE, '自由人甲')
        routing.clearCache()
        db.ensure('vk-global-data').set('mes-native-switch', { _id: 'mes-native-switch', actions: { requestPersonnelClaim: 'native' } })
        const uniID = makeUniID([NEW_UID])
        const result = await dispatch({ data: { personId: FREE, note: 'TEST-P3B4' }, uniIdToken: 'tok-' + NEW_UID, util: { db, uniID } }, { action: 'requestPersonnelClaim' })
        assert.equal(result.code, 0, JSON.stringify(result))
        assert.equal(result.data.status, 'pending')
        assert.equal(db.ensure('mes_ops_claims').size, 1)
        routing.clearCache()
    })

    console.log('\nP3-B4 人员认领：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

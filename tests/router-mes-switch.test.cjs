// P3-B1 运维入口：管理员在线读写 vk-global-data/mes-native-switch（mes/pub/mes-switch）。
// 覆盖 403/401/400、合并写入、缓存失效、get 默认值、无文档新建、写失败。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')
const switchEntry = require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/mes-switch.js')

const CONFIG = { collection: routing.CONFIG_COLLECTION, id: routing.CONFIG_ID }

function makeDb() {
    const db = createMemoryDb()
    db.command.neq = db.command.neq || ((value) => ({ op: 'neq', value }))
    return db
}
function makeUniID() {
    return { checkToken: async (token) => (String(token).startsWith('tok-') ? { code: 0, uid: String(token).slice(4) } : { code: 30204 }) }
}
function seedUser(db, uid, role) {
    db.ensure('uni-id-users').set(uid, { _id: uid, status: 0, role: role || [] })
}
/** 组织一个已绑定在岗人员的普通操作员（非管理员）。 */
function seedOperator(db, uid) {
    seedUser(db, uid, [])
    db.ensure('mes_ops_personnel').set('p-' + uid, { _id: 'p-' + uid, uid, name: '操作员', workshopId: '', enabled: true, scopeRole: 'operator' })
}
function call(db, uid, data, options = {}) {
    const event = {
        data: { $url: 'mes/pub/mes-switch', ...data },
        uniIdToken: options.token === undefined ? 'tok-' + uid : options.token,
        util: { db, uniID: makeUniID() },
    }
    return switchEntry.main(event)
}
function storedDoc(db) {
    return db.ensure(CONFIG.collection).get(CONFIG.id) || null
}

let passed = 0
let failed = 0
async function test(name, fn) {
    routing.clearCache()
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
    console.log('\nP3 灰度开关在线入口 mes-switch')

    await test('缺 action：400 且不读库', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        const result = await call(db, 'u-admin', {})
        assert.equal(result.code, 400)
        assert.equal(result.message, '缺少 action 参数')
        assert.equal(db.ensure(CONFIG.collection).size, 0)
    })

    await test('不支持的 action：400', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        const result = await call(db, 'u-admin', { action: 'delete' })
        assert.equal(result.code, 400)
        assert.equal(result.message, '不支持的 action 参数')
    })

    await test('缺 token：401「未登录」，不进入开关逻辑', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        const result = await call(db, 'u-admin', { action: 'set', actions: { saveCatalog: 'native' } }, { token: '' })
        assert.deepEqual(Object.keys(result).sort(), ['code', 'message'])
        assert.equal(result.code, 401)
        assert.equal(result.message, '未登录')
        assert.equal(db.ensure(CONFIG.collection).size, 0)
    })

    await test('非管理员 get/set：403「仅管理员可以操作灰度开关」且不写库', async () => {
        const db = makeDb()
        seedOperator(db, 'u-op')
        const got = await call(db, 'u-op', { action: 'get' })
        assert.equal(got.code, 403)
        assert.equal(got.message, '仅管理员可以操作灰度开关')
        const set = await call(db, 'u-op', { action: 'set', actions: { saveCatalog: 'native' } })
        assert.equal(set.code, 403)
        assert.equal(set.message, '仅管理员可以操作灰度开关')
        assert.equal(db.ensure(CONFIG.collection).size, 0)
    })

    await test('get 无文档：actions {} + 代码 DEFAULT_ACTIONS + 可切换清单', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        const result = await call(db, 'u-admin', { action: 'get' })
        assert.equal(result.code, 0)
        assert.deepEqual(result.data.actions, {})
        assert.deepEqual(result.data.defaults, routing.DEFAULT_ACTIONS)
        assert.deepEqual(result.data.switchable, [...routing.SWITCHABLE_WRITE_ACTIONS])
    })

    await test('set 无文档：新建 _id=mes-native-switch，写 updatedBy/updatedAt/comment', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        const result = await call(db, 'u-admin', { action: 'set', actions: { saveCatalog: 'forward', saveSchedule: 'forward' } })
        assert.equal(result.code, 0)
        assert.deepEqual(result.data.actions, { saveCatalog: 'forward', saveSchedule: 'forward' })
        assert.equal(result.data.updatedBy, 'u-admin')
        assert.match(result.data.updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        assert.match(result.data.comment, /^u-admin 于 \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}（北京时间）修改$/)
        const doc = storedDoc(db)
        assert.equal(doc._id, CONFIG.id)
        assert.deepEqual(doc.actions, { saveCatalog: 'forward', saveSchedule: 'forward' })
        assert.equal(doc.updatedBy, 'u-admin')
    })

    await test('set 合并写入：只改传入键，保留其它 action 键与其它顶层字段', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        db.ensure(CONFIG.collection).set(CONFIG.id, {
            _id: CONFIG.id,
            actions: { saveCatalog: 'native', bootstrap: 'forward' },
            note: '人工排查备注',
        })
        const result = await call(db, 'u-admin', { action: 'set', actions: { saveSchedule: 'native' } })
        assert.equal(result.code, 0)
        assert.deepEqual(result.data.actions, { saveCatalog: 'native', bootstrap: 'forward', saveSchedule: 'native' })
        const doc = storedDoc(db)
        assert.equal(doc.note, '人工排查备注')
        assert.equal(doc.actions.saveCatalog, 'native')
        assert.equal(doc.actions.saveSchedule, 'native')
    })

    await test('set 未传的开关项保持原值（不会被默认值覆盖）', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        db.ensure(CONFIG.collection).set(CONFIG.id, { _id: CONFIG.id, actions: { saveSchedule: 'native' } })
        await call(db, 'u-admin', { action: 'set', actions: { saveCatalog: 'forward' } })
        assert.deepEqual(storedDoc(db).actions, { saveSchedule: 'native', saveCatalog: 'forward' })
    })

    await test('非法 key（非可切换写 action）：400 且不写库', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        const known = await call(db, 'u-admin', { action: 'set', actions: { bootstrap: 'native' } })
        assert.equal(known.code, 400)
        assert.equal(known.message, '不支持的开关项：bootstrap')
        const unknown = await call(db, 'u-admin', { action: 'set', actions: { nope: 'native' } })
        assert.equal(unknown.code, 400)
        assert.equal(unknown.message, '不支持的开关项：nope')
        assert.equal(db.ensure(CONFIG.collection).size, 0)
    })

    await test('非法 value：400（只允许 native/forward）', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        for (const value of ['Native', 'gray', true, 1, null]) {
            const result = await call(db, 'u-admin', { action: 'set', actions: { saveCatalog: value } })
            assert.equal(result.code, 400, 'value=' + String(value))
            assert.equal(result.message, '开关值须为 native 或 forward：saveCatalog')
        }
        assert.equal(db.ensure(CONFIG.collection).size, 0)
    })

    await test('actions 缺失/非对象/空对象：400', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        for (const actions of [undefined, null, [], 'saveCatalog', 1, {}]) {
            const result = await call(db, 'u-admin', { action: 'set', actions })
            assert.equal(result.code, 400, 'actions=' + JSON.stringify(actions))
            assert.equal(result.message, '缺少 actions 参数')
        }
    })

    await test('set 写后清缓存：routing.resolveMode 立即读到新值（不等 60s）', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        db.ensure(CONFIG.collection).set(CONFIG.id, { _id: CONFIG.id, actions: { saveCatalog: 'forward' } })
        routing.clearCache()
        assert.equal(await routing.resolveMode(db, 'saveCatalog'), 'forward')
        const result = await call(db, 'u-admin', { action: 'set', actions: { saveCatalog: 'native' } })
        assert.equal(result.code, 0)
        // 不调用 clearCache，直接读：证明 set 内部已清缓存。
        assert.equal(await routing.resolveMode(db, 'saveCatalog'), 'native')
    })

    await test('合并后 routing 读取一致：其它 action 键仍按文档生效', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        db.ensure(CONFIG.collection).set(CONFIG.id, { _id: CONFIG.id, actions: { bootstrap: 'forward' } })
        await call(db, 'u-admin', { action: 'set', actions: { saveCatalog: 'native' } })
        routing.clearCache()
        assert.equal(await routing.resolveMode(db, 'bootstrap'), 'forward')
        assert.equal(await routing.resolveMode(db, 'saveCatalog'), 'native')
    })

    await test('文档 actions 结构损坏：get 按 {} 处理，set 可修复', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        db.ensure(CONFIG.collection).set(CONFIG.id, { _id: CONFIG.id, actions: 'broken' })
        const got = await call(db, 'u-admin', { action: 'get' })
        assert.equal(got.code, 0)
        assert.deepEqual(got.data.actions, {})
        const set = await call(db, 'u-admin', { action: 'set', actions: { saveSchedule: 'forward' } })
        assert.equal(set.code, 0)
        assert.deepEqual(storedDoc(db).actions, { saveSchedule: 'forward' })
    })

    await test('写库失败：500，且不返回成功', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        db.failWrite = CONFIG.collection
        const originalError = console.error
        console.error = () => {}
        let result
        try {
            result = await call(db, 'u-admin', { action: 'set', actions: { saveCatalog: 'native' } })
        } finally {
            console.error = originalError
            db.failWrite = null
        }
        assert.equal(result.code, 500)
        assert.equal(result.message, '灰度开关操作失败，请稍后重试')
        assert.equal(storedDoc(db), null)
    })

    await test('get 读回与 set 返回一致，且 defaults 未被文档覆盖', async () => {
        const db = makeDb()
        seedUser(db, 'u-admin', ['admin'])
        await call(db, 'u-admin', { action: 'set', actions: { saveCatalog: 'native', saveSchedule: 'forward' } })
        const got = await call(db, 'u-admin', { action: 'get' })
        assert.deepEqual(got.data.actions, { saveCatalog: 'native', saveSchedule: 'forward' })
        assert.deepEqual(got.data.defaults, routing.DEFAULT_ACTIONS)
        assert.equal(got.data.defaults.saveCatalog, undefined, '可切换写不写入 DEFAULT_ACTIONS（默认 forward）')
    })

    console.log('\nP3 灰度开关在线入口：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

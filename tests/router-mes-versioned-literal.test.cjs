// P3-B3 根因修复回归：saveVersioned 更新时对象/数组字段用 db.command.set 整体赋值（null→对象/数组、旧数组、嵌套对象）。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { saveVersioned, literalUpdate } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/versioned.js')

function makeDb() {
    const db = createMemoryDb()
    db.command.neq = db.command.neq || ((value) => ({ op: 'neq', value }))
    return db
}
/** 记录某集合 where().update() 的实际载荷（用于断言 command.set 包裹）。 */
function captureUpdate(db, collection) {
    const captured = []
    const originalCollection = db.collection.bind(db)
    db.collection = (name) => {
        const base = originalCollection(name)
        if (name !== collection) return base
        const originalWhere = base.where.bind(base)
        base.where = (where) => {
            const query = originalWhere(where)
            const originalUpdate = query.update.bind(query)
            query.update = (data) => { captured.push(data); return originalUpdate(data) }
            return query
        }
        return base
    }
    return captured
}
const options = over => ({
    collection: 'mes_ops_workshops', versions: 'mes_ops_versions', keyField: 'entityId', key: 'ops:workshops:W1', id: 'ops:workshops:W1',
    uid: 'u-admin', ...over,
})

let passed = 0
let failed = 0
async function test(name, fn) {
    try { await fn(); passed += 1; console.log('  ✓ ' + name) }
    catch (error) { failed += 1; console.error('  ✗ ' + name); console.error('    ' + ((error && error.stack) || error)) }
}

;(async () => {
    console.log('\nP3-B3 null→对象 通用修复（literalUpdate）')

    await test('literalUpdate：对象/数组包 command.set；标量/null 原样；无 set 时回退', () => {
        const db = makeDb()
        const payload = literalUpdate(db, { conflict: { a: 1 }, tags: [1, 2], name: 'x', count: 0, empty: null })
        assert.equal(payload.conflict.op, 'set')
        assert.deepEqual(payload.conflict.value, { a: 1 })
        assert.equal(payload.tags.op, 'set')
        assert.deepEqual(payload.tags.value, [1, 2])
        assert.equal(payload.name, 'x')
        assert.equal(payload.count, 0)
        assert.equal(payload.empty, null)
        const noSet = { command: {} }
        assert.deepEqual(literalUpdate(noSet, { conflict: { a: 1 }, tags: [1] }), { conflict: { a: 1 }, tags: [1] })
    })

    await test('null→对象：conflict=null 更新为对象成功，版本 +1，归档 v1', async () => {
        const db = makeDb()
        db.ensure('mes_ops_workshops').set('ops:workshops:W1', { _id: 'ops:workshops:W1', name: '旧', conflict: null, version: 1 })
        const result = await saveVersioned(db, options({ record: { name: '新', conflict: { retained: { kind: 'work' }, incoming: { kind: 'rest' }, detectedAt: 1 } }, expectedVersion: 1 }))
        assert.equal(result.version, 2)
        const row = db.ensure('mes_ops_workshops').get('ops:workshops:W1')
        assert.equal(row.version, 2)
        assert.deepEqual(row.conflict, { retained: { kind: 'work' }, incoming: { kind: 'rest' }, detectedAt: 1 })
        assert.ok(db.ensure('mes_ops_versions').get('ver:ops:workshops:W1:1'))
    })

    await test('null→数组 / 旧数组整体替换 / 嵌套对象', async () => {
        const db = makeDb()
        db.ensure('mes_ops_workshops').set('ops:workshops:W1', { _id: 'ops:workshops:W1', name: '旧', tags: null, pallet: null, version: 1 })
        await saveVersioned(db, options({ record: { name: '新', tags: [1, 2], pallet: { status: 'done', dims: { w: 1 } } }, expectedVersion: 1 }))
        let row = db.ensure('mes_ops_workshops').get('ops:workshops:W1')
        assert.deepEqual(row.tags, [1, 2])
        assert.deepEqual(row.pallet, { status: 'done', dims: { w: 1 } })
        await saveVersioned(db, options({ record: { name: '新', tags: [3], pallet: { status: 'pending', dims: null } }, expectedVersion: 2 }))
        row = db.ensure('mes_ops_workshops').get('ops:workshops:W1')
        assert.deepEqual(row.tags, [3], '旧数组应整体替换而不是合并')
        assert.deepEqual(row.pallet, { status: 'pending', dims: null })
    })

    await test('实际更新载荷：conflict/tags/audit 都包 command.set，标量字段不包', async () => {
        const db = makeDb()
        db.ensure('mes_ops_workshops').set('ops:workshops:W1', { _id: 'ops:workshops:W1', name: '旧', conflict: null, version: 1 })
        const captured = captureUpdate(db, 'mes_ops_workshops')
        await saveVersioned(db, options({ record: { name: '新', conflict: { detectedAt: 1 }, tags: [1] }, expectedVersion: 1, audit: () => ({ action: 'update' }) }))
        assert.equal(captured.length, 1)
        const payload = captured[0]
        assert.equal(payload.conflict.op, 'set')
        assert.equal(payload.tags.op, 'set')
        assert.equal(payload.audit.op, 'set', '审计对象也必须整体赋值（历史 audit:null 隐患）')
        assert.equal(payload.name, '新')
        assert.equal(payload.version, 2)
        assert.equal(payload.updatedBy, 'u-admin')
    })

    await test('CAS：expectedVersion 不匹配仍 409（command.set 不影响乐观锁）', async () => {
        const db = makeDb()
        db.ensure('mes_ops_workshops').set('ops:workshops:W1', { _id: 'ops:workshops:W1', name: '旧', conflict: null, version: 2 })
        await assert.rejects(
            () => saveVersioned(db, options({ record: { name: '新', conflict: { detectedAt: 1 } }, expectedVersion: 1 })),
            (error) => error.code === 409
        )
        assert.equal(db.ensure('mes_ops_workshops').get('ops:workshops:W1').version, 2)
    })

    await test('db.command.set 缺失时回退原写法（仍可写入对象，兼容其它环境）', async () => {
        const db = makeDb()
        delete db.command.set
        db.ensure('mes_ops_workshops').set('ops:workshops:W1', { _id: 'ops:workshops:W1', name: '旧', conflict: null, version: 1 })
        const result = await saveVersioned(db, options({ record: { name: '新', conflict: { detectedAt: 1 } }, expectedVersion: 1 }))
        assert.equal(result.version, 2)
        assert.deepEqual(db.ensure('mes_ops_workshops').get('ops:workshops:W1').conflict, { detectedAt: 1 })
    })

    console.log('\nP3-B3 null→对象 通用修复：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

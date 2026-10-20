// P2 批 6 多目标 façade：records / bom / buckets 三个新 target + orders.getByBatch。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { dispatch } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')
const forwardModule = require('../uniCloud-alipay/cloudfunctions/router/util/mes-forward.js')
const { forward, TARGETS, FUNCTIONS, READ_ACTIONS } = forwardModule
const ENTRIES = {
    records: require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/records.js'),
    bom: require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/bom.js'),
    buckets: require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/buckets.js'),
}

function makeDb() {
    const db = createMemoryDb()
    db.command.neq = db.command.neq || ((value) => ({ op: 'neq', value }))
    return db
}
function makeUniID(valid = 'good') {
    return { checkToken: async (token) => (token === valid ? { code: 0, uid: 'u-admin' } : { code: 30204 }) }
}
function withMockUniCloud(result, fn) {
    const original = global.uniCloud
    const captured = { calls: [] }
    global.uniCloud = {
        callFunction: async (options) => {
            captured.calls.push(options)
            if (result instanceof Error) throw result
            return { result }
        },
    }
    return Promise.resolve()
        .then(() => fn(captured))
        .finally(() => { global.uniCloud = original })
}

/** 批 6 开放 action：target/action/payload/期望透传/下游返回。 */
const CASES = [
    {
        target: 'records', action: 'get', data: { batchNo: 'TEST261020A' }, expect: { batchNo: 'TEST261020A' },
        upstream: { code: 0, message: 'ok', data: { batchNo: 'TEST261020A', version: 1 } },
    },
    {
        target: 'records', action: 'list', data: { limit: 50, before: 0 }, expect: { limit: 50, before: 0 },
        upstream: { code: 0, message: 'ok', data: { list: [], hasMore: false, nextBefore: 0 } },
    },
    {
        target: 'records', action: 'listVersions', data: { batchNo: 'TEST261020A', limit: 20 }, expect: { batchNo: 'TEST261020A', limit: 20 },
        upstream: { code: 0, message: 'ok', data: [] },
    },
    {
        target: 'records', action: 'getDraft', data: { deviceId: 'h5-test-01', batchNo: 'TEST261020A' }, expect: { deviceId: 'h5-test-01', batchNo: 'TEST261020A' },
        upstream: { code: 0, message: 'ok', data: { record: null } },
    },
    {
        target: 'bom', action: 'list', data: { batchPrefix: 'TEST', limit: 100 }, expect: { batchPrefix: 'TEST', limit: 100 },
        upstream: { code: 0, message: 'ok', data: [] },
    },
    {
        target: 'buckets', action: 'get', data: { batchNo: 'TEST261020A' }, expect: { batchNo: 'TEST261020A' },
        upstream: { code: 0, message: 'ok', data: { batchNo: 'TEST261020A', buckets: { A: 0 } } },
    },
    {
        target: 'orders', action: 'getByBatch', data: { batchNo: 'TEST261020A' }, expect: { batchNo: 'TEST261020A' },
        upstream: { code: 0, message: 'ok', data: { orderNo: '20261020', batchNo: 'TEST261020A' } },
    },
    {
        target: 'materials', action: 'list', data: { limit: 100 }, expect: { limit: 100 },
        upstream: { code: 0, message: 'ok', data: [{ productCode: '9900000001' }] },
    },
    {
        target: 'records', action: 'upsert', data: { record: { batchNo: 'TEST261020A', fields: { goodQty: 1 } } }, expect: { record: { batchNo: 'TEST261020A', fields: { goodQty: 1 } } },
        upstream: { code: 0, message: 'ok', data: { batchNo: 'TEST261020A', version: 2, unchanged: false } },
    },
    {
        target: 'records', action: 'saveDraft', data: { deviceId: 'h5-test-01', record: { batchNo: 'TEST261020A', fields: { note: '草稿' } } }, expect: { deviceId: 'h5-test-01', record: { batchNo: 'TEST261020A', fields: { note: '草稿' } } },
        upstream: { code: 0, message: 'ok', data: { saved: true } },
    },
    {
        target: 'buckets', action: 'upsert', data: { batchNo: 'TEST261020A', buckets: { A: 60, B: 60 }, checksum: 'abc123', sourceFetchedAt: 1792480000000 },
        expect: { batchNo: 'TEST261020A', buckets: { A: 60, B: 60 }, checksum: 'abc123', sourceFetchedAt: 1792480000000 },
        upstream: { code: 0, message: 'ok', data: { _id: 'batch:TEST261020A', batchNo: 'TEST261020A' } },
    },
]

/** 批 6 明确不开放、必须 403 的 action。 */
const EXCLUDED = {
    records: ['rollback', 'getVersion'],
    bom: ['upsert', 'setEnabled', 'listVersions', 'get', 'matchByBatch'],
    buckets: ['list'],
    orders: ['list', 'setEnabled', 'trace', 'sourceDetail', 'saveCustomer', 'savePlan'],
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
        console.error('    ' + ((error && error.message) || error))
    }
}

;(async () => {
    console.log('\nP2 批 6 多目标 façade 测试')

    // ---------- 常量与白名单 ----------
    await test('FUNCTIONS 登记 bom / records / batches，TARGETS 指向正确云函数', () => {
        assert.equal(FUNCTIONS.records, 'production-records')
        assert.equal(FUNCTIONS.bom, 'product-bom')
        assert.equal(FUNCTIONS.batches, 'batch-buckets')
        assert.equal(TARGETS.records.name, 'production-records')
        assert.equal(TARGETS.bom.name, 'product-bom')
        assert.equal(TARGETS.buckets.name, 'batch-buckets')
        assert.equal(TARGETS.orders.name, 'production-orders')
    })

    await test('批 6 白名单：读 9 项 / 写 3 项，读写不重叠', () => {
        const expectedRead = {
            records: ['get', 'list', 'listVersions', 'getDraft'],
            bom: ['list'],
            buckets: ['get'],
        }
        const expectedWrite = {
            records: ['upsert', 'saveDraft'],
            buckets: ['upsert'],
        }
        for (const target of ['records', 'bom', 'buckets']) {
            assert.deepEqual([...TARGETS[target].read].sort(), [...expectedRead[target]].sort(), target + ' read')
            assert.deepEqual([...TARGETS[target].write].sort(), [...(expectedWrite[target] || [])].sort(), target + ' write')
            assert.deepEqual(TARGETS[target].read.filter(action => TARGETS[target].write.includes(action)), [], target + ' 读写不应重叠')
        }
        assert.ok(TARGETS.orders.read.includes('getByBatch'), 'orders.read 应包含 getByBatch')
        assert.ok(READ_ACTIONS.includes('getJob'), 'operations.getJob 仍是已开放读 action')
        assert.ok(TARGETS.materials.read.includes('list'), 'materials.list 已是批 5 开放项')
    })

    await test('排除清单 action 不在任何 target 名单', () => {
        for (const [target, actions] of Object.entries(EXCLUDED)) {
            for (const action of actions) {
                assert.ok(!TARGETS[target].read.includes(action) && !TARGETS[target].write.includes(action), target + '.' + action + ' 不应开放')
            }
        }
        assert.ok(!TARGETS.records.write.includes('rollback'))
        assert.ok(!TARGETS.bom.write.includes('upsert'))
    })

    await test('批 6 action 不进灰度开关默认表，且不配置转发 timeout', () => {
        for (const item of CASES) assert.ok(!(item.action in routing.DEFAULT_ACTIONS), item.action + ' 不应进入 native 默认表')
        for (const target of ['records', 'bom', 'buckets']) assert.ok(!('timeout' in TARGETS[target]), target + ' 不应配置 timeout')
        assert.ok(!('FORWARD_TIMEOUTS' in forwardModule), '不应再导出 FORWARD_TIMEOUTS')
    })

    // ---------- 正向转发 ----------
    for (const item of CASES) {
        await test(item.target + '.' + item.action + '：转发到 ' + FUNCTIONS[item.target === 'orders' ? 'orders' : item.target === 'buckets' ? 'batches' : item.target],
            async () => {
                await withMockUniCloud(item.upstream, async (captured) => {
                    const result = await dispatch({ data: item.data, uniIdToken: 'good' }, { target: item.target, action: item.action })
                    assert.equal(captured.calls.length, 1)
                    const call = captured.calls[0]
                    assert.equal(call.name, TARGETS[item.target].name)
                    assert.equal(call.data.action, item.action)
                    assert.equal(call.data.uniIdToken, 'good')
                    for (const [key, value] of Object.entries(item.expect)) assert.deepEqual(call.data[key], value, '字段 ' + key + ' 应原样透传')
                    assert.ok(!Object.prototype.hasOwnProperty.call(call, 'timeout'), item.action + ' 不应传 timeout')
                    assert.deepEqual(result, item.upstream)
                })
            })
    }

    // ---------- service 入口 ----------
    await test('records 入口：6 个 action 经入口转发到 production-records', async () => {
        for (const action of ['get', 'list', 'listVersions', 'getDraft', 'upsert', 'saveDraft']) {
            const item = CASES.find(entry => entry.target === 'records' && entry.action === action)
            await withMockUniCloud(item.upstream, async (captured) => {
                const result = await ENTRIES.records.main({ data: { action, ...item.data }, uniIdToken: 'good' })
                assert.equal(captured.calls.length, 1)
                assert.equal(captured.calls[0].name, 'production-records')
                assert.equal(captured.calls[0].data.action, action)
                assert.deepEqual(result, item.upstream)
            })
        }
    })

    await test('bom 入口：list 经入口转发到 product-bom', async () => {
        const item = CASES.find(entry => entry.target === 'bom')
        await withMockUniCloud(item.upstream, async (captured) => {
            const result = await ENTRIES.bom.main({ data: { action: 'list', ...item.data }, uniIdToken: 'good' })
            assert.equal(captured.calls.length, 1)
            assert.equal(captured.calls[0].name, 'product-bom')
            assert.equal(captured.calls[0].data.action, 'list')
            assert.deepEqual(result, item.upstream)
        })
    })

    await test('buckets 入口：get / upsert 经入口转发到 batch-buckets', async () => {
        for (const action of ['get', 'upsert']) {
            const item = CASES.find(entry => entry.target === 'buckets' && entry.action === action)
            await withMockUniCloud(item.upstream, async (captured) => {
                const result = await ENTRIES.buckets.main({ data: { action, ...item.data }, uniIdToken: 'good' })
                assert.equal(captured.calls.length, 1)
                assert.equal(captured.calls[0].name, 'batch-buckets')
                assert.equal(captured.calls[0].data.action, action)
                assert.deepEqual(result, item.upstream)
            })
        }
    })

    // ---------- 缺 token ----------
    for (const target of ['records', 'bom', 'buckets']) {
        await test(target + '：缺 token 返回 401 且不发起转发', async () => {
            await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
                const action = TARGETS[target].read[0] || TARGETS[target].write[0]
                const result = await dispatch({ data: {} }, { target, action })
                assert.equal(result.code, 401)
                assert.equal(result.message, '未登录')
                assert.equal(captured.calls.length, 0)
            })
        })
    }

    // ---------- 白名单拒绝 ----------
    for (const [target, actions] of Object.entries(EXCLUDED)) {
        await test(target + '：排除清单 action 全部 403 且不转发', async () => {
            await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
                for (const action of actions) {
                    const result = await dispatch({ data: {}, uniIdToken: 'good' }, { target, action })
                    assert.equal(result.code, 403, target + '.' + action + ' 应拒绝')
                    assert.match(result.message, /未开放此操作/)
                }
                assert.equal(captured.calls.length, 0)
            })
        })
    }

    // ---------- 写操作固定 forward，不读灰度开关 ----------
    await test('写 action 固定 forward：即使传 mode=native 也不走 native', async () => {
        await withMockUniCloud({ code: 0, message: 'ok', data: {} }, async (captured) => {
            routing.clearCache()
            const db = makeDb()
            const result = await dispatch({ data: { record: { batchNo: 'TEST261020A' } }, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { target: 'records', action: 'upsert', mode: 'native' })
            assert.equal(captured.calls.length, 1)
            assert.equal(captured.calls[0].name, 'production-records')
            assert.equal(captured.calls[0].data.action, 'upsert')
            assert.equal(result.code, 0)
        })
    })

    // ---------- 参数/错误透传 ----------
    await test('保留字段剔除 + payload action 不能改路由', async () => {
        await withMockUniCloud({ code: 0, message: 'ok', data: {} }, async (captured) => {
            const result = await dispatch({
                data: { $url: 'mes/pub/bom', uniIdToken: 'fake', encrypt: true, action: 'rollback', batchNo: 'TEST261020A' },
                uniIdToken: 'good',
            }, { target: 'records', action: 'get' })
            assert.equal(result.code, 0)
            const call = captured.calls[0]
            assert.equal(call.data.action, 'get')
            assert.equal(call.data.batchNo, 'TEST261020A')
            assert.equal(call.data.uniIdToken, 'good')
            for (const key of ['$url', 'encrypt', 'uni_id_token']) assert.ok(!(key in call.data), '不应透传 ' + key)
        })
    })

    await test('下游业务错误码/文案原样透传（403/409/429）', async () => {
        for (const upstream of [
            { code: 403, message: '仅管理员可操作' },
            { code: 409, message: '版本冲突，请刷新后重试' },
            { code: 429, message: '同一照片正在识别，请稍后重试' },
        ]) {
            await withMockUniCloud(upstream, async () => {
                const result = await dispatch({ data: {}, uniIdToken: 'good' }, { target: 'records', action: 'get' })
                assert.deepEqual(result, upstream)
            })
        }
    })

    await test('转发失败 500 / 下游结构异常 500', async () => {
        await withMockUniCloud(new Error('timeout'), async () => {
            const result = await dispatch({ data: {}, uniIdToken: 'good' }, { target: 'buckets', action: 'get' })
            assert.equal(result.code, 500)
            assert.match(result.message, /调用业务云函数失败/)
        })
        await withMockUniCloud({ data: {} }, async () => {
            const result = await dispatch({ data: {}, uniIdToken: 'good' }, { target: 'bom', action: 'list' })
            assert.equal(result.code, 500)
            assert.match(result.message, /返回结构异常/)
        })
    })

    // ---------- service 入口参数校验 ----------
    for (const [target, entry] of Object.entries(ENTRIES)) {
        await test(target + ' 入口：缺 action 返回 400 且不转发', async () => {
            await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
                const result = await entry.main({ data: {}, uniIdToken: 'good' })
                assert.equal(result.code, 400)
                assert.match(result.message, /缺少 action 参数/)
                assert.equal(captured.calls.length, 0)
            })
        })
    }

    console.log('\nP2 批 6 多目标 façade：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

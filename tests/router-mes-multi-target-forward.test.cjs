// P2 批 5 多目标云函数 façade：多目标 service、读写白名单、转发超时、参数透传与错误透传。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { dispatch } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')
const forwardModule = require('../uniCloud-alipay/cloudfunctions/router/util/mes-forward.js')
const { forward, TARGETS, FUNCTIONS, READ_ACTIONS, WRITE_ACTIONS } = forwardModule
const ENTRIES = {
    orders: require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/orders.js'),
    ocr: require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/ocr.js'),
    materials: require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/materials.js'),
}

function makeDb() {
    const db = createMemoryDb()
    db.command.neq = db.command.neq || ((value) => ({ op: 'neq', value }))
    return db
}
function makeUniID(valid = 'good') {
    return { checkToken: async (token) => (token === valid ? { code: 0, uid: 'u-admin' } : { code: 30204 }) }
}

/** 安装 uniCloud mock，捕获转发参数并返回给定结果（或抛错）。 */
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

/** P2 批 5 要开放的 9 个 action：转发目标、payload、期望透传字段。 */
const CASES = [
    {
        target: 'orders',
        action: 'get',
        data: { orderNo: '568393' },
        expect: { orderNo: '568393' },
        upstream: { code: 0, message: 'ok', data: { orderNo: '568393', orderStatus: 'draft' } },
    },
    {
        target: 'orders',
        action: 'save',
        data: { record: { orderNo: '20261020', batchNo: 'TEST261020A', materials: [{ materialCode: 'TESTMAT001', unit: '瓶' }] }, expectedVersion: 1 },
        expect: { record: { orderNo: '20261020', batchNo: 'TEST261020A', materials: [{ materialCode: 'TESTMAT001', unit: '瓶' }] }, expectedVersion: 1 },
        upstream: { code: 0, message: 'ok', data: { orderNo: '20261020', version: 2 } },
    },
    {
        target: 'orders',
        action: 'prepareSourceImages',
        data: { sourceDocumentId: 'src:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' },
        expect: { sourceDocumentId: 'src:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' },
        upstream: { code: 0, message: 'ok', data: { sourceDocumentId: 'src:x', missing: [] } },
    },
    {
        target: 'orders',
        action: 'cleanupSourceUploads',
        data: { leaseId: 'source-upload:0123456789abcdef0123456789abcdef', fileIDs: ['cloud://env/mes-source-uploads/aa/bb/cc.image'] },
        expect: { leaseId: 'source-upload:0123456789abcdef0123456789abcdef', fileIDs: ['cloud://env/mes-source-uploads/aa/bb/cc.image'] },
        upstream: { code: 0, message: 'ok', data: { cleaned: true } },
    },
    {
        target: 'ocr',
        action: 'getCapabilities',
        data: {},
        expect: {},
        upstream: { code: 0, message: 'ok', data: { protocolVersion: 4, flow: 'archive-first' } },
    },
    {
        target: 'ocr',
        action: 'checkRecognition',
        data: { protocolVersion: 4, purpose: 'order', originalHashes: ['a'.repeat(64)], processedHashes: ['b'.repeat(64)] },
        expect: { protocolVersion: 4, purpose: 'order', originalHashes: ['a'.repeat(64)], processedHashes: ['b'.repeat(64)] },
        upstream: { code: 0, message: 'ok', data: { needsOriginalImages: true, uploadKey: 'upload:c:' + 'f'.repeat(64) } },
    },
    {
        target: 'ocr',
        action: 'cleanupOriginals',
        data: { uploadKey: 'upload:c:' + 'f'.repeat(64), uploadOwner: '0'.repeat(32), originalFileIds: ['cloud://env/ocr-originals/aa/bb/0.image'] },
        expect: { uploadKey: 'upload:c:' + 'f'.repeat(64), uploadOwner: '0'.repeat(32), originalFileIds: ['cloud://env/ocr-originals/aa/bb/0.image'] },
        upstream: { code: 0, message: 'ok', data: { cleaned: true } },
    },
    {
        target: 'orders',
        action: 'listCustomers',
        data: { includeDisabled: false },
        expect: { includeDisabled: false },
        upstream: { code: 0, message: 'ok', data: [{ _id: 'customer:x', name: 'TEST-测试客户' }] },
    },
    {
        target: 'orders',
        action: 'listPlans',
        data: { productCode: '9900000001', customerId: 'customer:edbf674c8eaebc592c2be73a9e2e8322' },
        expect: { productCode: '9900000001', customerId: 'customer:edbf674c8eaebc592c2be73a9e2e8322' },
        upstream: { code: 0, message: 'ok', data: [{ _id: 'plan:a3', planName: 'TEST-方案', planVersionId: 'planv:a3:1' }] },
    },
    {
        target: 'orders',
        action: 'getPlanVersion',
        data: { planVersionId: 'planv:a3def7901ea04ed2c00337037fdcf7f3:1' },
        expect: { planVersionId: 'planv:a3def7901ea04ed2c00337037fdcf7f3:1' },
        upstream: { code: 0, message: 'ok', data: { planVersionId: 'planv:a3def7901ea04ed2c00337037fdcf7f3:1', planName: 'TEST-方案' } },
    },
    {
        target: 'materials',
        action: 'get',
        data: { productCode: '9900000001' },
        expect: { productCode: '9900000001' },
        upstream: { code: 0, message: 'ok', data: { _id: 'mat:9900000001', productCode: '9900000001' } },
    },
    {
        target: 'materials',
        action: 'list',
        data: { limit: 100 },
        expect: { limit: 100 },
        upstream: { code: 0, message: 'ok', data: [{ productCode: '9900000001' }] },
    },
    {
        target: 'materials',
        action: 'upsert',
        data: { record: { productCode: '9900000001', productName: 'TEST-测试产品', packSpec: '6瓶/箱', materials: [{ materialCode: 'TESTMAT001', unit: '瓶' }] }, expectedVersion: 1 },
        expect: { record: { productCode: '9900000001', productName: 'TEST-测试产品', packSpec: '6瓶/箱', materials: [{ materialCode: 'TESTMAT001', unit: '瓶' }] }, expectedVersion: 1 },
        upstream: { code: 0, message: 'ok', data: { productCode: '9900000001', version: 2 } },
    },
]

/** 明确不开放、必须 403 且不转发的 action。 */
const EXCLUDED = {
    orders: ['list', 'upsert', 'setEnabled', 'saveCustomer', 'savePlan', 'trace', 'sourceDetail', 'commitSourceImages'],
    ocr: ['save', 'recognize'],
    materials: ['adminList', 'setEnabled', 'listVersions'],
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
    console.log('\nP2 批 5 多目标云函数 façade 测试')

    // ---------- 常量与白名单 ----------
    await test('TARGETS 三个 target 指向正确云函数', () => {
        assert.deepEqual(Object.keys(TARGETS).sort(), ['bom', 'buckets', 'materials', 'ocr', 'operations', 'orders', 'records'])
        assert.equal(TARGETS.orders.name, 'production-orders')
        assert.equal(TARGETS.ocr.name, 'doc-ocr')
        assert.equal(TARGETS.materials.name, 'product-materials')
        assert.equal(TARGETS.operations.name, 'production-operations')
        for (const key of ['operations', 'orders', 'ocr', 'materials']) assert.equal(TARGETS[key].name, FUNCTIONS[key])
    })

    await test('21 个开放 action 落在正确名单且读写不重叠（批 5 三 target + 批 6 getByBatch + 批 7 OCR 配置）', () => {
        const expected = {
            read: { orders: ['get', 'listCustomers', 'listPlans', 'getPlanVersion', 'getByBatch'], ocr: ['getCapabilities', 'checkRecognition', 'getConfig', 'getModels', 'getMyKey'], materials: ['get', 'list'] },
            write: { orders: ['save', 'prepareSourceImages', 'cleanupSourceUploads'], ocr: ['cleanupOriginals', 'setConfig', 'testModel', 'setMyKey', 'clearMyKey'], materials: ['upsert'] },
        }
        for (const target of ['orders', 'ocr', 'materials']) {
            assert.deepEqual([...TARGETS[target].read].sort(), [...expected.read[target]].sort(), target + ' read')
            assert.deepEqual([...TARGETS[target].write].sort(), [...expected.write[target]].sort(), target + ' write')
            assert.deepEqual(TARGETS[target].read.filter(action => TARGETS[target].write.includes(action)), [], target + ' 读写不应重叠')
            assert.equal(new Set([...TARGETS[target].read, ...TARGETS[target].write]).size, TARGETS[target].read.length + TARGETS[target].write.length)
        }
        assert.equal(TARGETS.orders.read.length + TARGETS.orders.write.length + TARGETS.ocr.read.length + TARGETS.ocr.write.length + TARGETS.materials.read.length + TARGETS.materials.write.length, 21)
    })

    await test('排除清单 action 不在任何 target 名单', () => {
        for (const [target, actions] of Object.entries(EXCLUDED)) {
            for (const action of actions) {
                assert.ok(!TARGETS[target].read.includes(action) && !TARGETS[target].write.includes(action), target + '.' + action + ' 不应开放')
            }
        }
    })

    await test('长耗时 action 已移出白名单，且不再配置任何转发 timeout', () => {
        // 支付宝云内部调用 ~10s 硬超时（云端实测），recognize/commitSourceImages 改为页面直调旧云函数
        assert.ok(!('FORWARD_TIMEOUTS' in forwardModule), '不应再导出 FORWARD_TIMEOUTS')
        for (const target of ['operations', 'orders', 'ocr', 'materials']) {
            assert.ok(!('timeout' in TARGETS[target]), target + ' 不应再配置 timeout')
            assert.ok(!TARGETS[target].read.includes('recognize') && !TARGETS[target].write.includes('recognize'), target + ' 不应开放 recognize')
            assert.ok(!TARGETS[target].read.includes('commitSourceImages') && !TARGETS[target].write.includes('commitSourceImages'), target + ' 不应开放 commitSourceImages')
        }
    })

    await test('多目标 action 不进灰度开关默认表', () => {
        for (const item of CASES) assert.ok(!(item.action in routing.DEFAULT_ACTIONS), item.action + ' 不应进入 native 默认表')
    })

    // ---------- 正向转发：每个 action 经 dispatch ----------
    for (const item of CASES) {
        await test(item.target + '.' + item.action + '：转发到 ' + FUNCTIONS[item.target] + '，参数与 token 透传、结果原样返回', async () => {
            await withMockUniCloud(item.upstream, async (captured) => {
                const result = await dispatch({ data: item.data, uniIdToken: 'good' }, { target: item.target, action: item.action })
                assert.equal(captured.calls.length, 1)
                const call = captured.calls[0]
                assert.equal(call.name, FUNCTIONS[item.target])
                assert.equal(call.data.action, item.action)
                assert.equal(call.data.uniIdToken, 'good')
                for (const [key, value] of Object.entries(item.expect)) assert.deepEqual(call.data[key], value, '字段 ' + key + ' 应原样透传')
                assert.ok(!Object.prototype.hasOwnProperty.call(call, 'timeout'), item.action + ' 不应传 timeout（平台内部调用 ~10s 硬限制）')
                assert.deepEqual(result, item.upstream)
            })
        })
    }

    // ---------- 正向转发：service 入口 ----------
    await test('orders 入口：7 个 action 经入口转发到 production-orders', async () => {
        for (const action of ['get', 'listCustomers', 'listPlans', 'getPlanVersion', 'save', 'prepareSourceImages', 'cleanupSourceUploads']) {
            const item = CASES.find(entry => entry.target === 'orders' && entry.action === action)
            await withMockUniCloud(item.upstream, async (captured) => {
                const result = await ENTRIES.orders.main({ data: { action, ...item.data }, uniIdToken: 'good' })
                assert.equal(captured.calls.length, 1)
                assert.equal(captured.calls[0].name, 'production-orders')
                assert.equal(captured.calls[0].data.action, action)
                assert.deepEqual(result, item.upstream)
            })
        }
    })

    await test('ocr 入口：3 个 action 经入口转发到 doc-ocr', async () => {
        for (const action of ['getCapabilities', 'checkRecognition', 'cleanupOriginals']) {
            const item = CASES.find(entry => entry.target === 'ocr' && entry.action === action)
            await withMockUniCloud(item.upstream, async (captured) => {
                const result = await ENTRIES.ocr.main({ data: { action, ...item.data }, uniIdToken: 'good' })
                assert.equal(captured.calls.length, 1)
                assert.equal(captured.calls[0].name, 'doc-ocr')
                assert.equal(captured.calls[0].data.action, action)

                assert.deepEqual(result, item.upstream)
            })
        }
    })

    await test('materials 入口：get/list/upsert 经入口转发到 product-materials', async () => {
        for (const action of ['get', 'list', 'upsert']) {
            const item = CASES.find(entry => entry.target === 'materials' && entry.action === action)
            await withMockUniCloud(item.upstream, async (captured) => {
                const result = await ENTRIES.materials.main({ data: { action, ...item.data }, uniIdToken: 'good' })
                assert.equal(captured.calls.length, 1)
                assert.equal(captured.calls[0].name, 'product-materials')
                assert.equal(captured.calls[0].data.action, action)
                assert.deepEqual(result, item.upstream)
            })
        }
    })

    // ---------- token ----------
    for (const target of ['orders', 'ocr', 'materials']) {
        await test(target + '：缺 token 返回 401 且不发起转发', async () => {
            await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
                const result = await dispatch({ data: {} }, { target, action: TARGETS[target].read[0] || TARGETS[target].write[0] })
                assert.equal(result.code, 401)
                assert.equal(result.message, '未登录')
                assert.equal(captured.calls.length, 0)
            })
        })
    }

    await test('新增 5 个读 action：缺 token 仍 401 且不发起转发', async () => {
        await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
            const items = [['orders', 'listCustomers'], ['orders', 'listPlans'], ['orders', 'getPlanVersion'], ['materials', 'get'], ['materials', 'list']]
            for (const [target, action] of items) {
                const result = await dispatch({ data: {} }, { target, action })
                assert.equal(result.code, 401, target + '.' + action + ' 缺 token 应 401')
                assert.equal(result.message, '未登录')
            }
            assert.equal(captured.calls.length, 0)
        })
    })

    // ---------- 白名单拒绝 ----------
    for (const [target, actions] of Object.entries(EXCLUDED)) {
        await test(target + '：排除清单内 action 全部 403 且不转发', async () => {
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

    // ---------- 参数规则 ----------
    await test('保留字段剔除 + payload action 不能改路由', async () => {
        await withMockUniCloud({ code: 0, message: 'ok', data: {} }, async (captured) => {
            const result = await dispatch({
                data: { $url: 'mes/pub/ocr', uniIdToken: 'fake-token', uni_id_token: 'fake-token', encrypt: true, action: 'setConfig', orderNo: '568393' },
                uniIdToken: 'good',
            }, { target: 'orders', action: 'get' })
            assert.equal(result.code, 0)
            const call = captured.calls[0]
            assert.equal(call.data.action, 'get')
            assert.equal(call.data.orderNo, '568393')
            assert.equal(call.data.uniIdToken, 'good')
            for (const key of ['$url', 'encrypt', 'uni_id_token']) assert.ok(!(key in call.data), '不应透传 ' + key)
        })
    })

    await test('event 平铺与 event.data 两种形态都能取到业务参数', async () => {
        await withMockUniCloud({ code: 0, message: 'ok', data: {} }, async (captured) => {
            await dispatch({ orderNo: '568393', action: 'get', uniIdToken: 'good' }, { target: 'orders', action: 'get' })
            assert.equal(captured.calls[0].data.orderNo, '568393')
            await dispatch({ data: { orderNo: '20261020' }, uniIdToken: 'good' }, { target: 'orders', action: 'get' })
            assert.equal(captured.calls[1].data.orderNo, '20261020')
        })
    })

    await test('业务错误码/文案原样透传（403/409/426）', async () => {
        for (const upstream of [
            { code: 403, message: '只有指定的接班本人可以确认接班' },
            { code: 409, message: '原图上传状态已过期，请重新保存' },
            { code: 426, message: '图片识别参数版本不匹配，请更新前端并重新上传 doc-ocr' },
        ]) {
            await withMockUniCloud(upstream, async () => {
                const result = await dispatch({ data: {}, uniIdToken: 'good' }, { target: 'orders', action: 'get' })
                assert.deepEqual(result, upstream)
            })
        }
    })

    // ---------- 转发层失败 ----------
    await test('转发调用失败：500 且文案含「调用业务云函数失败」', async () => {
        await withMockUniCloud(new Error('cloud function timeout'), async () => {
            const result = await dispatch({ data: { record: { orderNo: '20261020' } }, uniIdToken: 'good' }, { target: 'orders', action: 'save' })
            assert.equal(result.code, 500)
            assert.match(result.message, /调用业务云函数失败/)
            assert.equal(result.msg, result.message)
        })
    })

    await test('下游返回结构异常（无数字 code）：500 结构异常', async () => {
        await withMockUniCloud({ data: {} }, async () => {
            const result = await dispatch({ data: {}, uniIdToken: 'good' }, { target: 'materials', action: 'upsert' })
            assert.equal(result.code, 500)
            assert.match(result.message, /返回结构异常/)
        })
    })

    await test('未知 target：500 未配置目标云函数', async () => {
        await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
            const result = await dispatch({ data: {}, uniIdToken: 'good' }, { target: 'nope', action: 'get' })
            assert.equal(result.code, 500)
            assert.match(result.message, /未配置目标云函数/)
            assert.equal(captured.calls.length, 0)
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

    // ---------- 回归：operations 路径未被改动 ----------
    await test('回归：operations 写白名单 jobCommand 仍固定 forward 到 production-operations', async () => {
        await withMockUniCloud({ code: 0, message: 'ok', data: {} }, async (captured) => {
            routing.clearCache()
            const db = makeDb()
            const result = await dispatch({ data: { id: 'job:1', command: 'start' }, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action: 'jobCommand' })
            assert.equal(captured.calls.length, 1)
            assert.equal(captured.calls[0].name, 'production-operations')
            assert.equal(captured.calls[0].data.action, 'jobCommand')
            assert.equal(result.code, 0)
        })
    })

    await test('回归：直接走只读通道转发写 action 仍 403 只开放只读操作', async () => {
        const result = await forward({ data: { action: 'jobCommand', id: 'job:1' }, uniIdToken: 'good' }, { action: 'jobCommand', readOnly: true })
        assert.equal(result.code, 403)
        assert.match(result.message, /只开放只读操作/)
    })

    await test('回归：operations 未开放 action 经只读入口仍 403', async () => {
        const db = makeDb()
        routing.clearCache()
        for (const action of ['jobCommands', 'saveHandoverV2', 'saveExceptionDraft']) {
            const result = await dispatch({ data: {}, uniIdToken: 'good', util: { db, uniID: makeUniID() } }, { action, readOnly: true, forward })
            assert.equal(result.code, 403, action + ' 应拒绝')
            assert.match(result.message, /只开放只读操作/)
        }
    })

    console.log('\nP2 批 5 多目标 façade：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

// P2 批 7 OCR 设置页：doc-ocr 配置类 action 经 mes/pub/ocr-config 转发（继续 forward、不做 native）。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const { dispatch } = require('../uniCloud-alipay/cloudfunctions/router/util/mes/dispatch.js')
const routing = require('../uniCloud-alipay/cloudfunctions/router/util/mes/routing.js')
const { TARGETS, FORWARD_TIMEOUTS } = require('../uniCloud-alipay/cloudfunctions/router/util/mes-forward.js')
const ocrConfigEntry = require('../uniCloud-alipay/cloudfunctions/router/service/mes/pub/ocr-config.js')

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

const SECRET = 'sk-test-raw-key-12345678'
const USER_SECRET = 'sk-user-own-key-abcdef'

/** 批 7 开放 action：target/action/payload/期望透传/下游返回。 */
const CASES = [
    {
        action: 'getConfig', data: {}, expect: {},
        upstream: { code: 0, message: 'ok', data: { config: { flowMode: 'model-first' }, keySet: true, maskedKey: 'sk-****5678', updatedAt: 1792480000000 } },
    },
    {
        action: 'getModels', data: { provider: 'deepseek', forceRefresh: false }, expect: { provider: 'deepseek', forceRefresh: false },
        upstream: { code: 0, message: 'ok', data: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }] },
    },
    {
        action: 'getMyKey', data: {}, expect: {},
        upstream: { code: 0, message: 'ok', data: { providerType: 'deepseek', keySet: true, maskedKey: 'sk-****cdef' } },
    },
    {
        action: 'testModel', data: {}, expect: {},
        upstream: { code: 0, message: 'ok', data: { results: [{ stepId: 'deepseek', ok: true, ms: 320 }] } },
    },
    {
        action: 'setConfig',
        data: {
            config: { flowMode: 'model-first', dailyLimit: 200, userDailyLimit: 100, apiKey: SECRET, providers: [{ id: 'deepseek', type: 'deepseek', name: 'DeepSeek', enabled: true }] },
            expectedUpdatedAt: 1792480000000,
        },
        expect: {
            config: { flowMode: 'model-first', dailyLimit: 200, userDailyLimit: 100, apiKey: SECRET, providers: [{ id: 'deepseek', type: 'deepseek', name: 'DeepSeek', enabled: true }] },
            expectedUpdatedAt: 1792480000000,
        },
        upstream: { code: 0, message: 'ok', data: { keySet: true, maskedKey: 'sk-****5678', updatedAt: 1792480001000 } },
    },
    {
        action: 'setMyKey', data: { providerType: 'deepseek', apiKey: USER_SECRET }, expect: { providerType: 'deepseek', apiKey: USER_SECRET },
        upstream: { code: 0, message: 'ok', data: { providerType: 'deepseek', keySet: true, maskedKey: 'sk-****cdef' } },
    },
    {
        action: 'clearMyKey', data: {}, expect: {},
        upstream: { code: 0, message: 'ok', data: { providerType: '', keySet: false, maskedKey: '' } },
    },
]

const EXCLUDED = ['save', 'recognize', 'getMyKeyV2', 'setConfigV2']

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
    console.log('\nP2 批 7 OCR 设置页转发测试')

    // ---------- 白名单 ----------
    await test('TARGETS.ocr 新增 7 个配置 action，save/recognize 不在名单', () => {
        const expectedRead = ['getCapabilities', 'checkRecognition', 'getConfig', 'getModels', 'getMyKey']
        const expectedWrite = ['cleanupOriginals', 'setConfig', 'testModel', 'setMyKey', 'clearMyKey']
        assert.deepEqual([...TARGETS.ocr.read].sort(), [...expectedRead].sort())
        assert.deepEqual([...TARGETS.ocr.write].sort(), [...expectedWrite].sort())
        for (const action of ['save', 'recognize']) {
            assert.ok(!TARGETS.ocr.read.includes(action) && !TARGETS.ocr.write.includes(action), action + ' 不应开放')
        }
        assert.deepEqual(TARGETS.ocr.read.filter(action => TARGETS.ocr.write.includes(action)), [], '读写不应重叠')
    })

    await test('配置类 action 不进灰度开关默认表，也不配置转发 timeout', () => {
        for (const item of CASES) assert.ok(!(item.action in routing.DEFAULT_ACTIONS), item.action + ' 不应进入 native 默认表')
        assert.ok(!('timeout' in TARGETS.ocr), 'ocr target 不应配置 timeout')
        assert.ok(!('FORWARD_TIMEOUTS' in require('../uniCloud-alipay/cloudfunctions/router/util/mes-forward.js')))
    })

    // ---------- 正向转发 ----------
    for (const item of CASES) {
        await test('ocr.' + item.action + '：转发到 doc-ocr，参数/token 原样透传、结果原样返回', async () => {
            await withMockUniCloud(item.upstream, async (captured) => {
                const result = await dispatch({ data: item.data, uniIdToken: 'good' }, { target: 'ocr', action: item.action })
                assert.equal(captured.calls.length, 1)
                const call = captured.calls[0]
                assert.equal(call.name, 'doc-ocr')
                assert.equal(call.data.action, item.action)
                assert.equal(call.data.uniIdToken, 'good')
                for (const [key, value] of Object.entries(item.expect)) assert.deepEqual(call.data[key], value, '字段 ' + key + ' 应原样透传')
                assert.ok(!Object.prototype.hasOwnProperty.call(call, 'timeout'), item.action + ' 不应传 timeout')
                assert.deepEqual(result, item.upstream)
            })
        })
    }

    // ---------- service 入口 ----------
    await test('ocr-config 入口：7 个 action 均经入口转发到 doc-ocr', async () => {
        for (const item of CASES) {
            await withMockUniCloud(item.upstream, async (captured) => {
                const result = await ocrConfigEntry.main({ data: { action: item.action, ...item.data }, uniIdToken: 'good' })
                assert.equal(captured.calls.length, 1)
                assert.equal(captured.calls[0].name, 'doc-ocr')
                assert.equal(captured.calls[0].data.action, item.action)
                assert.deepEqual(result, item.upstream)
            })
        }
    })

    // ---------- 401 ----------
    await test('配置类 action 缺 token 一律 401 且不发起转发', async () => {
        await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
            for (const item of CASES) {
                const result = await dispatch({ data: item.data }, { target: 'ocr', action: item.action })
                assert.equal(result.code, 401, item.action + ' 缺 token 应 401')
                assert.equal(result.message, '未登录')
            }
            assert.equal(captured.calls.length, 0)
        })
    })

    // ---------- 排除 ----------
    await test('doc-ocr.save / recognize 及其它未列 action 一律 403 且不转发', async () => {
        await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
            for (const action of EXCLUDED) {
                const result = await dispatch({ data: {}, uniIdToken: 'good' }, { target: 'ocr', action })
                assert.equal(result.code, 403, action + ' 应拒绝')
                assert.match(result.message, /未开放此操作/)
            }
            assert.equal(captured.calls.length, 0)
        })
    })

    // ---------- 安全：不注入 uid / 不落 payload ----------
    await test('router 不注入 uid，payload 只含客户端字段 + action + token', async () => {
        await withMockUniCloud({ code: 0, message: 'ok', data: {} }, async (captured) => {
            await dispatch({ data: { providerType: 'deepseek', apiKey: USER_SECRET }, uniIdToken: 'good' }, { target: 'ocr', action: 'setMyKey' })
            const call = captured.calls[0]
            assert.equal(call.data.uid, undefined)
            assert.deepEqual(Object.keys(call.data).sort(), ['action', 'apiKey', 'providerType', 'uniIdToken'])
        })
    })

    await test('setConfig/setMyKey 下游返回的错误不回显 apiKey（router 不落 payload）', async () => {
        const upstreamErrors = [
            { code: 400, message: 'Key 格式非法' },
            { code: 409, message: '配置已被修改，请重新加载' },
        ]
        for (const upstream of upstreamErrors) {
            await withMockUniCloud(upstream, async () => {
                const result = await dispatch({ data: { config: { apiKey: SECRET } }, uniIdToken: 'good' }, { target: 'ocr', action: 'setConfig' })
                assert.deepEqual(result, upstream)
                assert.ok(!JSON.stringify(result).includes(SECRET), 'router 返回不应包含 apiKey 明文')
            })
        }
        await withMockUniCloud(new Error('upstream timeout'), async () => {
            const result = await dispatch({ data: { providerType: 'deepseek', apiKey: USER_SECRET }, uniIdToken: 'good' }, { target: 'ocr', action: 'setMyKey' })
            assert.equal(result.code, 500)
            assert.ok(!JSON.stringify(result).includes(USER_SECRET), 'router 错误不应包含 apiKey 明文')
        })
    })

    // ---------- 权限逻辑由旧实现负责：错误码原样透传 ----------
    await test('管理员动作用普通账号：下游 403 原样透传（router 不改写）', async () => {
        await withMockUniCloud({ code: 403, message: '无权限' }, async (captured) => {
            const result = await dispatch({ data: {}, uniIdToken: 'good' }, { target: 'ocr', action: 'getConfig' })
            assert.deepEqual(result, { code: 403, message: '无权限' })
            assert.equal(captured.calls[0].name, 'doc-ocr')
        })
    })

    await test('保留字段剔除 + payload action 不能改路由', async () => {
        await withMockUniCloud({ code: 0, message: 'ok', data: {} }, async (captured) => {
            const result = await dispatch({
                data: { $url: 'mes/pub/ocr-config', uniIdToken: 'fake', encrypt: true, action: 'save', provider: 'deepseek' },
                uniIdToken: 'good',
            }, { target: 'ocr', action: 'getModels' })
            assert.equal(result.code, 0)
            const call = captured.calls[0]
            assert.equal(call.data.action, 'getModels')
            assert.equal(call.data.provider, 'deepseek')
            assert.equal(call.data.uniIdToken, 'good')
            for (const key of ['$url', 'encrypt', 'uni_id_token']) assert.ok(!(key in call.data), '不应透传 ' + key)
        })
    })

    // ---------- 入口校验 ----------
    await test('ocr-config 入口缺 action 返回 400 且不转发', async () => {
        await withMockUniCloud({ code: 0, message: 'ok' }, async (captured) => {
            const result = await ocrConfigEntry.main({ data: {}, uniIdToken: 'good' })
            assert.equal(result.code, 400)
            assert.match(result.message, /缺少 action 参数/)
            assert.equal(captured.calls.length, 0)
        })
    })

    console.log('\nP2 批 7 OCR 设置页转发：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

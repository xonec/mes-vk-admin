// MES 原生化（P3-B 第 5 模块）工单/交接班/异常只读回归：权限范围、状态筛选、事件历史去重、详情鉴权。
const assert = require('node:assert/strict')
const { createMemoryDb } = require('./helpers/router-memory-db.cjs')
const jobs = require('../uniCloud-alipay/cloudfunctions/router/util/mes/jobs-read.js')
const handovers = require('../uniCloud-alipay/cloudfunctions/router/util/mes/handovers-read.js')

const ADMIN = { uid: 'u-admin', isAdmin: true, personId: '', workshopId: '', processIds: [], scopeRole: 'admin' }
const OPERATOR = { uid: 'u-emp', isAdmin: false, personId: 'p1', workshopId: 'w1', processIds: [], scopeRole: 'operator' }

function makeDb() {
    const db = createMemoryDb()
    const seed = (name, rows) => { for (const row of rows) db.ensure(name).set(row._id, row) }
    seed('mes_ops_jobs', [
        { _id: 'job:1', state: 'running', workshopId: 'w1', personIds: ['p1'], personNames: ['张三'], batchNo: 'APDD26X1006', productName: '产品A', processName: '灌装', updatedAt: 300, version: 3, event: { type: 'report', requestId: 'r1', version: undefined } },
        { _id: 'job:2', state: 'completed', workshopId: 'w1', personIds: ['p1'], personNames: ['张三'], batchNo: 'APDD26X1007', productName: '产品B', processName: '灌装', updatedAt: 200, version: 1, event: { type: 'complete', requestId: 'r2' } },
        { _id: 'job:3', state: 'running', workshopId: 'w2', personIds: ['p2'], personNames: ['李四'], batchNo: 'APDD26X1008', productName: '产品C', processName: '贴标', updatedAt: 100, version: 1 },
    ])
    seed('mes_ops_versions', [
        { _id: 'ver:job:1:1', entityId: 'job:1', version: 1, snapshot: { _id: 'job:1', version: 1, workshopId: 'w1', personIds: ['p1'], event: { type: 'create', requestId: 'r0' } } },
        { _id: 'ver:job:1:2', entityId: 'job:1', version: 2, snapshot: { _id: 'job:1', version: 2, workshopId: 'w1', personIds: ['p1'], event: { type: 'report', requestId: 'r1' } } },
    ])
    seed('mes_ops_handovers', [
        { _id: 'h1', status: 'submitted', workshopId: 'w1', authorId: 'u-emp', receiverUid: 'u2', authorName: '张三', updatedAt: 100 },
        { _id: 'h2', status: 'draft', workshopId: 'w1', authorId: 'u3', receiverUid: 'u-emp', authorName: '王五', updatedAt: 200 },
        { _id: 'h3', status: 'submitted', workshopId: 'w2', authorId: 'u3', receiverUid: 'u4', authorName: '王五', updatedAt: 300 },
    ])
    seed('mes_ops_exceptions', [
        { _id: 'e1', status: 'open', enabled: true, workshopId: 'w1', personIds: ['p1'], batchNo: 'APDD26X1006', category: '设备', updatedAt: 100 },
        { _id: 'e2', status: 'resolved', enabled: true, workshopId: 'w1', personIds: ['p1'], batchNo: 'APDD26X1007', category: '质量', updatedAt: 200 },
        { _id: 'e3', status: 'open', enabled: false, workshopId: 'w1', personIds: ['p1'], batchNo: 'APDD26X1009', category: '安全', updatedAt: 300 },
        { _id: 'e4', status: 'open', enabled: true, workshopId: 'w2', personIds: ['p2'], batchNo: 'APDD26X1010', category: '设备', updatedAt: 400 },
    ])
    return db
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
const rejectsWith = async (promise, code, pattern) => {
    try {
        await promise
    } catch (error) {
        assert.equal(error.code, code, '错误码应为 ' + code)
        if (pattern) assert.match(error.message, pattern)
        return
    }
    assert.fail('应当抛错但成功返回')
}

;(async () => {
    console.log('\nMES 原生化 jobs/handovers/exceptions（只读）测试')

    await test('listJobs 管理员：分页、状态筛选、关键字；非法状态 400', async () => {
        const all = await jobs.listJobs(makeDb(), ADMIN, { page: 1, pageSize: 20 })
        assert.equal(all.total, 3)
        assert.equal(all.list.length, 3)
        const running = await jobs.listJobs(makeDb(), ADMIN, { state: 'running' })
        assert.deepEqual(running.list.map((row) => row._id).sort(), ['job:1', 'job:3'])
        const keyword = await jobs.listJobs(makeDb(), ADMIN, { keyword: 'APDD26X1006' })
        assert.deepEqual(keyword.list.map((row) => row._id), ['job:1'])
        await rejectsWith(jobs.listJobs(makeDb(), ADMIN, { state: 'unknown' }), 400, /状态非法/)
    })

    await test('listJobs 普通人员：只返回本人车间且分配了本人的工单', async () => {
        const data = await jobs.listJobs(makeDb(), OPERATOR, { page: 1, pageSize: 20 })
        assert.deepEqual(data.list.map((row) => row._id).sort(), ['job:1', 'job:2'])
        assert.equal(data.total, 2)
    })

    await test('getJob：返回工单 + 事件历史（按版本倒序、同 requestId 去重）', async () => {
        const data = await jobs.getJob(makeDb(), ADMIN, { id: 'job:1' })
        assert.equal(data.job._id, 'job:1')
        // 去重按版本升序保留第一次出现：r1 命中归档 v2（与旧实现一致）
        assert.deepEqual(data.events.map((event) => [event.requestId, event.version]), [['r1', 2], ['r0', 1]])
        await rejectsWith(jobs.getJob(makeDb(), ADMIN, { id: 'missing' }), 404, /记录不存在/)
        await rejectsWith(jobs.getJob(makeDb(), ADMIN, { id: 123 }), 400, /记录标识/)
    })

    await test('getJob 越权：普通人员读他人车间工单 403', async () => {
        await rejectsWith(jobs.getJob(makeDb(), OPERATOR, { id: 'job:3' }), 403, /无权访问/)
    })

    await test('listHandovers 管理员：分页与状态筛选；非法状态 400', async () => {
        const all = await handovers.listHandovers(makeDb(), ADMIN, { page: 1, pageSize: 20 })
        assert.equal(all.total, 3)
        const submitted = await handovers.listHandovers(makeDb(), ADMIN, { status: 'submitted' })
        assert.deepEqual(submitted.list.map((row) => row._id).sort(), ['h1', 'h3'])
        await rejectsWith(handovers.listHandovers(makeDb(), ADMIN, { status: 'bad' }), 400, /状态非法/)
    })

    await test('listHandovers 普通人员：只看到本人交班或待本人接班的记录', async () => {
        const data = await handovers.listHandovers(makeDb(), OPERATOR, { page: 1, pageSize: 20 })
        assert.deepEqual(data.list.map((row) => row._id).sort(), ['h1', 'h2'])
    })

    await test('getHandover：本人可见，他人车间记录 403', async () => {
        const mine = await handovers.getHandover(makeDb(), OPERATOR, { id: 'h1' })
        assert.equal(mine._id, 'h1')
        await rejectsWith(handovers.getHandover(makeDb(), OPERATOR, { id: 'h3' }), 403, /无权访问/)
    })

    await test('listExceptions：默认排除停用；状态筛选；非法状态 400', async () => {
        const all = await handovers.listExceptions(makeDb(), ADMIN, { page: 1, pageSize: 20 })
        assert.equal(all.total, 3)
        assert.equal(all.list.some((row) => row._id === 'e3'), false)
        const resolved = await handovers.listExceptions(makeDb(), ADMIN, { status: 'resolved' })
        assert.deepEqual(resolved.list.map((row) => row._id), ['e2'])
        await rejectsWith(handovers.listExceptions(makeDb(), ADMIN, { status: 'bad' }), 400, /状态非法/)
    })

    await test('listExceptions 普通人员：只返回本人可见工单范围内的异常', async () => {
        const data = await handovers.listExceptions(makeDb(), OPERATOR, { page: 1, pageSize: 20 })
        assert.deepEqual(data.list.map((row) => row._id).sort(), ['e1', 'e2'])
    })

    console.log('\nMES 原生化 jobs/handovers：' + passed + ' passed, ' + failed + ' failed')
    process.exit(failed ? 1 : 0)
})()

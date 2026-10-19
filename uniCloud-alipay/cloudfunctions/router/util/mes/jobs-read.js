'use strict'
/**
 * MES 原生化（P3-B 第 5 模块）：工单只读，从 mes-operations/jobs.js 内迁。
 * 范围：getJob / listJobs；工单写操作（createJob/jobCommand）留到写模块阶段。
 */
const { ClientError } = require('./common')
const { identifier, get, list, history } = require('./shared')
const { where, visible } = require('./scope')

const STATES = ['planned', 'running', 'paused', 'completed']

/** 返回工单和全部已接受事件；历史内容只读、数量不重新推算替换原始凭据。 */
async function getJob(db, profile, input) {
    const job = visible(profile, 'jobs', await get(db, 'jobs', identifier(input.id)))
    const snapshots = await history(db, 'jobs', job)
    const seen = new Set()
    const events = snapshots.map(snapshot => snapshot.event ? { ...snapshot.event, version: snapshot.version } : null).filter(item => {
        if (!item || seen.has(item.requestId)) return false
        seen.add(item.requestId); return true
    }).sort((left, right) => right.version - left.version)
    return { job, events }
}

/** 列表不接受任意状态，保证权限条件始终参与实际数据库查询。 */
async function listJobs(db, profile, input) {
    if (input.state && !STATES.includes(input.state)) throw new ClientError('工单状态非法', 400)
    return list(db, 'jobs', input, where(db, profile, 'jobs'), ['batchNo', 'productCode', 'productName', 'processName', 'workshopName'], input.state ? { state: input.state } : {})
}

module.exports = { STATES, getJob, listJobs }

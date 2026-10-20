'use strict'
/**
 * P3-B4：从 mes-operations/personnel-claims.js 1:1 内迁认领读操作。
 * claimCandidates / myPersonnelClaim 走 auth-only（不经过 scope.profile：未绑定账号也能申请认领）；
 * listPersonnelClaims 为管理员分页查询。
 */
const { ClientError } = require('./common')
const { digest, text, collection, all, get, list } = require('./shared')
const { admin } = require('./scope')

/** 尚未绑定的已登录员工仅能查询最少的认领信息，不能访问人员账号资料。 */
async function claimCandidates(db, auth, input) {
    const keyword = text(input.keyword, 80)
    if (!keyword) return { list: [] }
    const bound = await all(db, collection('personnel'), { uid: auth.uid, enabled: db.command.neq(false) }, 2)
    if (bound.length) throw new ClientError('当前账号已绑定人员档案', 409)
    const result = await list(db, 'personnel', { keyword, pageSize: 20 }, { enabled: db.command.neq(false), uid: '' }, ['name', 'code', 'enterpriseEmployeeNo'])
    return { list: result.list.map(row => ({ _id: row._id, name: row.name, code: row.code, workshopName: row.workshopName })), total: result.total }
}

/** 当前账号只读取自己的认领申请。 */
async function myPersonnelClaim(db, auth) {
    const record = await get(db, 'claims', 'claim:' + digest(auth.uid), false)
    return { record }
}

/** 管理员按申请状态分页审核，包含申请人唯一账号标识。 */
async function listPersonnelClaims(db, profile, input) {
    admin(profile)
    return list(db, 'claims', input, {}, ['personName', 'employeeNo', 'accountName'], input.status ? { status: text(input.status, 30) } : {})
}

module.exports = { claimCandidates, myPersonnelClaim, listPersonnelClaims }

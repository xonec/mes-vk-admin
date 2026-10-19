'use strict'
/**
 * MES 原生化（P3-B）：鉴权与统一响应，从 mes-common 内迁。
 *
 * 与 mes-common 的差异：
 * - token 校验复用 vk router 提供的 uniID 实例（uni-id 3.x），不再依赖 uni-id-common；
 *   vk 实例的 checkToken 可能额外校验 token 是否仍在用户 token 列表（比旧版更严格）。
 * - 其余行为保持一致：用户表复核、封禁/注销拦截、改密后旧 token 失效、fail-closed。
 *
 * 响应口径与旧云函数完全一致：{ code, message, data } / 失败 { code, message }。
 */
const USER_COLL = 'uni-id-users'

/** 面向客户端的业务错误（与 mes-common.ClientError 同名同语义）。 */
class ClientError extends Error {
    constructor(message, code = 500) {
        super(message)
        this.name = 'ClientError'
        this.code = code
    }
}

/** 从已验签 token 里取 iat（仅解码 payload，不重复验签；验签已由 uniID.checkToken 完成）。 */
function decodeIat(token) {
    try {
        const payload = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64').toString('utf8'))
        return Number(payload && payload.iat) || 0
    } catch (_) {
        return 0
    }
}

/** 读用户记录（带一次重试，降低瞬时抖动导致的误判）。 */
async function loadUserWithRetry(db, uid) {
    let lastErr = null
    for (let i = 0; i < 2; i++) {
        try {
            const res = await db.collection(USER_COLL).doc(uid).get()
            return { user: (res && res.data && res.data[0]) || null, err: null }
        } catch (e) {
            lastErr = e
            if (i === 0) await new Promise(r => setTimeout(r, 150))
        }
    }
    return { user: null, err: lastErr }
}

/** uni-id status：0/未设置=正常；1=封禁；2=审核中；3=审核失败；4=已注销。 */
function isBlocked(u) {
    const s = u.status
    return s === 1 || s === 2 || s === 3 || s === 4
}

/**
 * 验 token → { errCode, uid, role }；errCode 0 表示通过。
 * @param {Object} db
 * @param {String} token 客户端 uni_id_token
 * @param {Object} uniID vk router util.uniID（uni-id 实例）
 */
async function checkAuth(db, token, uniID) {
    if (!token) return { errCode: 401, message: '未登录' }
    if (!uniID || typeof uniID.checkToken !== 'function') return { errCode: 503, message: '鉴权组件不可用，请稍后重试' }
    let result
    try {
        result = await uniID.checkToken(token, { needPermission: false, needUserInfo: false })
    } catch (_) {
        return { errCode: 401, message: '登录失效，请重新登录' }
    }
    if (!result || result.code !== 0 || !result.uid) return { errCode: 401, message: '登录失效，请重新登录' }

    const { user: u, err } = await loadUserWithRetry(db, result.uid)
    if (err) {
        console.warn('[mes-native] 查用户状态失败，拒绝本次请求（fail-closed）：', err && err.message)
        return { errCode: 503, message: '服务暂时不可用，请稍后重试' }
    }
    if (!u) return { errCode: 401, message: '账号不存在' }
    if (isBlocked(u)) return { errCode: 401, message: '账号已失效，请重新登录' }
    const iat = decodeIat(token)
    if (u.valid_token_date && iat && Number(u.valid_token_date) > iat * 1000) {
        return { errCode: 401, message: '密码已变更，请重新登录' }
    }
    return { errCode: 0, uid: result.uid, role: u.role || [] }
}

/** 管理员鉴权：验 token + 数据库最新角色含 admin（fail-closed）。 */
async function checkAdmin(db, token, uniID) {
    const auth = await checkAuth(db, token, uniID)
    if (auth.errCode) return auth
    if ((auth.role || []).indexOf('admin') < 0) return { errCode: 403, message: '无权限' }
    return auth
}

/** 统一响应封装（与 mes-common 完全一致）。 */
function ok(data) {
    return { code: 0, message: 'ok', data }
}
function fail(code, message) {
    return { code, message }
}

module.exports = { checkAuth, checkAdmin, ok, fail, ClientError, USER_COLL, decodeIat }

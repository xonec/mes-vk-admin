'use strict'
/**
 * MES 灰度开关（vk-global-data/mes-native-switch）在线读写 —— 管理员运维入口的数据层。
 *
 * 背景：灰度开关一直只靠 routing.js 的 DEFAULT_ACTIONS，云端从没有可用的写入入口；
 * P3-B1 起通过 `mes/pub/mes-switch` 云函数在线上改开关，不再依赖云开发控制台。
 *
 * 文档结构（routing.js 只读取 actions，其余字段仅供人工排查）：
 * {
 *   _id: 'mes-native-switch',
 *   actions: { saveCatalog: 'native', saveSchedule: 'forward', ... },
 *   updatedBy: '<uid>',
 *   updatedAt: '<ISO 时间>',
 *   comment: '<uid> 于 <北京时间>（北京时间）修改'
 * }
 *
 * 约定：
 * - 只允许写 routing.SWITCHABLE_WRITE_ACTIONS 里的 action，值与旧开关口径一致（native/forward）；
 * - 合并写入：只覆盖传入的键，保留文档里其它 action 键与其它顶层字段；
 * - 写后清 routing 的 60 秒缓存并读回，保证调用方看到的就是下一步生效的配置。
 */
const { ClientError } = require('./common')
const routing = require('./routing')

const MODES = ['native', 'forward']
const BEIJING_OFFSET_MS = 8 * 3600 * 1000

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** 读开关文档原始内容；不存在返回 null。 */
async function readDoc(db) {
    const res = await db.collection(routing.CONFIG_COLLECTION).doc(routing.CONFIG_ID).get()
    return (res && res.data && res.data[0]) || null
}

/** 读当前文档里的 actions；文档不存在或结构异常按 {} 处理（与 routing 的容错口径一致）。 */
async function readActions(db) {
    const doc = await readDoc(db)
    return doc && isPlainObject(doc.actions) ? { ...doc.actions } : {}
}

/** comment 用北京时间（UTC+8），与后台页面显示口径一致。 */
function beijingNow() {
    return new Date(Date.now() + BEIJING_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 19)
}

/** 校验入参：只接受可切换写 action + native/forward，避免误写其它 action。 */
function validateActions(input) {
    if (!isPlainObject(input)) throw new ClientError('缺少 actions 参数', 400)
    const keys = Object.keys(input)
    if (!keys.length) throw new ClientError('缺少 actions 参数', 400)
    const patch = {}
    for (const key of keys) {
        if (routing.SWITCHABLE_WRITE_ACTIONS.indexOf(key) < 0) throw new ClientError('不支持的开关项：' + key, 400)
        if (MODES.indexOf(input[key]) < 0) throw new ClientError('开关值须为 native 或 forward：' + key, 400)
        patch[key] = input[key]
    }
    return patch
}

/** 统一返回结构：当前 actions + 代码默认值 + 可切换清单，便于调用方核对。 */
function snapshot(actions, extra) {
    return {
        actions,
        defaults: { ...routing.DEFAULT_ACTIONS },
        switchable: [...routing.SWITCHABLE_WRITE_ACTIONS],
        ...(extra || {}),
    }
}

/** get：返回文档 actions（无文档为 {}）+ 代码默认 DEFAULT_ACTIONS。 */
async function getSwitch(db) {
    return snapshot(await readActions(db))
}

/** set：合并写入 → 清缓存 → 读回；返回读回的 actions 与本次写入元信息。 */
async function setSwitch(db, uid, input) {
    const patch = validateActions(input)
    const current = await readDoc(db)
    const doc = current ? { ...current } : {}
    // doc(id).set 会整体替换文档：先合并旧字段，去掉 _id 由 doc(id) 决定，避免云端拒绝改主键。
    delete doc._id
    const actions = { ...(isPlainObject(doc.actions) ? doc.actions : {}), ...patch }
    const updatedAt = new Date().toISOString()
    const comment = `${uid} 于 ${beijingNow()}（北京时间）修改`
    await db.collection(routing.CONFIG_COLLECTION).doc(routing.CONFIG_ID).set({ ...doc, actions, updatedBy: uid, updatedAt, comment })
    routing.clearCache()
    return snapshot(await readActions(db), { updatedBy: uid, updatedAt, comment })
}

module.exports = { getSwitch, setSwitch, readActions, validateActions, MODES }

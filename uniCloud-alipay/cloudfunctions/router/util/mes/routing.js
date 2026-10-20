'use strict'
/**
 * MES 原生化灰度开关：action → 'native' | 'forward'。
 *
 * 配置位置：集合 vk-global-data 文档 _id = 'mes-native-switch'，
 * 结构：{ actions: { bootstrap: 'native', listSchedules: 'forward', ... } }。
 * 读取缓存 60 秒；配置不存在或读取失败时回退 DEFAULT_ACTIONS（已迁移模块默认 native）。
 *
 * 回退方式：把对应 action 改成 'forward'（无需重传 router，60 秒内生效），
 * 或重传上一版 router。façade 转发代码（util/mes-forward.js）在 P4 前一直保留。
 */
const CONFIG_COLLECTION = 'vk-global-data'
const CONFIG_ID = 'mes-native-switch'
const CACHE_MS = 60000

/** 已内迁的 action 默认走 native；未登记的 action 一律 forward。 */
const DEFAULT_ACTIONS = {
    bootstrap: 'native',
    listSchedules: 'native',
    scheduleCalendar: 'native',
    myScheduleDay: 'native',
    report: 'native',
    dashboard: 'native',
    attendanceSummary: 'native',
    listAttendance: 'native',
    myAttendance: 'native',
    attendanceHistory: 'native',
    listJobs: 'native',
    getJob: 'native',
    listHandovers: 'native',
    getHandover: 'native',
    listExceptions: 'native',
    audit: 'native',
}

/**
 * 可切换写 action：跟随 mes-native-switch（先 forward、后 native、可回退）。
 * - P3-B1：catalogs / schedules（saveCatalog/saveSchedule）
 * - P3-B2：jobs / handovers / exceptions（createJob/jobCommand/saveHandover/handoverCommand/saveException/resolveException）
 * - P3-B3：attendance（saveAttendance/resolveAttendanceConflict/syncAttendance）
 * 这也是 mes-switch 允许写入的 key 白名单（native-switch.js 直接校验本数组）。
 */
const SWITCHABLE_WRITE_ACTIONS = [
    'saveCatalog', 'saveSchedule',
    'createJob', 'jobCommand',
    'saveHandover', 'handoverCommand', 'saveException', 'resolveException',
    'saveAttendance', 'resolveAttendanceConflict', 'syncAttendance',
]

let cache = { at: 0, actions: null }

/** 读开关配置；失败按“未配置”处理，绝不因此拒绝请求。 */
async function loadActions(db) {
    if (cache.actions && Date.now() - cache.at < CACHE_MS) return cache.actions
    let actions = null
    try {
        const doc = ((await db.collection(CONFIG_COLLECTION).doc(CONFIG_ID).get()).data || [])[0]
        if (doc && doc.actions && typeof doc.actions === 'object' && !Array.isArray(doc.actions)) actions = doc.actions
    } catch (error) {
        console.warn('[mes-native] 读取灰度开关失败，按未配置处理：', error && error.message)
        actions = null
    }
    cache = { at: Date.now(), actions }
    return actions
}

/** 解析某个 action 本次请求走 native 还是 forward；options.mode 仅测试用。 */
async function resolveMode(db, action, options = {}) {
    if (options.mode === 'native' || options.mode === 'forward') return options.mode
    const actions = await loadActions(db)
    const mode = actions ? actions[action] : DEFAULT_ACTIONS[action]
    if (mode === 'native') return 'native'
    return 'forward'
}

/** 测试用：清空开关缓存。 */
function clearCache() {
    cache = { at: 0, actions: null }
}

module.exports = { resolveMode, clearCache, DEFAULT_ACTIONS, SWITCHABLE_WRITE_ACTIONS, CONFIG_ID, CONFIG_COLLECTION }

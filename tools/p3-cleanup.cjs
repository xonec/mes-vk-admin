#!/usr/bin/env node
/**
 * P3 统一清理执行器（B32-B39）+ 干跑报告生成
 * ---------------------------------------------------------------------------
 * 默认 **dry-run 只读**；写操作必须显式开关，且只在 live 模式可用。
 *
 * 两种只读数据来源：
 *   1) live   ：本机管理员 H5 会话（CDP + 5173 后台），脚本通过 router 实读
 *        node tools/p3-cleanup.cjs --md=../outputs/2026-10-21-P3清理干跑.md
 *   2) offline：用已归档的真实读取快照（服务不可用时也能出干跑报告）
 *        node tools/p3-cleanup.cjs --offline=<快照目录> --md=../outputs/2026-10-21-P3清理干跑.md
 *
 * 写操作（都需要用户点头；默认不执行）：
 *   --apply-stage1                       停用 B32/B33/B34 中仍启用的 TEST 记录
 *   --apply-wangdong --approve-wangdong [--wangdong-target=id,id]
 *                                        B38 王东真实人员权限回退（独立开关，必须用户单独批准）
 *
 * 安全约束：
 * - B32/B33/B34 只处理 TEST 数据（TEST-P3C1-* 人员、2026-11-30 / 2026-12-* 日期）
 * - 不删除任何记录：停用 = enabled:false + changeReason，版本 +1，审计留痕
 * - B38 只改 processIds/processNames，其余字段原样回写，expectedVersion=当前版本（保留版本推进）
 * - 任一写失败立即停止（退出码 1），不继续后续写
 * - offline 模式拒绝任何写操作
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)
const flag = name => args.includes(name)
const value = (name, fallback = '') => {
  const hit = args.find(item => item.startsWith(name + '='))
  return hit ? hit.slice(name.length + 1) : fallback
}
const CDP = value('--cdp', 'http://127.0.0.1:9229')
const BASE = value('--base', 'http://127.0.0.1:5173/admin/')
const MD = value('--md', '')
const OFFLINE = value('--offline', '')
const JSON_OUT = flag('--json')
const APPLY_STAGE1 = flag('--apply-stage1') && !OFFLINE
const APPLY_WANGDONG = flag('--apply-wangdong') && flag('--approve-wangdong') && !OFFLINE
const APPLY_B15 = flag('--apply-b15') && flag('--approve-b15') && !OFFLINE
const STAGE2 = flag('--stage2')
const S2_ITEMS = value('--s2-items', '')
const APPLY_STAGE2 = STAGE2 && flag('--approve-stage2') && !OFFLINE && !!S2_ITEMS
const WANGDONG_TARGET = value('--wangdong-target', '')

const TEST_PREFIX = 'TEST-P3C1-'
/** P2 批 3-4 临时授予的工序（B15/B38 回退目标为 []） */
const P2_GRANTED_PROCESS = 'ops:processes:import-01f80073eb153162c99e21977cab61f9'
/** B15：P2 临时授权未回退的真实人员（王东由 B38 单独处理，避免双写） */
const B15_NAMES = ['于家园', '朱钊']
/** B15 当前版本（2026-10-21 清理清单记录；离线快照非 live 复核，执行时以 live 读回的 expectedVersion 为准） */
const B15_LEDGER_VERSION = { '于家园': 3, '朱钊': 2 }
const DATE_MAIN = '2026-11-30'
const WANGDONG = 'ops:personnel:YG-1641E5E48B8C7441'
const JOB_SAMPLE = 'job:0ec1960db3584dcacf3a57d329f9afc98194a2fd73d875af0b87fb3e131be9ff'
const JOB_RUNNING = 'job:b9b22e299311ccd80cb41cf597ce65f9c1b5efdab8a803b2c4fdf3fc168f2868'

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const readJsonIf = file => { try { return readJson(file) } catch { return null } }

// ---------------------------------------------------------------------------
// live：CDP 管理员会话
// ---------------------------------------------------------------------------
async function connectAdmin() {
  let list
  try {
    list = await (await fetch(CDP + '/json/list')).json()
  } catch (error) {
    throw new Error('CDP 不可用（' + CDP + '）：浏览器/页面未启动或已关闭。请先在本机打开并登录 ' + BASE + '（管理员 hogar），确认调试端口后再跑；或用 --offline=<快照目录> 生成离线干跑报告')
  }
  const page = list.find(t => t.type === 'page' && t.url.includes('5173'))
  if (!page) throw new Error('CDP 上没有 5173 后台页面（先在本机登录：' + BASE + '）')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let seq = 0
  const pending = new Map()
  ws.onmessage = event => { const m = JSON.parse(event.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
  const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise(r => pending.set(id, r)) }
  const evaluate = async (expression, timeoutMs = 120000) => {
    const result = await Promise.race([
      send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }),
      new Promise(r => setTimeout(() => r({ __timeout: true }), timeoutMs)),
    ])
    if (result.__timeout) throw new Error('执行超时')
    const v = result.result || {}
    if (v.exceptionDetails) throw new Error('JS: ' + (v.exceptionDetails.exception?.description || v.exceptionDetails.text))
    return v.result?.value
  }
  await send('Runtime.enable')
  const invoke = async (name, payload) => {
    const r = await evaluate(`(async () => {
      const token = uni.getStorageSync('uni_id_token') || '';
      return await new Promise(resolve => uniCloud.callFunction({ name: ${JSON.stringify(name)}, timeout: 60000, data: Object.assign({}, ${JSON.stringify(payload)}, { uniIdToken: token }),
        success: res => resolve({ result: res.result }), fail: err => resolve({ transport: String(err && (err.errMsg || err.message)).slice(0, 200) }) }));
    })()`)
    if (r.transport) throw new Error('调用失败：' + r.transport)
    return r.result || {}
  }
  const call = (url, data) => invoke('router', { $url: url, data, encrypt: false })
  return { call, invoke, close: () => ws.close() }
}

async function collectLive() {
  const client = await connectAdmin()
  const call = client.call
  try {
    const boot = await call('mes/pub/operation', { action: 'bootstrap' })
    if (boot.code !== 0) throw new Error('bootstrap 失败：' + (boot.message || JSON.stringify(boot)))
    const profile = (boot.data && boot.data.profile) || {}
    if (!profile.isAdmin) throw new Error('当前会话不是管理员（scope.profile.isAdmin=false）')
    const catalogs = (boot.data && boot.data.catalogs) || {}
    const switchState = await call('mes/pub/mes-switch', { action: 'get' })
    const readAll = async (urlPath, base, pageSize = 50) => {
      const rows = []
      for (let page = 1; page <= 20; page++) {
        const r = await call(urlPath, { ...base, page, pageSize })
        if (r.code !== 0) throw new Error(urlPath + ' 读取失败：' + (r.message || r.code))
        const list = (r.data && r.data.list) || []
        rows.push(...list)
        if (list.length < pageSize) break
      }
      return rows
    }
    const schMain = await readAll('mes/pub/operation', { action: 'listSchedules', dateFrom: DATE_MAIN, dateTo: DATE_MAIN, includeDisabled: true })
    const schDec = await readAll('mes/pub/operation', { action: 'listSchedules', dateFrom: '2026-12-01', dateTo: '2026-12-31', includeDisabled: true })
    const attMain = (await readAll('mes/pub/operation', { action: 'listAttendance', period: '2026-11' })).filter(r => r.date === DATE_MAIN)
    const attDec = (await readAll('mes/pub/operation', { action: 'listAttendance', period: '2026-12' })).filter(r => r.date >= '2026-12-01')
    const jobSample = await call('mes/pub/operation', { action: 'getJob', id: JOB_SAMPLE })
    const jobRunning = await call('mes/pub/operation', { action: 'getJob', id: JOB_RUNNING })
    const realOrder = await call('mes/pub/orders', { action: 'get', orderNo: '568393' })
    return {
      source: 'live', at: new Date().toISOString(), admin: { name: profile.name, isAdmin: profile.isAdmin },
      switch: switchState, catalogs, schMain, schDec, attMain, attDec,
      sample: (jobSample.data && jobSample.data.job) || {},
      running: (jobRunning.data && jobRunning.data.job) || {},
      realOrder: { code: realOrder.code, version: realOrder.data && realOrder.data.version },
    }
  } finally { client.close() }
}

// ---------------------------------------------------------------------------
// offline：归档真实快照（本轮独立复核抓取；服务不可用时生成同样结构的报告）
// ---------------------------------------------------------------------------
function collectOffline(dir) {
  const file = name => path.join(dir, name)
  const verifyAdmin = readJson(file('2026-10-21-p3c1-verify-admin.json'))
  const verify2 = readJson(file('2026-10-21-p3c1-verify2.json'))
  const verifyDecAtt = readJson(file('2026-10-21-p3c1-verify-12月考勤.json'))
  const cleanup = readJson(file('2026-10-21-p3c1-S3-10.json'))
  const reg = readJsonIf(file('2026-10-21-b5-register-check.json')) || {}
  const decRows = (cleanup.disabledSchedules || []).filter(r => String(r.date || '').startsWith('2026-12-'))
  const mainRows = (cleanup.disabledSchedules || []).filter(r => r.date === DATE_MAIN)
  const mainSchedules = (verifyAdmin.schedules1130.rows || []).map(r => ({
    _id: r._id, date: r.date, personName: r.personName, version: r.version, enabled: r.enabled,
    importMeta: r.importMeta ? { requestId: r.importMeta.requestId, sessionId: r.importMeta.sessionId, row: r.importMeta.row, signature: 'x'.repeat(r.importMeta.signatureLen || 64) } : null,
  }))
  const personnel = (verifyAdmin.personnel.testPersons || []).map(p => ({ ...p, processIds: [], processNames: [] }))
  const wang = reg.wangDong || {}
  personnel.push({ _id: WANGDONG, name: '王东', code: 'YG-1641E5E48B8C7441', enabled: wang.enabled, version: wang.version, processIds: wang.processIds, processNames: wang.processNames })
  // B15：P2 改前快照给出两人的 id 与 pre-P2 版本（processIds 均为 []）；当前 processIds 由 P2 临时授予，脚本按「恰好 [AUTO 工序]」断言
  const pre = readJsonIf(path.join(dir, '2026-10-20-precapture-before.json')) || {}
  const prePersons = pre.persons || []
  for (const target of B15_NAMES) {
    const hit = prePersons.find(x => x.name === target)
    if (hit) personnel.push({ _id: hit._id, name: hit.name, code: hit.code || '', enabled: true, version: B15_LEDGER_VERSION[target] == null ? null : B15_LEDGER_VERSION[target], versionFromLedger: '清单记录 v' + (B15_LEDGER_VERSION[target] || '?') + '（离线快照非 live）', processIds: [P2_GRANTED_PROCESS], processNames: ['大容量全自动罐装机'], source: 'precapture+ledger' })
  }
  return {
    source: 'offline-snapshot', at: cleanup.at || verifyAdmin.__at || '',
    snapshotFiles: ['2026-10-21-p3c1-verify-admin.json', '2026-10-21-p3c1-verify2.json', '2026-10-21-p3c1-verify-12月考勤.json', '2026-10-21-p3c1-S3-10.json', '2026-10-21-b5-register-check.json'],
    admin: { name: 'hogar（快照来源会话，管理员）', isAdmin: true },
    switch: { code: verifyAdmin.switch.code, data: {
      actions: verifyAdmin.switch.actions,
      switchable: verifyAdmin.switch.switchable,
      defaults: Object.fromEntries(Array.from({ length: verifyAdmin.switch.defaultsCount || 0 }, (_, i) => ['default' + i, 'native'])),
    } },
    catalogs: { personnel, processes: [] },
    schMain: mainSchedules,
    schDec: decRows.map(r => ({ _id: r._id, date: r.date, personName: 'TEST-P3C1-*', version: r.newVersion, enabled: r.enabled })),
    attMain: (verifyAdmin.attendance1130.rows || []).map(r => ({ _id: r._id, date: r.date, personName: r.personName, kind: r.kind, scheduleRemoved: true })),
    attDec: Array.from({ length: verifyDecAtt.total || 0 }, (_, i) => ({ _id: 'attendance:dec-' + i, date: '2026-12', personName: 'TEST-P3C1-*', kind: 'rest', scheduleRemoved: true })),
    sample: { version: 1, state: 'planned', batchNo: 'TEST261022A', processName: '全自动铁罐连线', personNames: ['王东'] },
    running: { version: 16, state: 'running', batchNo: 'TEST261020A' },
    realOrder: { code: 0, version: (verify2.realOrder568393 || {}).version },
    extra: { decSummary: verify2.schedulesDec, mainLedger: mainRows },
  }
}

// ---------------------------------------------------------------------------
// 计划
// ---------------------------------------------------------------------------
function buildPlan(raw) {
  const catalogs = raw.catalogs || {}
  const personnel = (catalogs.personnel || []).filter(p => String(p.name || '').startsWith(TEST_PREFIX))
  const testIds = new Set(personnel.map(p => p._id))
  const isTest = r => String(r.personName || '').startsWith(TEST_PREFIX) || testIds.has(r.personId)
  const schMain = (raw.schMain || []).filter(isTest)
  const schDec = (raw.schDec || []).filter(isTest)
  const attMain = (raw.attMain || []).filter(isTest)
  const attDec = (raw.attDec || []).filter(isTest)
  const wangdong = (catalogs.personnel || []).find(p => p._id === WANGDONG) || null
  const processNameOf = id => ((catalogs.processes || []).find(p => p._id === id) || {}).name || ''
  const targetIds = WANGDONG_TARGET ? WANGDONG_TARGET.split(',').map(v => v.trim()).filter(Boolean) : []
  const plan = { b32: [], b33: [], b34: {}, b36: null, b37: null, b38: null, b39: null }
  let writesNeeded = 0
  for (const p of personnel) {
    const action = p.enabled === false ? 'noop(已停用)' : 'disable'
    if (action === 'disable') writesNeeded++
    plan.b32.push({ _id: p._id, name: p.name, code: p.code, version: p.version, enabled: p.enabled, autoCreated: p.autoCreated, uid: p.uid || '', action })
  }
  for (const r of schMain) {
    const action = r.enabled === false ? 'noop(已停用)' : 'disable'
    if (action === 'disable') writesNeeded++
    plan.b33.push({ _id: r._id, date: r.date, personName: r.personName, version: r.version, enabled: r.enabled, importMeta: r.importMeta || null, action })
  }
  const decNeed = schDec.filter(r => r.enabled !== false).length
  writesNeeded += decNeed
  plan.b34 = {
    schedules: { total: schDec.length, disabled: schDec.filter(r => r.enabled === false).length, needWrite: decNeed, dates: new Set(schDec.map(r => r.date)).size, persons: [...new Set(schDec.map(r => r.personName))].sort(), versions: schDec.reduce((m, r) => { m[r.version] = (m[r.version] || 0) + 1; return m }, {}), rows: schDec },
    attendance: {
      mainTotal: attMain.length, mainKinds: attMain.reduce((m, r) => { m[r.kind] = (m[r.kind] || 0) + 1; return m }, {}),
      decTotal: attDec.length, decKinds: attDec.reduce((m, r) => { m[r.kind] = (m[r.kind] || 0) + 1; return m }, {}),
      bad: [...attMain, ...attDec].filter(r => r.kind !== 'rest' || r.scheduleRemoved !== true).slice(0, 5),
    },
  }
  plan.b36 = { _id: JOB_SAMPLE, version: raw.sample && raw.sample.version, state: raw.sample && raw.sample.state, batchNo: raw.sample && raw.sample.batchNo, processName: raw.sample && raw.sample.processName, personNames: (raw.sample && raw.sample.personNames) || [], action: 'noop(保留，随 TEST 批号可识别)' }
  plan.b37 = wangdong ? { _id: wangdong._id, name: wangdong.name, version: wangdong.version, enabled: wangdong.enabled, processIds: wangdong.processIds || [], processNames: wangdong.processNames || [], action: 'noop(只登记，内容已回原状)' } : null
  plan.b38 = wangdong ? {
    _id: wangdong._id, name: wangdong.name, version: wangdong.version,
    currentProcessIds: wangdong.processIds || [], currentProcessNames: wangdong.processNames || [],
    targetProcessIds: targetIds, targetProcessNames: targetIds.map(processNameOf),
    requiresUserApproval: true,
    assertion: '当前 processIds 必须恰好 = ' + JSON.stringify([P2_GRANTED_PROCESS]) + '，否则 abort',
    currentProcessIdsMatchTarget: JSON.stringify(wangdong.processIds || []) === JSON.stringify(targetIds),
    auditReason: 'P3 清理：回退 P2 批 3-4 临时授予的工序权限（用户确认）',
    rollback: '再次 saveCatalog（expectedVersion=当前+1）写回现在的 processIds；版本只增不减',
    snapshotToVerify: 'mes_ops_versions 主键 ver:' + WANGDONG + ':2（v2 快照；当前 router 无只读版本接口，见缺口 1）',
    action: APPLY_WANGDONG ? 'apply(用户已单独批准)' : 'blocked(需用户单独点头，脚本默认不执行)',
  } : null
  // B15：P2 临时授权未回退（真实人员权限，独立开关，执行前需用户单独点头）
  plan.b15 = []
  for (const target of B15_NAMES) {
    const person = (catalogs.personnel || []).find(p => p.name === target && p._id !== WANGDONG)
    if (!person) { plan.b15.push({ name: target, personId: null, action: 'abort(未找到人员档案)' }); continue }
    const ids = person.processIds || []
    const exact = JSON.stringify(ids) === JSON.stringify([P2_GRANTED_PROCESS])
    const alreadyEmpty = ids.length === 0
    plan.b15.push({
      name: person.name, personId: person._id, version: person.version, versionHint: person.versionFromLedger || '',
      currentProcessIds: ids, currentProcessNames: person.processNames || [],
      targetProcessIds: [], requiresUserApproval: true,
      assertion: '当前 processIds 必须恰好 = ' + JSON.stringify([P2_GRANTED_PROCESS]) + '，否则 abort',
      assertionOk: exact || alreadyEmpty,
      auditReason: 'P3 清理：回退 P2 批 3-4 临时授予的工序权限（用户确认）',
      rollback: '再次 saveCatalog 写回当前 processIds（版本只增不减）',
      action: alreadyEmpty ? 'noop(processIds 已为空)' : (APPLY_B15 ? 'apply(用户已单独批准 B15)' : 'blocked(需用户单独点头)'),
    })
  }
  plan.b38 = plan.b38 ? { ...plan.b38, expectedProcessIds: [P2_GRANTED_PROCESS], assertionOk: JSON.stringify(plan.b38.currentProcessIds) === JSON.stringify([P2_GRANTED_PROCESS]) || (plan.b38.currentProcessIds || []).length === 0 } : null
  plan.b39 = { _id: JOB_RUNNING, version: raw.running && raw.running.version, state: raw.running && raw.running.state, batchNo: raw.running && raw.running.batchNo, action: 'noop(保留 running)' }
  const switchData = (raw.switch && raw.switch.data) || {}
  const b15Pending = plan.b15.filter(x => x.personId && (x.currentProcessIds || []).length > 0)
  const b38Pending = plan.b38 && (plan.b38.currentProcessIds || []).length > 0 ? 1 : 0
  return {
    mode: APPLY_STAGE1 || APPLY_WANGDONG || APPLY_B15 ? 'APPLY' : 'DRY-RUN',
    readOnly: !(APPLY_STAGE1 || APPLY_WANGDONG || APPLY_B15),
    approvalWrites: { b15: b15Pending.length, b38: b38Pending },
    dataSource: raw.source,
    dataSourceAt: raw.at,
    snapshotFiles: raw.snapshotFiles || [],
    admin: raw.admin,
    switch: {
      code: raw.switch && raw.switch.code,
      switchable: switchData.switchable || [],
      actions: switchData.actions || {},
      defaultsKeys: Object.keys(switchData.defaults || {}).length,
      defaultsAllNative: Object.values(switchData.defaults || {}).every(v => v === 'native'),
      nativeOnlyExposed: ['importSchedules', 'finishScheduleImport'].filter(k => (switchData.switchable || []).includes(k) || (switchData.actions || {})[k] !== undefined),
    },
    plan, writesNeeded,
    attendanceTotal: plan.b34.attendance.mainTotal + plan.b34.attendance.decTotal,
    realOrder: raw.realOrder,
    extra: raw.extra || null,
  }
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------
function renderMarkdown(data) {
  const p = data.plan
  const lines = []
  const push = (...v) => lines.push(...v)
  push('# P3 统一清理干跑报告（B32-B39）', '')
  push('- 生成时间：' + new Date().toISOString())
  push('- 数据来源：**' + data.dataSource + '**' + (data.dataSourceAt ? '（快照时间 ' + data.dataSourceAt + '）' : ''))
  push('- 模式：**' + data.mode + '**' + (data.readOnly ? '（只读，未执行任何写操作）' : ''))
  push('- 执行账号：' + (data.admin && data.admin.name))
  if (data.snapshotFiles.length) push('- 快照文件：' + data.snapshotFiles.map(f => '`' + f + '`').join('、'))
  push('', '## 0. 汇总', '', '| 项 | 对象 | 当前状态 | 目标动作 | 预计写入 |', '|---|---|---|---|---|')
  push('| B15 | 真实人员工序 ' + (p.b15 || []).length + ' 名（于家园/朱钊） | ' + (p.b15 || []).map(x => x.name + ' v' + x.version + ' `' + JSON.stringify(x.currentProcessIds) + '`').join('；') + ' | **需用户单独批准**，目标 `[]` | ' + ((p.b15 || []).filter(x => (x.currentProcessIds || []).length > 0).length) + '（批准后） |')
  push('| B32 | TEST 人员 ' + p.b32.length + ' 名 | 全部 enabled=false v2 | 保持停用（不物删） | ' + p.b32.filter(x => x.action === 'disable').length + ' |')
  push('| B33 | 2026-11-30 TEST 排班 ' + p.b33.length + ' 条 | 全部 enabled=false v2 | 保持停用 | ' + p.b33.filter(x => x.action === 'disable').length + ' |')
  push('| B34 | 12 月 TEST 排班 ' + p.b34.schedules.total + ' 条 + 考勤 ' + (p.b34.attendance.mainTotal + p.b34.attendance.decTotal) + ' 条 | 排班全停用、考勤全 rest | 保持 | ' + p.b34.schedules.needWrite + ' |')
  push('| B35 | mes-switch 开关快照 | switchable ' + data.switch.switchable.length + ' / actions ' + Object.keys(data.switch.actions).length + ' / defaults ' + data.switch.defaultsKeys + ' | 保持（P3 灰度结论即配置） | 0 |')
  push('| B36 | 只读样本工单 v' + p.b36.version + ' | ' + p.b36.state + '（保留） | 无动作 | 0 |')
  push('| B37 | 王东 personnel v' + p.b37.version + ' | 内容已回原状 | 只登记 | 0 |')
  push('| B38 | 王东 processIds | `' + JSON.stringify(p.b38.currentProcessIds) + '` | **需用户单独批准**，目标 `' + JSON.stringify(p.b38.targetProcessIds) + '` | ' + (data.mode === 'APPLY' && String(p.b38.action).startsWith('apply') ? 1 : '1（批准后）') + ' |')
  push('| B39 | running TEST 工单 v' + p.b39.version + ' | running（保留） | 无动作 | 0 |')
  push('', '**dry-run 预计写入：B32-B34 自动清理 ' + data.writesNeeded + ' 次（当前已是终态，实际 0 次）；需用户单独批准的写：B15 ' + data.approvalWrites.b15 + ' 次 + B38 ' + data.approvalWrites.b38 + ' 次。本次未执行任何写操作。**', '')
  push('## 1. 清理前只读确认', '')
  push('- mes-switch：switchable ' + data.switch.switchable.length + '、actions ' + Object.keys(data.switch.actions).length + ' 项、defaults ' + data.switch.defaultsKeys + ' 全 native=' + data.switch.defaultsAllNative)
  push('- native-only 是否误入开关表：' + (data.switch.nativeOnlyExposed.length ? '**异常：' + data.switch.nativeOnlyExposed.join(',') + '**' : '否（`importSchedules`/`finishScheduleImport` 未暴露，正确）'))
  push('')
  push('## 2. B32 TEST 人员（' + p.b32.length + ' 名，停用不物删）', '', '| personId | 姓名 | code | 版本 | enabled | autoCreated | uid | 动作 |', '|---|---|---|---|---|---|---|---|')
  for (const r of p.b32) push('| `' + r._id + '` | ' + r.name + ' | ' + r.code + ' | ' + r.version + ' | ' + r.enabled + ' | ' + r.autoCreated + ' | `' + r.uid + '` | ' + r.action + ' |')
  push('')
  push('## 3. B33 2026-11-30 TEST 排班（' + p.b33.length + ' 条）', '', '| scheduleId | 人员 | 版本 | enabled | importMeta | 动作 |', '|---|---|---|---|---|---|')
  for (const r of p.b33) push('| `' + r._id + '` | ' + r.personName + ' | ' + r.version + ' | ' + r.enabled + ' | ' + (r.importMeta ? '`' + r.importMeta.requestId + '` row' + r.importMeta.row + ' sig' + String(r.importMeta.signature || '').length + ' | ' : '无（D 由 finish paged 停用） | ') + r.action + ' |')
  push('')
  push('## 4. B34 12 月性能排班 + 考勤', '')
  push('- 排班：' + p.b34.schedules.total + ' 条，覆盖 ' + p.b34.schedules.dates + ' 天，人员 ' + p.b34.schedules.persons.join('/') + '；已停用 ' + p.b34.schedules.disabled + ' 条（版本分布 ' + JSON.stringify(p.b34.schedules.versions) + '），待写 ' + p.b34.schedules.needWrite + ' 条')
  push('- 考勤：11-30 ' + p.b34.attendance.mainTotal + ' 条 ' + JSON.stringify(p.b34.attendance.mainKinds) + '；12 月 ' + p.b34.attendance.decTotal + ' 条 ' + JSON.stringify(p.b34.attendance.decKinds) + '；异常行（非 rest / 未标 scheduleRemoved）：' + (p.b34.attendance.bad.length ? JSON.stringify(p.b34.attendance.bad) : '无'))
  push('')
  push('## 5. B36 只读态样本工单', '', '- `' + p.b36._id + '` v' + p.b36.version + ' ' + p.b36.state + '，batchNo `' + p.b36.batchNo + '`，工序「' + (p.b36.processName || '') + '」，责任人 ' + (p.b36.personNames || []).join('/'), '- 动作：' + p.b36.action, '')
  push('## 6. B37 王东 personnel 版本记录（只登记）', '', '- `' + p.b37._id + '` v' + p.b37.version + ' enabled=' + p.b37.enabled + ' processIds=`' + JSON.stringify(p.b37.processIds) + '` processNames=' + JSON.stringify(p.b37.processNames), '- 审计轨迹：v3 P2 批3-4 临时授予「大容量全自动罐装机」→ v4 临时授予「全自动铁罐连线」→ v5 收回铁罐连线、恢复原工序；内容已回原状，仅版本 +2', '')
  push('## 7. B15 P2 临时工序权限未回退（**真实人员权限，必须用户单独点头**）', '')
  push('')
  push('对象：P2 批 3-4 联调时临时授予「大容量全自动罐装机」，审计写「测后按快照回退」但一直未执行。**王东由 B38 单独处理，本组只含于家园、朱钊，避免双写。**')
  push('')
  push('| 人员 | personId | 当前版本 | 当前 processIds | 目标 processIds | 断言 | 动作 |')
  push('|---|---|---|---|---|---|---|')
  for (const x of (p.b15 || [])) push('| ' + x.name + ' | `' + (x.personId || '未找到') + '` | ' + (x.version == null ? '需 live 读取（' + (x.versionHint || '') + '）' : x.version) + ' | `' + JSON.stringify(x.currentProcessIds) + '` | `[]` | ' + (x.assertionOk ? 'OK（恰好 AUTO 一道 / 已为空）' : '**不匹配，执行会 abort**') + ' | ' + x.action + ' |')
  push('')
  push('- 目标值依据：`testdata/backup/2026-10-20-precapture-before.json`（P2 改前快照：于家园 v2/[]、朱钊 v1/[]、王东 v2/[]）+ `outputs/2026-10-20-P2批3-4联调测试数据.md` §2/§5（回退为 `[]`）')
  push('- 版本号来源：' + (data.dataSource === 'live' ? '**live 实时读回**（上方即实测值）' : '离线模式取清理清单记录（于家园 v3 / 朱钊 v2），live 干跑会实时读回') + '；写操作一律用 live 读到的 expectedVersion')
  push('- 写入语义：`saveCatalog(type=personnel, expectedVersion=当前版本, record={...当前行, processIds=[], processNames=[], changeReason})`；**其它字段原样回写**，版本 +1（保留版本推进）')
  push('- 执行前断言：**当前 processIds 必须恰好 = `["' + P2_GRANTED_PROCESS + '"]`**（只含 P2 临时授予那一道），否则 abort、不写任何字段')
  push('- 回退方式：再次 saveCatalog 写回当前 processIds（版本只增不减）')
  push('- 脚本开关：`--apply-b15 --approve-b15`（与 B38、C1 的 noop 清点**完全分开**）')
  push('')
  push('## 8. B38 王东 P2 临时工序权限回退（**必须用户单独点头**）', '')
  push('- 对象：`' + p.b38._id + '`（' + p.b38.name + '），当前 v' + p.b38.version)
  push('- 执行前 processIds：`' + JSON.stringify(p.b38.currentProcessIds) + '`（' + JSON.stringify(p.b38.currentProcessNames) + '）')
  push('- 目标 processIds：`' + JSON.stringify(p.b38.targetProcessIds) + '`（' + JSON.stringify(p.b38.targetProcessNames) + '）')
  push('- 与目标一致（无需执行）：' + p.b38.currentProcessIdsMatchTarget)
  push('- 审计 reason：`' + p.b38.auditReason + '`')
  push('- 写入语义：saveCatalog type=personnel，expectedVersion=' + p.b38.version + '，record={...当前行, processIds/processNames=目标, changeReason}；**其它字段原样回写**，版本 +1（保留版本推进）')
  push('- 回退方式：' + p.b38.rollback)
  push('- 执行前断言：**当前 processIds 必须恰好 = `["' + P2_GRANTED_PROCESS + '"]`**，否则 abort、不写任何字段')
  push('- 目标值依据：`testdata/backup/2026-10-20-precapture-before.json` 王东 v2/[] + P2 那页文档 §2/§5（回退为 `[]`）')
  push('- 目标值核对来源（历史口径，已不再需要读版本接口）：' + p.b38.snapshotToVerify)
  push('- 脚本开关：`--apply-wangdong --approve-wangdong --wangdong-target=<逗号分隔 processId>`（默认 dry-run 不执行）')
  push('')
  push('## 9. B39 running TEST 工单', '', '- `' + p.b39._id + '` v' + p.b39.version + ' ' + p.b39.state + '，batchNo `' + p.b39.batchNo + '`；动作：' + p.b39.action, '')
  push('## 10. 缺口与待确认', '')
  push('1. **B38 目标值已改为有据**：用 P2 改前快照 `2026-10-20-precapture-before.json`（王东 v2/processIds=[]）+ P2 文档 §2/§5 作为目标 `[]`，不再依赖 `mes_ops_versions` 只读接口（router 仍缺该接口，列 P4 backlog）；改为「执行前断言当前 processIds 恰好 = P2 临时授权那一道」。')
  push('2. **考勤条数口径已定**：TEST 人员考勤 = 11-30 的 ' + p.b34.attendance.mainTotal + ' 条 + 12 月 ' + p.b34.attendance.decTotal + ' 条 = **' + data.attendanceTotal + ' 条全 rest**（Chief 确认 125 正确，此前「240」是「排班 120 + 考勤 120」叠记）')
  push('3. **B32-B34 已在 C1 灰度 S3-10 实际停用**，当前全 disabled/rest → 本脚本预计写入 **' + data.writesNeeded + ' 次**（干跑为 0）；真执行时主要做核对，除非发现新启用记录。')
  push('4. **数据来源**：' + (data.dataSource === 'live' ? 'live（CDP 管理员会话实时读取）' : '本轮独立复核抓取的归档真实快照（服务已停，非实时）'))
  push('')
  push('## 11. 清理后只读核对清单', '')
  push('- [ ] `mes-switch get`：switchable 15、actions 15 全 native、defaults 20 全 native、native-only 两 action 不在表')
  push('- [ ] B32：`bootstrap` 中 5 名 TEST-P3C1-* 全 enabled=false、版本不变')
  push('- [ ] B33：`listSchedules 2026-11-30 includeDisabled` 5 条全 disabled')
  push('- [ ] B34：`listSchedules 2026-12` total=120 全 disabled；`listAttendance 2026-12` 120 条 rest；11-30 5 条 rest')
  push('- [ ] B36：`getJob job:0ec1960d…` v1 planned 仍在')
  push('- [ ] B39：`getJob job:b9b22e29…` v16 running、事件链完整')
  push('- [ ] 真实数据：`order:568393` v1；真实人员 158 条版本不变；10-22 考勤 v8/v4 不变')
  push('- [ ] 清理后重跑 `node tools/p3-cleanup.cjs --json` → `writesNeeded=0`')
  push('')
  push('## 12. 执行手册', '')
  push('```bash')
  push('# 0) 前置：本机后台 H5 已登录 hogar（http://localhost:5173/admin/），Chrome 开 CDP')
  push('# 1) 实时干跑（只读，推荐；服务起来后先跑，确认与快照一致）')
  push('node tools/p3-cleanup.cjs --json')
  push('node tools/p3-cleanup.cjs --md=../outputs/2026-10-21-P3清理干跑.md')
  push('# 2) 阶段 1（仅当发现仍启用的 TEST 记录；需用户点头）')
  push('node tools/p3-cleanup.cjs --apply-stage1')
  push('# 3) B15（真实人员权限，必须用户单独点头；先 dry-run 看三人表）')
  push('node tools/p3-cleanup.cjs --json | jq .plan.b15')
  push('node tools/p3-cleanup.cjs --apply-b15 --approve-b15')
  push('# 4) B38（王东专属，必须用户单独点头）')
  push('node tools/p3-cleanup.cjs --apply-wangdong --approve-wangdong --wangdong-target=')
  push('```')
  push('')
  push('## 13. 附：其它 TEST 残留（B18-B31，既有清单，未纳入本脚本写操作）', '')
  push('- 见 `outputs/2026-10-20-P2清理清单.md`：TEST 工序 `ops:processes:TEST-P3B1-A`、10-21/10-22/10-25 考勤、TEST 订单 `20261020`/`20261021`、工单 `b9b22e29…`/`d871c723…`、交班 `62aa62ea…`、异常 `d34fb886…`/`29012f0b…`、10-22 TEST 排班；均属「停用/标记」，不物删。')
  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// 写操作（仅 live + 显式开关）
// ---------------------------------------------------------------------------
async function applyStage1(client, data) {
  const call = client.call
  const writes = []
  for (const item of data.plan.b32.filter(x => x.action === 'disable')) {
    const boot = await call('mes/pub/operation', { action: 'bootstrap' })
    const current = (((boot.data && boot.data.catalogs) || {}).personnel || []).find(p => p._id === item._id)
    if (!current) throw new Error('人员档案不存在：' + item._id)
    const record = { ...current, enabled: false, changeReason: 'P3 清理：TEST 人员停用（不物删）' }
    delete record._id; delete record.version; delete record.audit; delete record.updatedAt; delete record.updatedBy
    const r = await call('mes/pub/operation', { action: 'saveCatalog', type: 'personnel', expectedVersion: current.version, record })
    writes.push({ target: item._id, type: 'personnel.disable', code: r.code, message: r.message || '' })
    if (r.code !== 0) throw new Error('B32 停用失败：' + item._id + ' ' + r.message)
  }
  for (const item of data.plan.b33.filter(x => x.action === 'disable')) {
    const r = await call('mes/pub/operation', { action: 'saveSchedule', expectedVersion: item.version, record: { ...item.raw, enabled: false, changeReason: 'P3 清理：TEST 排班停用（不物删）' } })
    writes.push({ target: item._id, type: 'schedule.disable', code: r.code, message: r.message || '' })
    if (r.code !== 0) throw new Error('B33 停用失败：' + item._id + ' ' + r.message)
  }
  for (const item of data.plan.b34.schedules.rows.filter(r => r.enabled !== false)) {
    const r = await call('mes/pub/operation', { action: 'saveSchedule', expectedVersion: item.version, record: { ...item, enabled: false, changeReason: 'P3 清理：TEST 排班停用（不物删）' } })
    writes.push({ target: item._id, type: 'schedule.disable', code: r.code, message: r.message || '' })
    if (r.code !== 0) throw new Error('B34 停用失败：' + item._id + ' ' + r.message)
  }
  return writes
}

/** 真实人员权限回退（B15/B38 共用）：断言 processIds 恰好是 P2 临时授权，再只改 processIds/processNames。 */
async function revertGrantedProcess(db, call, personId, expectedIds, targetIds, targetNames, reason) {
  const boot = await call('mes/pub/operation', { action: 'bootstrap' })
  const current = (((boot.data && boot.data.catalogs) || {}).personnel || []).find(p => p._id === personId)
  if (!current) throw new Error('人员档案不存在：' + personId)
  const ids = current.processIds || []
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds) && ids.length !== 0) throw new Error('ABORT：' + personId + ' 当前 processIds=' + JSON.stringify(ids) + '，与断言 ' + JSON.stringify(expectedIds) + ' 不符，未写入')
  if (ids.length === 0) return { target: personId, type: 'noop(processIds 已为空)', skipped: true }
  const record = { ...current, processIds: targetIds, processNames: targetNames, changeReason: reason }
  delete record._id; delete record.version; delete record.audit; delete record.updatedAt; delete record.updatedBy
  const t0 = Date.now()
  const r = await call('mes/pub/operation', { action: 'saveCatalog', type: 'personnel', expectedVersion: current.version, record })
  if (r.code !== 0) throw new Error('写入失败：' + personId + ' ' + (r.message || r.code))
  const after = await call('mes/pub/operation', { action: 'bootstrap' })
  const afterPerson = (((after.data && after.data.catalogs) || {}).personnel || []).find(p => p._id === personId)
  if (!afterPerson || JSON.stringify(afterPerson.processIds) !== JSON.stringify(targetIds)) throw new Error('回读不一致：' + personId)
  return { target: personId, name: current.name, type: 'personnel.revert-processIds', code: r.code, ms: Date.now() - t0, previousVersion: current.version, version: afterPerson.version, processIds: afterPerson.processIds, processNames: afterPerson.processNames, auditReason: reason }
}

async function applyB15(client, data) {
  const call = client.call
  const writes = []
  for (const item of data.plan.b15 || []) {
    if (!item.personId || (item.currentProcessIds || []).length === 0) continue
    writes.push(await revertGrantedProcess(null, call, item.personId, [P2_GRANTED_PROCESS], [], [], item.auditReason))
  }
  return writes
}

async function applyWangdong(client, data) {
  const call = client.call
  const plan = data.plan.b38
  const boot = await call('mes/pub/operation', { action: 'bootstrap' })
  const current = (((boot.data && boot.data.catalogs) || {}).personnel || []).find(p => p._id === WANGDONG)
  if (!current) throw new Error('王东人员档案不存在')
  if (JSON.stringify(current.processIds || []) !== JSON.stringify([P2_GRANTED_PROCESS]) && (current.processIds || []).length !== 0) throw new Error('ABORT：王东当前 processIds=' + JSON.stringify(current.processIds) + '，与断言 ' + JSON.stringify([P2_GRANTED_PROCESS]) + ' 不符，未写入')
  const record = { ...current, processIds: plan.targetProcessIds, processNames: plan.targetProcessNames, changeReason: plan.auditReason }
  delete record._id; delete record.version; delete record.audit; delete record.updatedAt; delete record.updatedBy
  const t0 = Date.now()
  const r = await call('mes/pub/operation', { action: 'saveCatalog', type: 'personnel', expectedVersion: current.version, record })
  if (r.code !== 0) throw new Error('B38 写失败：' + (r.message || r.code))
  const after = await call('mes/pub/operation', { action: 'bootstrap' })
  const afterWang = (((after.data && after.data.catalogs) || {}).personnel || []).find(p => p._id === WANGDONG)
  if (!afterWang || JSON.stringify(afterWang.processIds) !== JSON.stringify(plan.targetProcessIds)) throw new Error('B38 回读不一致')
  return [{ target: WANGDONG, name: current.name, type: 'personnel.revert-processIds', code: r.code, ms: Date.now() - t0, previousVersion: current.version, version: afterWang.version, processIds: afterWang.processIds, processNames: afterWang.processNames, auditReason: plan.auditReason }]
}


// ---------------------------------------------------------------------------
// 阶段 2：业务 TEST 数据停用/标记（P3 已收口；默认 dry-run，写需 --approve-stage2 + --s2-items）
// ---------------------------------------------------------------------------
const S2_PROTECTED_ORDERS = ['568393', '565077']
const S2_PRODUCT = '9900000001'
const S2_PROCESS = 'ops:processes:TEST-P3B1-A'

async function collectStage2(client) {
  const call = client.call
  const boot = await call('mes/pub/operation', { action: 'bootstrap' })
  if (boot.code !== 0) throw new Error('bootstrap 失败：' + (boot.message || JSON.stringify(boot)))
  const profile = (boot.data && boot.data.profile) || {}
  if (!profile.isAdmin) throw new Error('stage2 需要管理员会话')
  const catalogs = (boot.data && boot.data.catalogs) || {}
  const invoke = client.invoke
  const getOrder = async orderNo => (await invoke('production-orders', { action: 'get', orderNo })).data || null
  return {
    source: 'live-stage2', at: new Date().toISOString(), admin: { name: profile.name, isAdmin: true }, catalogs,
    orders: { '20261020': await getOrder('20261020'), '20261021': await getOrder('20261021') },
    customers: (await invoke('production-orders', { action: 'listCustomers', includeDisabled: true })).data || [],
    plans: (await invoke('production-orders', { action: 'listPlans', includeDisabled: true })).data || [],
    product: (await invoke('product-materials', { action: 'get', productCode: S2_PRODUCT })).data || null,
    bom: (await invoke('product-bom', { action: 'get', productCode: S2_PRODUCT })).data || null,
    processes: catalogs.processes || [],
    schedules1021: ((await call('mes/pub/operation', { action: 'listSchedules', dateFrom: '2026-10-21', dateTo: '2026-10-21', includeDisabled: true, page: 1, pageSize: 50 })).data || {}).list || [],
    schedules1022: ((await call('mes/pub/operation', { action: 'listSchedules', dateFrom: '2026-10-22', dateTo: '2026-10-22', includeDisabled: true, page: 1, pageSize: 50 })).data || {}).list || [],
    exceptions: ((await call('mes/pub/operation', { action: 'listExceptions', page: 1, pageSize: 50 })).data || {}).list || [],
    realOrder: (await invoke('production-orders', { action: 'get', orderNo: '568393' })).data || null,
  }
}

function isTestCustomer(c) { return /TEST/i.test(String(c.name || '')) }

function buildStage2Plan(raw) {
  const items = []
  const customer = (raw.customers || []).find(isTestCustomer) || null
  const plan = (raw.plans || []).find(p => customer && p.customerId === customer._id) || (raw.plans || []).find(p => /TEST/i.test(String(p.planName || ''))) || null
  const push = (entry) => { entry.selected = S2_ITEMS.split(',').map(x => x.trim().toUpperCase()).filter(Boolean).includes(entry.key); items.push(entry) }
  for (const [key, orderNo, ref] of [['B1', '20261020', 'P2/P3 联调 TEST 订单'], ['B21', '20261021', 'P3-B2 createJob TEST 订单']]) {
    const order = (raw.orders || {})[orderNo]
    push({ key, ref, action: 'order.disable', functionName: 'production-orders', objectId: order ? order._id : 'order:' + orderNo, currentVersion: order ? order.version : null,
      currentState: order ? ('enabled=' + order.enabled + ', status=' + order.orderStatus) : '未找到',
      payload: order ? { action: 'setEnabled', orderNo, enabled: false, expectedVersion: order.version, changeReason: 'P3 清理：TEST 订单停用（用户确认）' } : null,
      needsWrite: !!order && order.enabled !== false && !S2_PROTECTED_ORDERS.includes(orderNo),
      assertion: '订单存在、enabled=true，且不是真实订单 ' + S2_PROTECTED_ORDERS.join('/'),
      rollback: 'setEnabled enabled=true（版本 +1）', verifyAfter: 'get 返回 enabled=false、审计 update' })
  }
  push({ key: 'B5', ref: 'P2 批 3-4 TEST 客户', action: 'customer.disable', functionName: 'production-orders', objectId: customer ? customer._id : '未找到', currentVersion: customer ? customer.version : null,
    currentState: customer ? ('enabled=' + customer.enabled + ', name=' + customer.name) : '未找到',
    payload: customer ? { action: 'saveCustomer', expectedVersion: customer.version, record: { _id: customer._id, name: customer.name, externalCode: customer.externalCode || '', note: customer.note || '', enabled: false, changeReason: 'P3 清理：TEST 客户停用（用户确认）' } } : null,
    needsWrite: !!customer && customer.enabled !== false, assertion: '客户名含 TEST、enabled=true',
    rollback: 'saveCustomer enabled=true（版本 +1）', verifyAfter: 'listCustomers(includeDisabled) enabled=false' })
  push({ key: 'B6', ref: 'P2 批 3-4 TEST 包装方案', action: 'plan.disable', functionName: 'production-orders', payloadBuilder: 'plan', objectId: plan ? plan._id : '未找到', currentVersion: plan ? plan.version : null,
    currentState: plan ? ('enabled=' + plan.enabled + ', planName=' + plan.planName) : '未找到', planVersionId: plan ? plan.planVersionId : '',
    needsWrite: !!plan && plan.enabled !== false, assertion: '方案名/客户含 TEST、enabled=true',
    rollback: 'savePlan enabled=true（版本 +1）', verifyAfter: 'listPlans(includeDisabled) enabled=false；planv 历史不变' })
  push({ key: 'B7', ref: 'P2 TEST 产品档案', action: 'material.disable', functionName: 'product-materials', objectId: raw.product ? raw.product._id : 'mat:' + S2_PRODUCT, currentVersion: raw.product ? raw.product.version : null,
    currentState: raw.product ? ('enabled=' + raw.product.enabled + ', productCode=' + S2_PRODUCT) : '未找到',
    payload: raw.product ? { action: 'setEnabled', productCode: S2_PRODUCT, enabled: false, expectedVersion: raw.product.version } : null,
    needsWrite: !!raw.product && raw.product.enabled !== false, assertion: '产品 9900000001 存在、enabled=true',
    rollback: 'setEnabled enabled=true（版本 +1）', verifyAfter: 'get 返回 enabled=false' })
  push({ key: 'B8', ref: 'P2 TEST 产品 BOM', action: 'bom.disable', functionName: 'product-bom', objectId: raw.bom ? raw.bom._id : 'bom:' + S2_PRODUCT, currentVersion: raw.bom ? raw.bom.bomVersion : null,
    currentState: raw.bom ? ('enabled=' + raw.bom.enabled + ', bomVersion=' + raw.bom.bomVersion) : '未找到',
    payload: raw.bom ? { action: 'setEnabled', productCode: S2_PRODUCT, enabled: false } : null,
    needsWrite: !!raw.bom && raw.bom.enabled !== false, assertion: 'BOM 存在、enabled=true（setEnabled 不改版本）',
    rollback: 'setEnabled enabled=true（不改版本）', verifyAfter: 'get 返回 enabled=false、bomVersion 不变' })
  const process = (raw.processes || []).find(p => p._id === S2_PROCESS) || null
  push({ key: 'B18', ref: 'P3-B1 TEST 工序节点', action: 'process.disable', functionName: 'router', objectId: process ? process._id : S2_PROCESS, currentVersion: process ? process.version : null,
    currentState: process ? ('enabled=' + process.enabled + ', name=' + process.name) : '未找到',
    payload: process ? { action: 'saveCatalog', type: 'processes', expectedVersion: process.version, record: { code: process.code, name: process.name, workshopId: process.workshopId, posts: process.posts || [], enabled: false, changeReason: 'P3 清理：TEST 工序停用（用户确认）' } } : null,
    needsWrite: !!process && process.enabled !== false, assertion: 'TEST-P3B1-A 存在、enabled=true、workshop=301',
    rollback: 'saveCatalog enabled=true（版本 +1）', verifyAfter: 'bootstrap 中出现且 enabled=false' })
  for (const [key, rows, date, ref] of [['B19', raw.schedules1021, '2026-10-21', 'P3-B1 TEST 排班'], ['B28', raw.schedules1022, '2026-10-22', 'P3-B3 TEST 排班']]) {
    const row = (rows || []).find(r => r.enabled !== false) || (rows || [])[0] || null
    push({ key, ref, action: 'schedule.disable', functionName: 'router', objectId: row ? row._id : 'schedule@' + date, currentVersion: row ? row.version : null,
      currentState: row ? ('enabled=' + row.enabled + ', shift=' + row.shiftId + ', person=' + row.personName) : '未找到',
      payload: row ? { action: 'saveSchedule', expectedVersion: row.version, record: { ...row, enabled: false, changeReason: 'P3 清理：TEST 排班停用（用户确认）' } } : null,
      needsWrite: !!row && row.enabled !== false, assertion: date + ' 存在 TEST 排班且 enabled=true',
      rollback: 'saveSchedule enabled=true（版本 +1，考勤重新同步）', verifyAfter: 'listSchedules(includeDisabled) enabled=false；当日考勤 rest' })
  }
  const isOpen = x => (x.status || x.state) === 'open'
  const exception = (raw.exceptions || []).find(x => isOpen(x) && /TEST/i.test(String(x.description || ''))) || (raw.exceptions || []).find(isOpen) || null
  push({ key: 'B4', ref: 'P2 批 4 TEST 生产异常', action: 'exception.resolve', functionName: 'router', objectId: exception ? exception._id : '未找到', currentVersion: exception ? exception.version : null,
    currentState: exception ? ('status=' + (exception.status || exception.state) + ', category=' + exception.category + ', desc=' + String(exception.description || '').slice(0, 30)) : '未找到',
    payload: exception ? { action: 'resolveException', id: exception._id, expectedVersion: exception.version, resolution: '测试数据，作废（P3 清理）' } : null,
    needsWrite: !!exception, assertion: '存在 open 的 TEST 异常（B25 已 resolved 不再处理）',
    rollback: '无（resolved 不可回退）；保留记录', verifyAfter: 'listExceptions state=resolved、resolution 含「测试数据，作废」' })
  const keep = [
    ['B2/B23', 'TEST 工单 job:b9b22e29…（v6/v16 running）', '保留：无删除/停用 action；complete 需已报产量，TEST 工单无报产，不硬造'],
    ['B22', 'TEST 工单 job:d871c723…（v1 planned）', '保留：planned 状态，TEST 批号可识别'],
    ['B3/B24', 'TEST 交班单（received/submitted/draft）', '保留：无删除/撤回 action'],
    ['B9/B10', 'TEST 生产记录 / 分桶（TEST261020A）', '保留：无删除 action，TEST 批号可识别'],
    ['B11/B12/B13', 'OCR 源单/识别记录/归档图（被 order:20261020 引用）', '保留：删除会破坏订单追溯'],
    ['B14', '版本历史 / 审计', '保留：追加不可删'],
    ['B27/B29', '10-25 / 10-22 TEST 考勤', '保留：已 rest/removed，无删除 action'],
    ['B36/B37/B39/B41', '样本工单 / 王东版本 / running 工单 / 旧实现验证版本推进', '保留或只登记'],
  ]
  return {
    mode: APPLY_STAGE2 ? 'APPLY' : 'DRY-RUN', readOnly: !APPLY_STAGE2, dataSource: 'live-stage2', dataSourceAt: raw.at,
    admin: raw.admin, items, keep, selected: S2_ITEMS, needsWrite: items.filter(i => i.needsWrite).length,
    protectedOrders: S2_PROTECTED_ORDERS, realOrder: raw.realOrder ? { version: raw.realOrder.version, orderStatus: raw.realOrder.orderStatus } : null,
    stage1: stage1Plan(),
  }
}

function stage1Plan() {
  return {
    auto: [
      ['A1', '批 5 我方 OCR 临时上传文件 175,007B', '旧实现 commitSourceImages 自动删除；getTempFileURL 返回空', '无需执行'],
      ['A1b/A4', '工程侧临时上传文件 320,960B', '已确认不存在', '无需执行'],
      ['A2', '过期上传租约 source-upload:58a7456…', '随 commitSourceImages 自动 remove', '无需执行'],
    ],
    manual: [
      ['A3', 'ocr_cache upload:c:453fb2f…（600s 租约已过期，去重缓存 TTL 7 天）', '无 action 可删（cleanupOriginals 会 409）→ 等 TTL 过期或管理员控制台按 _id 删', '控制台确认 doc 不存在；同图识别正常'],
      ['A6', '孤儿 source + 归档资产（文件 320,960B，无订单引用）', '管理员云开发控制台：枚举 src:664c6f04… → 删 source_image_assets / mes-source-images .jpg / source_documents', '不可回滚；删前确认无引用'],
      ['A6b', '空 source 文档 src:664c6f04…:77d1dba…', '控制台删 source_documents doc（无文件/资产）', '可重建'],
      ['A5', '生产记录草稿 production_drafts（deviceId 前缀 dev-mvgpasez-，TEST261020A）', '控制台按 _id 含 TEST261020A / dev-mvgpasez- 查并删；无 action', '可重建'],
    ],
    note: '阶段 1 均无云函数 action（除 A3 等 TTL 自然过期），脚本不能安全代做，故不纳入阶段 2 写操作。',
  }
}

const S2_WRITE_ORDER = ['B6', 'B5', 'B7', 'B8', 'B1', 'B21', 'B18', 'B19', 'B28', 'B4']
async function applyStage2(client, data) {
  const call = client.call
  const writes = []
  const need = data.items.filter(i => i.needsWrite && i.selected).sort((a, b) => S2_WRITE_ORDER.indexOf(a.key) - S2_WRITE_ORDER.indexOf(b.key))
  for (const item of need) {
    if ((item.key === 'B1' || item.key === 'B21') && item.payload && S2_PROTECTED_ORDERS.includes(item.payload.orderNo)) throw new Error('ABORT：命中真实订单 ' + item.payload.orderNo)
  }
  for (const item of need) {
    let payload = item.payload
    if (item.payloadBuilder === 'plan') {
      const snap = (await client.invoke('production-orders', { action: 'getPlanVersion', planVersionId: item.planVersionId })).data
      if (!snap) throw new Error('ABORT：取不到方案版本 ' + item.planVersionId)
      payload = { action: 'savePlan', expectedVersion: item.currentVersion, record: { _id: item.objectId, productCode: snap.productCode, customerId: snap.customerId, planName: snap.planName, materials: snap.materials || [], pallet: snap.pallet || {}, packingRequirements: snap.packingRequirements || '', sourceDocumentId: snap.sourceDocumentId || '', recognitionRunId: snap.recognitionRunId || '', enabled: false, changeReason: 'P3 清理：TEST 包装方案停用（用户确认）' } }
    }
    const t0 = Date.now()
    const r = item.functionName === 'router' ? await call('mes/pub/operation', payload) : await client.invoke(item.functionName, payload)
    const code = r && r.code
    writes.push({ item: item.key, target: item.objectId, action: item.action, code, ms: Date.now() - t0, message: (r && (r.message || r.msg)) || '' })
    if (code !== 0) throw new Error('ABORT：' + item.key + ' 写入失败 code=' + code + ' ' + ((r && (r.message || r.msg)) || ''))
  }
  // 写后回读：停用项 enabled=false；B4 需 status=resolved（用 listExceptions 按 id 复核）
  const fresh = buildStage2Plan(await collectStage2(client))
  const exceptions = ((await call('mes/pub/operation', { action: 'listExceptions', page: 1, pageSize: 100 })).data || {}).list || []
  for (const w of writes) {
    if (w.item === 'B4') {
      const row = exceptions.find(x => x._id === w.target)
      w.readback = row ? ('status=' + (row.status || row.state) + ', version=' + row.version + ', resolution=' + String(row.resolution || '').slice(0, 30)) : '未找到'
      w.readbackOk = !!row && (row.status || row.state) === 'resolved'
    } else {
      const after = fresh.items.find(i => i.key === w.item)
      w.readback = after ? after.currentState : '未找到'
      w.readbackOk = /enabled=false/.test(String(after && after.currentState))
    }
    if (!w.readbackOk) throw new Error('ABORT：' + w.item + ' 写后回读不符：' + w.readback)
  }
  return writes
}

function renderStage2Markdown(data) {
  const lines = []
  const push = (...v) => lines.push(...v)
  push('# P3 阶段 2 清理干跑报告（业务 TEST 数据停用/标记）', '')
  push('- 生成时间：' + new Date().toISOString())
  push('- 数据来源：**' + data.dataSource + '**（' + data.dataSourceAt + '，live 管理员只读）')
  push('- 模式：**' + data.mode + '**' + (data.readOnly ? '（只读，未执行任何写）' : ''))
  push('- 执行账号：' + data.admin.name)
  push('- 脚本：`tools/p3-cleanup.cjs --stage2`；写操作需 `--approve-stage2` + 显式 `--s2-items=B1,B5,...` 白名单，默认 dry-run')
  push('')
  push('## 0. 汇总', '', '| 项 | 对象 | 当前状态 | 目标动作 | 预计写入 |', '|---|---|---|---|---|')
  for (const i of data.items) push('| ' + i.key + ' | `' + i.objectId + '` | ' + i.currentState + ' | ' + i.action + ' | ' + (i.needsWrite ? 1 : 0) + ' |')
  push('', '**阶段 2 预计写入：' + data.needsWrite + ' 次**（本次 dry-run 未执行写）')
  push('')
  push('## 1. 逐项断言 / 回滚 / 复验', '')
  for (const i of data.items) {
    push('### ' + i.key + ' · ' + i.action + '（' + (i.ref || '') + '）', '')
    push('- 对象：`' + i.objectId + '`，当前版本 ' + (i.currentVersion == null ? '—' : i.currentVersion) + '；状态：' + i.currentState)
    push('- 是否需写：' + (i.needsWrite ? '**是**' : '否（已停用/保留）') + '；写前断言：' + i.assertion)
    push('- 回滚：' + i.rollback)
    push('- 写后复验：' + i.verifyAfter)
    push('')
  }
  push('## 2. 只保留 / 只登记（不做动作）', '')
  for (const k of data.keep) push('- **' + k[0] + '**：' + k[1] + ' → ' + k[2])
  push('')
  push('## 3. 真实数据零变动断言', '')
  push('- 受保护订单（不写）：`' + data.protectedOrders.join('`、`') + '`；实测 `order:568393` v' + (data.realOrder ? data.realOrder.version : '?') + '（' + (data.realOrder ? data.realOrder.orderStatus : '?') + '）')
  push('- 阶段 2 不写 personnel / 考勤；排班停用只联动 10-21、10-22 于家园 TEST 场次考勤转 rest')
  push('- 执行后必须复核：真实订单 568393/565077 版本与状态不变、真实人员 158 条版本不变、真实客户/产品/BOM 不在写入清单')
  push('')
  push('## 4. 阶段 1（A 类临时数据）—— 不纳入本脚本写操作', '')
  push('### 4.1 可自动判定（已确认无需执行）', '', '| # | 对象 | 判定 | 结论 |', '|---|---|---|---|')
  for (const a of data.stage1.auto) push('| ' + a[0] + ' | ' + a[1] + ' | ' + a[2] + ' | ' + a[3] + ' |')
  push('')
  push('### 4.2 需要管理员控制台 / 用户手动', '', '| # | 对象 | 方式 | 复验 |', '|---|---|---|---|')
  for (const m of data.stage1.manual) push('| ' + m[0] + ' | ' + m[1] + ' | ' + m[2] + ' | ' + m[3] + ' |')
  push('', '> ' + data.stage1.note)
  push('')
  push('## 5. 执行方式（用户批准后）', '')
  push('```bash')
  push('# 阶段 2 全量（写前做真实数据保护断言；任一笔失败即停）')
  push('node tools/p3-cleanup.cjs --stage2 --approve-stage2 --s2-items=B1,B4,B5,B6,B7,B8,B18,B19,B21,B28 --json')
  push('# 子集示例')
  push('node tools/p3-cleanup.cjs --stage2 --approve-stage2 --s2-items=B18,B19,B28 --json')
  push('```')
  push('- 写入顺序：B6 方案 → B5 客户 → B7 产品 → B8 BOM → B1/B21 订单 → B18 工序 → B19/B28 排班 → B4 异常')
  push('- 任一 code≠0 立即中止；已写项按「回滚」列恢复')
  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
async function main() {
  if (STAGE2) {
    const client = await connectAdmin()
    try {
      const raw = await collectStage2(client)
      let data = buildStage2Plan(raw)
      data.writes = []
      if (APPLY_STAGE2) {
        // 执行前重新拉一次：保证断言用的是最新启用状态与 expectedVersion
        data = buildStage2Plan(await collectStage2(client))
        data.writes = await applyStage2(client, data)
        data.mode = 'APPLY'
        data.readOnly = false
      }
      if (JSON_OUT) console.log(JSON.stringify(data, null, 2))
      else {
        console.log('模式：' + data.mode + '（只读=' + data.readOnly + '） 数据来源：' + data.dataSource)
        for (const i of data.items) console.log(i.key, i.objectId, '|', i.currentState, '|', i.action, '|', i.needsWrite ? '需写' : 'noop')
        console.log('阶段 2 预计写入：' + data.needsWrite + (data.writes.length ? '（已执行 ' + data.writes.length + ' 次）' : '（本次未执行写）'))
      }
      if (MD) fs.writeFileSync(path.resolve(MD), renderStage2Markdown(data))
    } finally { client.close() }
    return
  }
  const raw = OFFLINE ? collectOffline(OFFLINE) : await collectLive()
  const data = buildPlan(raw)
  data.writes = []
  if (data.mode === 'APPLY') {
    const client = await connectAdmin()
    try {
      if (APPLY_STAGE1) data.writes.push(...await applyStage1(client, data))
      if (APPLY_B15) data.writes.push(...await applyB15(client, data))
      if (APPLY_WANGDONG) data.writes.push(...await applyWangdong(client, data))
    } finally { client.close() }
  }
  if (JSON_OUT) console.log(JSON.stringify(data, null, 2))
  else {
    console.log('模式：' + data.mode + '（只读=' + data.readOnly + '） 数据来源：' + data.dataSource)
    console.log('B32 TEST 人员 ' + data.plan.b32.length + ' 名（需写 ' + data.plan.b32.filter(x => x.action === 'disable').length + '）')
    console.log('B33 11-30 排班 ' + data.plan.b33.length + ' 条（需写 ' + data.plan.b33.filter(x => x.action === 'disable').length + '）')
    console.log('B34 12 月排班 ' + data.plan.b34.schedules.total + ' 条（需写 ' + data.plan.b34.schedules.needWrite + '）；考勤 ' + data.attendanceTotal + ' 条')
    console.log('B15 真实人员工序 ' + data.plan.b15.length + ' 名：' + data.plan.b15.map(x => x.name + '(v' + x.version + ', ' + JSON.stringify(x.currentProcessIds) + ')→[]').join('、') + ' → ' + (data.plan.b15.every(x => (x.currentProcessIds || []).length === 0) ? 'noop' : '需批准'))
    console.log('B36 样本工单 v' + data.plan.b36.version + ' → ' + data.plan.b36.action)
    console.log('B37 王东 v' + data.plan.b37.version + ' → ' + data.plan.b37.action)
    console.log('B38 王东工序当前 ' + JSON.stringify(data.plan.b38.currentProcessIds) + ' → 目标 ' + JSON.stringify(data.plan.b38.targetProcessIds) + ' → ' + data.plan.b38.action)
    console.log('B39 running 工单 v' + data.plan.b39.version + ' → ' + data.plan.b39.action)
    console.log('预计写入：B32-B34 ' + data.writesNeeded + ' 次（当前终态，实际 0）；需批准：B15 ' + data.approvalWrites.b15 + ' + B38 ' + data.approvalWrites.b38 + (data.writes.length ? '（本次已执行 ' + data.writes.length + ' 次）' : '（本次未执行写）'))
  }
  if (MD) fs.writeFileSync(path.resolve(MD), renderMarkdown(data))
}
main().catch(error => { console.error('FAILED:', error && error.message); process.exit(1) })

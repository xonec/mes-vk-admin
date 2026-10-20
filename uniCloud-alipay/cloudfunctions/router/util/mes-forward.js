'use strict';

/**
 * MES 适配层：把 vk router 的请求单向转发到现有业务云函数，返回值原样透传。
 * 原则：这里不写业务逻辑；P3 原生化时再逐个替换为 router service 原生实现。
 *
 * P2 批 5：按目标函数拆出 orders / ocr / materials 三个 target，
 * 各带独立读写白名单与转发超时；写 action 固定 forward，不参与 mes-native-switch。
 */

/** 允许转发的目标云函数（常量登记；开放 action 必须逐条评审）。 */
const FUNCTIONS = {
  operations: 'production-operations',
  // P2-3~6 后续要用的业务云函数（只登记名称，未开放转发；开放时需单独评审 action 白名单）
  orders: 'production-orders',
  ocr: 'doc-ocr',
  materials: 'product-materials',
  records: 'production-records',
  bom: 'product-bom',
  batches: 'batch-buckets',
};

/**
 * 只读 action 白名单（production-operations）：P0 只开放读，避免迁移期从新后台绕过旧页面的校验。
 * 新增写操作前先在迁移计划登记，再单独评审。
 */
const READ_ACTIONS = [
  'bootstrap',
  'dashboard',
  'scheduleCalendar',
  'listSchedules',
  'listAttendance',
  'attendanceSummary',
  'myAttendance',
  'myScheduleDay',
  'attendanceHistory',
  'listJobs',
  'getJob',
  'listHandovers',
  'getHandover',
  'listExceptions',
  'report',
  'trace',
  'audit',
];

/**
 * 写 action 白名单（P2 批 3-4）：固定走 forward 到 production-operations，
 * 由旧实现自己做权限/scope/冲突校验；不参与 mes-native-switch，避免被误切 native。
 * 新增写 action 前需登记并评审（P3 写模块 native 内迁时再移除）。
 */
const WRITE_ACTIONS = [
  'jobCommand', // 批 3：工单开工/暂停/继续/报产/入库/完工
  'saveHandover', // 批 4：交接班保存
  'handoverCommand', // 批 4：交接班提交/接班
  'saveException', // 批 4：异常保存
];

/**
 * 关于长耗时 action（重要）：
 * 支付宝云 router 内 `uniCloud.callFunction` 调用下游函数存在约 10000ms 的 HTTP 硬超时，
 * 传入 timeout 参数不会生效（2026-10-20 云端实测：recognize 在 10.55s 返回
 * HttpClientRequestTimeoutError: Request timeout for 10000 ms）。
 * 因此 `doc-ocr.recognize`（服务端 180s 窗口）与 `production-orders.commitSourceImages`
 * （客户端按 210s 设计）**不经过 router**，由页面直调旧云函数（用户已批准的例外方案 A）；
 * 这里不再配置任何转发 timeout，后续如需彻底解决在 P3 原生内迁时评估。
 */

/**
 * 目标函数 → 白名单与超时。action 必须精确命中对应名单，否则 403 且不发起转发。
 * operations 沿用批 3/4 的读写名单；其余三个 target 是 P2 批 5 指令单三步流程。
 */
const TARGETS = {
  operations: {
    name: FUNCTIONS.operations,
    read: READ_ACTIONS,
    write: WRITE_ACTIONS,
  },
  orders: {
    name: FUNCTIONS.orders,
    // 指令单页面：订单读取 + 客户/包装方案选择器（只读档案查询，旧端页面依赖）
    read: ['get', 'listCustomers', 'listPlans', 'getPlanVersion', 'getByBatch'],
    // commitSourceImages 是长耗时 action（客户端 210s），按例外方案 A 由页面直调旧云函数
    write: ['save', 'prepareSourceImages', 'cleanupSourceUploads'],
  },
  ocr: {
    name: FUNCTIONS.ocr,
    // 批 5 指令单流程：checkRecognition 有租约/source 轻量写副作用、无 OCR 花费
    // 批 7 设置页：getConfig/getModels 为管理员只读；getMyKey 为登录用户读本人 Key 状态
    read: ['getCapabilities', 'checkRecognition', 'getConfig', 'getModels', 'getMyKey'],
    // recognize 是长耗时 action（服务端 180s 窗口），按例外方案 A 由页面直调旧云函数，不在白名单
    // setConfig/testModel 为管理员动作（含外部模型请求/明文 Key 上行）；setMyKey/clearMyKey 只作用于本人 uid；
    // doc-ocr.save 不开放（与 orders.save 重叠）。以上权限均由旧实现负责，router 只透传、不落 payload/不注入 uid。
    write: ['cleanupOriginals', 'setConfig', 'testModel', 'setMyKey', 'clearMyKey'],
  },
  materials: {
    name: FUNCTIONS.materials,
    // 指令单 purpose=bom 读档案、createProductArchive/observeExisting 只读查询
    read: ['get', 'list'],
    write: ['upsert'],
  },
  // P2 批 6：生产记录 / 产品 BOM / 批号分桶
  records: {
    name: FUNCTIONS.records,
    // getVersion/rollback 不开放（rollback 属高风险覆盖写，getVersion 按批 6 清单排除）
    read: ['get', 'list', 'listVersions', 'getDraft'],
    write: ['upsert', 'saveDraft'], // 生产记录保存（高风险主数据）/ 本人本设备草稿
  },
  bom: {
    name: FUNCTIONS.bom,
    // 写操作（upsert/setEnabled/listVersions）批 6 不开放
    read: ['list'],
    write: [],
  },
  buckets: {
    name: FUNCTIONS.batches,
    // upsert 为帆软同步链路的整批覆盖写（无版本/审计），按批 6 清单开放但单独评审风险
    read: ['get'],
    write: ['upsert'],
  },
};

/** 适配层保留字段：不进入业务 payload；uniIdToken 只从平台注入的 event 顶层读取。 */
const RESERVED = ['$url', 'uniIdToken', 'uni_id_token', 'vk', 'context', 'encrypt'];

/** 转发层错误统一返回 message（并保留 msg 兼容旧调用方与 vk unwrap 的 message||msg）。 */
function errorResult(code, message) {
  return { code, message, msg: message };
}

/**
 * 把一次 router 请求转发给业务云函数。
 * @param {Object} event vk router 事件（含 data、uniIdToken）
 * @param {Object} options { target: TARGETS 的键（默认 operations）, action: 固定 action, readOnly: 是否只读校验 }
 * @return {Object} 业务云函数原始返回 { code, message|msg, data }
 */
async function forward(event = {}, options = {}) {
  const targetKey = options.target || 'operations';
  const target = TARGETS[targetKey];
  if (!target) return errorResult(500, 'MES 适配层未配置目标云函数');
  // vk router 不同版本可能把参数放在 event.data（显式 data）或平铺在 event 上，两种都兼容
  const source = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event;
  const data = { ...source };
  // 去掉路由与运行时保留字段，避免透传给业务云函数
  RESERVED.forEach(key => { delete data[key] });
  const action = options.action || data.action;
  if (!action) return errorResult(400, '缺少 action 参数');
  if (options.readOnly && !target.read.includes(action)) {
    return errorResult(403, 'P0 适配层只开放只读操作，写操作请继续使用旧后台：' + action);
  }
  if (!target.read.includes(action) && !target.write.includes(action)) {
    return errorResult(403, 'MES 适配层未开放此操作：' + action);
  }
  const payload = { ...data, action };
  if (event.uniIdToken) payload.uniIdToken = event.uniIdToken;
  let response;
  try {
    // 不传 timeout：平台内部调用有 ~10s 硬限制，长耗时 action 已移出白名单（见文件顶部说明）
    response = await uniCloud.callFunction({ name: target.name, data: payload });
  } catch (error) {
    return errorResult(500, '调用业务云函数失败：' + ((error && (error.message || error.errMsg)) || String(error)));
  }
  const result = response && response.result;
  if (!result || typeof result.code !== 'number') return errorResult(500, '业务云函数返回结构异常');
  return result;
}

module.exports = { forward, READ_ACTIONS, WRITE_ACTIONS, FUNCTIONS, TARGETS };

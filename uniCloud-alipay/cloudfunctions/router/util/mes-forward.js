'use strict';

/**
 * MES 适配层（P0）：把 vk router 的请求单向转发到现有业务云函数，返回值原样透传。
 * 原则：这里不写业务逻辑；P3 原生化时再逐个替换为 router service 原生实现。
 */

/** 允许转发的目标云函数；按需增加，默认生产执行云函数。 */
const FUNCTIONS = {
  operations: 'production-operations',
};

/**
 * 只读 action 白名单：P0 只开放读，避免迁移期从新后台绕过旧页面的校验。
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
 * 把一次 router 请求转发给业务云函数。
 * @param {Object} event vk router 事件（含 data、uniIdToken）
 * @param {Object} options { target: FUNCTIONS 的键, action: 固定 action, readOnly: 是否只读校验 }
 * @return {Object} 业务云函数原始返回 { code, message|msg, data }
 */
async function forward(event = {}, options = {}) {
  // vk router 不同版本可能把参数放在 event.data（显式 data）或平铺在 event 上，两种都兼容
  const source = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event;
  const data = { ...source };
  // 去掉路由与运行时保留字段，避免透传给业务云函数
  ;['$url', 'uniIdToken', 'uni_id_token', 'vk', 'context'].forEach(key => { delete data[key] });
  const name = FUNCTIONS[options.target || 'operations'];
  const action = options.action || data.action;
  if (!name) return { code: 500, msg: 'MES 适配层未配置目标云函数' };
  if (!action) return { code: 400, msg: '缺少 action 参数' };
  if (options.readOnly && !READ_ACTIONS.includes(action)) return { code: 403, msg: 'P0 适配层只开放只读操作，写操作请继续使用旧后台：' + action };
  const payload = { ...data, action };
  if (event.uniIdToken) payload.uniIdToken = event.uniIdToken;
  let response;
  try {
    response = await uniCloud.callFunction({ name, data: payload });
  } catch (error) {
    return { code: 500, msg: '调用业务云函数失败：' + ((error && (error.message || error.errMsg)) || String(error)) };
  }
  const result = response && response.result;
  if (!result || typeof result.code !== 'number') return { code: 500, msg: '业务云函数返回结构异常' };
  return result;
}

module.exports = { forward, READ_ACTIONS, FUNCTIONS };

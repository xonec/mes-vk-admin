/**
 * 直接调用现有业务云函数（P1）。
 *
 * 口径与旧后台 mes-uniadmin/utils/mes-api.js 保持一致：
 * - token 从本地 uni_id_token 读取，随请求带给云函数；
 * - 云函数返回 { code, message, data }，code 非 0 统一抛错，401 回登录页；
 * - 长任务（OCR 识别、原图归档）单独放宽超时。
 *
 * 说明：P0 的 router façade 保留为可选路径；P1 页面先直调，避免依赖 router 上传。
 */

/** 允许调用的业务云函数；新增时在此登记。 */
const FUNCTIONS = {
  operations: 'production-operations',
  userAdmin: 'user-admin',
  ocr: 'doc-ocr',
  orders: 'production-orders',
  materials: 'product-materials',
};

/** 长耗时 action，单独放宽超时。 */
const LONG_ACTIONS = {
  ocr: ['recognize'],
  orders: ['commitSourceImages'],
};

/**
 * 调用生产执行云函数（最常用入口）。
 * @param {String} action 云函数 action
 * @param {Object} payload 业务参数
 * @param {Object} options { timeout }
 */
export function callOperations(action, payload = {}, options = {}) {
  return callCloud('operations', action, payload, options);
}

/**
 * 调用指定业务云函数。
 * @param {String} target FUNCTIONS 的键
 * @param {String} action 云函数 action
 * @param {Object} payload 业务参数
 * @param {Object} options { timeout }
 */
export function callCloud(target, action, payload = {}, options = {}) {
  const name = FUNCTIONS[target];
  if (!name) return Promise.reject(new Error('未配置的业务云函数：' + target));
  const long = (LONG_ACTIONS[target] || []).includes(action);
  const timeout = options.timeout || (long ? 210000 : 60000);
  const token = uni.getStorageSync('uni_id_token');
  const data = { ...payload, action, ...(token ? { uniIdToken: token } : {}) };

  /** 单次请求；网络类失败由外层重试，避免冷启动/瞬时抖动直接报错给用户。 */
  const send = () => new Promise((resolve, reject) => {
    uniCloud.callFunction({
      name,
      timeout,
      data,
      success: (response) => {
        const result = response && response.result;
        if (!result || typeof result.code !== 'number') {
          const error = new Error('服务返回异常，请重试');
          error.transient = true;
          reject(error);
          return;
        }
        if (result.code !== 0) {
          if (result.code === 401) {
            uni.removeStorageSync('uni_id_token');
            uni.reLaunch({ url: '/pages/login/index' });
          }
          const error = new Error(result.message || result.msg || '操作失败');
          error.code = result.code;
          reject(error);
          return;
        }
        resolve(result.data);
      },
      fail: (error) => {
        const message = String((error && (error.errMsg || error.message)) || '');
        const network = /request:fail|timeout|NetworkError|ERR_CONNECTION/i.test(message);
        const failure = new Error(network ? '连接云服务失败，请检查网络后重试。' : (message || '请求失败'));
        failure.transient = network;
        reject(failure);
      },
    });
  });

  return send().catch((error) => {
    if (!error || !error.transient) throw error;
    return new Promise((resolve) => setTimeout(resolve, 800)).then(send);
  });
}

/** 时间戳格式化为本地时间；空值显示 —。 */
export function formatTime(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', { hour12: false });
}

/** 生成幂等请求编号（旧后台同款），保存类操作重试时复用。 */
export function operationRequest(previous, payload) {
  const fingerprint = JSON.stringify(payload);
  if (previous && previous.fingerprint === fingerprint) return previous;
  return { fingerprint, id: 'vk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12) };
}

/** uni-id-co 云对象：账号相关能力（建号、编辑档案、分页查询员工档案）。 */
let uniIdCoInstance = null;

export function uniIdCo() {
  if (!uniIdCoInstance) uniIdCoInstance = uniCloud.importObject('uni-id-co', { customUI: true });
  return uniIdCoInstance;
}

/**
 * 调用 uni-id-co 云对象方法；成功返回数据，失败抛错并保留 errCode。
 */
export async function callUniIdCo(method, payload = {}) {
  const instance = uniIdCo();
  const fn = instance[method];
  if (typeof fn !== 'function') throw new Error('uni-id-co 不支持方法：' + method);
  try {
    return await fn.call(instance, payload);
  } catch (error) {
    const message = (error && (error.errMsg || error.message)) || '账号服务返回异常';
    const failure = new Error(message);
    failure.code = (error && error.errCode) || 0;
    throw failure;
  }
}

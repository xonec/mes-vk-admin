'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 通用只读入口（P3-B：按 data.action 分发；已内迁的 action 走 native，其余仍走旧 façade）
 * @url mes/pub/operation
 * @description readOnly=true 保留 P0 阶段「只开放只读操作」的兜底：未迁移的写操作仍拒绝。
 */
module.exports = {
  main: async (event) => {
    const source = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event || {};
    const action = typeof source.action === 'string' ? source.action : '';
    if (!action) return { code: 400, message: '缺少 action 参数' };
    return dispatch(event, { action, readOnly: true });
  },
};

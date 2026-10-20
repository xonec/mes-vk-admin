'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 批号分桶（batch-buckets）多目标转发入口（P2 批 6）。
 * @url mes/pub/buckets
 * @description 固定 forward 到 batch-buckets，白名单见 util/mes-forward.js 的 TARGETS.buckets。
 * 开放 action：读 get；写 upsert（帆软同步链路整批覆盖写，无版本/审计，风险见批 6 方案 §1.5）。
 */
module.exports = {
  main: async (event) => {
    const source = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event || {};
    const action = typeof source.action === 'string' ? source.action : '';
    if (!action) return { code: 400, message: '缺少 action 参数' };
    return dispatch(event, { target: 'buckets', action });
  },
};

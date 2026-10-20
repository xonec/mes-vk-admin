'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 生产记录多目标转发入口（P2 批 6）。
 * @url mes/pub/records
 * @description 固定 forward 到 production-records，白名单见 util/mes-forward.js 的 TARGETS.records。
 * 开放 action：读 get / list / listVersions / getDraft；写 upsert / saveDraft。
 * rollback / getVersion 不开放（rollback 为高风险覆盖写）。
 */
module.exports = {
  main: async (event) => {
    const source = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event || {};
    const action = typeof source.action === 'string' ? source.action : '';
    if (!action) return { code: 400, message: '缺少 action 参数' };
    return dispatch(event, { target: 'records', action });
  },
};

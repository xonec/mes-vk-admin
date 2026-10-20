'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 产品物料档案多目标转发入口（P2 批 5）。
 * @url mes/pub/materials
 * @description 固定 forward 到 product-materials，白名单见 util/mes-forward.js 的 TARGETS.materials。
 * 开放 action：写 upsert（指令单建立产品 BOM 档案）。
 */
module.exports = {
  main: async (event) => {
    const source = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event || {};
    const action = typeof source.action === 'string' ? source.action : '';
    if (!action) return { code: 400, message: '缺少 action 参数' };
    return dispatch(event, { target: 'materials', action });
  },
};

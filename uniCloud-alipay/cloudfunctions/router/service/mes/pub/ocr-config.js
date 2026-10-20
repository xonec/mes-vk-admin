'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES OCR 设置页多目标转发入口（P2 批 7）。
 * @url mes/pub/ocr-config
 * @description 固定 forward 到 doc-ocr，白名单见 util/mes-forward.js 的 TARGETS.ocr。
 * 开放 action：管理员配置 getConfig/getModels/testModel/setConfig；
 * 个人 Key getMyKey/setMyKey/clearMyKey（服务端按 auth.uid 落库，仅本人）。
 * 不开放 doc-ocr.save（与 orders.save 重叠）；recognize 保持批 5 直调例外。
 * 安全：router 不记录 payload、不注入 uid、不落 apiKey；admin/owner 权限由旧实现判定。
 */
module.exports = {
  main: async (event) => {
    const source = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event || {};
    const action = typeof source.action === 'string' ? source.action : '';
    if (!action) return { code: 400, message: '缺少 action 参数' };
    return dispatch(event, { target: 'ocr', action });
  },
};

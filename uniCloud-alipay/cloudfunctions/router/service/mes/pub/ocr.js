'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 单据识别（OCR）多目标转发入口（P2 批 5）。
 * @url mes/pub/ocr
 * @description 固定 forward 到 doc-ocr，白名单见 util/mes-forward.js 的 TARGETS.ocr。
 * 开放 action：读 getCapabilities / checkRecognition；写 recognize / cleanupOriginals。
 * recognize 的转发超时 190s 由 forward 统一配置。
 */
module.exports = {
  main: async (event) => {
    const source = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event || {};
    const action = typeof source.action === 'string' ? source.action : '';
    if (!action) return { code: 400, message: '缺少 action 参数' };
    return dispatch(event, { target: 'ocr', action });
  },
};

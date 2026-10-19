'use strict';

const { forward } = require('../../util/mes-forward.js');

/**
 * MES 基础目录与权限上下文（只读）
 * @url mes/bootstrap
 * @description 适配层：转发到 production-operations 的 bootstrap，返回结构不变。
 */
module.exports = {
  main: async (event) => {
    return await forward(event, { action: 'bootstrap', readOnly: true });
  },
};

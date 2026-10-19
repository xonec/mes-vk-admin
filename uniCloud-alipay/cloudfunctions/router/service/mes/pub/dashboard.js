'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 生产工作台（P3-B 第 3 模块：已内迁，走 native；开关可回退 forward）
 * @url mes/pub/dashboard
 */
module.exports = {
  main: async (event) => dispatch(event, { action: 'dashboard' }),
};

'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 生产报表汇总（P3-B 第 3 模块：已内迁，走 native；开关可回退 forward）
 * @url mes/pub/report
 */
module.exports = {
  main: async (event) => dispatch(event, { action: 'report' }),
};

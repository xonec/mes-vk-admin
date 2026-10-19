'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 排班列表（P3-B 第 2 模块：已内迁，走 native；新增 processId/shiftId 服务端筛选）
 * @url mes/pub/listSchedules
 */
module.exports = {
  main: async (event) => dispatch(event, { action: 'listSchedules' }),
};

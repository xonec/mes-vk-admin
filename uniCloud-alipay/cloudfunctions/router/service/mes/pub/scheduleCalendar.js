'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 排班月历（P3-B 第 2 模块：已内迁，走 native）
 * @url mes/pub/scheduleCalendar
 */
module.exports = {
  main: async (event) => dispatch(event, { action: 'scheduleCalendar' }),
};

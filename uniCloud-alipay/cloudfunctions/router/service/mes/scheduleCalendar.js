'use strict';

const { forward } = require('../../util/mes-forward.js');

/**
 * MES 排班日历（只读）
 * @url mes/scheduleCalendar
 * @description 适配层：转发到 production-operations 的 scheduleCalendar，返回结构不变。
 */
module.exports = {
  main: async (event) => {
    return await forward(event, { action: 'scheduleCalendar', readOnly: true });
  },
};

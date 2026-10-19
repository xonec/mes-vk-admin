'use strict';

const { forward } = require('../../util/mes-forward.js');

/**
 * MES 排班列表（只读）
 * @url mes/listSchedules
 * @description 适配层：转发到 production-operations 的 listSchedules，返回结构不变。
 * data 参数沿用旧后台：dateFrom、dateTo、keyword、page、pageSize、workshopId
 */
module.exports = {
  main: async (event) => {
    return await forward(event, { action: 'listSchedules', readOnly: true });
  },
};

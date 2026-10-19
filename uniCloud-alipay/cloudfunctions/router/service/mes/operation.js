'use strict';

const { forward, READ_ACTIONS } = require('../../util/mes-forward.js');

/**
 * MES 通用只读转发（P0）
 * @url mes/operation
 * @description 适配层：data.action 指定 production-operations 的只读 action，返回结构不变。
 * 写操作不在白名单内，仍由旧后台处理，直到对应页面完成迁移。
 */
module.exports = {
  main: async (event) => {
    return await forward(event, { readOnly: true });
  },
};
module.exports.READ_ACTIONS = READ_ACTIONS;

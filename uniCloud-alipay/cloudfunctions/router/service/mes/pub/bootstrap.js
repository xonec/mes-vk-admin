'use strict';

const { dispatch } = require('../../../util/mes/dispatch.js');

/**
 * MES 基础目录与权限上下文（P3-B 第 1 模块：已内迁，走 native；开关可回退 forward）
 * @url mes/pub/bootstrap
 * @description 原生化实现：util/mes/{dispatch,scope,shared}.js；旧 façade 见 util/mes-forward.js。
 */
module.exports = {
  main: async (event) => dispatch(event, { action: 'bootstrap' }),
};

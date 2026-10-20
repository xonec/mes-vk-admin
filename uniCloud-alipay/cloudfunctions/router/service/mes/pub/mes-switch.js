'use strict';

const { checkAuth, ok, fail, ClientError } = require('../../../util/mes/common.js');
const scope = require('../../../util/mes/scope.js');
const nativeSwitch = require('../../../util/mes/native-switch.js');
const { payloadOf } = require('../../../util/mes/dispatch.js');

const ACTIONS = ['get', 'set'];

/**
 * MES 灰度开关在线入口（P3 起，仅管理员）。
 * @url mes/pub/mes-switch
 * @description 读写 vk-global-data/mes-native-switch，替代云开发控制台手工改配置。
 * - get：返回当前文档 actions + 代码 DEFAULT_ACTIONS；
 * - set：入参 { actions: { saveCatalog: 'native'|'forward', ... } }，仅允许 SWITCHABLE_WRITE_ACTIONS，
 *   合并写入并清 routing 60 秒缓存后返回读回结果。
 * 权限：先验 token 再按 scope.profile().isAdmin 判定，非管理员 403「仅管理员可以操作灰度开关」。
 * 安全：不记录 payload、不注入 uid；本入口自身不参与灰度开关（永远 native），否则开关写不进去。
 */
module.exports = {
  main: async (event) => {
    const source = event && event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : event || {};
    const action = typeof source.action === 'string' ? source.action : '';
    if (!action) return fail(400, '缺少 action 参数');
    if (ACTIONS.indexOf(action) < 0) return fail(400, '不支持的 action 参数');

    const util = (event && event.util) || {};
    const { db, uniID } = util;
    if (!db) return fail(500, 'MES 服务未就绪，请稍后重试');

    try {
      const auth = await checkAuth(db, event && event.uniIdToken, uniID);
      if (auth.errCode) return fail(auth.errCode, auth.message);
      const profile = await scope.profile(db, auth);
      if (!profile.isAdmin) return fail(403, '仅管理员可以操作灰度开关');
      if (action === 'get') return ok(await nativeSwitch.getSwitch(db));
      return ok(await nativeSwitch.setSwitch(db, auth.uid, payloadOf(event).actions));
    } catch (error) {
      if (error instanceof ClientError) return fail(error.code, error.message);
      console.error('[mes-switch]', action, error && (error.stack || error.message));
      return fail(500, '灰度开关操作失败，请稍后重试');
    }
  },
};

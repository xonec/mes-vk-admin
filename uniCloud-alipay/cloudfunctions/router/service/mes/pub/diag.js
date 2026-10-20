'use strict';

const { checkAuth, ok, fail, ClientError } = require('../../../util/mes/common.js');
const scope = require('../../../util/mes/scope.js');
const diag = require('../../../util/mes/diag.js');
const { payloadOf } = require('../../../util/mes/dispatch.js');

const ACTIONS = ['sync-person', 'inspect', 'old-shift-row', 'write-probe', 'db-check', 'safety-scan'];

/**
 * MES 临时诊断入口（admin-only，P3-B3 排班考勤同步 500 定位用；不参与灰度开关）。
 * @url mes/pub/diag
 * - sync-person：{personId, date} 或 {personId, dateFrom, dateTo} 直接调用 native 考勤同步，
 *   成功返回 {code:0,data}；异常原样返回 {code:900,name,message,stack,errCode,detail,date}。
 * - inspect（别名 old-shift-row）：{personId, date} 只读查看考勤行/排班/版本/人员锁。
 * - write-probe（临时）：{id} 对 2026-10-22 TEST 考勤行做「null→对象」写入形式实验（A/B/C/C2/D/E），实验后恢复 conflict 原值。
 * - db-check（只读）：统计显式 null 字段（默认 attendance.conflict、orders pallet/materials/audit、plans pallet、records buckets、全部 mes_ops_*.audit），可传 checks 自定义。
 * 安全：仅管理员可用；不落 payload 日志；定位完成后应下线本入口。
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
      if (!profile.isAdmin) return fail(403, '仅管理员可以使用诊断入口');
      const payload = payloadOf(event);
      if (action === 'db-check' || action === 'safety-scan') return ok(await diag.dbCheck(db, payload));
      if (action === 'write-probe') return ok(await diag.writeProbe(db, payload));
      if (action === 'sync-person') {
        const result = await diag.syncPerson(db, profile, payload);
        if (result && result.code === 900) return result;
        return ok(result);
      }
      return ok(await diag.inspect(db, payload));
    } catch (error) {
      if (error instanceof ClientError) return fail(error.code, error.message);
      console.error('[mes-diag]', action, error && (error.stack || error.message));
      return fail(500, '诊断入口异常，请稍后重试');
    }
  },
};

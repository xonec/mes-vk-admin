module.exports = {
  /**
   * 修改
   * @url admin/system_uni/error-log/sys/update 前端调用的url参数地址
   */
  main: async (event) => {
    let { data = {}, userInfo, util, filterResponse, originalParam } = event;
    let { customUtil, uniID, config, pubFun, vk, db, _ } = util;
    let { uid } = data;
    let res = { code: 0, msg: '' };
    // 业务逻辑开始-----------------------------------------------------------
    let { id, md5, status, comment, mode, md5List } = data;
    let dbName = 'vk-error-log';
    let whereJson = {};
    let dataJson = {};

    if (mode === 'batch') {
      if (!Array.isArray(md5List) || vk.pubfn.isNull(md5List)) {
        return { code: -1, msg: '请选择需要处理的错误日志' };
      }
      if (md5List.some((item) => typeof item !== 'string' || vk.pubfn.isNull(item))) {
        return { code: -1, msg: '错误日志参数格式不正确' };
      }
      if ([1, 2].indexOf(status) === -1) {
        return { code: -1, msg: '目标状态不正确' };
      }
      whereJson = {
        md5: _.in(md5List),
        status: 0,
      };
      dataJson = {
        status,
      };
    } else if (mode === 'allPending') {
      whereJson = {
        status: 0,
      };
      dataJson = {
        status: 1,
      };
    } else if (vk.pubfn.isNotNull(mode)) {
      return { code: -1, msg: '不支持的操作模式' };
    } else {
      let info = await vk.baseDao.findById({
        dbName,
        id,
      });
      if (!info) {
        return { code: -1, msg: '记录不存在' };
      }
      whereJson = {
        md5,
        status: info.status,
      };
      dataJson = {
        status,
      };
    }

    // 执行数据库API请求
    res.num = await vk.baseDao.update({
      dbName,
      whereJson,
      dataJson,
    });
    return res;
  },
};

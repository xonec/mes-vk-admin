'use strict';
let vk = uniCloud.vk; // 全局vk实例

const dbName = {
  luckyDraw: 'vk-lucky-draw-activity', // 抽奖活动表
};

const db = uniCloud.database(); // 全局数据库引用
const _ = db.command; // 数据库操作符
const $ = _.aggregate; // 聚合查询操作符

// 密钥缓存的键名
const cacheKey = 'sys-lucky-draw-key';

/**
 * 权限注意：访问以下链接查看
 * 文档地址：https://vkdoc.fsq.pub/client/uniCloud/cloudfunctions/cloudObject.html#内置权限
 */
const cloudObject = {
  isCloudObject: true, // 标记为云对象模式
  /**
   * 请求前处理，主要用于调用方法之前进行预处理，一般用于拦截器、统一的身份验证、参数校验、定义全局对象等。
   * 文档地址：https://vkdoc.fsq.pub/client/uniCloud/cloudfunctions/cloudObject.html#before-预处理
   */
  _before: async function () {
    vk = uniCloud.vk; // 将vk定义为全局对象
    // let { customUtil, uniID, config, pubFun } = this.getUtil(); // 获取工具包
  },
  /**
   * 请求后处理，主要用于处理本次调用方法的返回结果或者抛出的错误
   * 文档地址：https://vkdoc.fsq.pub/client/uniCloud/cloudfunctions/cloudObject.html#after-后处理
   */
  _after: async function (options) {
    let { err, res } = options;
    if (err) {
      return; // 如果方法抛出错误，直接return;不处理
    }
    return res;
  },
  // 加密key，该函数为私有函数
  _encryptKey: function (key) {
    try {
      return vk.crypto.aes.encrypt({
        mode: 'aes-256-ecb',
        data: key,
      });
    } catch (err) {
      throw { code: -1, msg: '该活动的key加密失败' };
    }
  },
  // 获取解密后的key，该函数为私有函数
  _decryptKey: function (key) {
    try {
      return vk.crypto.aes.decrypt({
        mode: 'aes-256-ecb',
        data: key,
      });
    } catch (err) {
      throw { code: -1, msg: '该活动的key解密失败' };
    }
  },
  /**
   * 获取key
   * @url plugs/lucky-draw/admin/sys.luckyDraw.getKey 前端调用的url参数地址
   */
  getKey: async function (key) {
    let res = { code: 0, msg: '' };
    const cacheManage = vk.getCacheManage();
    res.key = await cacheManage.get(cacheKey);
    return res;
  },
  /**
   * 设置key
   * @url plugs/lucky-draw/admin/sys.luckyDraw.setKey 前端调用的url参数地址
   */
  setKey: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { key } = data;
    const luckyDrawManage = vk.getLuckyDrawManage({ key });
    let requestRes = await luckyDrawManage.checkKey(); // 检查key是否有效
    if (requestRes.code !== 0) {
      return requestRes;
    }
    const cacheManage = vk.getCacheManage();
    await cacheManage.set(cacheKey, key, 0);
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 获取远程活动数据
   * @url plugs/lucky-draw/admin/sys.luckyDraw.getActivityList 前端调用的url参数地址
   */
  getActivityList: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { pageIndex, pageSize, formData = {} } = data;
    let { status, title } = formData;
    const cacheManage = vk.getCacheManage();
    let key = await cacheManage.get(cacheKey);
    const luckyDrawManage = vk.getLuckyDrawManage({ key });
    let requestRes = await luckyDrawManage.getActivityList({
      page: pageIndex,
      size: pageSize,
      sort: 'desc',
      status,
      title,
    });
    if (requestRes.code !== 0) {
      return requestRes;
    }
    res = {
      hasMore: requestRes.result.more,
      rows: requestRes.result.data,
      code: 0,
      msg: '查询成功',
      pagination: {
        pageIndex,
        pageSize,
      },
      getCount: false,
    };
    return res;
  },
  /**
   * 获取远程活动详情
   * @url plugs/lucky-draw/admin/sys.luckyDraw.getActivityInfo 前端调用的url参数地址
   */
  getActivityInfo: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { _id } = data;
    if (vk.pubfn.isNull(_id)) {
      return { code: -1, msg: '_id不能为空' };
    }
    let luckyDrawInfo = await vk.baseDao.findById({
      dbName: dbName.luckyDraw,
      id: _id,
    });
    if (vk.pubfn.isNull(luckyDrawInfo)) {
      return { code: -1, msg: '该活动不存在' };
    }
    let key = this._decryptKey(luckyDrawInfo.key);
    const luckyDrawManage = vk.getLuckyDrawManage({ key });
    let requestRes = await luckyDrawManage.getActivityInfo({
      activity_id: luckyDrawInfo.activity_id,
    });
    if (requestRes.code !== 0) {
      return requestRes;
    }
    res.info = requestRes.result.data;
    return res;
  },
  /**
   * 获取远程活动中奖记录
   * @url plugs/lucky-draw/admin/sys.luckyDraw.getActivityWinList 前端调用的url参数地址
   */
  getActivityWinList: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { pageIndex, pageSize, formData = {} } = data;
    let { _id } = formData;

    if (vk.pubfn.isNull(_id)) {
      return { code: -1, msg: '_id不能为空' };
    }
    let luckyDrawInfo = await vk.baseDao.findById({
      dbName: dbName.luckyDraw,
      id: _id,
    });
    if (vk.pubfn.isNull(luckyDrawInfo)) {
      return { code: -1, msg: '该活动不存在' };
    }
    let key = this._decryptKey(luckyDrawInfo.key);
    const luckyDrawManage = vk.getLuckyDrawManage({ key });
    let requestRes = await luckyDrawManage.getActivityWinUserList({
      page: pageIndex,
      size: pageSize,
      sort: 'desc',
      activity_id: luckyDrawInfo.activity_id,
    });
    if (requestRes.code !== 0) {
      return requestRes;
    }
    res = {
      hasMore: requestRes.result.more,
      rows: requestRes.result.data,
      code: 0,
      msg: '查询成功',
      pagination: {
        pageIndex,
        pageSize,
      },
      getCount: false,
    };
    return res;
  },
  /**
   * 奖品批量发货
   * @url plugs/lucky-draw/admin/sys.luckyDraw.batchdDeliveryPrize 前端调用的url参数地址
   */
  batchdDeliveryPrize: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let {
      _id,
      list, // 发货数据
    } = data;
    if (vk.pubfn.isNull(_id)) {
      return { code: -1, msg: '_id不能为空' };
    }
    if (vk.pubfn.isNull(list)) {
      return { code: -1, msg: '参数list不能为空' };
    }
    let luckyDrawInfo = await vk.baseDao.findById({
      dbName: dbName.luckyDraw,
      id: _id,
    });
    if (vk.pubfn.isNull(luckyDrawInfo)) {
      return { code: -1, msg: '该活动不存在' };
    }
    let key = this._decryptKey(luckyDrawInfo.key);
    const luckyDrawManage = vk.getLuckyDrawManage({ key });
    let requestRes = await luckyDrawManage.batchdDeliveryPrize({
      activity_id: luckyDrawInfo.activity_id,
      list,
    });
    if (requestRes.code !== 0) {
      return requestRes;
    }
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 获取活动列表
   * @url plugs/lucky-draw/admin/sys.luckyDraw.getList 前端调用的url参数地址
   */
  getList: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    res = await vk.baseDao.getTableData({
      dbName: dbName.luckyDraw,
      data,
    });
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 添加活动
   * @url plugs/lucky-draw/admin/sys.luckyDraw.add 前端调用的url参数地址
   */
  add: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { list, sort, enable, cover_image } = data;
    if (vk.pubfn.isNull(list)) return { code: -1, msg: 'list不能为空' };
    if (list.length > 500) return { code: -1, msg: 'list不能超过500条' };
    const cacheManage = vk.getCacheManage();
    let key = await cacheManage.get(cacheKey);
    let dataArr = list.map((item, index) => {
      return {
        _add_time: item._add_time,
        activity_id: item._id,
        title: item.title,
        sort: 0,
        enable,
        prize_list: item.prize_list,
        start_time: item.start_time,
        end_time: item.end_time,
        max_people: item.max_people,
        lottery_type: item.lottery_type,
        mode: item.mode,
        cover_image,
        key: this._encryptKey(key), // 因为key可能会变更，所以每个活动都要保存key（加密保存）
      };
    });
    let ids = dataArr.map((item) => item.activity_id);
    let luckyDrawList = await vk.baseDao.select({
      dbName: dbName.luckyDraw,
      pageIndex: 1,
      pageSize: ids.length,
      getCount: false,
      getMain: true,
      whereJson: {
        activity_id: _.in(ids),
      },
    });
    if (luckyDrawList.length > 0) {
      // dataArr数据需要去除luckyDrawList中存在的数据
      dataArr = dataArr.filter((item) => {
        return !luckyDrawList.some((luckyDraw) => luckyDraw.activity_id === item.activity_id);
      });
    }
    if (dataArr.length > 0) {
      await vk.baseDao.adds({
        dbName: dbName.luckyDraw,
        dataJson: dataArr,
      });
    }
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 修改活动
   * @url plugs/lucky-draw/admin/sys.luckyDraw.update 前端调用的url参数地址
   */
  update: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { _id, sort, enable, cover_image } = data;
    if (vk.pubfn.isNull(_id)) return { code: -1, msg: 'id不能为空' };
    let dataJson = {
      sort,
      enable,
      cover_image,
    };
    if (typeof _id === 'string') {
      // 单条修改
      res.num = await vk.baseDao.updateById({
        dbName: dbName.luckyDraw,
        id: _id,
        dataJson,
      });
    } else if (typeof _id === 'object') {
      // 批量修改
      res.num = await vk.baseDao.update({
        dbName: dbName.luckyDraw,
        whereJson: {
          _id: _.in(_id),
        },
        dataJson,
      });
    }
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 删除活动
   * @url plugs/lucky-draw/admin/sys.luckyDraw.delete 前端调用的url参数地址
   */
  delete: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { _id } = data;
    if (vk.pubfn.isNull(_id)) return { code: -1, msg: 'id不能为空' };
    if (typeof _id === 'string') {
      // 单条删除
      res.num = await vk.baseDao.deleteById({
        dbName: dbName.luckyDraw,
        id: _id,
      });
    } else if (typeof _id === 'object') {
      // 批量删除
      res.num = await vk.baseDao.del({
        dbName: dbName.luckyDraw,
        whereJson: {
          _id: _.in(_id),
        },
      });
      if (res.num > 0) {
        res.msg = `删除成功，共删除${res.num}条数据`;
      }
    }
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 模板函数
   * @url plugs/lucky-draw/admin/sys.luckyDraw.test 前端调用的url参数地址
   */
  test: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------

    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
};

module.exports = cloudObject;

'use strict';
let vk = uniCloud.vk; // 全局vk实例
// 涉及的表名
const dbName = {
  luckyDraw: 'vk-lucky-draw-activity', // 抽奖活动表
};

const db = uniCloud.database(); // 全局数据库引用
const _ = db.command; // 数据库操作符
const $ = _.aggregate; // 聚合查询操作符
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
      if (err instanceof Error) {
        return; // 如果是Error类型，直接return;不处理
      }
      return err;
    }
    return res;
  },
  /**
   * 获取列表
   * @url plugs/lucky-draw/client/pub.getList 前端调用的url参数地址
   */
  getList: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { pageIndex = 1, pageSize = 10 } = data;
    res = await vk.baseDao.select({
      dbName: dbName.luckyDraw,
      getCount: false,
      hasMore: true, // 当getCount为false时，是否需要精准的hasMore
      pageIndex,
      pageSize,
      whereJson: {
        enable: true, // 只查询启用的活动
      },
      fieldJson: {
        key: false, // 不返回key字段
      },
      sortArr: [
        { name: 'sort', type: 'desc' },
        { name: '_id', type: 'desc' },
      ],
    });
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 模板函数
   * @url plugs/lucky-draw/client/pub.test 前端调用的url参数地址
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

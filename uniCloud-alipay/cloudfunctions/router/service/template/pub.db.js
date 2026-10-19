'use strict';
let vk = uniCloud.vk; // 全局vk实例
// 涉及的表名
const dbName = require('../../dao/config.js');

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
    vk = this.vk; // 将vk定义为全局对象
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
   * @url template/pub.db.getList 前端调用的url参数地址
   */
  getList: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    res = await vk.daoCenter.testDao.getTableData({
      data,
      // 强制where条件
      whereJson: {
        // 因为是演示，故此处未加强制条件
      },
    });
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 初始化测试数据
   * @url template/pub.db.initTestData 前端调用的url参数地址
   */
  initTestData: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    // 先清空表内容
    await vk.daoCenter.testDao.del({
      _id: _.exists(true),
    });
    let startTime = Date.now();
    let addNum = 5000;
    console.log('开始运行，添加' + addNum + '条数据');
    // 承载所有读操作的 promise 的数组
    let dataArr = [];
    for (let i = 1; i <= addNum; i++) {
      dataArr.push({
        no: vk.pubfn.createOrderNo('NO'),
        nickname: `用户昵称-${i}`,
        value: Math.floor(Math.random() * 500) / 10000,
        title: `标题`,
        user_id: '00' + Math.floor(Math.random() * 2 + 1),
        type: 1,
      });
    }
    await vk.daoCenter.testDao.adds(dataArr);
    let endTime = Date.now();
    res.runTime = endTime - startTime;
    console.log('运行结束，耗时:' + res.runTime / 1000 + '秒');
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 模板函数
   * @url template/pub.db.test 前端调用的url参数地址
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

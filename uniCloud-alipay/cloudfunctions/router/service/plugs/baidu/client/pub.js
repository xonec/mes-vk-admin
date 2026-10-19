'use strict';
let vk = uniCloud.vk; // 全局vk实例
// 涉及的表名
const dbName = {
  //test: "vk-test", // 测试表
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
   * 获取accessToken
   * @url plugs/baidu/client/pub.getAccessToken 前端调用的url参数地址
   */
  getAccessToken: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    res.access_token = await vk.openapi.baidu.open.auth.getAccessToken();
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 营业执照识别
   * @url plugs/baidu/client/pub.ocrBusinessLicense 前端调用的url参数地址
   */
  ocrBusinessLicense: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { image, url } = data;
    res = await vk.openapi.baidu.open.request({
      action: 'ocr/v1/business_license',
      actionVersion: '2.0',
      data: {
        image,
        url,
      },
    });
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 身份证识别
   * @url plugs/baidu/client/pub.ocrIdcard 前端调用的url参数地址
   */
  ocrIdcard: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { image, url } = data;
    res = await vk.openapi.baidu.open.request({
      action: 'ocr/v1/idcard',
      actionVersion: '2.0',
      data: {
        image,
        url,
      },
    });
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
};

module.exports = cloudObject;

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
      return; // 如果方法抛出错误，直接return;不处理
    }
    return res;
  },
  /**
   * 获取列表
   * @url template/sys.table.getList 前端调用的url参数地址
   */
  getList: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    res = await vk.daoCenter.testDao.getTableData({
      data,
      // 副表列表
      foreignDB: [
        {
          dbName: dbName.user,
          localKey: 'user_id',
          foreignKey: '_id',
          as: 'userInfo',
          limit: 1,
          fieldJson: { token: false, password: false },
        },
      ],
    });
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 获取详情
   * @url template/sys.table.getInfo 前端调用的url参数地址
   */
  getInfo: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { _id } = data;
    if (vk.pubfn.isNull(_id)) {
      return { code: -1, msg: '缺少_id参数' };
    }
    res.info = await vk.daoCenter.testDao.findById(_id);
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 添加或修改
   * @url template/sys.table.save 前端调用的url参数地址
   */
  save: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let {
      _id,
      user_id,
      money,
      remark,
      avatar,
      image,
      file_url,
      rate,
      status,
      icon,
      tag,
      end_time,
      html_content,
      count,
      percentage,
      discount,
      province,
      address,
      location,
      user_info,
      field1,
      field2,
      object_info,
      radio_value,
      select_value,
      checkbox_value,
      string_array,
      password,
      color,
    } = data;

    const isAdd = vk.pubfn.isNull(_id);

    // 公共参数（添加和修改都需要的字段）
    let dataJson = {
      user_id,
      money,
      remark,
      avatar,
      image,
      file_url,
      rate,
      icon,
      tag,
      end_time,
      html_content,
      count,
      percentage,
      discount,
      province,
      address,
      location,
      user_info,
      field1,
      field2,
      object_info,
      radio_value,
      select_value,
      checkbox_value,
      string_array,
      password,
      color,
    };

    if (isAdd) {
      // 添加
      vk.pubfn.objectAssign(dataJson, {
        // 仅添加时才需要的参数
        status: status || 0,
      });
      res.id = await vk.daoCenter.testDao.add(dataJson);
      res.msg = '添加成功';
    } else {
      // 修改
      let info = await vk.daoCenter.testDao.findById(_id);
      if (vk.pubfn.isNull(info)) {
        return { code: -1, msg: '修改失败，记录不存在' };
      }
      await vk.daoCenter.testDao.updateById({
        id: _id,
        dataJson,
      });
      res.id = _id;
      res.msg = '修改成功';
    }
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 修改基础信息
   * @url template/sys.table.updateBase 前端调用的url参数地址
   */
  updateBase: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { _id, enable, sort } = data;
    // 只解构需要通过 updateBase 修改的字段
    if (vk.pubfn.isNull(_id)) {
      return { code: -1, msg: '缺少_id参数' };
    }
    res.num = await vk.daoCenter.testDao.updateById({
      id: _id,
      dataJson: {
        enable,
        sort,
      },
    });
    res.msg = '修改成功';
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 删除
   * @url template/sys.table.delete 前端调用的url参数地址
   */
  delete: async function (data) {
    let res = { code: 0, msg: '' };
    let { uid } = this.getClientInfo(); // 获取客户端信息
    // 业务逻辑开始-----------------------------------------------------------
    let { _id } = data;
    if (vk.pubfn.isNull(_id)) {
      return { code: -1, msg: '缺少_id参数' };
    }
    let whereJson = {};
    if (Array.isArray(_id)) {
      // 批量删除
      whereJson._id = _.in(_id);
    } else {
      // 单个删除
      whereJson._id = _id;
    }
    res.num = await vk.daoCenter.testDao.del(whereJson);
    res.msg = `成功删除 ${res.num} 条数据`;
    // 业务逻辑结束-----------------------------------------------------------
    return res;
  },
  /**
   * 模板函数
   * @url template/sys.table.test 前端调用的url参数地址
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

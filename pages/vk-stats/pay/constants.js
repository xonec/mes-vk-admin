/**
 * 支付订单 - 共享常量
 * MAP 为主数据源，数组格式通过函数派生
 */

// 颜色 → tagType 映射
const COLOR_TAG_MAP = {
  '#07c160': 'success',
  '#1677ff': 'primary',
  '#161823': 'danger',
  '#cf0a2c': 'danger',
};

// 支付类型 MAP
export const PAY_TYPE_MAP = {
  // 微信官方
  'wxpay_mp-weixin': { label: '微信官方 - 小程序', icon: 'vk-icon-weixin', color: '#07c160' },
  'wxpay_app-plus': { label: '微信官方 - APP', icon: 'vk-icon-weixin', color: '#07c160' },
  wxpay_h5: { label: '微信官方 - H5', icon: 'vk-icon-weixin', color: '#07c160' },
  wxpay_mweb: { label: '微信官方 - MWEB', icon: 'vk-icon-weixin', color: '#07c160' },
  'wxpay_h5-weixin': { label: '微信官方 - 公众号', icon: 'vk-icon-weixin', color: '#07c160' },
  'wxpay-virtual_mp-weixin': { label: '微信官方 - 虚拟支付', icon: 'vk-icon-weixin', color: '#07c160' },
  // 支付宝官方
  'alipay_mp-alipay': { label: '支付宝官方 - 小程序', icon: 'vk-icon-zhifubaozhifu', color: '#1677ff' },
  'alipay_app-plus': { label: '支付宝官方 - APP', icon: 'vk-icon-zhifubaozhifu', color: '#1677ff' },
  alipay_h5: { label: '支付宝官方 - H5', icon: 'vk-icon-zhifubaozhifu', color: '#1677ff' },
  // 抖音官方
  'douyin_mp-toutiao': { label: '抖音官方 - 小程序', icon: 'vk-icon-douyin', color: '#161823' },
  // 华为官方
  'huawei_mp-harmony': { label: '华为官方 - 元服务', icon: 'vk-icon-huawei', color: '#cf0a2c' },
  'huawei_app-harmony': { label: '华为官方 - APP', icon: 'vk-icon-huawei', color: '#cf0a2c' },
  // 苹果官方
  'appleiap_app-plus': { label: '苹果内购', icon: 'vk-icon-apple', color: '#000000' },
  // 三方渠道 - VksPay
  'vkspay_mp-weixin': { label: 'VksPay - 微信小程序', icon: 'vk-icon-weixin', color: '#07c160' },
  vkspay_mweb: { label: 'VksPay - 微信MWEB', icon: 'vk-icon-weixin', color: '#07c160' },
  'vkspay_h5-weixin': { label: 'VksPay - 微信公众号', icon: 'vk-icon-weixin', color: '#07c160' },
  'vkspay_mp-alipay': { label: 'VksPay - 支付宝小程序', icon: 'vk-icon-zhifubaozhifu', color: '#1677ff' },
  vkspay_h5: { label: 'VksPay - H5', icon: 'vk-icon-heading-h5', color: '#07c160' },
  'vkspay_app-plus': { label: 'VksPay - APP', icon: 'vk-icon-APPku', color: '#07c160' },
};

// 订单状态 MAP
export const STATUS_MAP = {
  '-1': { label: '已关闭', tagType: 'info' },
  0: { label: '未支付', tagType: 'info' },
  1: { label: '已支付', tagType: 'success' },
  2: { label: '已部分退款', tagType: 'warning' },
  3: { label: '已全额退款', tagType: 'danger' },
  'paid-success': { label: '已支付（含退款）', tagType: 'success' },
  refunded: { label: '已退款（含部分退款）', tagType: 'success' },
};

// 订单类型 MAP
export const ORDER_TYPE_MAP = {
  goods: '商品订单',
  recharge: '充值订单',
  vip: 'VIP购买订单',
  other: '其他订单',
  'wxpay-virtual-test': '微信虚拟支付测试',
};

// 通知模式 MAP
export const NOTIFY_MODE_MAP = {
  0: '主动调用',
  1: '异步回调',
};

// 支付方式 MAP
export const PROVIDER_PAY_METHOD_MAP = {
  wxpay: '微信支付',
  'wxpay-virtual': '微信虚拟支付',
  alipay: '支付宝支付',
  douyin: '抖音支付',
  huawei: '华为支付',
  appleiap: '苹果内购',
};

export const PLATFORM_LABEL_MAP = {
  h5: 'Web（H5）',
  'mp-weixin': '微信小程序',
  'h5-weixin': '微信公众号',
  'mp-alipay': '支付宝小程序',
  'mp-toutiao': '抖音小程序',
  'mp-harmony': '鸿蒙元服务',
  'app-plus': 'App（安卓、iOS）',
  'app-harmony': '鸿蒙App',
};

// 派生数组：支付类型（供表格/查询表单使用）
export const payTypeData = Object.keys(PAY_TYPE_MAP).map((key) => {
  const item = PAY_TYPE_MAP[key];
  return {
    label: item.label,
    value: key,
    tagType: COLOR_TAG_MAP[item.color] || 'info',
  };
});

// 派生数组：支付方式搜索项（按支付渠道类型聚合）
export const payTypeSearchData = Object.keys(PROVIDER_PAY_METHOD_MAP).map((key) => ({
  label: PROVIDER_PAY_METHOD_MAP[key],
  value: key,
}));

// 派生数组：支付方式搜索项（按支付渠道类型聚合）
export const platformData = Object.keys(PLATFORM_LABEL_MAP).map((key) => ({
  label: PLATFORM_LABEL_MAP[key],
  value: key,
}));

// 派生数组：订单类型
export const orderTypeData = Object.keys(ORDER_TYPE_MAP).map((key) => ({
  label: ORDER_TYPE_MAP[key],
  value: key,
}));

// 派生数组：订单状态
export const statusData = Object.keys(STATUS_MAP).map((key) => ({
  label: STATUS_MAP[key].label,
  value: isNaN(key) ? key : Number(key),
  tagType: STATUS_MAP[key].tagType,
}));

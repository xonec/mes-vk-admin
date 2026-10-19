# pages/stats 统计模块说明

## 目录结构

```text
pages/stats
├── common/                        # 统计模块公共资源
│   └── css/index.scss             # 统计卡片公共样式
├── components/                    # 统计模块公共组件
│   └── stat-alert.vue             # 统计刷新提示组件
├── user/                          # 用户统计业务目录
│   ├── overview.vue               # 用户统计总览页
│   └── components/                # 用户统计专用组件
├── pay/                           # 支付统计业务目录
│   ├── overview.vue               # 支付统计总览页
│   └── list.vue                   # 支付订单明细页
└── error/                         # 云端错误统计业务目录
    └── list.vue                   # 云端错误统计列表页
```

## 后端依赖

- 用户统计依赖的后端云对象：`${uniCloud目录}/cloudfunctions/${router主函数名}/service/admin/system_uni/sys.stats.js`
- 前端调用地址前缀：`admin/system_uni/sys.stats.*`
- 该云对象封装了数量统计、金额统计、趋势图统计、缓存等复用方法，可用于快速实现与当前用户统计页相似的统计页面。具体可查看该云对象的源码

## 定时任务依赖

用户统计的数据依赖定时任务生成：

- 定时任务文件：`${uniCloud目录}/cloudfunctions/${router主函数名}/service/crontab/tasks/statUser.js`
- 任务开关配置：`${uniCloud目录}/cloudfunctions/${router主函数名}/service/crontab/taskConfig.js`
- 需要在 `taskConfig.js` 的 `tasks` 中开启 `statUser`，用户统计固定为：`statUser: '1h'`
- 需要在 `${uniCloud目录}/cloudfunctions/${router主函数名}/package.json` 的 `cloudfunction-config` 中配置足够的超时时间和固定的定时触发器。
- `timeout` 按云厂商上限配置：腾讯云最大 `900`，阿里云最大 `7200`，支付宝云最大 `10800`。
- `triggers` 为固定配置，不要修改：

```json
{
  "triggers": [
    {
      "config": "0 * * * * * *",
      "name": "timer",
      "type": "timer"
    }
  ]
}
```

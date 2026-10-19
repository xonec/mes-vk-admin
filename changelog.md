## 1.25.2（2026-09-10）
- 【升级】`vk-unicloud-admin-ui` 的 npm 包（执行`npm i vk-unicloud-admin-ui@1.25.5 --registry https://registry.npmjs.org/`）
- 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
- 【重要】恢复 `"runtime": "Nodejs18"` 配置，注意：此配置不兼容 `HBuilderX 5.15` 版本，请尽快升级到 HBuilderX 最新版
- 【重要】修复定时任务在部分情况下可能不运行的问题
- 【优化】定时任务日志优化，打印本次要执行的任务列表和本次不执行的任务列表
## 1.25.1（2026-07-27）
- 【升级】`vk-unicloud-admin-ui` 的 npm 包（执行`npm i vk-unicloud-admin-ui@1.25.1 --registry https://registry.npmjs.org/`）
- 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
- 【重要】`router` 临时移除 `"runtime": "Nodejs18"` 配置，以便兼容 `HBuilderX 5.15` 版本
- 【修复】`万能表格` 的 `rightBtnsMore` 按钮第二次点击可能会报错的问题
## 1.25.0（2026-06-17）
- 【升级】`vk-unicloud-admin-ui` 的 npm 包（执行`npm i vk-unicloud-admin-ui@1.25.0 --registry https://registry.npmjs.org/`）
- 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
- 【重要】新增 `vk 统计` 模块，包含用户统计、支付统计、错误统计三大功能区，可通过菜单管理页「初始化vk统计」按钮一键导入菜单
- 【新增】`用户统计` 页面（概览 + 登录日志），展示新增用户趋势图、登录用户趋势图，支持按时/日/月维度切换
- 【新增】`支付统计` 页面（概览），展示收入趋势图、支付漏斗、支付方式占比饼图、按平台/订单类型收入明细表，支持日期快捷筛选和多维度筛选
- 【新增】`用户价值排行` 页面，支持按净收入/支付金额/支付笔数等多维度排序，支持导出 Excel，点击可跳转查看该用户的订单明细
- 【新增】`vk-stat-result` 统计结果表
- 【新增】定时任务 `statUser`（每小时执行用户统计）、`clearExpiredCache`（每小时清理 vk-global-data 过期缓存）
- 【调整】`支付订单明细` 页面，订单列表和详情弹窗从 `pages_plugs/system_uni/vk-pay-orders` 迁移至 `pages/vk-stats/pay`，详情弹窗 UI 全面重构（顶部概要卡片 + 基础信息/通知回调/退款信息三 Tab + 订单时间轴）
- 【调整】 `云端错误统计` 页面，从 `pages_plugs/system_uni/vk-error-log` 迁移至 `pages/vk-stats/error`，支持按状态筛选和处理操作
- 【调整】`登录日志` 页面，从 `pages_plugs/system_uni/uni-id-log` 迁移至 `pages/vk-stats/user`，支持按应用、IP、设备、用户等多维度筛选
- 【调整】云函数定时任务超时时间从 900 秒（15 分钟）提升至 7200 秒（2 小时）


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.24.1（2026-05-28）
- 【升级】`vk-unicloud-admin-ui` 的 npm 包（执行`npm i vk-unicloud-admin-ui@1.24.1 --registry https://registry.npmjs.org/`）
- 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
- 【重要】支持国际化（i18n），涉及所有内置组件以及素材库、顶栏、登录页、菜单、错误日志、修改密码、富文本编辑器、二维码等组件（暂未包含用户管理等业务页面）
- 【重要】素材库页面UI全面重构，支持父子分组管理、独立音频类型、多种视图模式（列表/缩略图/幻灯片）
- 【重要】素材库选择组件由内置调整为自定义组件，源码在 `/components/vk-data-input-file-select/vk-data-input-file-select.vue`
- 【重要】左侧菜单组件由内置组件调整为自定义组件，源码在 `/windows/components/menu-nav.vue`、`/windows/components/menu-sub.vue`
- 【重要】新增页面权限拦截功能（没有该菜单访问权限的用户将自动跳转到403页面）
- 【重要】万能表格 新增属性 `fullscreen`，为 true 时表格高度撑满到屏幕底部（全屏模式）自 1.24.1 起，表格不再默认全屏，需要手动设置 `:fullscreen="true"` 才会全屏。
- 【重要】万能表格 默认的详情表格重构为 24 栅格布局，支持 span 属性控制每行格子数（默认为24）
- 【重要】万能表格 搜索组件重构为 24 栅格布局，支持 span 属性控制每行格子数（默认为0）为0时代表不开启栅格布局，保持原布局 [传送门](https://vkdoc.fsq.pub/admin/2/table.html#query-columns)
- 【新增】万能表格 搜索组件 `vk-data-table-query` 支持搜索区域折叠/展开 [传送门](https://vkdoc.fsq.pub/admin/2/table.html#query)
- 【新增】万能表格 导出 Excel 支持字段选择器和字段排序
- 【新增】万能表格 新增属性 `pagination-placement` 分页器位置（当 batchBtns 有值时固定为 right）自 1.24.1 起，分页器位置默认在右下角
- 【新增】万能表单 `vk-data-input-numeric` 统一数字输入组件，替代原 money/number/percentage/discount 四个独立组件，支持输入负数，支持范围输入 [传送门](https://vkdoc.fsq.pub/admin/components/4%E3%80%81number.html#range)
- 【新增】万能表格 底部新增批量操作按钮组件能力 [传送门](https://vkdoc.fsq.pub/admin/2/table.html#batch-btns)
- 【新增】万能表单 地图选择器支持手动输入经纬度和地址，新增 `requireMapKey` 配置项 [传送门](https://vkdoc.fsq.pub/admin/components/28%E3%80%81map.html)
- 【新增】用户管理新增自定义详情弹窗，支持头像编辑、标签选择、邮箱字段展示和编辑
- 【优化】菜单标签页支持右键上下文菜单操作
- 【优化】万能表单 上传组件的拖拽排序交互体验
- 【优化】所有表格页面统一使用 `vk-page-card` 卡片化布局，排版符合当前主流admin风格
- 【优化】省市区数据更新
- 【优化】提升整体页面加载性能
## 1.24.0（2026-05-28）
## 1.24.1（2026-05-28）
- 【升级】`vk-unicloud-admin-ui` 的 npm 包（执行`npm i vk-unicloud-admin-ui@1.24.1 --registry https://registry.npmjs.org/`）
- 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
- 【重要】支持国际化（i18n），涉及所有内置组件以及素材库、顶栏、登录页、菜单、错误日志、修改密码、富文本编辑器、二维码等组件（暂未包含用户管理等业务页面）
- 【重要】素材库页面UI全面重构，支持父子分组管理、独立音频类型、多种视图模式（列表/缩略图/幻灯片）
- 【重要】素材库选择组件由内置调整为自定义组件，源码在 `/components/vk-data-input-file-select/vk-data-input-file-select.vue`
- 【重要】左侧菜单组件由内置组件调整为自定义组件，源码在 `/windows/components/menu-nav.vue`、`/windows/components/menu-sub.vue`
- 【重要】新增页面权限拦截功能（没有该菜单访问权限的用户将自动跳转到403页面）
- 【重要】万能表格 新增属性 `fullscreen`，为 true 时表格高度撑满到屏幕底部（全屏模式）自 1.24.1 起，表格不再默认全屏，需要手动设置 `:fullscreen="true"` 才会全屏。
- 【重要】万能表格 默认的详情表格重构为 24 栅格布局，支持 span 属性控制每行格子数（默认为24）
- 【重要】万能表格 搜索组件重构为 24 栅格布局，支持 span 属性控制每行格子数（默认为0）为0时代表不开启栅格布局，保持原布局 [传送门](https://vkdoc.fsq.pub/admin/2/table.html#query-columns)
- 【新增】万能表格 搜索组件 `vk-data-table-query` 支持搜索区域折叠/展开 [传送门](https://vkdoc.fsq.pub/admin/2/table.html#query)
- 【新增】万能表格 导出 Excel 支持字段选择器和字段排序
- 【新增】万能表格 新增属性 `pagination-placement` 分页器位置（当 batchBtns 有值时固定为 right）自 1.24.1 起，分页器位置默认在右下角
- 【新增】万能表单 `vk-data-input-numeric` 统一数字输入组件，替代原 money/number/percentage/discount 四个独立组件，支持输入负数，支持范围输入 [传送门](https://vkdoc.fsq.pub/admin/components/4%E3%80%81number.html#range)
- 【新增】万能表格 底部新增批量操作按钮组件能力 [传送门](https://vkdoc.fsq.pub/admin/2/table.html#batch-btns)
- 【新增】万能表单 地图选择器支持手动输入经纬度和地址，新增 `requireMapKey` 配置项 [传送门](https://vkdoc.fsq.pub/admin/components/28%E3%80%81map.html)
- 【新增】用户管理新增自定义详情弹窗，支持头像编辑、标签选择、邮箱字段展示和编辑
- 【优化】菜单标签页支持右键上下文菜单操作
- 【优化】万能表单 上传组件的拖拽排序交互体验
- 【优化】所有表格页面统一使用 `vk-page-card` 卡片化布局，排版符合当前主流admin风格
- 【优化】省市区数据更新
- 【优化】提升整体页面加载性能

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.23.1（2026-04-15）
- 【升级】`vk-unicloud-admin-ui` 的 npm 包（执行`npm i vk-unicloud-admin-ui@1.23.0 --registry https://registry.npmjs.org/`）
- 【优化】一些细节问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.23.0（2026-03-20）
- 【升级】`vk-unicloud-admin-ui` 的 npm 包（执行`npm i vk-unicloud-admin-ui@1.23.0 --registry https://registry.npmjs.org/`）
- 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
- 【重要】项目使用 `Prettier` 进行统一代码格式化 [传送门](https://vkdoc.fsq.pub/client/codeFormat.html)
- 【新增】admin 内置组件（涉及云函数请求的组件）新增属性 `encryptAction` 控制请求是否需要加密
- 【优化】admin 角色默认显示所有菜单，但若 admin 角色若设置了菜单，且菜单数量>0，则以设置的可见菜单为准

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.22.3（2026-03-03）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.21.9 --registry https://registry.npmjs.org/`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】hbx 4.87 版本导入插件会有两个uniCloud目录的问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.22.2（2026-02-11）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.21.9 --registry https://registry.npmjs.org/`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】万能表单 `array<object>` 嵌套 `array<object>` 时，弹窗内的确定按钮文字没有显示的问题
* 【优化】router 内的定时任务支持设置并发执行数，参数名 concurrency [传送门](https://vkdoc.fsq.pub/client/uniCloud/cloudfunctions/timer.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.22.1（2026-02-07）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.21.8 --registry https://registry.npmjs.org/`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【重要】移除 `db_init.json` 单一文件，将其拆分为多文件结构并补全完整表结构，采用新版数据库初始化方案（通过右键 database 目录完成数据库初始化操作）
* 【重要】Dao 文件升级为 Dao2.0 版本 [传送门](https://vkdoc.fsq.pub/client/uniCloud/db/dao.html)
* 【新增】登录页面支持参数传 username和password 或 token 进行自动登录
* 【新增】任意页面传token参数实现自动登录 [传送门](https://vkdoc.fsq.pub/client/vk.userCenter.html#handleautologintoken)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.22.0（2026-02-07）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.21.8 --registry https://registry.npmjs.org/`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【重要】移除 `db_init.json` 单一文件，将其拆分为多文件结构并补全完整表结构，采用新版数据库初始化方案（通过右键 database 目录完成数据库初始化操作）
* 【重要】Dao 文件升级为 Dao2.0 版本 [传送门](https://vkdoc.fsq.pub/client/uniCloud/db/dao.html)
* 【新增】登录页面支持参数传 username和password 或 token 进行自动登录
* 【新增】任意页面传token参数实现自动登录 [传送门](https://vkdoc.fsq.pub/client/vk.userCenter.html#handleautologintoken)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.21.4（2026-01-30）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.21.8 --registry https://registry.npmjs.org/`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】websocket 连接管理，部分情况下连接无法删除的问题
* 【新增】`vk-ws-connection` 表新增 `space_id`、`provider`、`ip` 字段

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.21.3（2025-12-09）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.21.8 --registry https://registry.npmjs.org/`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】万能表格模糊查询时，模糊查询无法查询 * + ? 等特殊符号的问题
* 【修复】万能表格模糊查询时，新增属性 ignoreCase，如设置为 true，可忽略大小写，默认为 true


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.21.2（2025-11-07）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.21.7 --registry https://registry.npmjs.org/`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【重要】万能表格 重构导出Excel功能，导出格式从html调整为xlsx的表格文件（`需替换template.h5.html文件和/static/plugs/exceljs/exceljs.min.js`）[传送门](https://vkdoc.fsq.pub/admin/2/table.html#export-excel)
* 【重要】新增 前端API vk.pubfn.parseXlsxFile，可直接解析.xlsx格式的文件 [传送门](https://vkdoc.fsq.pub/client/jsapi.html#parsexlsxfile)
* 【优化】万能表格 exportExcel 新增参数 freezeHeader、autoFilter [传送门](https://vkdoc.fsq.pub/admin/2/table.html#export-excel-3) 
* 【优化】万能表单 switch 新增参数 inlinePrompt [传送门](https://vkdoc.fsq.pub/admin/components/14%E3%80%81switch.html#demo3)


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.21.1（2025-09-26）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.21.0 --registry https://registry.npmjs.org/`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【重要】万能表单 text、textarea 新增属性 trimMode，可以设置过滤空格的模式，默认为 trim（过滤前后空格）[传送门](https://vkdoc.fsq.pub/admin/components/1%E3%80%81text.html#trim-mode)
* 【修复】权限管理添加父权限可能会报url不能为空的问题
* 【优化】素材库管理页面新增幻灯片播放模式 [传送门](https://vkdoc.fsq.pub/admin/6/uni-id-files.html#slideshow)
* 【优化】素材库支持并发上传文件，提升上传速度 [传送门](https://vkdoc.fsq.pub/admin/6/uni-id-files.html#concurrency)
* 【优化】素材库支持上传远程图片和视频 [传送门](https://vkdoc.fsq.pub/admin/6/uni-id-files.html#remotefile)
* 【优化】素材库支持显示私有权限的图片和视频
* 【优化】万能表单 columns 属性内支持直接写 rules（表单验证规则） 
* 【优化】万能表单 select 新增属性 showDesc [传送门](https://vkdoc.fsq.pub/admin/components/9%E3%80%81select.html#show-desc)
* 【优化】万能表单 remote-select 新增属性 showDesc 和 group [传送门](https://vkdoc.fsq.pub/admin/components/10%E3%80%81remote-select.html#demo7)
* 【优化】万能表单 remote-select 的刷新按钮显示在右侧，而非显示在待选项中
* 【优化】万能表单 file-select 新增 returnType 属性，可控制返回值是 url 或 id [传送门](https://vkdoc.fsq.pub/admin/components/25%E3%80%81file-select.html#fileid)
* 【优化】万能表单 `array-object` 新增属性 beforeRemove，支持删除前拦截

**特别注意：本次更新需要替换框架内置文件**

- `/router/service/admin/system_uni/uni-id-files/` 整个目录

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.21.0（2025-07-07）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.20.15`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【重要】新增抽奖活动管理页面 `/pages_plugs/system_uni/lucky-draw/list`
* 【修复】一些细节问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.20.2（2025-05-23）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.20.13`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【重要】`万能表单` address 组件数据源信息至2025年
* 【修复】`万能表单` datetimerange 组件属性 disabled 无效的问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.20.1（2025-04-08）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.20.7`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【新增】日志打印模式新增折叠模式，可在 `app.config.js` 内设置 `logger.mode` 为 1 开启默认折叠
* 【优化】登录日志管理页面
* 【优化】`万能表单` `地图选址` 组件支持选择地图上任意一点

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.27（2025-03-14）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.19.33`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】`万能表单` `array<object>` 内使用 `remote-select` 等需要网络请求的组件时会重复请求3次的问题
* 【修复】`万能表单` `tree-select` 内使用 `actionData` 不生效的问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.26（2025-03-13）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.19.30`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.25（2025-03-11）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.19.30`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【优化】`万能表单` file-select 新增参数 fileSize 和 sizeUnit

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.24（2025-01-22）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.19.28`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】运行报错 'localStorage' has already been declared 的问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.23（2025-01-21）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.19.28`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【优化】`万能表单` file-select 新增参数 fileSize 和 sizeUnit

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.22（2025-01-21）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.19.28`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【优化】`万能表单` file-select 新增参数 fileSize 和 sizeUnit

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.21（2024-12-19）
* 【升级】`vk-unicloud-admin-ui` 的npm包（执行`npm i vk-unicloud-admin-ui@1.19.27`）
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】`万能表格` toggleRowExpansion 方法参数无效的问题
* 【修复】`万能表格` updateRows 方法执行后，表格的滚动条会自动置顶的问题
* 【修复】`万能表单` 只有一个text时，按回车会刷新页面的问题
* 【优化】`万能表单` checkbox radio remote-select table-select 的 props 属性的 list 属性支持写 "a.b"

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.20（2024-10-18）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.22`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】万能表格 type `image`、`file` 属性 `beforeRemove` 不生效的问题
* 【修复】万能表格 type `radio` 在谷歌浏览器运行正常，但控制台会报错的问题
* 【新增】系统错误日志页面 `/pages_plugs/system_uni/vk-error-log`
* 【优化】万能表格 radio和select在单选模式下，新增属性defaultIndex，控制默认选择第几个

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.19（2024-10-17）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.22`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】万能表格 type `image`、`file` 属性 `beforeRemove` 不生效的问题
* 【修复】万能表格 type `radio` 在谷歌浏览器运行正常，但控制台会报错的问题
* 【新增】系统错误日志页面 `/pages_plugs/system_uni/vk-error-log`
* 【优化】万能表格 radio和select在单选模式下，新增属性defaultIndex，控制默认选择第几个

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.18（2024-09-04）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.15`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】万能表格排序取消后的默认排序不正确的问题


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.17（2024-08-27）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.14`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【优化】支付宝云空间在素材管理中的视频封面图的获取


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.16（2024-08-27）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.14`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【优化】支付宝云空间在素材管理中的视频封面图的获取


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.15（2024-08-27）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.14`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【优化】支付宝云空间在素材管理中的视频封面图的获取


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.14（2024-08-20）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.13`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.13（2024-08-20）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.13`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【修复】万能表格导出数据时，字段 type 为 date 时，时间未正确格式化的问题
* 【修复】补全 `1.19.11` 版本 `pages.json` 文件内遗漏的 `vk-ws-connection` 页面

**特别注意：本次更新涉及框架内置文件，请注意合并对比**

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.11（2024-08-12）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.10`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)
* 【重要】新增WebSocket连接管理页面 `/pages_plugs/system_uni/vk-ws-connection.vue`
* 【调整】云函数router默认的node版本调整为node18
* 【修复】group内的元素tips属性不生效的问题
* 【优化】素材选择组件，视频默认缩略图支持扩展存储

**特别注意：本次更新涉及框架内置文件，请注意合并对比**

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.10（2024-07-19）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.8`
* 【升级】`vk依赖` [详情](https://ext.dcloud.net.cn/plugin?id=4157&update_log)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.9（2024-07-17）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.8`
* 【升级】`vk依赖`

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.8（2024-07-03）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.8`
* 【修复】已知问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.7（2024-07-02）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.8`
* 【升级】`vk依赖`

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.6（2024-07-01）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.7`
* 【升级】`vk依赖`

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.5（2024-06-19）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.6`
* 【重要】客户端与云函数支持加密通信 [传送门](https://vkdoc.fsq.pub/client/pages/callFunction.html#encrypt-%E5%8A%A0%E5%AF%86%E9%80%9A%E4%BF%A1)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.4（2024-05-20）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.6`
* 【升级】`vk依赖`

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.3（2024-05-17）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.6`
* 【修复】`万能表格` 详情弹窗内group内的文字大小不一致的问题
* 【优化】`万能表格` 图片展示的样式设置

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
## 1.19.2（2024-04-26）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.0`（阿里云已宣布node8不再维护）
* 【重要】云函数的 node.js 版本统一调整为 node16
* 【重要】新增 vk.getReentrantLockManage 高并发分布式重入锁，主要用于控制云函数或云对象并发访问时的同步，确保同一时间只有一个线程或进程能够拿到锁。 [传送门](https://vkdoc.fsq.pub/client/uniCloud/cloudfunctions/reentrantLock.html)
* 【重要】新增 vk.getCacheManage 缓存管理2.0版本，新版云端数据缓存同时支持空间内置数据库和Redis数据库，用户可以根据需求选择合适的存储方式。 [传送门](https://vkdoc.fsq.pub/client/uniCloud/cache/cache.html)
* 【修复】vk.baseDao.selects 的 treeProps 内的 addFields 不生效的问题
* 【调整】vk.request 的默认时间调整为60秒
* 【优化】内置页面 `角色管理` 赋予权限和菜单的UI

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.19.1（2024-04-24）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.0`
* 【重要】云函数的 node.js 版本统一调整为 node16
* 【重要】新增 vk.getReentrantLockManage 高并发分布式重入锁，主要用于控制云函数或云对象并发访问时的同步，确保同一时间只有一个线程或进程能够拿到锁。 [传送门](https://vkdoc.fsq.pub/client/uniCloud/cloudfunctions/reentrantLock.html)
* 【重要】新增 vk.getCacheManage 缓存管理2.0版本，新版云端数据缓存同时支持空间内置数据库和Redis数据库，用户可以根据需求选择合适的存储方式。 [传送门](https://vkdoc.fsq.pub/client/uniCloud/cache/cache.html)
* 【优化】内置页面 `角色管理` 赋予权限和菜单的UI

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.19.0（2024-03-25）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.19.0`
* 【重要】新增功能更强的富文本组件 `custom-editor-tinymce` [传送门](https://vkdoc.fsq.pub/admin/custom-components/components/custom-editor-tinymce.html)
* 【优化】`万能表单` array 可变数组子表单 `defaultValue` 属性支持函数，且支持sync

**注意**

富文本组件 `custom-editor-tinymce` 需要升级整个admin框架才能正常使用（只升级npm依赖无法使用） [升级整个admin框架教程](https://vkdoc.fsq.pub/admin/1/update.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.18.3（2024-03-14）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.18.5`
* 【修复】万能表单 `table-select` key确保唯一的情况下，部分情况下还会报key重复的问题
* 【优化】万能表格 `vk-data-table-query` 组件新增 reset 事件 [传送门](https://vkdoc.fsq.pub/admin/2/table.html#%E4%B8%87%E8%83%BD%E8%A1%A8%E6%A0%BC%E6%90%9C%E7%B4%A2%E7%BB%84%E4%BB%B6)
* 【优化】万能表格 新增表头插槽 [传送门](https://vkdoc.fsq.pub/admin/2/table.html#%E8%A1%A8%E5%A4%B4%E6%8F%92%E6%A7%BD)
* 【优化】万能表单 属性 `beforeAction` 支持 async
* 【优化】内置页面 `/pages_plugs/system_uni/uni-id-log` 内的 login_type 字段显示规则
* 【优化】万能表单 `remote-select` 和 `cascader` 组件请求接口的触发时机

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.18.2（2024-02-23）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.18.0`
* 【重要】支付宝小程序云支持地理位置查询，需要先创建地理位置索引（HBX版本4.01的alpha版支持本地运行，3.99的正式版只能云端运行）
* 【修复】`vk.baseDao.selects` 执行树形结构查询时，在支付宝小程序云中表现不一致的问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.18.1（2024-02-14）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.18.0`
* 【修复】已知问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.18.0（2024-02-01）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.18.0`
* 【重要】`万能表格` 的分页策略调整（提升查询性能）[传送门](https://vkdoc.fsq.pub/admin/2/table.html#%E5%88%86%E9%A1%B5)
* 【调整】`vk.baseDao.getTableData` 的参数 `getCount` 的默认值为 `true`，但若含有 `lastWhereJson` 或 `lastSortArr` 则默认值为 `false`（兼顾性能和实用性）
* 【调整】`vk.baseDao.selects` 、 `vk.baseDao.getTableData` 将 `addFields` 的执行顺序调整到 `fieldJson` 之前
* 【调整】`万能表格` 搜索组件当有2个字段以上时默认显示重置按钮
* 【优化】`vk.baseDao.select`、`vk.baseDao.selects`、`vk.baseDao.getTableData` 新增返回值 `getCount`，表示是否同时执行了 `count` 请求 [传送门](https://vkdoc.fsq.pub/client/uniCloud/db/selects.html#getcount)
* 【优化】`vk.baseDao.select`、`vk.baseDao.selects`、`vk.baseDao.getTableData` 新增参数 `debug`，传 `true` 会返回执行rows和count的数据库语句执行耗时，单位毫秒，方便优化数据库语句

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.17.7（2024-01-04）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.17.56`
* 【修复】支付宝小程序云环境下，非admin账号左侧菜单不显示二级菜单的问题
* 【优化】前端 `main.js` 移除 `vk.init` 代码（不再需要手动init）

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.17.6（2023-12-27）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.17.55`
* 【重要】`vk.uploadFile` 支持扩展存储-七牛云 [传送门](https://vkdoc.fsq.pub/client/pages/uploadFile.html#%E4%B8%8A%E4%BC%A0%E6%89%A9%E5%B1%95%E5%AD%98%E5%82%A8)
* 【修复】`万能表单` radio 和 checkbox 因 `1.17.4` 更新导致当超出一行后不会自动换行的问题
* 【修复】`万能表单` group 间距样式问题
* 【优化】`万能表单` `file-select` 当分类太多时显示滚动条
* 【优化】`万能表单` `file-select` watch新增返回option属性

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.17.5（2023-11-06）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.17.50`
* 【修复】`万能表单` 文件上传组件按钮太长样式错误的问题
* 【优化】`万能表格` 默认排序字段不在columns中时增加报错提示


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.17.4（2023-10-27）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.17.46`
* 【修复】用户管理-添加用户时uni-id的配置autoSetInviteCode无效的问题
* 【优化】`万能表单` radio 新增direction属性，支持设置竖向排列


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。

## 1.17.3（2023-09-25）
* 【升级】`vk-unicloud-admin-ui` 包升级至 `1.17.45`
* 【调整】`万能表单` `vk-data-input-editor` 组件的js依赖内置到项目里，防止因quill官方CDN无法访问导致editor组件渲染失败的问题
* 【修复】`万能表单` 部分复杂情况下表单验证未生效的问题 
* 【修复】`万能表格` `object` 内 `oneLine:true` 不生效的bug
* 【修复】`万能表单` `object` 内 `disabled` 不生效的bug
* 【修复】`万能表格` `:searched-clean-selection="false"` 时，分页会导致多选框清空的问题
* 【修复】`万能表格` 点击右侧按钮时可能会出现请先选中一行的bug
* 【优化】`pages_plugs/system_uni/vk-pay-orders.vue`页面新增支付渠道区分
* 【优化】`万能表格` 导出的文件名支持自定义扩展名
* 【优化】`万能表格` 新增 `getRowIndex` 方法

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.17.2（2023-07-20）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.17.17`
* 2、【调整】`万能表单` 支持 `object` 新增 `showErrMsg` 属性，默认 `false`，如果设置为 `true`，会多个 `margin-bottom: 22px;` 的样式
* 3、【修复】`万能表单` `tag` 不触发 `watch` 的问题
* 4、【优化】`万能表单` `table-select`、`remote-select`、`cascader`、`tree-select`、`checkbox`、`radio` 的 `action` 属性均支持传函数（自定义function请求模式）[传送门](https://vkdoc.fsq.pub/admin/components/12%E3%80%81table-select.html#%E8%87%AA%E5%AE%9A%E4%B9%89function%E8%AF%B7%E6%B1%82%E6%A8%A1%E5%BC%8F)
* 5、【优化】`万能表单` `上传组件` 支持拖拽排序
* 6、【优化】`万能表单` 新增 `needAlert` 属性，设置false则取消默认的错误弹窗
* 7、【优化】`万能表单` `object` 支持 `bar-title`
* 8、【优化】`万能表单` `color` 支持 `activeChange` 事件

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.17.0（2023-07-04）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.17.0`
* 2、【重要】`万能表格` 的 `action` 属性支持传函数 [传送门 - 自定义function请求模式](https://vkdoc.fsq.pub/admin/2/table.html#%E8%87%AA%E5%AE%9A%E4%B9%89function%E8%AF%B7%E6%B1%82%E6%A8%A1%E5%BC%8F)
* 3、【重要】`万能表单` 的 `action` 属性支持传函数 [传送门 - 自定义function请求模式](https://vkdoc.fsq.pub/admin/3/form.html#%E8%87%AA%E5%AE%9A%E4%B9%89function%E8%AF%B7%E6%B1%82%E6%A8%A1%E5%BC%8F)
* 4、【修复】`万能表单` `group + object` 会报错的问题
* 5、【修复】`万能表单` `group` 内的组件 `disabled` 函数和字符串表达式不生效的问题
* 6、【修复】`万能表格` `group` 内的 `object` 的 `showLabel` 属性不生效的问题
* 7、【修复】`万能表格` `this.$refs.table1.updateRows` 执行后再次点击编辑会报错的问题
* 8、【优化】`万能表单` `tag` 组件支持 `max` 属性
* 9、【优化】`万能表单` `上传组件` 支持属性 `cloudDirectory` 可以设置上传至指定的云端目录 
* 10、【优化】`万能表单` `file-select` 支持预览非图片和视频的文件（无法预览的会触发下载）


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。

## 1.16.2（2023-06-01）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.16.15`
* 2、【修复】`缓存管理` 页面添加缓存后，`vk.globalDataCache.get(key);` 无法获取到数据的问题（需要手动替换目录`router/service/admin/system_uni/global-data/`）
* 3、【优化】`素材管理` 上传素材时的进度条样式
* 4、【优化】`万能表格` 新增 `needAlert` 属性，设为false可以取消默认的错误弹窗（默认为true）


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.16.1（2023-05-17）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.16.9`
* 2、【优化】`万能表格` 右侧按钮支持属性 icon、plain、round、circle、loading
* 3、【优化】其他细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。

## 1.16.0（2023-04-23）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.16.0`
* 2、【升级】`element-ui` 包升级至 `2.15.13`
* 3、【修复】`table-select` 在多选模式下，控制台可能会报 `Cannot read properties of undefined(reading 'length')` 警告的问题。
* 4、【优化】`topWindow` 支持显示正方形logo+文本（暂无开关，需手动切换注释）
* 5、【优化】`万能表单` `素材选择组件` 多选时显示文件顺序
* 6、【优化】`万能表单` `富文本` 支持从素材库选择图片
* 7、【优化】`素材管理` 批量上传时显示上传进度
* 8、【优化】角色管理页面细节
* 9、【优化】菜单管理页面细节
* 10、【优化】权限管理页面细节
* 11、【新增】内置支付订单明细页面（支持回调失败后重试）

**注意：本次更新涉及内置页面改动，请仔细比对**

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架
##### 如果你觉得框架对你有用，可以在下方进行评论或赞赏。
## 1.15.12（2023-03-20）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.15.25`
* 2、【优化】`万能表单` `array<string>` `array<number>` 新增属性 `showDelete` 控制是否显示右侧删除图标


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.15.11（2023-01-19）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.15.23`
* 2、【调整】router云函数运行内存调整为512M（实测512M即可达到最优性能）
* 3、【修复】`万能表单` object内的字段disabled不生效的问题。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.15.10（2022-12-29）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.15.19`
* 2、【优化】兼容阿里云新版

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.15.9（2022-12-13）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.15.14`
* 2、【优化】leftWindow，左侧菜单支持自定义默认图标（可设置为默认不显示图标）

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.15.8（2022-11-24）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.15.8`
* 2、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.15.1（2022-10-25）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.15.5`
* 2、【优化】`万能表单` 的 `图标选择` 选择时，支持搜索
* 3、【优化】因 `1.15.0` 导致的表格卡顿问题。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.15.0（2022-10-10）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.15.2`
* 2、【重要】应用管理内置 `生成统一发布页` [传送门 - 应用管理](https://vkdoc.fsq.pub/admin/6/app.html)
* 3、【重要】新增自定义图标库 [传送门 - 拓展教程](https://vkdoc.fsq.pub/admin/components2/1%E3%80%81vk-data-icon.html#%E5%A6%82%E4%BD%95%E6%89%A9%E5%B1%95%E5%9B%BE%E6%A0%87%E5%BA%93)
* 4、【优化】`万能表单` 图标选择组件支持图标过滤 [传送门 - 组件文档](https://vkdoc.fsq.pub/admin/components/26%E3%80%81icon.html#filter)
* 5、【新增】`万能表格` 支持视频预览，设置 `type` 为 `file` 即可

**本次更新除了常规升级框架外，还需要下载最新版框架示例项目，从最新版中复制 以下文件 替换 你项目中的对应文件。**

* 1、`router/service/admin/system/app/`（替换整个目录）
* 2、`根目录/pages_plugs/system/app/`（替换整个目录）

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.14.4（2022-10-07）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.14.4`
* 2、【优化】`万能表单` 针对 `type` 为 `object` 且多层嵌套时的内部细节处理优化。（现在可以无限嵌套）

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.14.3（2022-10-07）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.14.2`
* 2、【优化】更新依赖

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.14.2（2022-09-29）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.14.2`
* 2、【修复】升级HBX后带来的部分兼容性问题。
* 3、【优化】`部分组件` 的 `placeholder` 可能不生效的问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.14.1（2022-09-13）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.14.1`
* 2、【优化】`vk-data-input-cascader`、`vk-data-input-checkbox`、`vk-data-input-radio`、`vk-data-input-remote-select`、`vk-data-input-tree-select` 组件均支持 `http方式请求数据`（用法与 `vk-data-input-table-select` 一致）
如：
```js
{
	key:"select1", title:"远程select", type:"remote-select",
	showAll: true,
	isRequest: true,
	//requestHeader: {}, // 请求头
	action: "https://www.xxx.com",
	props: { list: "rows", value: "id", label: "name" },
},
```
* 3、【优化】`用户管理`、`角色管理`、`权限管理`、`菜单管理` 的内部细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.14.0（2022-09-12）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.14.0`
* 2、【重要】`vk-admin` 内置 `App升级中心`（新增 `opendb-app-versions` 表）[传送门](https://vkdoc.fsq.pub/admin/6/app-upgrade-center.html)
* 3、【重要】`应用管理` 重构（对齐官方 `opendb-app-list` 表）[传送门](https://vkdoc.fsq.pub/admin/6/app.html)

**可以右键项目根目录的 `package.json` 一键更新（注意对比自己修改过的文件）**
 
**以下是手动改更新步骤，本次改动涉及到的框架内置文件变动**

* pages_plugs/system/app/ （替换整个目录）
* pages_plugs/system/app-upgrade-center/ （替换整个目录）
* cloudfunctions/router/service/admin/system/app/ （替换整个目录）
* cloudfunctions/router/service/admin/system/app-upgrade-center/ （替换整个目录）

**添加菜单**

进入 `vk-admin` 菜单管理，点击【通过JSON数组批量导入菜单】粘贴下方json数组 导入

```js
[{"_id": "sys-app-upgrade-center","_add_time": 1596416400000,"menu_id":"sys-app-upgrade-center","name": "App升级中心","icon":"vk-icon-shengji3-xianxing","url": "/pages_plugs/system/app-upgrade-center/list","comment":"管理和发布新的app版本","sort": 6,"parent_id":"sys-admin","enable":true}]
```

**添加pages.json内的页面**

```js
{ "path": "system/app-upgrade-center/list" },
```

**完成上述步骤后，进入应用管理->编辑->开启App升级中心->即可进入版本管理。**

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.13.2（2022-08-30）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.13.6`
* 2、【优化】`万能表格` 的合计功能支持指定精度（默认2位小数）[传送门](https://vkdoc.fsq.pub/admin/2/table.html?t=20220826#%E4%B8%87%E8%83%BD%E8%A1%A8%E6%A0%BC%E5%90%88%E8%AE%A1%E5%88%97%E7%9A%84%E7%A4%BA%E4%BE%8B)
* 3、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.13.1（2022-08-20）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.13.1`
* 2、【优化】左侧菜单的最大层级支持自定义，需替换 `router/service/user/kh/getMenu.js` 文件，同时 `uni_modules/vk-unicloud` 模块更新到最新版
* 2、【优化】菜单管理的最大层级支持自定义，需替换 `router/service/admin/system/menu/sys/getAll.js` 文件

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.13.0（2022-08-17）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.13.1`
* 2、【优化】`万能表单` `数值类型` 的输入组件当值为""空字符串时，可通过设置 `emptyValue` 属性更改空值转化的值（默认为null）

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.12.10（2022-08-15）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.45`
* 2、【修复】`万能表单` `table-select` 组件若设置http请求模式后，init方法不走http请求的bug
* 3、【修复】`万能表单` `数值类型` 的输入组件直接在 `template` 使用时，值为0时不显示值的bug
* 4、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.12.9（2022-08-15）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.43`
* 2、【修复】`万能表单` `table-select` 组件若设置http请求模式后，init方法不走http请求的bug
* 3、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.12.8（2022-08-13）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.42`
* 2、【优化】表格搜索组件新增 `data` 和 `time` 组件（原先只有范围选择，现在支持单个日期的选择）（属性与万能表单一致）
* 3、【优化】一些细节
##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.12.7（2022-07-30）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.36`
* 2、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.12.6（2022-07-25）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.35`
* 2、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.12.5（2022-07-23）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.35`
* 2、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.12.4（2022-07-23）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.32`
* 2、【优化】一些细节


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.12.3（2022-07-21）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.29`
* 2、【修复】`vk-data-upload` 组件 `before-upload` 属性没有接收到 `file` 参数的问题。
* 3、【优化】`数字类型` 输入框的交互体验
* 4、【优化】`icon` 组件文档新增icon预览 [传送门](https://vkdoc.fsq.pub/admin/components/26%E3%80%81icon.html#%E5%9B%BE%E6%A0%87%E5%88%97%E8%A1%A8)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.12.2（2022-07-20）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.21`
* 2、【优化】`万能表单` 的 `array<object>` 支持内嵌 `array<object>`，用以渲染对象数组字段内还有对象数组字段的数据形式。（理论上可以无限嵌套） [传送门](https://vkdoc.fsq.pub/admin/components/24%E3%80%81array.html#array%E5%B5%8C%E5%A5%97array)
* 3、【优化】`万能表单` 的 `array<object>` 新增属性 `incMode`（可规定每行数据必须递增或递减）[传送门](https://vkdoc.fsq.pub/admin/components/24%E3%80%81array.html#incmode)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.12.1（2022-07-09）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.0`
* 2、【更新】省市区数据源
* 3、【新增】`vk-data-input-tag` 组件 [传送门](https://vkdoc.fsq.pub/admin/components/29%E3%80%81tag.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.12.0（2022-07-09）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.12.0`
* 2、【更新】省市区数据源
* 3、【新增】`vk-data-input-tag` 组件 [传送门](https://vkdoc.fsq.pub/admin/components/29%E3%80%81tag.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.11.7（2022-07-05）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.11.22`
* 2、【优化】`万能表单` `remote-select` 组件 当设置 `showAll:true` 时，新增 `刷新选项按钮`（方便数据库数据变动后手动刷新选项）[传送门](https://vkdoc.fsq.pub/admin/components/10%E3%80%81remote-select.html)
![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/06e4bb4b-da42-46d8-83e2-a6a99618bdd5.png)
* 3、【优化】`万能表格` `switch` 组件 支持直接在表格行内编辑 [传送门](https://vkdoc.fsq.pub/admin/components/14%E3%80%81switch.html#%E8%A1%A8%E6%A0%BC%E8%A1%8C%E5%86%85%E5%8A%A8%E6%80%81%E7%BC%96%E8%BE%91%E6%A8%A1%E5%BC%8F)
* 4、【优化】`万能表格` `buttons`（字段扩展按钮列表）新增对应参数 `buttonsPosition` 默认为right（支持 left right bottom top）[传送门](https://vkdoc.fsq.pub/admin/2/table.html#buttons-%E5%AD%97%E6%AE%B5%E6%89%A9%E5%B1%95%E6%8C%89%E9%92%AE%E5%88%97%E8%A1%A8)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.11.6（2022-07-01）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.11.9`
* 2、【优化】`万能表单` 的 `tips` 属性支持解析 `html字符串` 和 `对象数组` [查看详情](https://vkdoc.fsq.pub/admin/3/form.html#tips-%E4%B8%8B%E6%96%B9%E7%9A%84%E5%9B%BA%E5%AE%9A%E6%8F%90%E7%A4%BA)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.11.5（2022-06-25）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.11.6`
* 2、【优化】一些细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.11.4（2022-06-18）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.11.6`
* 2、【新增】万能表单公共属性 `watch` 用于监听key对应的值的改变（只监听组件内部造成的值的改变）`watch` 是 `onChange` 的上位替代 [点击查看](https://vkdoc.fsq.pub/admin/3/form.html#watch-%E7%9B%91%E5%90%AC)
* 3、【修复】万能表单公共属性 `disabled` 数组模式不生效的bug

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.11.3（2022-06-16）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.11.4`
* 2、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.11.2（2022-06-16）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.11.4`
* 2、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.11.1（2022-06-15）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.11.4`
* 2、【优化】一些细节
##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.11.0（2022-06-10）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.11.4`
* 2、【新增】`左侧菜单` 支持折叠模式
![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/4d823e27-bfb8-4b0f-9387-b22e72d29389.png)

**由于改动涉及框架文件较多，建议直接更新框架项目（如果你改动了框架内置的部分代码，你改动过的代码可能会被还原，因此如果你改动过框架内置代码，合并的时候，可以先看下改动的文件。）**

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.10.6（2022-06-09）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.10.13`
* 2、【优化】一些细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.10.5（2022-06-02）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.10.10`
* 2、【优化】`万能表单` `table-select` 组件支持对已选择的数据进行求和。如下图效果所示。[点击查看](https://vkdoc.fsq.pub/admin/components/12%E3%80%81table-select.html#summarykey-%E6%B1%82%E5%92%8C)

![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/cd2a4240-a665-4209-bd82-75ba1870e95a.png)

* 3、【优化】`万能表单` `file-select` 组件新增属性 `upload`（是否允许上传，默认true） `updateCategory` （是否允许编辑分类，默认true）[点击查看](https://vkdoc.fsq.pub/admin/components/25%E3%80%81file-select.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.10.4（2022-05-26）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.10.7`
* 2、【优化】`vk.baseDao.selects` 和 `vk.baseDao.getTableData` API新增 `lastSortArr` 参数，用于聚合后再排序。
* 注意：`lastWhereJson` 和 `lastSortArr` 在数据量大的情况下是有性能问题的，（建议主表的where条件中先进行筛选，如只查本季度数据，只要主表过滤完后数据量不大，则没有性能问题。）
* 3、【修复】`lastWhereJson` 后，返回的 `total` 不准确的问题。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.10.3（2022-05-25）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.10.6`
* 2、【优化】应用管理页面，当前项目未添加时，进行友情提醒。
* 3、【优化】其他细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.10.2（2022-05-18）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.10.4`
* 2、【优化】`万能表单` 内公共属性 `disabled` 额外支持函数形式和字符串简写形式（和showRule写法一致）[查看详情](https://vkdoc.fsq.pub/admin/3/form.html#disabled)
* 3、【优化】`万能表格` 右侧按钮宽度计算内部算法。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.10.1（2022-05-14）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.10.2`
* 2、【优化】`万能表格` 的导出功能内部逻辑
* 3、【优化】`万能表单` 上传组件的内部逻辑

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.10.0（2022-05-13）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.10.0`
* 2、【新增】`万能表格` 右侧按钮区 `right-btns`、`right-btns-more`、`custom-right-btns` 升级显示规则，可自定义根据行记录设置按钮是否显示或禁用 [点击查看](https://vkdoc.fsq.pub/admin/2/table.html#right-btns-%E5%8F%B3%E4%BE%A7%E5%9B%BA%E5%AE%9A%E6%8C%89%E9%92%AE%E5%88%97%E8%A1%A8)
* 3、【新增】`万能表格` 属性 `right-btns-align` 控制右侧按钮的对齐方式，默认center（可选: center left right） [点击查看](https://vkdoc.fsq.pub/admin/2/table.html#%E5%B1%9E%E6%80%A7)
* 4、【优化】其他细节 

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.9.6（2022-05-05）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.9.15`
* 2、【重要】vk实例对象已调整为页面内置对象，vk实例对象内的api在任意地方都可以直接通过vk.xxx()使用，不再需要 this.vk.xxx() 或 uni.vk.xxx() 的方式来调用。
* 3、【重要】vk实例对象已调整为云函数内置对象，vk实例对象内的api在任意地方都可以直接通过vk.xxx()使用，不再需要 this.vk.xxx() 或 uniCloud.vk.xxx() 的方式来调用。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.9.5（2022-04-28）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.9.14`
* 2、【优化】`万能表单` 中的表格选择组件细节。
* 3、【修复】`万能表格` 中的图片可能会不显示的问题。


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.9.4（2022-04-21）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.9.12`
* 2、【重要】`uni-id` 配置新增 `tokenMaxLimit` 每个账户的最大token数量，0为不限，淘汰策略：新的淘汰旧的（注意，即使设置为0，框架也会自动淘汰已过期的token）[点击查看](https://vkdoc.fsq.pub/client/uniCloud/config/uni-id.html)
* 3、【新增】全局参数 `targetTimezone` 可设置默认时区（中国为8，8代表东8区，-8代表西8区）

> [查看前端全局配置](https://vkdoc.fsq.pub/client/pages/config.html) 

> [查看云函数全局配置](https://vkdoc.fsq.pub/client/uniCloud/config/vk-unicloud.html)

**本次更新除了常规升级框架外，还需要下载最新版框架示例项目，从最新版中复制 以下文件 替换 你项目中的对应文件。**

* 1、`router/middleware/modules/returnUserInfoFilter.js` （此为用户登录注册全局中间件）

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.9.3（2022-04-21）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.9.12`
* 2、【重要】`uni-id` 配置新增 `tokenMaxLimit` 每个账户的最大token数量，0为不限，淘汰策略：新的淘汰旧的（注意，即使设置为0，框架也会自动淘汰已过期的token）[点击查看](https://vkdoc.fsq.pub/client/uniCloud/config/uni-id.html)
* 3、【新增】全局参数 `targetTimezone` 可设置默认时区（中国为8，8代表东8区，-8代表西8区）

> [查看前端全局配置](https://vkdoc.fsq.pub/client/pages/config.html) 

> [查看云函数全局配置](https://vkdoc.fsq.pub/client/uniCloud/config/vk-unicloud.html)

**本次更新除了常规升级框架外，还需要下载最新版框架示例项目，从最新版中复制 以下文件 替换 你项目中的对应文件。**

* 1、`router/middleware/modules/returnUserInfoFilter.js` （此为用户登录注册全局中间件）

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.9.2（2022-04-14）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.9.11`
* 2、【重要】新增 `云对象` 路由模式 [什么是云对象？](https://vkdoc.fsq.pub/client/uniCloud/cloudfunctions/cloudObject.html)
* 3、【重要】自此，在VK框架中，可以做到云对象和云函数同时存在。即在VK框架中，同时支持 `云对象路由模式` 和 `云函数路由模式`。
* 4、【新增】本地运行支持云对象 [点击查看](https://vkdoc.fsq.pub/client/uniCloud/cloudfunctions/cloudObject.html#%E6%9C%AC%E5%9C%B0%E8%BF%90%E8%A1%8C)
* 5、【新增】地图选址组件 `type = "map"` [点击查看](https://vkdoc.fsq.pub/admin/components/28%E3%80%81map.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.9.1（2022-03-23）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.9.8`
* 2、【优化】`万能表格` 行内图片支持预览
* 3、【优化】`万能表格` 新增本地数据过滤器，同elementui的 `filters` [查看详情](https://vkdoc.fsq.pub/admin/2/table.html#filter-%E6%9C%AC%E5%9C%B0%E6%95%B0%E6%8D%AE%E8%BF%87%E6%BB%A4%E5%99%A8)
* 4、【修复】`万能表格` 导出表格时，若值为0，会导出为空字符串的问题。
* 5、【修复】`万能表格` 导出表格时，字段 `type` 为 `time` 时 `valueFormat` 属性无效的问题。
* 6、【修复】`万能表格` `radio` `checkbox` `select` 的选项数据data不支持函数计算的问题。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.9.0（2022-02-26）
###【重要】由于uni官方限制自定义表不可以用 `opendb-` 和 `uni-` 开头，故以下数据库表名只能进行调整

* 1、`opendb-components-dynamic` 改为 `vk-components-dynamic`
* 2、`opendb-global-data` 改为 `vk-global-data`
* 3、`uni-id-files` 改为 `vk-files`
* 4、`uni-id-files-categories` 改为 `vk-files-categories`

___更改表名势必会对老项目产生影响。（对新项目无影响）___

### 老项目更新注意事项：
* 1、老项目更新后，还需要从 `unicloud控制台` 把表名改成对应的新表名
* 2、在项目代码中全局搜索旧表名，替换成新表名

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.13（2022-02-24）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.36`
* 2、【新增】`addAdminLog` 中间件示例。
* 3、【修复】`vk-data-input-editor` 组件通过外部赋值无法达到双向绑定的问题。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.12（2022-02-10）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.27`
* 2、【优化】一些细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.11（2022-01-20）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.26`
* 2、【优化】一些细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.10（2021-12-24）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.24`
* 2、【修复】`万能表单` 的 `树形选择` 搜索可能会报错的bug。 
* 3、【优化】一些细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.9（2021-12-20）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.23`
* 2、【修复】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.8（2021-12-19）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.22`
* 2、【新增】`万能表格` 新增 `pagination-change` 事件 （主要用于手动模式分页）[点击查看](https://vkdoc.fsq.pub/admin/2/table.html#%E4%BA%8B%E4%BB%B6)
* 3、【修复】`万能表格` type 为 `money` 、`percentage` 、`discount` 时，部分情况下，默认值不生效的问题。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.7（2021-12-13）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.15`
* 2、【重要】`万能表格` `columns` 内 `buttons` 属性新增 `showRule` 属性（用于实现根据行记录显示不同按钮） [点击查看](https://vkdoc.fsq.pub/admin/2/table.html#buttons-%E5%AD%97%E6%AE%B5%E6%89%A9%E5%B1%95%E6%8C%89%E9%92%AE%E5%88%97%E8%A1%A8)
* 3、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.6（2021-12-11）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.9`
* 2、【重要】`万能表格` `columns` 内新增 `buttons` 属性（扩展按钮列表，可实现快速修改这1个字段的功能）[点击查看](https://vkdoc.fsq.pub/admin/2/table.html#buttons-%E5%AD%97%E6%AE%B5%E6%89%A9%E5%B1%95%E6%8C%89%E9%92%AE%E5%88%97%E8%A1%A8)
* 3、【优化】`万能表格` 合计功能的简单模式支持金额 [点击查看](https://vkdoc.fsq.pub/admin/2/table.html#%E7%AE%80%E5%8D%95%E6%A8%A1%E5%BC%8F)
* 4、【优化】`万能表单` `cascader` 组件支持 `actionData` [点击查看](https://vkdoc.fsq.pub/admin/components/11%E3%80%81cascader.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.5（2021-12-08）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.7`
* 2、【优化】上传api的url自动去除原文件名的中文部分。
* 3、【优化】`tree-select` 树形选择组件 [点击查看](https://vkdoc.fsq.pub/admin/components/27%E3%80%81tree-select.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.4（2021-12-08）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.7`
* 2、【优化】上传api的url自动去除原文件名的中文部分。
* 3、【优化】`tree-select` 树形选择组件 [点击查看](https://vkdoc.fsq.pub/admin/components/27%E3%80%81tree-select.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.3（2021-12-04）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.5`
* 2、【优化】一些细节
* 
##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.2（2021-12-01）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.5`
* 2、【升级】`element-ui` 包升级至 `2.15.7`
* 3、【新增】自 `1.8.0` 起，支持自定义主题，内置纯白、纯黑、黑白3个主题，同时支持编写自定义主题。[点击查看主题说明](https://vkdoc.fsq.pub/admin/1/theme.html)
* 4、【优化】主题细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.1（2021-12-01）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.2`
* 2、【升级】`element-ui` 包升级至 `2.15.7`
* 3、【新增】自 `1.8.0` 起，支持自定义主题，内置纯白、纯黑、黑白3个主题，同时支持编写自定义主题。[点击查看主题说明](https://vkdoc.fsq.pub/admin/1/theme.html)
* 4、【优化】主题细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.8.0（2021-11-30）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.8.1`
* 2、【新增】自 `1.8.0` 起，支持自定义主题，内置纯白、纯黑、黑白3个主题，同时支持编写自定义主题。[点击查看主题说明](https://vkdoc.fsq.pub/admin/1/theme.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.7.4（2021-11-13）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.7.7`
* 2、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.7.3（2021-11-09）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.7.6`
* 2、【优化】`万能表单` `radio` `checkbox` `select` `cascader` `tree-select` 的 `data` 静态模式数据源 支持 `function` 模式 [点击查看](https://vkdoc.fsq.pub/admin/components/9%E3%80%81select.html#%E9%9D%99%E6%80%81%E6%95%B0%E6%8D%AE%E6%96%B9%E5%BC%8F2)
* 3、【修复】`万能表单` `tree-select` 点击清除按钮可能会报错的问题。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.7.2（2021-11-02）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.7.4`
* 2、【优化】美化默认滚动条样式 [点击查看](https://vkdoc.fsq.pub/admin/question/question.html#%E5%A6%82%E4%BD%95%E7%BE%8E%E5%8C%96%E9%BB%98%E8%AE%A4%E6%BB%9A%E5%8A%A8%E6%9D%A1)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.7.1（2021-10-26）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.7.3`
* 2、【重要】`万能表格` 支持导出数据库内所有数据 [点击查看](https://vkdoc.fsq.pub/admin/2/table.html#%E5%AF%BC%E5%87%BA%E6%BB%A1%E8%B6%B3%E8%A1%A8%E6%A0%BC%E6%9F%A5%E8%AF%A2%E6%9D%A1%E4%BB%B6%E7%9A%84%E6%95%B0%E6%8D%AE%E5%BA%93%E5%86%85%E6%89%80%E6%9C%89%E6%95%B0%E6%8D%AE)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.7.0（2021-10-22）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.7.2`
* 2、【重要】万能表单每个字段的 `showRule` 属性支持 `函数`（现在可以用自定义函数来控制表单字段的显示和隐藏）[点击查看](https://vkdoc.fsq.pub/admin/3/form.html#show)
* 3、【重要】万能表单 新增组件 图标选择组件 type: `icon` [点击查看](https://vkdoc.fsq.pub/admin/components/26%E3%80%81icon.html)
* 4、【重要】万能表单 新增组件 树型选择组件 type: `tree-select` [点击查看](https://vkdoc.fsq.pub/admin/components/27%E3%80%81tree-select.html)
* 5、【优化】菜单管理和权限管理页面应用 `icon` 和 `tree-select` 组件。
* 6、【优化】菜单管理和权限管理在修改时，禁止设置自己为自己的父级。（替换 `admin/system/menu/sys/update` 和 `admin/system/permission/sys/update`）
* 7、【优化】`windows/topWindow.vue` 页面逻辑（替换页面代码），现在可以通过调用 `vk.menuTabs.closeCurrent();` 关闭当前tabs页面 [点击查看](https://vkdoc.fsq.pub/admin/question/question.html#%E5%A6%82%E4%BD%95%E5%85%B3%E9%97%AD%E5%BD%93%E5%89%8D%E6%89%93%E5%BC%80%E7%9A%84tabs%E9%A1%B5%E9%9D%A2)
* 8、【优化】表单示例组件中的关闭按钮
* 9、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.9（2021-10-14）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.39`
* 2、【优化】`富文本编辑器` 现在无需使用插槽的形式（需要在 `main.js` 中 `Vue.use(vkAdminUI);` 的下方添加如下代码） [点击查看](https://vkdoc.fsq.pub/admin/components/22%E3%80%81editor.html)
```js
// 引入 富文本编辑器 组件（必须加在Vue.use(vkAdminUI);的后面）
import VkDataInputEditor from "@/components/vk-data-input-editor/vk-data-input-editor";
Vue.component("vk-data-input-editor", VkDataInputEditor);
```

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.8（2021-10-11）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.34`
* 2、【优化】`App.vue` 内的 `init` 逻辑（可以有效解决首次进入首页再返回登录页面的显示问题）
* 3、【修复】`万能表单` 时间选择组件 `pickerOptions` 参数不生效的问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.7（2021-10-08）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.31`
* 2、【优化】`万能表单` `table-select` 新增属性 `dataPreprocess`
* 3、【优化】`万能表单` `table-select` 内部缓存逻辑
* 4、【优化】`万能表单` `array<object>` 新增属性 `size` 可选值：medium / small / mini

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.6（2021-10-07）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.28`
* 2、【新增】`万能表格` 新增 `type` ： `dateDiff2` 计算出还剩多少时间到期。
```js
{ key:"exp_time", title:"到期剩", type:"dateDiff2", endText:"已到期", width:80, defaultValue: "永久", sortable:"custom" },
```
* 3、【优化】`万能表格` `avatar` 新增属性 `shape` 默认为 `circle` circle 圆形 square 方形
* 4、【优化】其他细节
  
##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.5（2021-09-30）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.13`
* 2、【优化】`万能表格` 查询接口支持异常重试机制（可有效解决阿里云空间偶尔出现数据库连接超时导致异常的问题）[点击查看](https://vkdoc.fsq.pub/admin/2/table.html#%E5%BC%82%E5%B8%B8%E9%87%8D%E8%AF%95%E6%9C%BA%E5%88%B6)
* `万能表单` 暂无计划支持异常重试机制（因为阿里云虽然前端会报超时（执行10秒后），但云函数其实可能还在运行，所以此时重试机制可能会造成表单重复提交多次）
* 3、【优化】其他一些细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.4（2021-09-30）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.13`
* 2、【优化】`万能表格` 查询接口支持异常重试机制（可有效解决阿里云空间偶尔出现数据库连接超时导致异常的问题）
* `万能表单` 暂无计划支持异常重试机制（因为阿里云虽然前端会报超时（执行10秒后），但云函数其实可能还在运行，所以此时重试机制可能会造成表单重复提交多次）
* 3、【优化】其他一些细节。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.3（2021-09-27）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.10`
* 2、【优化】`万能表单` 新增属性 `success-msg` 可以设置表单提交成功后右上角的提示
* 3、【优化】`table-select` 的查询action支持http请求（传统后端请求）[点击查看](https://vkdoc.fsq.pub/admin/components/12%E3%80%81table-select.html#http%E8%AF%B7%E6%B1%82%E6%A8%A1%E5%BC%8F)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.2（2021-09-18）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.7`
* 2、【升级】`element-ui` 包升级至 `2.15.6` [点击查看](https://element.eleme.cn/#/zh-CN/component/changelog)
* 3、【优化】`vk-data-dialog` + `万能表单` 触发 `before-close` 的逻辑。
* 4、【优化】`vk-data-drawer` + `万能表单` 触发 `before-close` 的逻辑。


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.1（2021-09-17）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.6`
* 2、【优化】`万能表单` `array` 新增 `maxlength` 属性，控制最大可添加的数量 [点击查看文档](https://vkdoc.fsq.pub/admin/components/24%E3%80%81array.html)
* 3、【优化】`万能表单` `array<object>` 新增 `maxlength` 属性，控制最大可添加的数量 [点击查看文档](https://vkdoc.fsq.pub/admin/components/24%E3%80%81array.html)


##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.6.0（2021-09-17）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.6.1`
* 2、【优化】`万能表格` 新增 `leftFixed` 和 `rightFixed` 属性，默认均为true，当为false时，可以取消列固定。
* 3、【优化】`table-select` 新增 `leftFixed` 和 `rightFixed` 属性，默认均为true，当为false时，可以取消列固定。
* 4、【优化】`array<object>` 新增 `leftFixed` 和 `rightFixed` 属性，默认均为true，当为false时，可以取消列固定。
* 5、【修复】`vk-data-dialog` 无法正常触发 `before-close` 的问题
* 6、【修复】`vk-data-drawer` 无法正常触发 `before-close` 的问题

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.17（2021-09-16）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.30`
* 2、【优化】一些细节

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.16（2021-09-15）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.29`
* 2、【优化】`万能表格` 在弹窗模式下，行高自适应逻辑。
* 3、【优化】`万能表单` `table-select` 行高自适应逻辑。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.15（2021-09-14）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.27`
* 2、【优化】当页面中有多个 `万能表格` 组件时，表格高度可能无法正常自适应的问题。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.14（2021-09-13）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.23`
* 2、【优化】补全内置的3个组件（icon、dialog、link）文档 [点击查看](https://vkdoc.fsq.pub/admin/components2/1%E3%80%81vk-data-icon.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.13（2021-09-13）
* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.23`
* 2、【修复】`素材管理` 上传图片后有概率无法及时回显的bug。（需同时更新uni_modules/vk-unicloud） [点击查看](https://vkdoc.fsq.pub/admin/components/25%E3%80%81file-select.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.12（2021-09-05）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.21`
* 2、【修复】因`1.5.11`更新造成的`db_init.json`数据格式错误，导致权限管理页面无法正常打开的问题。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.11（2021-09-04）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.21`
* 2、【优化】`万能表格` `tag` 类型渲染支持 数组形式（渲染标签组），同时新增effect：dark / light / plain 3选1

```js
{ 
  key:"xxxxx", title:"身份类型", type:"tag", width:200,
  effect:"light",
  data:[
    { value:"region", label:"区域代理" },
    { value:"shareholder", label:"商城股东", tagType:"danger" }
  ]
}
```

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.10（2021-09-01）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 【修复】`素材管理` 上传图片后有概率无法及时回显的bug。（需同时更新uni_modules/vk-unicloud） [点击查看](https://vkdoc.fsq.pub/admin/components/25%E3%80%81file-select.html)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.9（2021-09-01）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.19`
* 2、【优化】`database`内的初始化文件
* 3、【优化】`菜单管理`中菜单标识长度修改为2-40个字符。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.8（2021-08-31）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.19`
* 2、【新增】配置`vk.db.unicloud.getTableData.sortArr`，可以设置`vk.baseDao.getTableData`全局默认排序规则
* 3、【修复】`万能表单`中 `money`、`number`、`percentage`、`discount` 的 `onChange` 返回的值不是数值类型的bug。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.7（2021-08-28）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.18`
* 2、【优化】`用户管理` 需自行替换新版文件 /pages_plugs/system/user/list
* 3、【优化】`应用管理` 需自行替换新版文件 /pages_plugs/system/app/list
* 4、【优化】`万能表单` `cascader` 组件支持 `onChange` [点击查看](https://vkdoc.fsq.pub/admin/components/11%E3%80%81cascader.html#onchange-%E4%BD%BF%E7%94%A8%E7%A4%BA%E4%BE%8B)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.6（2021-08-28）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.18`
* 2、【优化】`用户管理` 需自行替换新版文件 /pages_plugs/system/user/list
* 3、【优化】`应用管理` 需自行替换新版文件 /pages_plugs/system/app/list
* 4、【优化】`万能表单` `cascader` 组件支持 `onChange` [点击查看](https://vkdoc.fsq.pub/admin/components/11%E3%80%81cascader.html#onchange-%E4%BD%BF%E7%94%A8%E7%A4%BA%E4%BE%8B)

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.5（2021-08-28）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.16`
* 2、【修复】万能表格前端`queryForm1.sortRule`（排序）不生效的bug。

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.4（2021-08-26）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.13`
* 2、【优化】使用帮助/代码快捷提示/javascript代码块提示.json 新增新加的几个api的代码提示，同时输入`qw`可以快捷输出常用过滤器代码。
* 3、【优化】`万能表格` 支持展开行 [点击查看](https://vkdoc.fsq.pub/admin/2/table.html#http%E8%AF%B7%E6%B1%82%E6%A8%A1%E5%BC%8F)
* 4、【修复】`万能表格` 树形结构展示的bug

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.3（2021-08-26）
#### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
#### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.13`
* 2、【优化】使用帮助/代码快捷提示/javascript代码块提示.json 新增新加的几个api的代码提示，同时输入`qw`可以快捷输出常用过滤器代码。
* 3、【优化】`万能表格` 支持展开行 [点击查看](https://vkdoc.fsq.pub/admin/2/table.html#http%E8%AF%B7%E6%B1%82%E6%A8%A1%E5%BC%8F)
* 4、【修复】`万能表格` 树形结构展示的bug

##### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

#### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.2（2021-08-24）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容

* 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.11`
* 2、【新增】`vk.pubfn.getDayOffsetStartAndEnd` 获得相对当前时间的偏移 count 天的起止日期(日的开始和结束) [点击查看](https://vkdoc.fsq.pub/client/jsapi.html#vk-pubfn-getdayoffsetstartandend-%E8%8E%B7%E5%BE%97%E7%9B%B8%E5%AF%B9%E5%BD%93%E5%89%8D%E6%97%B6%E9%97%B4%E7%9A%84%E5%81%8F%E7%A7%BB-count-%E5%A4%A9%E7%9A%84%E8%B5%B7%E6%AD%A2%E6%97%A5%E6%9C%9F)
* 3、【新增】`vk.pubfn.getMonthOffsetStartAndEnd` 获得相对当前时间的偏移 count 月的起止日期(月的开始和结束) [点击查看](https://vkdoc.fsq.pub/client/jsapi.html#vk-pubfn-getmonthoffsetstartandend-%E8%8E%B7%E5%BE%97%E7%9B%B8%E5%AF%B9%E5%BD%93%E5%89%8D%E6%97%B6%E9%97%B4%E7%9A%84%E5%81%8F%E7%A7%BB-count-%E6%9C%88%E7%9A%84%E8%B5%B7%E6%AD%A2%E6%97%A5%E6%9C%9F)
* 4、【新增】`vk.pubfn.getYearOffsetStartAndEnd`获得相对当前时间的偏移 count 年的起止日期(年的开始和结束) [点击查看](https://vkdoc.fsq.pub/client/jsapi.html#vk-pubfn-getyearoffsetstartandend-%E8%8E%B7%E5%BE%97%E7%9B%B8%E5%AF%B9%E5%BD%93%E5%89%8D%E6%97%B6%E9%97%B4%E7%9A%84%E5%81%8F%E7%A7%BB-count-%E5%B9%B4%E7%9A%84%E8%B5%B7%E6%AD%A2%E6%97%A5%E6%9C%9F)
* 5、【优化】`万能表格` 的查询action支持http请求（传统后端请求）[点击查看](https://vkdoc.fsq.pub/admin/2/table.html#http%E8%AF%B7%E6%B1%82%E6%A8%A1%E5%BC%8F)
* 6、【优化】`万能表单` 的提交action支持http请求（传统后端请求）[点击查看](https://vkdoc.fsq.pub/admin/3/form.html#http%E8%AF%B7%E6%B1%82%E6%A8%A1%E5%BC%8F)

#### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.1（2021-08-16）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.2`
#### 2、【重要】文档已搬家（gitee文档地址仅作为备用地址）[查看新版文档地址](https://vkdoc.fsq.pub/)

#### 框架更新步骤 [点击查看](https://vkdoc.fsq.pub/admin/1/update.html)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.5.0（2021-08-11）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.5.1`
#### 2、【升级】`element-ui` 包升级至 `2.15.5`
#### 3、【优化】一些细节
#### 4、【新增】万能表格新增方法`getTableFormatterData`(获取整个表格数据（格式化后的数据）) [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4003876&doc_id=975983)
```js
let info = this.$refs.table1.getTableFormatterData();
console.log(info);
```
#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.4.2（2021-08-06）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.4.1`
#### 2、【新增】登录日志支持按应用搜索，支持显示登录用户头像昵称
#### 3、【优化】一些细节
#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.4.1（2021-08-04）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.4.0`
#### 2、【重要】适配`uni-id 3.3.3`：支持不同端用户隔离 [点击查看文档](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4313231&doc_id=975983)
#### 3、【重要】用户管理全面升级，支持展示不同端用户，支持`批量设置可登录的应用`
#### 4、【重要】新增应用管理

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.4.0（2021-08-04）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.4.0`
#### 2、【重要】适配`uni-id 3.3.2`：支持不同端用户隔离 [点击查看文档](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4313231&doc_id=975983)
#### 3、【重要】用户管理全面升级，支持展示不同端用户。
#### 4、【重要】新增应用管理

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.3.6（2021-07-28）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.3.4`
#### 2、【修复】万能表单 `array<object>` 嵌套 `array<string>`时，控制台会报错的问题。
#### 3、【优化】万能表单 `table-select` 组件新增 `dialogWidth` 属性(控制弹窗宽度)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.3.5（2021-07-22）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【修复】常用的 vk.baseDao `javascript代码块提示`（有部分错误的问题：少,号的问题）（在编辑器输入dao.即可弹出代码提示）[点击查看详情](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4019184&doc_id=975983)
![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/fe965ad9-e9ed-44fc-ad0b-5bc286988e09.png)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.3.4（2021-07-22）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.3.3`
#### 2、【优化】新增常用的 vk.baseDao `javascript代码块提示` （在编辑器输入dao.即可弹出代码提示）[点击查看详情](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4019184&doc_id=975983)
![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/fe965ad9-e9ed-44fc-ad0b-5bc286988e09.png)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.3.3（2021-07-12）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 【修复】已知问题

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.3.2（2021-07-12）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.3.2`
#### 2、【优化】部分输入性组件补全 readonly（只读）属性
#### 3、【修复】连表查询时，因`lastWhereJson`而导致`getCount`错误的问题。

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.3.1（2021-07-12）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.3.2`
#### 2、【优化】部分输入性组件补全 readonly（只读）属性
#### 3、【修复】连表查询时，因`lastWhereJson`而导致`getCount`错误的问题。

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.3.0（2021-07-09）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.3.0`
#### 2、【升级】`element-ui` 包升级至 `2.15.3`(有新增2个组件) [查看elementUI更新日志](https://element.eleme.cn/#/zh-CN/component/changelog)
#### 3、【重要调整】删除了`config`公共模块，升级为`uni-config-center`模式 [点击查看升级教程](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4219337&doc_id=975983)
#### 3、【重要调整】删除了`config`公共模块，升级为`uni-config-center`模式 [点击查看升级教程](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4219337&doc_id=975983)
#### 3、【重要调整】删除了`config`公共模块，升级为`uni-config-center`模式 [点击查看升级教程](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4219337&doc_id=975983)
#### 4、【重要】万能表格搜索组件`vk-data-table-query`文档（支持搜索折叠） [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4214905&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.2.7（2021-07-07）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.2.18`
#### 2、【新增】`admin/system/menu/sys/getCascader`（cascader 级联选择组件 远程懒加载方式的云函数示例）[点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050268&doc_id=975983)
#### 3、【新增】`万能表格`新增合计列的属性show-summary、summary-method 、total-option [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4003876&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.2.6（2021-07-05）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.2.16`
#### 2、【优化】权限管理页面逻辑（部分修改完成后，减少一次数据库查询）
#### 3、【优化】菜单管理页面逻辑（部分修改完成后，减少一次数据库查询）
#### 4、【优化】优化手机H5浏览时的部分样式。

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.2.5（2021-07-03）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.2.15`
#### 2、【调整】去除系统内置的`初级管理员`、`中级管理员`、`高级管理员`角色
#### 3、【优化】权限管理页面逻辑

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.2.4（2021-07-03）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.2.15`
#### 2、【调整】万能表格 `getCurrentRow()` 方法调整如下
```js
// 获取当前选中行的数据（拷贝一份新的数据），此时若改变item对象内属性的值，不影响表格本行数据。
let item = that.$refs.table1.getCurrentRow();
// 获取当前选中行的数据，此时若改变item对象内属性的值，可以实时更新表格本行数据。
let item = that.$refs.table1.getCurrentRow(true);
```
#### 3、【修复】万能表单 `checkbox` 第二次显示可能会报错的问题。


#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.2.3（2021-07-02）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.2.12`
#### 2、【修复】`万能表单`的 `remote-select` 当 showAll:true 时，actionData参数无效的问题。
#### 3、【修复】`万能表单`的 `file-select` 已知bug。


#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.2.2（2021-07-01）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.2.9`
#### 2、【修复】`素材管理`优化。需替换目录`/pages_plugs/system_uni/uni-id-files/`
#### 3、【优化】`万能表单`的 `remote-select`、 `radio`、 `checkbox`新增属性 `dataPreprocess`（数据预处理函数）[点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050267&doc_id=975983)
#### 4、【修复】`万能表单`的 `file-select` 已知bug [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4176041&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.2.1（2021-06-28）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.2.7`
#### 2、【修复】已知bug

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.2.0（2021-06-28）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.2.6`
#### 2、【修复】`manifest.json`的 H5 配置中运行的基础路径 由 `admin` 改成 `/admin/`（规范）（如果你的前端托管只发布admin，则可以设置为空）
#### 3、【新增】万能表单新增 `file-select` 组件（素材库选择组件），可以直接选择已上传的素材。[点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4176041&doc_id=975983)
#### 4、【重要】新增 `素材管理` 页面，可管理已上传的图片、视频、文件等素材。[点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4176041&doc_id=975983)
![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/f795789f-a7e7-4117-953f-07fe2a25f300.png)
#### 5、【优化】万能表单`remote-select` 新增属性`actionData` [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050267&doc_id=975983)
#### 6、【优化】万能表单`radio` 新增属性`actionData`   [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050276&doc_id=975983)
#### 7、【优化】万能表单`checkbox` 新增属性`actionData`  [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050277&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。


## 1.1.9（2021-06-23）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.1.19`
#### 2、【修复】`万能表格` 导出 `Excel` 的一些已知问题。

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。


## 1.1.8（2021-06-22）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.1.17`
#### 2、【修复】`万能表单` 组件 `table-select` 当设置为单选时 `onChange` 事件 返回参数 `option` 的值改为对象（之前是数组）[点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050276&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论。
## 1.1.7（2021-06-21）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.1.15`
#### 2、【升级】`element-ui` 包升级至 `2.15.2`
#### 3、【优化】`万能表单` 组件 `remote-select`、`table-select`、`select`、`checkbox`、`radio` 的 `onChange` 事件 新增返回参数 `option` 值为选项的对象值 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050276&doc_id=975983)
```js
{
  key:"user_id", title:"用户选择器", type:"remote-select", placeholder:"请输入用户账号/昵称",
  action:"admin/system/user/kh/select",
  onChange:function(val, formData, column, index, option){
    // option内的值为与val匹配的选项的数据源完整数据
    console.log(1,val, formData, column, index, option);
  }
}
```

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.1.6（2021-06-18）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.1.13`
#### 2、【修复】`vk.baseDao.add` 因hbx 3.1.18版本导致的本地运行时 `_add_time_str` 错误的问题。
#### 3、【新增】万能表单 `array<object>` 的 `columns` 中每个元素新增 `onChange` 属性 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4109698&doc_id=975983)
#### 4、【新增】万能表单 `table-select` 新增 `valueFields` 属性（用于控制value的值由哪些字段组成） [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050269&doc_id=975983)
```js
// 不设置 `valueFields` 时 表单绑定的值为`字符串数组形式`
["001","002"]
// 设置 `valueFields` 时 表单绑定的值为`对象数组形式`
// 如 `valueFields:["_id","nickname","mobile"]` 表单绑定的值为
[
  {"_id":"001","nickname":"昵称1","mobile":"手机号1"}，
  {"_id":"002","nickname":"昵称2","mobile":"手机号2"}
]
```
#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。


## 1.1.5（2021-06-15）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.1.11`
#### 2、【新增】`万能表单` 新增组件 `array<object>`(子表单-对象数组)  [点击查看文档](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4109698&doc_id=975983)
#### ![查看示例图](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/67cda695-e3f9-469f-9870-9f248b415400.png)
#### 3、【新增】`万能表单` 新增组件 `array<string>`(字符串数组) 
 ```js
{ key:"array1", title:"数组字符串类型", type:"array<string>" }
```

#### 4、【新增】`万能表单` 新增组件 `array<number>`(数字数组)  
```js
{ key:"array2", title:"数组数字类型", type:"array<number>" }
```

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。


## 1.1.4（2021-06-10）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.1.5`
#### 2、【新增】`万能表格`新增属性`default-sort`，支持表格默认排序 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4003876&doc_id=975983)
#### 如默认按时间降序
```html
<vk-data-table
  :default-sort="{ name:'_add_time', type:'desc' }"
></vk-data-table>
```
#### 3、【优化】`el-button` 组件支持 `vk-icon` 内置图标

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。


## 1.1.3（2021-05-31）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.1.2`
#### 2、【优化】`万能表格`中`tag`组件当没有匹配到值时进行忽略处理。
#### 3、【优化】`万能表格`中`time`组件正确识别10位数时间戳和13位时间戳，同时支持自定义时间g格式化
```js
{ key:"_add_time", title:"添加时间", type:"time", width:160, valueFormat:"yyyy-MM-dd hh:mm:ss" }
```

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论。
## 1.1.2（2021-05-31）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.1.1`
#### 2、【新增】补全内置组件文档 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050270&doc_id=975983)
#### 3、【修复】`上传组件` 上传视频时后缀名可能会错误的问题。
#### 4、【优化】`云函数URL化` 路由模式下，URL重写支持只允许部分云函数可被访问。（可以做到只暴露指定的API接口，增加URL化后的安全性）[点击URL重写规则](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=3916806&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.1.1（2021-05-29）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.1.0`
#### 2、【新增】用户管理新增强制重置其他账号登录密码。
#### 3、【新增】`table-select`、`address` 等组件文档 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050269&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.1.0（2021-05-29）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.0.19`
#### 2、【新增】用户管理新增强制重置其他账号登录密码。
#### 3、【新增】`table-select`、`address` 等组件文档 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050269&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.0.9（2021-05-28）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.0.19`
#### 2、【新增】强制重置admin账号密码教程 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4064984&doc_id=975983)
#### 3、【优化】`下拉选择`支持分组 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050278&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。
## 1.0.8（2021-05-27）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.0.18`
#### 2、【优化】`cascader` 组件的内部逻辑，支持异步加载。
#### 3、【修复】`上传组件` 上传视频时后缀名可能会错误的问题。
#### 4、【优化】将`系统设置`菜单变更为动态菜单（导入`database/动态菜单导入/系统设置.json`即可）
```js
动态菜单导入方式：
1、进入admin，点击菜单管理
2、点击通过JSON批量导入菜单
3、将`database/动态菜单导入/系统设置.json`内的全部内容复制到JSON内容中，点确定即可
4、可以删除`static_menu/menu.json`内的系统设置相关的菜单了。（由静态菜单变成了动态菜单）
```

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.0.7（2021-05-26）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
###  更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.0.18`
#### 2、【优化】`vk.baseDao.selects` 新增两个属性`getOne` 、 `getMain` [点击查看详情](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4054561&doc_id=975983)
#### 3、【优化】`万能表格`的搜索组件 新增`cascader`、`table-select`组件渲染。
#### 4、【优化】`万能表格`组件新增API `deleteRows`、`updateRows` （只更新表格内数据，不更新数据库）
```js
// 删除指定的行（不删数据库数据）
that.$refs.table1.deleteRows({
  ids:["60acf6248a69dc00018d8520"],
  success:function(){
    
  }
});
// 更新指定的行数据（不更新据库数据）
that.$refs.table1.updateRows({
  mode:"update", // update 局部字段更新 set 覆盖字段更新
  rows:[
    { _id:"60acf6248a69dc00018d8520", remark:"被修改了", money:10000 }
  ],
  success:function(){
    
  }
});
```

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.0.6（2021-05-24）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
###  更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.0.13`
#### 2、【优化】`万能表单`中单选和多选组的样式排版。增加属性`itemWidth` 所有选项的最小宽度。
#### 3、【优化】`remote-select`新增属性 `props` [点击查看组件文档](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050267&doc_id=975983)
#### 4、【优化】`radio` 和 `checkbox` 支持远程数据（通过云函数获取选项） [点击查看组件文档](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050276&doc_id=975983)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.0.5（2021-05-24）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
###  更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.0.11`
#### 2、【优化】`万能表单`中单选和多选组的样式排版。增加属性`itemWidth` 所有选项的最小宽度。
#### 3、【优化】`remote-select`新增属性 `props` [点击查看组件文档](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050267&doc_id=975983)
#### 4、【优化】`radio` 和 `checkbox` 支持远程数据（通过云函数获取选项） [点击查看组件文档](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4050276&doc_id=975983)
#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.0.4（2021-05-22）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
###  更新内容
#### 1、【优化】`vk.baseDao` API的查询性能。
#### 2、【调整】`vk.baseDao.getTableData` 默认排序规则调整为`_id`降序，之前是`_add_time`降序
#### 3、【优化】`vk.baseDao.getTableData` 和 `vk.baseDao.selects` 连表查询逻辑。

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.0.3（2021-05-20）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
###  更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.0.10`
#### 2、【修复】`pages_plugs/permission/list`页面`sort`的`type`为`number`(原本为`text`)

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.0.2（2021-05-18）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
###  更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.0.9`
#### 2、【新增】`JSON编辑器` `type: "json"` 可自由的编辑json对象 
![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/f3181c8a-efc7-4a73-8595-d7c029d0eac3.png)
#### 3、【修复】`vk-data-input-editor` 组件在其他组件中使用时功能异常的bug

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.0.1（2021-05-17）
### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
###  更新内容
#### 1、【升级】`vk-unicloud-admin-ui` 包升级至 `1.0.4`
#### 2、【优化】`opendb-admin-menus`(菜单表) 新增属性`hidden_menu` 若为true，则菜单存在，但在左侧菜单列表中隐藏。
#### 3、【修复】手机访问时，不显示用户角色权限菜单的bug。

#### 框架更新步骤指南 [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4023455&doc_id=975983)

##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 1.0.0（2021-05-15）

### 2021-05-15 `vk-unicloud-admin` 框架正式发布。

![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/6deebd32-8075-4bdb-8e04-5839516ef4f4.png)

### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 插件名称：`vk-unicloud-admin`
### 作者：VK

## 序
##### 如果你热爱编程，想快速入门云开发，欢迎使用`vk-unicloud`系列开发框架
##### 无需转变开发习惯，0成本上手云开发。
##### 框架内置了众多API、工具包，为你的业务扫平障碍。使你的项目刚起步进度就是50%（微信登录、短信、验证码、缓存、生成小程序码等等）
##### 从此你又get一个新技能，只需用js，轻松搞定前后台整体业务。
##### `client端`框架文档：`https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=2912167&doc_id=975983` [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=2912167&doc_id=975983)
##### `admin端`框架文档：`https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4003875&doc_id=975983` [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4003875&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 框架体验地址

[点击进入admin框架体验地址](https://vkunicloud.fsq.pub/admin/)

#### 体验账号：
##### 高级管理员：test11（账号）123456（密码）可以执行绝大部分功能
##### 初级管理员：test12（账号）123456（密码）只能执行查询功能
##### 无权限用户：test13（账号）123456（密码）无admin登录权限

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 2021-05-15 `vk-unicloud-admin` 框架正式发布。

![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/6deebd32-8075-4bdb-8e04-5839516ef4f4.png)

### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 插件名称：`vk-unicloud-admin`
### 作者：VK

## 序
##### 如果你热爱编程，想快速入门云开发，欢迎使用`vk-unicloud`系列开发框架
##### 无需转变开发习惯，0成本上手云开发。
##### 框架内置了众多API、工具包，为你的业务扫平障碍。使你的项目刚起步进度就是50%（微信登录、短信、验证码、缓存、生成小程序码等等）
##### 从此你又get一个新技能，只需用js，轻松搞定前后台整体业务。
##### `client端`框架文档：`https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=2912167&doc_id=975983` [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=2912167&doc_id=975983)
##### `admin端`框架文档：`https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4003875&doc_id=975983` [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4003875&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 框架体验地址

[点击进入admin框架体验地址](https://vkunicloud.fsq.pub/admin/)

#### 体验账号：
##### 高级管理员：test11（账号）123456（密码）可以执行绝大部分功能
##### 初级管理员：test12（账号）123456（密码）只能执行查询功能
##### 无权限用户：test13（账号）123456（密码）无admin登录权限

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。

## 2021-05-15 `vk-unicloud-admin` 框架正式发布。

![](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/6deebd32-8075-4bdb-8e04-5839516ef4f4.png)

### vk-unicloud-admin 框架研究Q群:`22466457` 如有问题或建议可以在群内讨论。
### 插件名称：`vk-unicloud-admin`
### 作者：VK

## 序
##### 如果你热爱编程，想快速入门云开发，欢迎使用`vk-unicloud`系列开发框架
##### 无需转变开发习惯，0成本上手云开发。
##### 框架内置了众多API、工具包，为你的业务扫平障碍。使你的项目刚起步进度就是50%（微信登录、短信、验证码、缓存、生成小程序码等等）
##### 从此你又get一个新技能，只需用js，轻松搞定前后台整体业务。
##### `client端`框架文档：`https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=2912167&doc_id=975983` [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=2912167&doc_id=975983)
##### `admin端`框架文档：`https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4003875&doc_id=975983` [点击查看](https://gitee.com/vk-uni/vk-uni-cloud-router/wikis/pages?sort_id=4003875&doc_id=975983)
##### 框架学习Q群：`22466457` 欢迎萌新和大佬来使用和共同改进框架

##### 框架体验地址

[点击进入admin框架体验地址](https://vkunicloud.fsq.pub/admin/)

#### 体验账号：
##### 高级管理员：test11（账号）123456（密码）可以执行绝大部分功能
##### 初级管理员：test12（账号）123456（密码）只能执行查询功能
##### 无权限用户：test13（账号）123456（密码）无admin登录权限

### 如果你觉得框架对你有用，可以在下方进行评论，也可以进行赞赏。


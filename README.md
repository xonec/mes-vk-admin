![vk-unicloud-admin](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/ad18e7d6-ae0e-4424-bf3d-6e3dad1036a1.png)

> **插件名称：** `vk-unicloud-admin`
>
> **作者：** VK

---

## 简介

`vk-unicloud-admin` 是基于 `uniapp` + `unicloud` + `uni-id` + `element ui` + `vk-unicloud-router` 打造的一套完整 PC 端 Admin 快速开发框架。

- 如果你热爱编程，想快速入门云开发，欢迎使用`vk-unicloud`系列开发框架
- 无需转变开发习惯，0 成本上手云开发。
- 框架内置了众多 API、工具包，为你的业务扫平障碍。使你的项目刚起步进度就是 50%（微信登录、短信、验证码、缓存、生成小程序码等等）
- 从此你又 get 一个新技能，只需用 js，轻松搞定前后台整体业务。

**相关链接**

|          | client 端                                                | admin 端（本插件）                                                  |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| 插件市场 | [查看插件](https://ext.dcloud.net.cn/plugin?id=2204)     | [查看插件](https://ext.dcloud.net.cn/plugin?name=vk-unicloud-admin) |
| 在线文档 | [查看文档](https://vkdoc.fsq.pub/client/)                | [查看文档](https://vkdoc.fsq.pub/admin/)                            |
| 安装教程 | [查看教程](https://vkdoc.fsq.pub/client/quickstart.html) | [查看教程](https://vkdoc.fsq.pub/admin/1/quickstart.html)           |

---

## 在线体验

- **框架演示：** [立即体验](https://vkunicloud.fsq.pub/admin/)
- **表单可视化生成器：** [立即体验](https://vkunicloud.fsq.pub/vk-form-visualizer/)

**演示账号：**

| 角色       | 账号   | 密码   | 权限说明           |
| ---------- | ------ | ------ | ------------------ |
| 高级管理员 | test11 | 123456 | 可执行绝大部分功能 |
| 初级管理员 | test12 | 123456 | 仅可执行查询功能   |
| 无权限用户 | test13 | 123456 | 无 Admin 登录权限  |

---

## 主要特性

1. **集成 `vk-unicloud-router`**：开箱即用的完整 API 体系，开发效率翻倍。[查看文档](https://vkdoc.fsq.pub/client/)
2. **深度封装 `element ui`**：在原生 element ui 基础上进行二次封装，同时完整兼容原生写法。[element ui 官网](https://element.eleme.cn/#/zh-CN/component/button)
3. **表单可视化拖拽工具**：可视化设计表单，一键生成 vk 框架代码或 element ui 原生代码。[立即体验](https://vkunicloud.fsq.pub/vk-form-visualizer/)
4. **万能表格组件**：少量配置即可完成 CRUD，几分钟搭起一个完整列表页面。
5. **万能表单组件**：少量配置即可完成表单渲染与数据提交。
6. **超高自由度**：每个字段均支持插槽自定义，也可随时退回原生 element ui 代码编写。
7. **完善的权限体系**：用户、角色、权限三级管控，权限粒度精确到单个云函数。
8. **极低迁移成本**：有传统 vue-admin 开发经验即可无缝上手，学习成本接近于零。

---

## 核心功能

### 万能表格

> 核心思想：通过 JSON 配置驱动页面渲染，简单配置即完成表格搭建。

**示例：** 渲染头像列与时间列

```js
[
  { key: 'avatar', title: '头像', type: 'avatar', width: 80, shape: 'circle' },
  { key: '_add_time', title: '添加时间', type: 'time', width: 160, valueFormat: 'yyyy-MM-dd hh:mm:ss' },
];
```

**功能清单：**

1. **查询**：分页、排序、多条件搜索、搜索项折叠、多表联查、数据源预处理、展开行、树状结构等
2. **批量操作**：内置多选框，一键触发批量处理逻辑
3. **详情页**：点击详情按钮，自动弹出详情弹窗
4. **编辑**：点击修改按钮，自动弹出编辑表单弹窗
5. **删除**：气泡二次确认后执行删除，防止误操作
6. **自定义操作按钮**：灵活扩展发货、审核等业务按钮
7. **高自由度插槽**：每个字段均支持自定义渲染（内置组件可覆盖 90% 以上渲染场景）
8. **一键导出 Excel**：调用内置 API，一行代码导出当前表格数据
9. **全量数据导出**：突破 unicloud 单次 1000 条限制，支持导出数据库全量数据
10. 更多功能 → [万能表格文档](https://vkdoc.fsq.pub/admin/2/table.html)

---

### 万能表单

> 核心思想：通过 JSON 配置驱动表单渲染，简单配置即完成表单搭建。

**示例：** 渲染昵称输入框与性别单选组

```js
[
  { key: 'nickname', title: '昵称', type: 'text' },
  {
    key: 'gender',
    title: '性别',
    type: 'radio',
    data: [
      { value: 1, label: '男' },
      { value: 2, label: '女' },
    ],
  },
];
```

**功能清单：**

1. **自动提交**：配置即可完成表单数据收集与接口请求
2. **提交前校验**：自动执行表单验证，不通过则阻止提交
3. **防重复提交**：提交后按钮自动进入 loading 状态，避免重复请求
4. **表单复用**：同一套表单配置可同时用于新增与编辑场景
5. **字段显示规则**：复用时支持按场景动态显示/隐藏指定字段
6. **提交拦截器**：在提交前注入自定义逻辑，可放行或终止流程
7. **高自由度插槽**：每个字段均支持自定义渲染（内置组件可覆盖 90% 以上渲染场景）
8. **一键重置**：快速清空或还原表单数据
9. **可视化拖拽设计**：[打开表单可视化生成器](https://vkunicloud.fsq.pub/vk-form-visualizer/#/)
10. 更多功能 → [万能表单文档](https://vkdoc.fsq.pub/admin/3/form.html)

> `vk-unicloud-admin` 同时包含 `vk-unicloud-router` 的全部功能。[查看 vk-unicloud-router 文档](https://vkdoc.fsq.pub/client/)

---

## 相关文档

- [快速上手 / 安装步骤](https://vkdoc.fsq.pub/admin/1/quickstart.html)
- [万能表格](https://vkdoc.fsq.pub/admin/2/table.html)
- [万能表单](https://vkdoc.fsq.pub/admin/3/form.html)
- [重置 Admin 账号密码](https://vkdoc.fsq.pub/admin/4/forceResetAdminPassword.html)

---

## 常见问题

### 新建用户登录时提示"用户不存在"（数据库中明明有该用户）

这是由**多端用户隔离机制**导致的，按以下步骤解决：

**第一步：** 在应用管理中配置你的 DCloud Appid

用 admin 账号登录后台，进入「应用管理」，添加你自己的应用，或将已有数据的 `appid` 改为你的项目 `appid`。

> `DCloud Appid` 获取方法：打开 uniapp 项目根目录下的 `manifest.json`，复制其中的 `appid` 字段值。

![获取 DCloud Appid](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/e717232f-0f18-4dee-8437-5dec2c224920.png)

**第二步：** 在用户管理中配置该用户允许登录的端

进入「用户管理」，找到对应用户，点击「编辑」，勾选允许其登录的应用端。

![配置用户登录端](https://vkceyugu.cdn.bspapp.com/VKCEYUGU-cf0c5e69-620c-4f3c-84ab-f4619262939f/18cd54d5-bedc-4d4f-bda2-7c339c865257.png)

**第三步：** 配置完成，重新登录即可。

---

> 如果本框架对你有所帮助，欢迎在插件市场留下评价或给予支持，感谢你的认可与鼓励！

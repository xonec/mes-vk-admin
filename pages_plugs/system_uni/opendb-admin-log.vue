<template>
  <div>
    <!-- 搜索区域卡片 -->
    <div class="vk-page-card vk-page-search-card">
      <vk-data-table-query
        v-model="queryForm1.formData"
        :columns="queryForm1.columns"
        :span="4"
        :collapse-rows="1"
        :collapse-default-expand="true"
        @search="search"
        @collapse-change="collapseChange"
      ></vk-data-table-query>
    </div>

    <!-- 表格内容卡片 -->
    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">操作日志列表</div>
        <div class="vk-page-card-actions">
          <el-button :size="$global.size" icon="el-icon-download" @click="exportExcel">导出Excel</el-button>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="vk-page-card-table">
        <vk-data-table
          ref="table1"
          :action="table1.action"
          :columns="table1.columns"
          :query-form-param="queryForm1"
          :right-btns="['detail_auto']"
          :row-no="true"
          :pagination="true"
          :top="0"
        ></vk-data-table>
      </div>
    </div>
  </div>
</template>

<script>
  let vk = uni.vk; // vk实例

  export default {
    data() {
      // 页面数据变量
      return {
        // 页面是否请求中或加载中
        loading: false,
        // init请求返回的数据
        data: {},
        // 表格相关开始 -----------------------------------------------------------
        table1: {
          // 表格数据请求地址
          action: 'admin/system_uni/admin-log/sys/getList',
          // 表格字段显示规则
          columns: [
            { key: 'user_id', title: '操作者用户ID', type: 'text', width: 120 },
            { key: 'user_name', title: '操作者用户昵称', type: 'text', width: 120 },
            { key: 'title', title: '标题', type: 'text', width: 140 },
            { key: 'url', title: 'url', type: 'text', width: 280 },
            { key: '_add_time', title: '添加时间', type: 'time', width: 140 },
            { key: '_add_time', title: '距离现在', type: 'dateDiff', width: 120 },
            { key: 'request_param', title: '请求参数', type: 'json', width: 300 },
            { key: 'response', title: '返回参数', type: 'json', width: 300 },
            { key: 'ip', title: 'ip地址', type: 'text', width: 140 },
            { key: 'request_id', title: '请求id', type: 'text', width: 280 },
          ],
          // 多选框选中的值
          multipleSelection: [],
          // 当前高亮的记录
          selectItem: '',
        },
        // 表格相关结束 -----------------------------------------------------------
        // 表单相关开始 -----------------------------------------------------------
        // 查询表单请求数据
        queryForm1: {
          // 查询表单数据源，可在此设置默认值
          formData: {},
          // 查询表单的字段规则 fieldName:指定数据库字段名,不填默认等于key
          columns: [
            { key: 'title', title: '标题', type: 'text', mode: '%%' },
            { key: 'ip', title: 'ip地址', type: 'text', mode: '%%' },
            { key: '_add_time', title: '添加时间', type: 'datetimerange', mode: '[]' },
            {
              key: 'user_id',
              title: '筛选用户',
              type: 'table-select',
              placeholder: '请选择用户',
              action: 'admin/system/user/sys/getList',
              columns: [
                { key: 'avatar', title: '头像', type: 'image', width: 80 },
                { key: 'nickname', title: '用户昵称', type: 'text', minWidth: 200, nameKey: true }, // nameKey: true 代表此字段的值会显示在表单上
                { key: 'mobile', title: '手机号', type: 'text', minWidth: 140 }, // 设置 minWidth 的列会自动撑开
                { key: '_id', title: '用户ID', type: 'text', width: 240, idKey: true }, // idKey:true 代表此字段为主键字段，若设置show:["none"]，则可以在表格中隐藏该字段的显示
              ],
              queryColumns: [
                { key: 'nickname', title: '用户昵称', type: 'text', width: 150, mode: '%%' },
                { key: 'mobile', title: '手机号', type: 'text', width: 150, mode: '%%' },
                { key: '_id', title: '用户ID', type: 'text', width: 150, mode: '=' },
              ],
            },
          ],
        },
        // 表单相关结束 -----------------------------------------------------------
      };
    },
    // 监听 - 页面每次【加载时】执行(如：前进)
    onLoad(options = {}) {
      vk = this.vk;
      this.options = options;
      this.init(options);
    },
    // 监听 - 页面【首次渲染完成时】执行。注意如果渲染速度快，会在页面进入动画完成前触发
    onReady() {},
    // 监听 - 页面每次【显示时】执行(如：前进和返回) (页面每次出现在屏幕上都触发，包括从下级页面点返回露出当前页面)
    onShow() {},
    // 监听 - 页面每次【隐藏时】执行(如：返回)
    onHide() {},
    // 函数
    methods: {
      // 页面数据初始化函数
      init(options) {},
      // 搜索
      search(obj) {
        this.$refs.table1.query(obj);
      },
      // 监听 - 查询表单折叠面板变化事件
      collapseChange() {
        // 执行表格重新布局
        this.$refs.table1.doLayout();
      },
      // 刷新
      refresh() {
        this.$refs.table1.refresh();
      },
      // 导出Excel
      exportExcel() {
        this.$refs.table1.exportExcel({
          showColumnSelector: true,
        });
      },
    },
    watch: {},
    // 计算属性
    computed: {},
  };
</script>
<style lang="scss" scoped>
  page {
    background-color: var(--bgcolor);
  }
</style>

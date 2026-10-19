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
        <div class="vk-page-card-title">连接列表</div>
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
          :right-btns="['detail_auto', 'more']"
          :right-btns-more="table1.rightBtnsMore"
          :row-no="true"
          :pagination="true"
          :top="0"
          @delete="deleteBtn"
          @current-change="currentChange"
          @selection-change="selectionChange"
        ></vk-data-table>
      </div>
    </div>
  </div>
</template>

<script>
  let vk = uni.vk; // vk实例
  let originalForms = {}; // 表单初始化数据

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
          action: 'admin/system_uni/ws-connection/sys/getList',
          // 表格字段显示规则
          columns: [
            { key: 'appid', title: 'DCloud appid', type: 'text', width: 160 },
            { key: 'userInfo', title: '用户', type: 'userInfo', width: 160, defaultValue: '-' },
            { key: 'device_id', title: '设备ID', type: 'text', width: 180 },
            { key: 'url', title: '云对象URL', type: 'text', width: 260 },
            { key: 'space_id', title: '空间ID', type: 'text', width: 180 },
            { key: 'provider', title: '供应商', type: 'text', width: 100 },
            { key: 'ip', title: 'ip地址', type: 'text', width: 120 },
            { key: '_add_time', title: '连接时间', type: 'time', width: 160 },
            { key: '_add_time', title: '距离现在', type: 'dateDiff', width: 100 },
            { key: '_id', title: '连接ID（cid）', type: 'text', width: 300 },
          ],
          // 多选框选中的值
          multipleSelection: [],
          // 当前高亮的记录
          selectItem: '',
          rightBtnsMore: [
            {
              title: '强制断开连接',
              onClick: (item) => {
                vk.callFunction({
                  url: 'admin/system_uni/ws-connection/sys/delete',
                  title: '请求中...',
                  data: {
                    cid: item._id,
                  },
                  success: (data) => {
                    this.refresh();
                  },
                });
              },
            },
            {
              title: '强制该设备退出登录',
              onClick: (item) => {
                vk.callFunction({
                  url: 'admin/system_uni/ws-connection/sys/forceLogout',
                  title: '请求中...',
                  data: {
                    cid: item._id,
                    url: item.url,
                  },
                  success: (data) => {
                    this.refresh();
                  },
                });
              },
            },
            {
              title: '强制该用户退出登录',
              disabled: (item) => {
                return !item.user_id ? true : false;
              },
              onClick: (item) => {
                vk.callFunction({
                  url: 'admin/system_uni/ws-connection/sys/forceLogout',
                  title: '请求中...',
                  data: {
                    user_id: item.user_id,
                    url: item.url,
                  },
                  success: (data) => {
                    this.refresh();
                  },
                });
              },
            },
          ],
        },
        // 表格相关结束 -----------------------------------------------------------
        // 表单相关开始 -----------------------------------------------------------
        // 查询表单请求数据
        queryForm1: {
          // 查询表单数据源，可在此设置默认值
          formData: {},
          // 查询表单的字段规则 fieldName:指定数据库字段名,不填默认等于key
          columns: [
            {
              key: 'appid',
              title: 'appid',
              type: 'select',
              filterable: true,
              clearable: true,
              data: [],
            },
            { key: '_id', title: '连接ID', type: 'text', mode: '=' },
            { key: 'user_id', type: 'text', title: '用户ID', mode: '=' },
            { key: 'device_id', type: 'text', title: '设备ID', mode: '=' },
            { key: 'url', type: 'text', title: '云对象URL', mode: '=' },
            { key: 'space_id', title: '空间ID', type: 'text' },
            { key: 'ip', title: 'ip地址', type: 'text' },
            { key: '_add_time', type: 'datetimerange', title: '连接时间', mode: '[]' },
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
      init(options) {
        originalForms['form1'] = vk.pubfn.copyObject(this.form1);

        vk.callFunction({
          url: 'admin/system/app/sys/getList',
          data: {},
          success: (data) => {
            let index = vk.pubfn.getListIndex(this.queryForm1.columns, 'key', 'appid');
            let list = data.rows.map((item) => {
              return {
                label: `${item.appid}（${item.name}）`,
                value: item.appid,
              };
            });
            this.queryForm1.columns[index].data = list;
          },
        });
      },
      // 页面跳转
      pageTo(path) {
        vk.navigateTo(path);
      },
      // 表单重置
      resetForm() {
        vk.pubfn.resetForm(originalForms, this);
      },
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
      // 获取当前选中的行的数据
      getCurrentRow() {
        return this.$refs.table1.getCurrentRow();
      },
      // 监听 - 行的选中高亮事件
      currentChange(val) {
        this.table1.selectItem = val;
      },
      // 当选择项发生变化时会触发该事件
      selectionChange(list) {
        this.table1.multipleSelection = list;
      },
      // 删除按钮
      deleteBtn({ item, deleteFn }) {
        deleteFn({
          action: 'admin/system_uni/ws-connection/sys/delete',
          data: {
            _id: item._id,
          },
        });
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

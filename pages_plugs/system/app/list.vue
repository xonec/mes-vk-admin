<template>
  <div>
    <!-- 搜索区域卡片 -->
    <div class="vk-page-card vk-page-search-card">
      <vk-data-table-query v-model="queryForm1.formData" :columns="queryForm1.columns" :span="3" @search="search" @collapse-change="collapseChange"></vk-data-table-query>
    </div>

    <!-- 表格内容卡片 -->
    <div class="vk-page-card">
      <!-- 操作按钮与表格标题区域 -->
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">应用列表</div>
        <div class="vk-page-card-actions">
          <el-button type="primary" :size="$global.size" icon="el-icon-plus" @click="addBtn">添加应用</el-button>
          <el-alert v-if="!appIdExist" :title="`⚠警告：当前项目的 appId：${currentAppId} 没有在下方表格中，请新增应用或修改应用！`" type="error"> </el-alert>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="vk-page-card-table">
        <vk-data-table
          ref="table1"
          :action="table1.action"
          :columns="table1.columns"
          :query-form-param="queryForm1"
          :right-btns="['update', 'delete']"
          :custom-right-btns="table1.customRightBtns"
          :selection="false"
          :row-no="true"
          :pagination="true"
          :top="0"
          @update="updateBtn"
          @delete="deleteBtn"
          @current-change="currentChange"
          @selection-change="selectionChange"
        ></vk-data-table>
      </div>
    </div>

    <!-- 添加或编辑 -->
    <addUpdate v-model="formDatas.addUpdate" @success="refresh"></addUpdate>
    <!-- 生成发布页 -->
    <createPublishHtml v-model="formDatas.createPublishHtml" @success="refresh"></createPublishHtml>
  </div>
</template>

<script>
  let vk = uni.vk; // vk实例

  import addUpdate from './form/addUpdate.vue';
  import createPublishHtml from './form/createPublishHtml.vue';
  export default {
    components: {
      addUpdate,
      createPublishHtml,
    },
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
          action: 'admin/system/app/sys/getList',
          // 表格字段显示规则
          columns: [
            { key: 'appid', title: 'AppID', type: 'text', width: 160, sortable: 'custom' },
            { key: 'type', title: '应用类型', type: 'text', width: 120, sortable: 'custom' },
            { key: 'name', title: '应用名称', type: 'text', width: 240, sortable: 'custom' },
            { key: 'description', title: '应用描述', type: 'text', minWidth: 260 },
            { key: '_add_time', title: '添加时间', type: 'time', width: 160, sortable: 'custom' },
          ],
          // 多选框选中的值
          multipleSelection: [],
          // 当前高亮的记录
          selectItem: '',
          customRightBtns: [
            {
              title: '发布页管理',
              type: 'primary',
              onClick: (item) => {
                vk.pubfn.openForm('createPublishHtml', { item });
              },
              disabled: 'enable_upgrade_center!=true',
            },
            {
              title: '版本管理',
              type: 'primary',
              onClick: (item) => {
                vk.navigateTo(`/pages_plugs/system/app-upgrade-center/list?appid=${item.appid}`);
              },
              disabled: 'enable_upgrade_center!=true',
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
            { key: 'appid', title: 'AppID', type: 'text', mode: '%%' },
            { key: 'name', title: '应用名称', type: 'text', mode: '%%' },
            { key: '_add_time', title: '添加时间', type: 'datetimerange', span: 4, mode: '[]' },
          ],
        },
        // 其他弹窗表单
        formDatas: {},
        // 表单相关结束 -----------------------------------------------------------
        appIdExist: true,
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
        this.checkCurrentAppId();
      },
      // 页面跳转
      pageTo(path) {
        vk.navigateTo(path);
      },
      // 搜索
      search() {
        this.$refs.table1.search();
      },
      // 监听 - 查询表单折叠面板变化事件
      collapseChange() {
        // 执行表格重新布局
        this.$refs.table1.doLayout();
      },
      // 刷新
      refresh() {
        this.$refs.table1.refresh();
        this.checkCurrentAppId();
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
      // 显示添加页面
      addBtn() {
        vk.pubfn.openForm('addUpdate', { mode: 'add' });
      },
      // 显示修改页面
      updateBtn({ item }) {
        vk.pubfn.openForm('addUpdate', { mode: 'update', item });
      },
      // 删除按钮
      deleteBtn({ item, deleteFn }) {
        deleteFn({
          action: 'admin/system/app/sys/delete',
          data: {
            _id: item._id,
          },
        });
      },
      checkCurrentAppId() {
        let systemInfo = uni.getSystemInfoSync();
        if (typeof systemInfo.appId !== 'undefined') {
          this.currentAppId = systemInfo.appId;
          vk.callFunction({
            url: 'admin/system/app/sys/getInfo',
            data: {
              appid: systemInfo.appId,
            },
            success: (data) => {
              if (data.info && data.info.appid === systemInfo.appId) {
                this.appIdExist = true;
              } else {
                this.appIdExist = false;
              }
            },
          });
        }
      },
    },
    // 监听属性
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

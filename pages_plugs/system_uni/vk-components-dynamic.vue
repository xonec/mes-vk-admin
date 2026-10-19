<template>
  <div>
    <!-- 搜索区域卡片 -->
    <div class="vk-page-card vk-page-search-card">
      <vk-data-table-query
        v-model="queryForm1.formData"
        :columns="queryForm1.columns"
        :span="3"
        :collapse-rows="1"
        :collapse-default-expand="true"
        @search="search"
        @collapse-change="collapseChange"
      ></vk-data-table-query>
    </div>

    <!-- 表格内容卡片 -->
    <div class="vk-page-card">
      <!-- 操作按钮与表格标题区域 -->
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">动态组件列表</div>
        <div class="vk-page-card-actions">
          <el-button type="primary" :size="$global.size" icon="el-icon-plus" @click="addBtn">添加</el-button>
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
          :right-btns="['detail_auto', 'update', 'delete']"
          :row-no="true"
          :pagination="true"
          :top="0"
          @update="updateBtn"
          @delete="deleteBtn"
          @current-change="currentChange"
          @selection-change="selectionChange"
        >
          <!-- 排序值 -->
          <template v-slot:sort="{ row, column, index }">
            <el-input v-model="row.sort" size="mini" @change="sortChange($event, row)" />
          </template>
        </vk-data-table>
      </div>
    </div>

    <!-- 添加或编辑的弹窗 -->
    <vk-data-dialog v-model="form1.props.show" :title="form1.props.title" width="800px" mode="form">
      <vk-data-form
        ref="form1"
        v-model="form1.data"
        :rules="form1.props.rules"
        :action="form1.props.action"
        :form-type="form1.props.formType"
        :columns="form1.props.columns"
        label-width="100px"
        @success="
          form1.props.show = false;
          refresh();
        "
      ></vk-data-form>
    </vk-data-dialog>
  </div>
</template>

<script>
  let vk = uni.vk; // vk实例
  let originalForms = {}; // 表单初始化数据

  let typeData = [
    { value: 'image', label: '图片' },
    { value: 'swiper', label: '图片轮播' },
    { value: 'grid-btn', label: '宫格按钮' },
    { value: 'notice', label: '通知' },
    { value: 'text', label: '文本' },
    { value: 'rich-text', label: '富文本' },
    { value: 'button', label: '按钮' },
    { value: 'custom', label: '自定义' },
  ];

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
          action: 'admin/system_uni/components-dynamic/sys/getList',
          // 表格字段显示规则
          columns: [
            { key: 'sort', title: '排序值', type: 'number', width: 100, sortable: 'custom' },
            { key: 'data_id', title: '组件数据id', type: 'text', width: 200 },
            { key: 'title', title: '数据标题', type: 'text', width: 200 },
            { key: 'description', title: '数据描述', type: 'textarea' },
            { key: 'data', title: '组件数据', type: 'json', width: 200 },
            {
              key: 'show',
              title: '是否显示',
              type: 'switch',
              activeValue: true,
              inactiveValue: false,
              width: 80,
              watch: (res) => {
                let { value, row, change } = res;
                vk.callFunction({
                  url: 'admin/system_uni/components-dynamic/sys/update',
                  title: '请求中...',
                  data: {
                    _id: row._id,
                    show: value,
                  },
                  success: (data) => {
                    change(value); // 这一步是让表格行内的开关改变显示状态
                  },
                });
              },
            },
            {
              key: 'type',
              title: 'type',
              type: 'select',
              width: 120,
              data: typeData,
            },
            { key: 'name', title: 'name', type: 'text', width: 120 },
            { key: '_add_time', title: '添加时间', type: 'time', width: 200 },
            { key: '_add_time', title: '距离现在', type: 'dateDiff', width: 120 },
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
            { key: 'data_id', title: '组件数据ID', type: 'text', mode: '%%' },
            { key: 'title', title: '数据标题', type: 'text', mode: '%%' },
            {
              key: 'type',
              title: 'type',
              type: 'select',
              mode: '=',
              data: [{ value: '', label: '全部' }, ...typeData],
            },
            { key: 'name', title: 'name', type: 'text', mode: '%%' },
            { key: '_add_time', title: '添加时间', type: 'datetimerange', mode: '[]' },
          ],
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {
            sort: 0,
            show: true,
          },
          // 表单属性
          props: {
            // 表单请求地址
            action: '',
            // 表单字段显示规则
            columns: [
              { key: '', title: '基础', type: 'bar-title' },
              { key: 'data_id', title: '组件数据id', type: 'text', show: ['add'] },
              { key: 'title', title: '数据标题', type: 'text' },
              { key: 'data', title: '组件数据', type: 'json' },
              { key: 'description', title: '数据描述', type: 'textarea' },
              { key: '', title: '扩展', type: 'bar-title' },
              { key: 'sort', title: '排序值', type: 'number' },
              { key: 'show', title: '是否显示', type: 'switch', activeValue: true, inactiveValue: false },
              {
                key: 'type',
                title: 'type',
                type: 'select',
                data: typeData,
              },
              { key: 'name', title: 'name', type: 'text', tips: '同一页面可以设置相同的name' },
            ],
            // 表单验证规则
            rules: {
              title: [{ required: true, message: '数据标题不能为空', trigger: 'blur' }],
              data_id: [{ required: true, message: '组件数据id不能为空', trigger: 'change' }],
            },
            // add 代表添加 update 代表修改
            formType: '',
            // 是否显示表单的弹窗
            show: false,
          },
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
      // 显示添加页面
      addBtn() {
        this.resetForm();
        this.form1.props.action = 'admin/system_uni/components-dynamic/sys/add';
        this.form1.props.formType = 'add';
        this.form1.props.title = '添加';
        this.form1.props.show = true;
      },
      // 显示修改页面
      updateBtn({ item }) {
        this.form1.props.action = 'admin/system_uni/components-dynamic/sys/update';
        this.form1.props.formType = 'update';
        this.form1.props.title = '编辑';
        this.form1.props.show = true;
        this.form1.data = item;
      },
      // 删除按钮
      deleteBtn({ item, deleteFn }) {
        deleteFn({
          action: 'admin/system_uni/components-dynamic/sys/delete',
          data: {
            _id: item._id,
          },
        });
      },
      // 修改排序值
      sortChange(sort, item) {
        vk.callFunction({
          url: 'admin/system_uni/components-dynamic/sys/update',
          data: {
            _id: item._id,
            sort: Number(sort),
          },
          success: (data) => {},
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

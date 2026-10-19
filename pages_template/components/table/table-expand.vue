<template>
  <div>
    <div class="vk-page-card vk-page-search-card">
      <vk-data-table-query v-model="queryForm1.formData" :columns="queryForm1.columns" :span="3" @search="search" @collapse-change="collapseChange"></vk-data-table-query>
    </div>

    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">展开行表格</div>
        <div class="vk-page-card-actions">
          <el-button type="primary" :size="$global.size" icon="el-icon-plus" class="btn-add" @click="addBtn">添加</el-button>
          <el-button :size="$global.size" icon="el-icon-download" @click="exportExcel">导出Excel</el-button>
        </div>
      </div>

      <div class="vk-page-card-table">
        <vk-data-table
          ref="table1"
          :action="table1.action"
          :columns="table1.columns"
          :query-form-param="queryForm1"
          :right-btns="['detail_auto', 'update', 'delete', 'more']"
          :right-btns-more="table1.rightBtnsMore"
          :batch-btns="table1.batchBtns"
          :selection="true"
          :row-no="true"
          :pagination="true"
          :expand="true"
          :top="0"
          @update="updateBtn"
          @delete="deleteBtn"
          @current-change="currentChange"
          @selection-change="selectionChange"
        ></vk-data-table>
      </div>
    </div>

    <!-- 添加或编辑的弹窗 -->
    <vk-data-dialog v-model="form1.props.show" :title="form1.props.title" width="580px" top="4vh" mode="form" :close-on-click-modal="false">
      <vk-data-form
        v-model="form1.data"
        :rules="form1.props.rules"
        :action="form1.props.action"
        :form-type="form1.props.formType"
        :columns="form1.props.columns"
        label-width="80px"
        max-height="700px"
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
          action: 'template/sys.table.getList',
          // 表格字段显示规则
          columns: [
            { key: '_id', title: 'id', type: 'text', width: 220, show: ['expand', 'detail'] },
            { key: 'money', title: '金额', type: 'money', width: 80, sortable: 'custom' },
            { key: 'remark', title: '备注', type: 'text', width: 160, show: ['expand', 'detail'] },
            { key: '_add_time', title: '添加时间', type: 'time', width: 160, sortable: 'custom', valueFormat: 'yyyy-MM-dd hh:mm:ss' },
            { key: '_add_time', title: '距离现在', type: 'dateDiff', width: 120 },
          ],
          // 多选框选中的值
          multipleSelection: [],
          // 当前高亮的记录
          selectItem: '',
          rightBtnsMore: [
            {
              title: '按钮1',
              onClick: (item) => {
                vk.toast(`${item._id}-按钮1`);
              },
            },
            {
              title: '按钮2',
              onClick: (item) => {
                vk.toast(`${item._id}-按钮2`);
              },
            },
          ],
          batchBtns: [
            {
              title: '批量删除',
              type: 'danger',
              confirm: true,
              onClick: (items) => {
                this.batchDelete(items);
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
            { key: 'remark', title: '备注', type: 'text', mode: '%%' },
            { key: '_add_time', title: '添加时间', type: 'datetimerange', mode: '[]' },
          ],
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {},
          // 表单属性
          props: {
            // 表单请求地址
            action: '',
            // 表单字段显示规则
            columns: [
              {
                key: 'user_id',
                title: '选择用户',
                type: 'table-select',
                placeholder: '选择',
                action: 'admin/system/user/sys/getList',
                columns: [
                  { key: 'nickname', title: '用户昵称', type: 'text', nameKey: true },
                  { key: '_id', title: '用户标识', type: 'text', idKey: true },
                  { key: 'mobile', title: '手机号', type: 'text', defaultValue: '无' },
                ],
              },
              { key: 'money', title: '金额', type: 'money', placeholder: '请输入金额' },
              { key: 'remark', title: '备注', type: 'text', placeholder: '请输入备注' },
            ],
            // 表单验证规则
            rules: {
              user_id: [{ required: true, message: '请选择用户', trigger: 'change' }],
              money: [
                { required: true, message: '金额不能为空', trigger: 'blur' },
                { type: 'number', message: '金额必须是数字', trigger: 'blur' },
              ],
            },
            // add 代表添加 update 代表修改
            formType: '',
            // 是否显示表单的弹窗
            show: false,
          },
        },
        formDatas: {},
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
      // 页面返回
      pageBack(path) {
        const pages = getCurrentPages();
        if (pages.length > 1 && pages[0].route !== this.$page.route) {
          vk.navigateBack();
        } else if (path) {
          vk.navigateTo(path);
        }
      },
      // 表单重置
      resetForm() {
        vk.pubfn.resetForm(originalForms, this);
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
      },
      // 获取当前选中的行的数据
      getCurrentRow() {
        return this.$refs.table1.getCurrentRow();
      },
      // 监听 - 行的选中高亮事件
      currentChange(val) {
        this.table1.selectItem = val;
      },
      // 导出Excel
      exportExcel() {
        this.$refs.table1.exportExcel({
          showColumnSelector: true,
        });
      },
      // 当选择项发生变化时会触发该事件
      selectionChange(list) {
        this.table1.multipleSelection = list;
      },
      // 显示添加页面
      addBtn() {
        this.resetForm();
        this.form1.props.action = 'template/sys.table.save';
        this.form1.props.formType = 'add';
        this.form1.props.title = '添加';
        this.form1.props.show = true;
      },
      // 显示修改页面
      updateBtn({ item }) {
        this.form1.props.action = 'template/sys.table.save';
        this.form1.props.formType = 'update';
        this.form1.props.title = '编辑';
        this.form1.props.show = true;
        this.form1.data = item;
      },
      // 删除按钮
      deleteBtn({ item, deleteFn }) {
        deleteFn({
          action: 'template/sys.table.delete',
          data: {
            _id: item._id,
          },
          refresh: true,
        });
      },
      // 批量删除
      batchDelete(items) {
        const ids = items.map((item) => item._id);
        vk.callFunction({
          url: 'template/sys.table.delete',
          data: {
            _id: ids,
          },
          success: (data) => {
            this.$message.success(data.msg || '删除成功');
            this.refresh();
          },
        });
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

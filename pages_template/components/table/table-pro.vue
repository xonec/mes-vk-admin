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
        <!-- 左侧标题 -->
        <div class="vk-page-card-title">专业表格</div>
        <!-- 右侧操作栏 -->
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
          :right-btns="['detail_auto', 'update', 'delete', 'more']"
          :right-btns-more="table1.rightBtnsMore"
          :batch-btns="table1.batchBtns"
          :selection="true"
          :row-no="true"
          :pagination="true"
          :top="0"
          @update="updateBtn"
          @delete="deleteBtn"
          @current-change="currentChange"
        >
          <!-- 排序值 -->
          <template v-slot:sort="{ row, column, index }">
            <el-input v-model="row.sort" size="mini" @change="sortChange($event, row)" />
          </template>
        </vk-data-table>
      </div>
    </div>

    <!-- 添加或编辑的弹窗 -->
    <vk-data-dialog v-model="form1.props.show" :title="form1.props.title" width="680px" top="4vh" mode="form" :close-on-click-modal="false" :destroy-on-close="true">
      <vk-data-form
        v-model="form1.data"
        :rules="form1.props.rules"
        :action="form1.props.action"
        :form-type="form1.props.formType"
        :columns="form1.props.columns"
        label-width="140px"
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
            { key: 'sort', title: '排序', type: 'number', width: 80, sortable: 'custom' },
            { key: '_id', title: 'ID', type: 'text', width: 220 },
            { key: 'user_id', title: '用户ID', type: 'text', width: 220 },
            { key: 'remark', title: '备注', type: 'textarea', width: 150, align: 'left' },
            { key: 'avatar', title: '头像', type: 'avatar', width: 80, imageWidth: 40, shape: 'circle', lazy: true },
            { key: 'image', title: '图片', type: 'image', width: 80, lazy: true, imageWidth: 40 },
            { key: 'file_url', title: '文件', type: 'file', width: 80 },
            { key: 'rate', title: '评分', type: 'rate', width: 150 },
            { key: 'status', title: '只读开关', type: 'switch', width: 80, activeValue: 1, inactiveValue: 0 },
            {
              key: 'enable',
              title: '编辑开关',
              type: 'switch',
              width: 80,
              watch: (res) => {
                let { value, row, change } = res;
                vk.callFunction({
                  url: 'template/sys.table.updateBase',
                  title: '请求中...',
                  data: {
                    _id: row._id,
                    enable: value,
                  },
                  success: (data) => {
                    if (data.num > 0) {
                      change(value);
                    }
                  },
                });
              },
            },
            { key: 'icon', title: '图标', type: 'icon', width: 80, color: '#409EFF', size: 20 },
            { key: 'tag', title: '标签', type: 'tag', width: 100, tagType: 'success', effect: 'dark', size: 'medium' },
            { key: '_add_time', title: '添加时间', type: 'time', width: 160, sortable: 'custom', valueFormat: 'yyyy-MM-dd hh:mm:ss' },
            { key: '_add_time', title: '日期', type: 'date', width: 120, valueFormat: 'yyyy-MM-dd' },
            { key: '_add_time', title: '距离现在', type: 'dateDiff', width: 120 },
            { key: 'end_time', title: '剩余时间', type: 'dateDiff2', width: 120, endText: '已结束' },
            { key: 'html_content', title: 'HTML内容', type: 'html', width: 200, show: ['detail'] },
            { key: 'count', title: '数量', type: 'number', width: 100, precision: 0 },
            { key: 'money', title: '金额', type: 'money', width: 120, sortable: 'custom', defaultValue: '0.00' },
            { key: 'percentage', title: '百分比', type: 'percentage', width: 100 },
            { key: 'discount', title: '折扣', type: 'discount', width: 100 },
            { key: 'province', title: '省份', type: 'province', width: 120 },
            { key: 'address', title: '详细地址', type: 'address', width: 200 },
            { key: 'location', title: '位置', type: 'map', width: 200 },
            { key: 'userInfo', title: '用户信息', type: 'userInfo', width: 200, defaultValue: '无' },
            {
              key: 'group_info',
              title: '分组详情',
              type: 'group',
              width: 300,
              labelWidth: '80px',
              columns: [
                { key: 'field1', title: '字段1', type: 'text' },
                { key: 'field2', title: '字段2', type: 'text' },
              ],
            },
            {
              key: 'object_info',
              title: '对象详情',
              type: 'object',
              width: 300,
              columns: [
                { key: 'name', title: '名称', type: 'text' },
                { key: 'value', title: '值', type: 'text' },
              ],
            },
            {
              key: 'radio_value',
              title: '单选',
              type: 'radio',
              width: 100,
              data: [
                { value: 1, label: '选项1' },
                { value: 2, label: '选项2' },
              ],
            },
            {
              key: 'select_value',
              title: '下拉选择',
              type: 'select',
              width: 120,
              data: [
                { value: 1, label: '选项1' },
                { value: 2, label: '选项2' },
              ],
            },
            {
              key: 'select_value',
              title: '下拉选择',
              type: 'select',
              width: 120,
              defaultValue: 1,
              data: [
                { value: 1, label: '选项1' },
                { value: 2, label: '选项2' },
              ],
            },
            {
              key: 'checkbox_value',
              title: '多选',
              type: 'checkbox',
              width: 150,
              data: [
                { value: 1, label: '选项1' },
                { value: 2, label: '选项2' },
                { value: 3, label: '选项3' },
              ],
            },
            { key: 'string_array', title: '字符串数组', type: 'array<string>', width: 150, defaultValue: '无' },
            { key: 'password', title: '密码', type: 'password', width: 150, visibleRange: [3, 3] },
            { key: 'color', title: '颜色', type: 'color', width: 120 },
            // { key: "custom_field", title: "自定义", type: "custom", width: 150, component: "custom-component" },
          ],
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
            { key: 'money', type: 'money', title: '金额范围', placeholder: ['最小金额', '最大金额'], range: true, mode: '[]' },
            { key: 'remark', title: '备注', type: 'text', placeholder: '请输入备注', mode: '%%' },
            { key: '_id', title: 'ID', type: 'text', placeholder: '请输入ID', mode: '==' },
            {
              key: 'status',
              title: '状态',
              type: 'select',
              placeholder: '请选择',
              mode: '==',
              data: [
                { value: 0, label: '关闭' },
                { value: 1, label: '开启' },
              ],
            },
            {
              key: 'radio_value',
              title: '单选选项',
              type: 'radio',
              mode: '==',
              data: [
                { value: 1, label: '选项1' },
                { value: 2, label: '选项2' },
              ],
            },
            { key: 'province', title: '省份', type: 'province', placeholder: '请选择省份', mode: '==' },
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
              { key: 'sort', title: '排序', type: 'number', placeholder: '请输入排序值' },
              {
                key: 'user_id',
                title: '选择用户',
                type: 'table-select',
                placeholder: '请选择用户',
                action: 'admin/system/user/sys/getList',
                columns: [
                  { key: '_id', title: '用户ID', type: 'text', idKey: true, show: ['none'] },
                  { key: 'avatar', title: '头像', type: 'image', width: 80 },
                  { key: 'nickname', title: '用户昵称', type: 'text', minWidth: 200, nameKey: true },
                  { key: 'mobile', title: '手机号', type: 'text', minWidth: 140 },
                ],
                queryColumns: [
                  { key: 'nickname', title: '用户昵称', type: 'text', width: 150, mode: '%%' },
                  { key: 'mobile', title: '手机号', type: 'text', width: 150, mode: '%%' },
                ],
              },
              { key: 'remark', title: '备注', type: 'textarea', placeholder: '请输入备注', autosize: { minRows: 4, maxRows: 10 } },
              { key: 'avatar', title: '头像', type: 'avatar', placeholder: '请上传头像', limit: 1, accept: 'image/*' },
              { key: 'image', title: '图片', type: 'image', placeholder: '请上传图片', limit: 9, multiple: true, accept: 'image/*' },
              { key: 'file_url', title: '文件', type: 'file', placeholder: '请上传文件', limit: 1 },
              { key: 'rate', title: '评分', type: 'rate', allowHalf: true, showScore: true, textColor: '#409eff', placeholder: '请评分' },
              {
                key: 'status',
                title: '状态',
                type: 'switch',
                activeValue: 1,
                inactiveValue: 0,
                activeText: '开启',
                inactiveText: '关闭',
                inlinePrompt: true,
                hidden: (res) => {
                  return res.formType === 'update'; // 修改时隐藏
                },
              },
              { key: 'icon', title: '图标', type: 'icon', placeholder: '请选择图标' },
              { key: 'end_time', title: '结束时间', type: 'date', placeholder: '请选择结束时间', valueFormat: 'timestamp' },
              { key: 'html_content', title: '富文本编辑器', type: 'custom', component: 'custom-editor-tinymce', width: 500, height: 600, placeholder: '开始输入...' },
              { key: 'count', title: '数量', type: 'number', placeholder: '请输入数量', precision: 2, min: 0 },
              { key: 'money', title: '金额', type: 'money', placeholder: '请输入金额', precision: 2 },
              { key: 'percentage', title: '百分比', type: 'percentage', placeholder: '请输入百分比', precision: 2 },
              { key: 'discount', title: '折扣', type: 'discount', placeholder: '请输入折扣', precision: 2 },
              { key: 'province', title: '省份', type: 'province', placeholder: '请选择省份' },
              { key: 'address', title: '地址', type: 'address', placeholder: '请选择地址', level: 3 },
              { key: 'location', title: '地图位置', type: 'map', placeholder: '请选择位置', manualInput: true, requireMapKey: false },
              {
                key: 'user_info',
                title: '用户信息',
                type: 'object',
                columns: [
                  { key: '_id', title: '用户ID', type: 'text', placeholder: '请输入用户ID' },
                  { key: 'nickname', title: '昵称', type: 'text', placeholder: '请输入昵称' },
                  { key: 'avatar', title: '头像', type: 'avatar', placeholder: '请上传头像' },
                ],
              },
              { key: 'field1', title: '字段1', type: 'text', placeholder: '请输入字段1' },
              { key: 'field2', title: '字段2', type: 'text', placeholder: '请输入字段2' },
              {
                key: 'object_info',
                title: '对象详情',
                type: 'object',
                columns: [
                  { key: 'name', title: '名称', type: 'text', placeholder: '请输入名称' },
                  { key: 'value', title: '值', type: 'text', placeholder: '请输入值' },
                ],
              },
              {
                key: 'radio_value',
                title: '单选',
                type: 'radio',
                placeholder: '请选择',
                data: [
                  { value: 1, label: '选项1' },
                  { value: 2, label: '选项2' },
                ],
              },
              {
                key: 'select_value',
                title: '下拉选择',
                type: 'select',
                placeholder: '请选择',
                data: [
                  { value: 1, label: '选项1' },
                  { value: 2, label: '选项2' },
                ],
              },
              {
                key: 'checkbox_value',
                title: '多选',
                type: 'checkbox',
                placeholder: '请选择',
                data: [
                  { value: 1, label: '选项1' },
                  { value: 2, label: '选项2' },
                  { value: 3, label: '选项3' },
                ],
              },
              { key: 'string_array', title: '字符串数组', type: 'array<string>', placeholder: '请输入，多个用逗号分隔' },
              { key: 'password', title: '密码', type: 'password', placeholder: '请输入密码', showPassword: true },
              { key: 'color', title: '颜色', type: 'color', placeholder: '请选择颜色' },
            ],
            // 表单验证规则
            rules: {
              money: [
                { required: true, message: '金额不能为空', trigger: 'blur' },
                { type: 'number', message: '金额必须是数字', trigger: 'blur' },
              ],
              remark: [{ required: true, message: '备注不能为空', trigger: 'blur' }],
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
      // 监听 - 查询表单折叠面板变化事件
      collapseChange() {
        // 执行表格重新布局
        this.$refs.table1.doLayout();
      },
      // 导出Excel
      exportExcel() {
        this.$refs.table1.exportExcel({
          showColumnSelector: true,
        });
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
      // 修改排序值
      sortChange(sort, item) {
        vk.callFunction({
          url: 'template/sys.table.updateBase',
          data: {
            _id: item._id,
            sort: Number(sort),
          },
          success: (data) => {},
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

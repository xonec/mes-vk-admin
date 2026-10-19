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
        <div class="vk-page-card-title">错误日志列表</div>
        <div class="vk-page-card-actions">
          <el-button
            type="warning"
            :size="$global.size"
            icon="el-icon-circle-check"
            :loading="loading"
            :disabled="loading"
            @click="markAllPendingHandled"
          >
            全部标记已处理
          </el-button>
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
          :custom-right-btns="table1.customRightBtns"
          :selection="true"
          :selectable="table1.selectable"
          :batch-btns="table1.batchBtns"
          :default-sort="{ name: 'count', type: 'desc' }"
          secondary-sort-key="_id"
          :row-no="true"
          :pagination="true"
          :top="0"
        ></vk-data-table>
      </div>
    </div>

    <!-- 添加或编辑的弹窗 -->
    <vk-data-dialog v-model="form1.props.show" :title="form1.props.title" width="800px" mode="form" top="2vh">
      <vk-data-form
        ref="form1"
        v-model="form1.data"
        :rules="form1.props.rules"
        :action="form1.props.action"
        :form-type="form1.props.formType"
        :columns="form1.props.columns"
        label-width="80px"
        @success="updateSuccess"
      >
        <template v-slot:data="{ form, keyName }">
          <div class="stack-view">
            <text space="ensp" style="font-size: 13px" v-if="form.data">{{ form.data }}</text>
          </div>
        </template>
        <template v-slot:stack="{ form, keyName }">
          <div class="stack-view">
            <text space="ensp" style="font-size: 13px" v-if="form.err">{{ form.err.stack || form.err }}</text>
          </div>
        </template>
      </vk-data-form>
    </vk-data-dialog>
  </div>
</template>

<script>
  let vk = uni.vk; // vk实例
  let dcloudAppidData = [];

  let statusData = [
    { value: 0, label: '待处理', tagType: 'danger' },
    { value: 1, label: '已处理', tagType: 'success' },
    { value: 2, label: '不处理', tagType: 'info' },
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
          action: 'admin/system_uni/error-log/sys/getList',
          // 表格字段显示规则
          columns: [
            { key: 'userInfo', title: '用户信息', type: 'userInfo', width: 150 },
            { key: 'request_id', title: '请求ID', type: 'text', width: 300 },
            { key: 'url', title: '请求地址', type: 'text', width: 300 },
            { key: 'data', title: '请求参数', type: 'json', width: 190 },
            { key: 'count', title: '出现次数', type: 'number', width: 110, sortable: 'custom' },
            { key: 'status', title: '当前状态', type: 'tag', width: 100, data: statusData },
            { key: 'err.message', title: '错误信息', type: 'text', width: 300, show: ['rows'] },
            {
              key: 'err',
              title: '错误堆栈',
              type: 'html',
              width: 200,
              show: ['detail'],
              formatter: (val, row, column, index) => {
                if (typeof val.stack === 'undefined') {
                  return JSON.stringify(val);
                }
                let str = val.stack.replace(/\n/g, '<br>');
                return str;
              },
            },
            { key: '_add_time', title: '添加时间', type: 'time', width: 160, sortable: 'custom' },
            { key: '_add_time', title: '距离现在', type: 'dateDiff', width: 120 },
            { key: 'md5', title: 'MD5值', type: 'text', width: 280 },
          ],
          // 多选框选中的值
          multipleSelection: [],
          // 仅待处理错误可以执行批量操作
          selectable: (row) => {
            return row.status === 0;
          },
          // 底部批量操作按钮
          batchBtns: [
            {
              title: '批量标记已处理',
              type: 'success',
              icon: 'el-icon-circle-check',
              confirm: true,
              onClick: (items) => {
                this.batchUpdateStatus(items, 1);
              },
            },
            {
              title: '批量标记不处理',
              type: 'info',
              icon: 'el-icon-remove-outline',
              confirm: true,
              onClick: (items) => {
                this.batchUpdateStatus(items, 2);
              },
            },
          ],
          // 当前高亮的记录
          selectItem: '',
          customRightBtns: [
            {
              title: '处理',
              type: 'primary',
              icon: 'el-icon-edit',
              disabled: (formData) => {
                return formData.status === 0 ? false : true;
              },
              onClick: (item) => {
                this.updateBtn({ item: vk.pubfn.copyObject(item) });
              },
            },
          ],
        },
        // 表格相关结束 -----------------------------------------------------------
        // 表单相关开始 -----------------------------------------------------------
        // 查询表单请求数据
        queryForm1: {
          // 查询表单数据源，可在此设置默认值
          formData: {
            dcloud_appid: '',
            status: 0,
            _add_time: [],
          },
          // 查询表单的字段规则 fieldName:指定数据库字段名,不填默认等于key
          columns: [
            { key: 'request_id', title: '请求ID', type: 'text', mode: '=' },
            { key: 'url', title: '请求地址', type: 'text', mode: '=' },
            {
              key: 'status',
              title: '当前状态',
              type: 'select',
              mode: '=',
              clearable: false,
              data: [{ value: '', label: '全部' }, ...statusData],
            },
            { key: '_add_time', title: '添加时间', type: 'datetimerange', mode: '[]', clearable: false },
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
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {},
          // 表单属性
          props: {
            // 表单请求地址
            action: '',
            // 表单字段显示规则
            columns: [
              // { key: "request_id", title: "请求ID", type: "text-view" },
              { key: 'url', title: '请求地址', type: 'text-view' },
              { key: 'data', title: '请求参数', type: 'text-view' },
              { key: 'md5', title: 'md5', type: 'text-view' },
              { key: 'stack', title: '错误堆栈', type: 'text-view' },
              { key: 'status', title: '当前状态', type: 'radio', optionType: 'button', width: 140, clearable: false, data: statusData },
              {
                key: 'comment',
                title: '备注',
                type: 'textarea',
                placeholder: '请输入备注',
                autosize: { minRows: 4, maxRows: 10 },
                maxlength: 1000,
                showWordLimit: true,
              },
            ],
            // 表单验证规则
            rules: {},
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
        // 默认查询近7天的数据
        let { startTime } = vk.pubfn.getDayOffsetStartAndEnd(-7);
        let { endTime } = vk.pubfn.getDayOffsetStartAndEnd(0);
        this.queryForm1.formData._add_time = [startTime, endTime];
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
      // 批量修改选中错误的状态
      batchUpdateStatus(items, status) {
        let md5List = items.map((item) => item.md5);
        vk.callFunction({
          url: 'admin/system_uni/error-log/sys/update',
          title: '处理中...',
          data: {
            mode: 'batch',
            md5List,
            status,
          },
          success: (data) => {
            this.batchUpdateSuccess(data);
          },
        });
      },
      // 将全库所有待处理错误标记为已处理
      markAllPendingHandled() {
        this.$confirm('此操作会将全库所有待处理错误标记为已处理，不受当前筛选条件影响，是否继续？', '确认操作', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
          .then(() => {
            vk.callFunction({
              url: 'admin/system_uni/error-log/sys/update',
              loading: { that: this, name: 'loading' },
              data: {
                mode: 'allPending',
              },
              success: (data) => {
                this.batchUpdateSuccess(data);
              },
            });
          })
          .catch(() => {});
      },
      // 批量操作成功
      batchUpdateSuccess(data) {
        let num = Number(data.num) || 0;
        if (num > 0) {
          this.$message.success(`操作成功，共更新 ${num} 条错误日志`);
        } else {
          this.$message.info('没有需要更新的待处理错误日志');
        }
        this.$refs.table1.clearSelection();
        this.$refs.table1.refresh();
      },
      // 显示修改页面
      updateBtn({ item }) {
        this.form1.props.action = 'admin/system_uni/error-log/sys/update';
        this.form1.props.formType = 'update';
        this.form1.props.title = '处理';
        this.form1.props.show = true;
        this.form1.data = item;
      },
      updateSuccess() {
        this.form1.props.show = false;
        this.$refs.table1.updateRows({
          mode: 'update', // update 局部字段更新 set 覆盖字段更新
          rows: [
            {
              _id: this.form1.data._id,
              status: this.form1.data.status,
            },
          ],
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
  .stack-view {
    background-color: #f6f8fa;
    padding: 5px 10px;
    line-height: 24px !important;
    max-height: 400px;
    overflow-y: auto;
  }
</style>

<!-- 请不要修改此页面的代码，因为更新后会覆盖，你自己系统的用户管理不应该在这个页面上开发，你应该复制整个页面，在别的目录创建用户管理。 -->
<!-- 请不要修改此页面的代码，因为更新后会覆盖，你自己系统的用户管理不应该在这个页面上开发，你应该复制整个页面，在别的目录创建用户管理。 -->
<!-- 请不要修改此页面的代码，因为更新后会覆盖，你自己系统的用户管理不应该在这个页面上开发，你应该复制整个页面，在别的目录创建用户管理。 -->
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
        <!-- 左侧标题 -->
        <div class="vk-page-card-title">用户列表</div>
        <!-- 右侧操作栏 -->
        <div class="vk-page-card-actions">
          <el-button type="primary" :size="$global.size" icon="el-icon-plus" @click="addBtn">添加用户</el-button>
          <el-tooltip :disabled="!!table1.selectItem" content="请先点击需要操作的用户" placement="top">
            <el-button type="warning" :size="$global.size" icon="el-icon-user" :disabled="!table1.selectItem" @click="bindRoleBtn()">绑定角色</el-button>
          </el-tooltip>
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
          :right-btns="['detail', 'update', 'delete', 'more']"
          :right-btns-more="table1.rightBtnsMore"
          :batch-btns="table1.batchBtns"
          :selection="true"
          :row-no="true"
          :pagination="true"
          :top="0"
          @detail="detailBtn"
          @update="updateBtn"
          @delete="deleteBtn"
          @current-change="currentChange"
        ></vk-data-table>
      </div>
    </div>

    <!-- 添加或编辑的弹窗 -->
    <vk-data-dialog v-model="form1.props.show" :title="form1.props.title" width="580px" top="4vh" mode="form">
      <vk-data-form
        ref="form1"
        v-model="form1.data"
        :rules="form1.props.rules"
        :action="form1.props.action"
        :form-type="form1.props.formType"
        :columns="form1.props.columns"
        label-width="120px"
        max-height="700px"
        @success="
          form1.props.show = false;
          refresh();
          $refs.detailRef.refresh();
        "
      >
        <template v-slot:tags="{ form, keyName }">
          <userTagsSelect v-model="form[keyName]"></userTagsSelect>
        </template>
      </vk-data-form>
    </vk-data-dialog>

    <!-- 用户详情弹窗 -->
    <detail
      ref="detailRef"
      v-model="formDatas.detail"
      @edit-user="detailEditUser"
      @edit-tags="detailEditTags"
      @edit-comment="detailEditComment"
      @reset-password="detailResetPassword"
      @bind-role="detailBindRole"
    ></detail>
    <!-- 用户角色授权弹窗 -->
    <bindRole
      v-model="formDatas.bindRole"
      @success="
        refresh();
        $refs.detailRef.refresh();
      "
    ></bindRole>
    <!-- 重置密码弹窗 -->
    <resetPassword v-model="formDatas.resetPassword"></resetPassword>
    <!-- 批量设置用户允许登录的客户端 -->
    <setAuthorizedAppLogin v-model="formDatas.setAuthorizedAppLogin" @success="refresh"></setAuthorizedAppLogin>
  </div>
</template>

<script>
  let vk = uni.vk; // vk实例
  let originalForms = {}; // 表单初始化数据
  let genderData = [
    { value: 1, label: '男' },
    { value: 2, label: '女' },
    { value: 0, label: '保密' },
  ];
  let dcloudAppidData = [];

  import bindRole from './form/bindRole';
  import detail from './form/detail';
  import resetPassword from './form/resetPassword';
  import setAuthorizedAppLogin from './form/setAuthorizedAppLogin';
  import userTagsSelect from './form/userTagsSelect';

  export default {
    components: {
      bindRole,
      detail,
      resetPassword,
      setAuthorizedAppLogin,
      userTagsSelect,
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
          action: 'admin/system/user/sys/getList',
          // 表格字段显示规则
          columns: [
            { key: 'avatar', title: '头像', type: 'avatar', width: 80 },
            { key: 'username', title: '用户名', type: 'text', width: 180, defaultValue: '未设置' },
            { key: 'nickname', title: '昵称', type: 'text', width: 180, defaultValue: '未设置' },
            { key: 'mobile', title: '手机号', type: 'text', width: 120, defaultValue: '未绑定' },
            { key: 'email', title: '邮箱', type: 'text', width: 180, defaultValue: '未绑定' },
            {
              key: 'appList',
              title: '可登录的应用',
              type: 'html',
              width: 220,
              formatter: (val, row, column, index) => {
                if (typeof row.dcloud_appid === 'undefined') return '全部应用';
                if (row.dcloud_appid.length === 0) return '未绑定任何应用';
                if (val.length === 0 && row.dcloud_appid.length > 0) return row.dcloud_appid;
                let str = '';
                val.map((item, index) => {
                  str += `、${item.name}`;
                });
                if (str) str = str.substring(1);
                return str;
              },
            },
            {
              key: 'roleList',
              title: '角色',
              type: 'text',
              width: 120,
              defaultValue: '-',
              formatter: (val) => {
                if (vk.pubfn.isNull(val) || val.length === 0) return '-';
                let names = val.map((item) => item.role_name || item.role_id);
                return names.join('、');
              },
            },
            { key: 'comment', title: '备注', type: 'text', width: 160 },
            {
              key: 'allow_login_background',
              title: '允许登录后台',
              type: 'tag',
              width: 140,
              defaultValue: false,
              sortable: 'custom',
              data: [
                { value: true, label: '允许', tagType: 'success' },
                { value: false, label: '禁止', tagType: 'danger' },
              ],
            },
            {
              key: 'status',
              title: '账户状态',
              type: 'tag',
              width: 120,
              defaultValue: 0,
              sortable: 'custom',
              data: [
                { value: 0, label: '正常', tagType: 'success' },
                { value: 1, label: '冻结', tagType: 'danger' },
                { value: 2, label: '审核中', tagType: 'primary' },
                { value: 3, label: '审核拒绝', tagType: 'info' },
              ],
            },
            {
              key: 'gender',
              title: '性别',
              type: 'radio',
              width: 80,
              defaultValue: 0,
              sortable: 'custom',
              data: genderData,
            },
            { key: 'register_date', title: '注册时间', type: 'time', width: 160, sortable: 'custom' },
            { key: 'last_login_date', title: '最后登录时间', type: 'dateDiff', width: 140, defaultValue: '从未登录过', sortable: 'custom' },
            { key: 'last_login_ip', title: '最后登录ip', type: 'text', width: 120, defaultValue: '从未登录过' },
            { key: '_id', title: 'id', type: 'text', width: 280 },
          ],
          // 当前高亮的记录
          selectItem: '',
          rightBtnsMore: [
            {
              title: '重置密码',
              onClick: (item) => {
                this.resetPasswordBtn(item);
              },
            },
          ],
          batchBtns: [
            {
              title: '批量冻结',
              type: 'danger',
              confirm: true,
              onClick: (items) => {
                this.frozen(items, 1);
              },
            },
            {
              title: '批量解冻',
              confirm: true,
              onClick: (items) => {
                this.frozen(items, 0);
              },
            },
            {
              title: '批量设置可登录应用',
              onClick: (items) => {
                this.setAuthorizedAppLogin(items);
              },
            },
          ],
        },
        // 表格相关结束 -----------------------------------------------------------
        // 表单相关开始-----------------------------------------------------------
        // 查询表单请求数据
        queryForm1: {
          // 查询表单数据源，可在此设置默认值
          formData: {
            dcloud_appid: '',
          },
          // 查询表单的字段规则 fieldName:指定数据库字段名,不填默认等于key
          columns: [
            {
              key: 'dcloud_appid',
              title: '所属应用',
              type: 'select',
              mode: 'custom',
              data: [],
              props: {
                value: 'appid',
                label: 'name',
              },
            },
            { key: 'searchvalue', title: '', placeholder: '输入用户名、昵称、手机号、邮箱、ID搜索', type: 'text', mode: 'custom' },
            { key: 'register_date', title: '注册时间', type: 'datetimerange', span: 4, mode: '[]' }, // 这里 span: 4 是为了让搜索按钮在同一行显示，具体可以根据实际情况调整
            { key: 'allow_login_background', hidden: true, mode: '=' }, // hidden: true 代表隐藏不显示
          ],
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {
            gender: 0,
            login_appid_type: 1,
            allow_login_background: false,
            tags: [],
          },
          // 表单属性
          props: {
            // 表单请求地址
            action: '',
            // 表单字段显示规则
            columns: [
              { key: 'username', title: '用户名', type: 'text', show: ['add'] },
              { key: 'nickname', title: '昵称', type: 'text', show: ['add', 'update'] },
              { key: 'avatar', title: '头像', type: 'file-select', placeholder: '请选择头像', fileType: 'image', multipleLimit: 1, imageFit: 'cover', show: ['add', 'update'] },
              {
                key: 'gender',
                title: '性别',
                type: 'radio',
                data: genderData,
                show: ['add', 'update'],
              },
              { key: 'password', title: '密码', type: 'text', tips: '若密码为空，则默认为234567', show: ['add'] },
              { key: 'mobile', title: '手机号', type: 'text', show: ['add', 'update'] },
              { key: 'email', title: '邮箱', type: 'text', show: ['add', 'update'] },
              {
                key: 'login_appid_type',
                title: '登录权限',
                type: 'radio',
                optionType: 'button',
                data: [
                  { value: 1, label: '部分应用' },
                  { value: 0, label: '全部应用' },
                ],
                show: ['add', 'update'],
                watch: ({ value, formData, column, index, option, $set }) => {
                  if (value === 1) {
                    $set('allow_login_background', false);
                  } else {
                    $set('allow_login_background', true);
                  }
                },
              },
              {
                key: 'dcloud_appid',
                title: '可登录的应用',
                type: 'checkbox',
                border: true,
                itemWidth: 100,
                data: [],
                props: { value: 'appid', label: 'name' },
                show: ['add', 'update'],
                showRule: 'login_appid_type=1',
                watch: ({ value, formData, column, index, option = [], $set }) => {
                  let allow_login_background = false;
                  option.map((item = {}, index) => {
                    if (item.type && item.type.indexOf('admin') > -1) {
                      allow_login_background = true;
                    }
                  });
                  $set('allow_login_background', allow_login_background);
                },
              },
              // {
              //   key:"allow_login_background", title:"允许登录后台?", type:"switch",
              //   tips:"只有同时设置可登录的应用有管理端以及允许登后台，该用户才能登录管理端"
              // },
              {
                key: 'tags',
                title: '标签',
                type: 'text',
                show: ['add', 'update', 'tags'],
              },
              {
                key: 'comment',
                title: '备注',
                type: 'textarea',
                maxlength: 99,
                showWordLimit: true,
                autosize: { minRows: 2, maxRows: 10 },
                show: ['add', 'update', 'comment'],
              },
            ],
            // 表单对应的验证规则
            rules: {
              username: [{ required: true, validator: vk.pubfn.validator('username'), message: '用户名以字母开头，长度在6~18之间，只能包含字母、数字和下划线', trigger: 'blur' }],
              nickname: [
                { required: true, message: '昵称为必填字段', trigger: 'blur' },
                { min: 2, max: 20, message: '昵称长度在 2 到 20 个字符', trigger: 'blur' },
              ],
              password: [{ validator: vk.pubfn.validator('password'), message: '密码长度在6~18之间，只能包含字母、数字和下划线', trigger: 'blur' }],
              mobile: [{ validator: vk.pubfn.validator('mobile'), message: '手机号格式错误', trigger: 'blur' }],
              email: [{ validator: vk.pubfn.validator('email'), message: '邮箱格式错误', trigger: 'blur' }],
            },
            // add 代表添加 update 代表修改
            formType: '',
            // 是否显示表单1 的弹窗
            show: false,
          },
        },
        // 其他表单属性容器(请勿修改)
        formDatas: {},
        // 表单相关结束-----------------------------------------------------------
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
        this.getAppList();
      },
      // 获取应用列表
      getAppList(obj) {
        // 请在store/modules/$app.js文件里增加代码 appList: lifeData.$app.appList || []
        vk.callFunction({
          url: 'admin/system/app/sys/getList',
          data: {},
          success: (data) => {
            dcloudAppidData = data.rows;
            let dcloudAppidData1 = vk.pubfn.copyObject(data.rows);
            let dcloudAppidData2 = vk.pubfn.copyObject(data.rows);
            let index1 = vk.pubfn.getListIndex(this.form1.props.columns, 'key', 'dcloud_appid');
            this.form1.props.columns[index1].data = dcloudAppidData1;
            dcloudAppidData2.unshift({
              appid: '___error___',
              name: '不存在的应用',
            });
            dcloudAppidData2.unshift({
              appid: '___empty-array___',
              name: '未绑定应用',
            });
            dcloudAppidData2.unshift({
              appid: '___non-existent___',
              name: '全部应用',
            });
            let index2 = vk.pubfn.getListIndex(this.queryForm1.columns, 'key', 'dcloud_appid');
            this.queryForm1.columns[index2].data = dcloudAppidData2;
            let appids = [];
            dcloudAppidData.map((item, index) => {
              appids.push(item.appid);
            });
            this.queryForm1.formData.appids = appids;
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
      getCurrentRow(key) {
        return this.$refs.table1.getCurrentRow(key);
      },
      // 监听 - 行的选中高亮事件
      currentChange(val) {
        this.table1.selectItem = val;
      },
      // 显示添加页面
      addBtn() {
        this.resetForm();
        this.form1.props.action = 'admin/system/user/sys/add';
        this.form1.props.formType = 'add';
        this.form1.props.title = '添加';
        this.form1.props.show = true;
      },
      // 显示修改页面
      updateBtn({ item }) {
        this.form1.props.action = 'admin/system/user/sys/update';
        this.form1.props.formType = 'update';
        this.form1.props.title = '编辑';
        this.form1.props.show = true;
        item.login_appid_type = typeof item.dcloud_appid === 'undefined' ? 0 : 1;
        this.form1.data = item;
      },
      // 删除按钮
      deleteBtn({ item, deleteFn }) {
        deleteFn({
          action: 'admin/system/user/sys/delete',
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
      // 角色绑定按钮
      bindRoleBtn(item) {
        if (!item) item = this.getCurrentRow(true);
        vk.pubfn.openForm('bindRole', { item });
      },
      // 详情按钮
      detailBtn({ row }) {
        vk.pubfn.openForm('detail', { item: row });
      },
      // 详情弹窗 - 编辑用户
      detailEditUser(item) {
        this.updateBtn({ item: vk.pubfn.copyObject(item) });
      },
      detailEditTags(item) {
        this.form1.props.action = 'admin/system/user/sys/update';
        this.form1.props.formType = 'tags';
        this.form1.props.title = '编辑标签';
        this.form1.props.show = true;
        this.form1.data = item;
      },
      detailEditComment(item) {
        this.form1.props.action = 'admin/system/user/sys/update';
        this.form1.props.formType = 'comment';
        this.form1.props.title = '编辑备注';
        this.form1.props.show = true;
        this.form1.data = item;
      },
      // 详情弹窗 - 重置密码
      detailResetPassword(item) {
        this.resetPasswordBtn(item);
      },
      // 详情弹窗 - 绑定角色
      detailBindRole(item) {
        this.bindRoleBtn(item);
      },
      // 重置密码按钮
      resetPasswordBtn(item) {
        vk.pubfn.openForm('resetPassword', { item });
      },
      //账户批量冻结/解冻
      frozen(items, status) {
        let user_ids = items.map((item) => item._id);
        vk.callFunction({
          url: 'admin/system/user/sys/batchUpdateStatus',
          title: '请求中...',
          data: {
            user_ids,
            status,
          },
          success: (data) => {
            this.$notify({
              message: '批量操作成功!',
              type: 'success',
            });
            this.refresh();
          },
        });
      },
      // 批量设置允许登录的客户端
      setAuthorizedAppLogin(items) {
        let user_ids = items.map((item) => item._id);
        this.formDatas.setAuthorizedAppLogin = {
          show: true,
          item: {
            user_ids,
            dcloudAppidData,
          },
        };
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

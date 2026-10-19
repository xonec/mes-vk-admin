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
        <div class="vk-page-card-title">角色列表</div>
        <div class="vk-page-card-actions">
          <el-button type="primary" :size="$global.size" icon="el-icon-plus" @click="addBtn">添加角色</el-button>
          <el-tooltip :disabled="!!table1.selectItem" content="请先点击需要操作的角色" placement="top">
            <el-button type="success" :size="$global.size" icon="el-icon-key" :disabled="!table1.selectItem" @click="bindPermissionBtn">权限赋予</el-button>
          </el-tooltip>
          <el-tooltip :disabled="!!table1.selectItem" content="请先点击需要操作的角色" placement="top">
            <el-button type="warning" :size="$global.size" icon="el-icon-menu" :disabled="!table1.selectItem" @click="bindMenu">菜单赋予</el-button>
          </el-tooltip>
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

    <!-- 添加或编辑的弹窗 -->
    <vk-data-dialog v-model="form1.props.show" :title="form1.props.title" width="500px" mode="form">
      <vk-data-form
        v-model="form1.data"
        :rules="form1.props.rules"
        :action="form1.props.action"
        :form-type="form1.props.formType"
        :columns="form1.props.columns"
        label-width="80px"
        @success="
          form1.props.show = false;
          refresh();
        "
      ></vk-data-form>
    </vk-data-dialog>

    <!-- 角色赋予权限弹窗 -->
    <bindPermission v-model="formDatas.bindPermission"></bindPermission>
    <!-- 角色赋予菜单弹窗 -->
    <bindMenu v-model="formDatas.bindMenu"></bindMenu>
  </div>
</template>

<script>
  let vk = uni.vk; // vk实例
  let originalForms = {}; // 表单初始化数据

  import bindPermission from './form/bindPermission';
  import bindMenu from './form/bindMenu';
  export default {
    components: {
      bindPermission,
      bindMenu,
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
          action: 'admin/system/role/sys/getList',
          // 表格字段显示规则
          columns: [
            { key: 'role_id', title: '角色标识', type: 'text', width: 220 },
            { key: 'role_name', title: '角色名称', type: 'text', width: 130 },
            { key: 'comment', title: '备注', type: 'text', minWidth: 180 },
            {
              key: 'permissionList',
              title: '拥有的权限',
              type: 'text',
              minWidth: 290,
              align: 'left',
              formatter: (val, row, column, index) => {
                let str = '';
                if (row.role_id === 'admin') {
                  str = '系统内置角色 - 拥有所有权限';
                } else if (vk.pubfn.isNull(val)) {
                  str = '该角色未赋予任何权限';
                } else {
                  val.map((item, index) => {
                    if (vk.pubfn.isNotNull(item.url)) {
                      str += item.permission_name;
                      if (index !== val.length - 1) {
                        str += '、';
                      }
                    }
                  });
                }
                return str;
              },
            },
            {
              key: 'menuList',
              title: '拥有的菜单',
              type: 'text',
              minWidth: 290,
              align: 'left',
              formatter: (val, row, column, index) => {
                let str = '';
                if (vk.pubfn.isNull(val)) {
                  if (row.role_id === 'admin') {
                    str = '系统内置角色 - 拥有所有菜单';
                  } else {
                    str = '该角色未赋予任何菜单';
                  }
                } else {
                  val.map((item, index) => {
                    str += item.name;
                    if (index !== val.length - 1) {
                      str += '、';
                    }
                  });
                }
                return str;
              },
            },
            // 系统
            {
              key: 'stats_count_info',
              title: '统计信息',
              type: 'html',
              width: 220,
              align: 'left',
              show: ['detail'],
              formatter: (val, row, column, index) => {
                console.log(`val`, val);
                let str = ``;
                if (row.role_id === 'admin') {
                  return '拥有所有权限';
                }
                for (let value in val) {
                  switch (value) {
                    case 'curd_category':
                      str += `分类:&nbsp;&nbsp;`;
                      break;
                    case 'level':
                      str += `等级:&nbsp;&nbsp;`;
                      break;
                    case 'match_mode':
                      str += `模式:&nbsp;&nbsp;`;
                      break;
                    default:
                      str += `菜单和权限:&nbsp;&nbsp;`;
                      break;
                  }
                  for (let [index, item] of val[value].entries()) {
                    str += `${item.label} : ${item.count}个&nbsp;&nbsp;`;
                  }
                  str += `<br/>`;
                }
                return str;
              },
            },
            {
              key: 'enable',
              title: '是否启用',
              type: 'switch',
              activeValue: true,
              inactiveValue: false,
              width: 80,
              watch: (res) => {
                let { value, row, change } = res;
                vk.callFunction({
                  url: 'admin/system/role/sys/updateBase',
                  title: value ? '启用中...' : '关闭中...',
                  data: {
                    _id: row._id,
                    enable: value,
                  },
                  success: (data) => {
                    change(value); // 这一步是让表格行内的开关改变显示状态
                  },
                });
              },
            },
          ],
          // 多选框选中的值
          multipleSelection: [],
          // 当前高亮的记录
          selectItem: '',
        },
        // 表格相关结束 -----------------------------------------------------------
        // 表单相关开始-----------------------------------------------------------
        // 查询表单请求数据
        queryForm1: {
          // 查询表单数据源，可在此设置默认值
          formData: {},
          // 查询表单的字段规则 fieldName:指定数据库字段名,不填默认等于key
          columns: [
            { key: 'role_id', title: '角色标识', type: 'text', mode: '%%' },
            { key: 'role_name', title: '角色名称', type: 'text', mode: '%%' },
            { key: '_add_time', title: '添加时间', type: 'datetimerange', span: 4, mode: '[]' },
          ],
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {
            enable: true,
          },
          // 表单属性
          props: {
            // 表单请求地址
            action: '',
            // 表单字段显示规则
            columns: [
              { key: 'role_id', title: '角色标识', type: 'text', show: ['add'] },
              { key: 'role_name', title: '角色名称', type: 'text' },
              {
                key: 'comment',
                title: '备注',
                type: 'textarea',
                maxlength: '99',
                showWordLimit: true,
                autosize: { minRows: 2, maxRows: 10 },
              },
              { key: 'enable', title: '是否启用', type: 'switch' },
            ],
            // 表单验证规则
            rules: {
              role_id: [{ required: true, message: '角色标识不能为空', trigger: 'blur' }],
              role_name: [{ required: true, message: '角色名称不能为空', trigger: 'change' }],
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
      // 当选择项发生变化时会触发该事件
      selectionChange(list) {
        this.table1.multipleSelection = list;
      },
      // 显示添加页面
      addBtn() {
        this.resetForm();
        this.form1.props.action = 'admin/system/role/sys/add';
        this.form1.props.formType = 'add';
        this.form1.props.title = '添加';
        this.form1.props.show = true;
      },
      // 显示修改页面
      updateBtn({ item }) {
        this.form1.props.action = 'admin/system/role/sys/update';
        this.form1.props.formType = 'update';
        this.form1.props.title = '编辑';
        this.form1.props.show = true;
        this.form1.data = item;
      },
      // 删除按钮
      deleteBtn({ item, deleteFn }) {
        deleteFn({
          action: 'admin/system/role/sys/delete',
          data: {
            role_id: item.role_id,
          },
        });
      },
      // 权限赋予按钮
      bindPermissionBtn() {
        let item = this.getCurrentRow(true);
        vk.pubfn.openForm('bindPermission', { item });
      },
      // 菜单赋予绑定按钮
      bindMenu() {
        let item = this.getCurrentRow(true);
        vk.pubfn.openForm('bindMenu', { item });
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

<template>
  <div>
    <!-- 表格内容卡片 -->
    <div class="vk-page-card">
      <!-- 操作按钮与表格标题区域 -->
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">菜单列表</div>
        <div class="vk-page-card-actions">
          <el-button type="primary" :size="$global.size" icon="el-icon-plus" @click="addBtn">添加菜单</el-button>
          <el-tooltip :disabled="!!table1.selectItem" content="请先点击需要操作的菜单" placement="top">
            <el-button type="success" :size="$global.size" icon="el-icon-key" :disabled="!table1.selectItem" @click="bindPermissionBtn">设置内置权限</el-button>
          </el-tooltip>
          <el-button :size="$global.size" icon="el-icon-upload2" @click="addMenuByJsonBtn">通过JSON批量导入</el-button>
          <el-button :size="$global.size" icon="el-icon-data-line" @click="initVkStatBtn">初始化vk统计</el-button>
          <el-badge v-if="pluginMenus && pluginMenus.length > 0" :value="pluginMenus.length" class="item">
            <el-button type="warning" :size="$global.size" icon="el-icon-plus" style="margin-right: 0" @click="addPluginMenuMenu">待添加的插件菜单</el-button>
          </el-badge>
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
          :default-expand-all="false"
          :fullscreen="true"
          :top="0"
          @update="updateBtn"
          @delete="deleteBtn"
          @current-change="currentChange"
          @selection-change="selectionChange"
          @success="tableSuccess"
        >
          <!-- 排序值 -->
          <template v-slot:sort="{ row, column, index }">
            <el-input v-model="row.sort" size="mini" @change="sortChange($event, row)" />
          </template>
        </vk-data-table>
      </div>
    </div>

    <!-- 添加或编辑的弹窗 -->
    <vk-data-dialog v-model="form1.props.show" :title="form1.props.title" width="700px" mode="form">
      <vk-data-form
        v-model="form1.data"
        :rules="form1.props.rules"
        :action="form1.props.action"
        :form-type="form1.props.formType"
        :columns="form1.props.columns"
        label-width="80px"
        @success="formSuccess"
      ></vk-data-form>
    </vk-data-dialog>

    <!-- 设置角色权限组件 -->
    <bindPermission v-model="formDatas.bindPermission"></bindPermission>

    <!-- 通过JSON批量导入菜单 -->
    <addMenuByJson v-model="formDatas.addMenuByJson" @success="refresh"></addMenuByJson>

    <!-- 添加插件菜单 -->
    <addPluginMenu v-model="formDatas.addPluginMenu" @success="refresh"></addPluginMenu>
  </div>
</template>

<script>
  import bindPermission from './form/bindPermission.vue';
  import addMenuByJson from './form/addMenuByJson.vue';
  import addPluginMenu from './form/addPluginMenu.vue';

  import getPluginMenu from './libs/pluginMenu.js';
  import vkStatMenus from './libs/vk-stat.json';
  const pluginMenuJsons = getPluginMenu();

  let vk = uni.vk; // vk实例
  let originalForms = {}; // 表单初始化数据

  const matchModeData = [
    { value: 0, label: '完整路径' },
    { value: 1, label: '通配符' },
    { value: 2, label: '正则表达式' },
  ];
  const curdCategoryData = [
    { value: 1, label: '增', tagType: 'success' },
    { value: 2, label: '删', tagType: 'danger' },
    { value: 3, label: '改', tagType: '' },
    { value: 4, label: '查', tagType: 'info' },
    { value: 5, label: '特殊', icon: 'info' },
    { value: 0, label: '其他', icon: 'info' },
  ];
  const levelDate = [
    { value: 1, label: '子弹级', tagType: 'success' },
    { value: 2, label: '炸弹级', tagType: '' },
    { value: 3, label: '榴弹级', tagType: 'warning' },
    { value: 4, label: '核弹级', tagType: 'danger' },
    { value: 0, label: '其他', tagType: 'info' },
  ];
  export default {
    components: {
      bindPermission,
      addMenuByJson,
      addPluginMenu,
    },
    data() {
      // 页面数据变量
      return {
        pluginMenus: [],
        // 页面是否请求中或加载中
        loading: false,
        // init请求返回的数据
        data: {},
        // 表格相关开始 -----------------------------------------------------------
        table1: {
          // 表格数据请求地址
          action: 'admin/system/menu/sys/getAll',
          // 表格字段显示规则
          columns: [
            /* { key:"icon", title:"图标", type:"icon", width:100, defaultValue: "el-icon-tickets"}, */
            {
              key: 'name',
              title: '菜单名称',
              type: 'html',
              width: 340,
              align: 'left',
              formatter: function (val, row, column, index) {
                let icon = row.icon || 'el-icon-tickets';
                if (icon.indexOf('vk-icon') > -1) icon = 'vk-icon ' + icon;
                return `<i class="${icon}" style="margin-right: 10px;"></i><span>${row.name}</span>`;
              },
            },
            { key: 'menu_id', title: '菜单唯一标识', type: 'text', width: 350, align: 'left' },
            { key: 'url', title: '菜单URL', type: 'text', width: 250, align: 'left' },
            { key: 'comment', title: '备注', type: 'text', width: 200, align: 'left' },
            { key: 'permission', title: '菜单内置权限表', type: 'text', width: 120, defaultValue: '无' },
            { key: 'sort', title: '排序值', type: 'number', width: 100 },
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
                  url: 'admin/system/menu/sys/updateBase',
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
            {
              key: 'hidden_menu',
              title: '是否显示',
              type: 'switch',
              activeValue: false,
              inactiveValue: true,
              width: 80,
              watch: (res) => {
                let { value, row, change } = res;
                vk.callFunction({
                  url: 'admin/system/menu/sys/updateBase',
                  title: '请求中...',
                  data: {
                    _id: row._id,
                    hidden_menu: value,
                  },
                  success: (data) => {
                    change(value); // 这一步是让表格行内的开关改变显示状态
                  },
                });
              },
            },

            { key: 'parent_id', title: '父级菜单Id', type: 'text', width: 250, align: 'left' },
          ],
          // 多选框选中的值
          multipleSelection: [],
          // 当前高亮的记录
          selectItem: '',
        },
        formDatas: {},
        // 表格相关结束 -----------------------------------------------------------
        // 表单相关开始-----------------------------------------------------------
        // 查询表单请求数据
        queryForm1: {
          // 查询表单数据源，可在此设置默认值
          formData: {},
          // 查询表单的字段规则 fieldName:指定数据库字段名,不填默认等于key
          columns: [],
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {
            sort: 0,
            enable: true,
            url: '',
          },
          // 表单属性
          props: {
            // 表单请求地址
            action: '',
            // 表单字段显示规则
            columns: [
              { key: '', title: '基础属性', type: 'bar-title' },
              { key: 'menu_id', title: '菜单标识', type: 'text', tips: '设置一个能表达唯一含义的标识', show: ['add'] },
              { key: 'name', title: '菜单名称', type: 'text', tips: '设置菜单的名称' },
              { key: 'icon', title: '图标', type: 'icon', tips: '设置一个能表达权限含义的图标' },
              { key: 'url', title: 'URL', type: 'text', tips: '页面路径，本地路径需以 / 开头 网络路径需带http:// 或 https://' },
              { key: 'sort', title: '排序值', type: 'number', tips: '越小越显示在前面' },
              {
                key: 'parent_id',
                title: '父级菜单',
                type: 'tree-select',
                tips: '父级的menu_id',
                action: 'admin/system/menu/sys/getAll',
                props: { list: 'rows', value: 'menu_id', label: 'label', children: 'children' },
              },
              {
                key: 'comment',
                title: '备注',
                type: 'textarea',
                maxlength: '99',
                showWordLimit: true,
                autosize: { minRows: 2, maxRows: 10 },
                tips: '设置一个备注来更详细的描述此权限的含义',
              },
              {
                key: 'enable',
                title: '是否启用',
                type: 'switch',
                tips: '当关闭时，菜单将失效，再次启用时，菜单会恢复。',
              },
              {
                key: 'hidden_menu',
                title: '是否隐藏',
                type: 'switch',
                tips: '当设为true时，菜单不显示在左侧菜单列表中。',
              },
            ],
            // 表单对应的验证规则
            rules: {
              menu_id: [
                { required: true, message: '菜单标识不能为空', trigger: 'blur' },
                { min: 2, max: 40, message: '长度在 2 到 40 个字符', trigger: 'blur' },
              ],
              name: [{ required: true, message: '菜单名称不能为空', trigger: 'blur' }],
              sort: [{ type: 'number', message: '排序值必须为数字' }],
            },
            // add 代表添加 update 代表修改
            formType: '',
            // 是否显示表单1 的弹窗
            show: false,
          },
        },
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
      tableSuccess() {
        this.pluginMenus = this.getPluginMenus();
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
        this.form1.props.action = 'admin/system/menu/sys/add';
        this.form1.props.formType = 'add';
        this.form1.props.title = '添加';
        this.form1.props.show = true;
        let currentRow = this.getCurrentRow();
        if (currentRow && currentRow.menu_id) {
          this.$set(this.form1.data, 'parent_id', currentRow.menu_id);
          this.$set(this.form1.data, 'menu_id', currentRow.menu_id + '-');
        }
      },
      // 显示修改页面
      updateBtn({ item }) {
        this.form1.props.action = 'admin/system/menu/sys/update';
        this.form1.props.formType = 'update';
        this.form1.props.title = '编辑';
        this.form1.props.show = true;
        this.form1.data = item;
      },
      formSuccess() {
        this.form1.props.show = false;
        // 下面的写法是为了部分修改完成后，减少一次再次请求数据库的查询
        if (this.form1.props.formType === 'update') {
          let item = this.getCurrentRow(true);
          if (item.parent_id !== this.form1.data.parent_id) {
            this.refresh();
          } else {
            vk.pubfn.objectAssignForVue(item, this.form1.data, this);
          }
        } else {
          this.refresh();
        }
      },
      // 删除按钮
      deleteBtn({ item, deleteFn }) {
        deleteFn({
          action: 'admin/system/menu/sys/delete',
          data: {
            menu_id: item.menu_id,
          },
        });
      },
      // 设置内置权限
      bindPermissionBtn() {
        let item = this.getCurrentRow(true);
        vk.pubfn.openForm('bindPermission', { item });
      },
      addMenuByJsonBtn() {
        let item = this.getCurrentRow();
        vk.pubfn.openForm('addMenuByJson', { item });
      },
      initVkStatBtn() {
        vk.callFunction({
          url: 'admin/system/menu/sys/adds',
          title: '初始化中...',
          data: {
            mode: 1,
            menus: vk.pubfn.copyObject(vkStatMenus),
          },
          success: () => {
            this.refresh();
          },
        });
      },
      // 修改排序值
      sortChange(sort, item) {
        vk.callFunction({
          url: 'admin/system/menu/sys/updateBase',
          data: {
            _id: item._id,
            sort: Number(sort),
          },
          success: (data) => {},
        });
      },
      addPluginMenuMenu() {
        vk.pubfn.openForm('addPluginMenu', { pluginMenus: this.pluginMenus });
      },
      getPluginMenus() {
        const menus = [];
        const tableData = this.$refs.table1.getTableData() || [];
        const dbMenus = vk.pubfn.treeToArray(tableData, {
          id: 'menu_id',
          parent_id: 'parent_id',
          children: 'children',
        });
        pluginMenuJsons.forEach((menu) => {
          // 查找尚未被注册到数据库中的菜单
          if (!dbMenus.find((item) => item.menu_id === menu.menu_id)) {
            menus.push(menu);
          }
        });
        return menus;
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

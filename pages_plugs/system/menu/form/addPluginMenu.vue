<template>
  <vk-data-dialog v-model="value.show" :title="page.title" :top="page.top" :width="page.width" mode="form" @open="onOpen" @closed="onClose">
    <!-- 页面主体内容开始 -->
    <vk-data-form
      ref="form1"
      v-model="form1.data"
      :form-type="value.mode"
      :rules="form1.props.rules"
      :action="form1.props.action"
      :columns="form1.props.columns"
      :loading.sync="form1.props.loading"
      :labelWidth="form1.props.labelWidth"
      :before-action="form1.props.beforeAction"
      :show-cancel="page.showCancel"
      :cancel-text="page.cancelText"
      :submit-text="page.submitText"
      @success="onFormSuccess"
    >
      <template v-slot:menus="{ form, keyName }">
        <div>
          <vk-data-table style="margin-top: 0" :data="table1.data" :columns="table1.columns" row-key="menu_id" :default-expand-all="true"></vk-data-table>
        </div>
      </template>
    </vk-data-form>
    <!-- 页面主体内容结束 -->
  </vk-data-dialog>
</template>

<script>
  let vk = uni.vk; // vk实例
  export default {
    props: {
      value: {
        type: Object,
        default: function () {
          return {
            show: false,
            mode: '',
            pluginMenus: [],
          };
        },
      },
    },
    data: function () {
      // 组件创建时，进行数据初始化
      return {
        page: {
          title: '添加插件菜单',
          submitText: '添加',
          cancelText: '关闭',
          showCancel: true,
          top: '7vh',
          width: '1100px',
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {
            mode: 1,
            jsonType: 1,
          },
          // 表单属性
          props: {
            // 表单请求地址
            action: 'admin/system/menu/sys/adds',
            // 表单字段显示规则
            columns: [{ key: 'menus', title: '', type: 'json', showLabel: false }],
            // 表单验证规则
            rules: {},
            // add 代表添加 update 代表修改
            formType: '',
            // 表单是否在请求中
            loading: false,
            // 是否显示表单1 的弹窗
            show: false,
            labelWidth: '140px',
            beforeAction: (formData) => {
              return {
                menus: this.form1.data.menus,
              };
            },
          },
        },
        table1: {
          // 表格数据
          data: [],
          // 表格字段显示规则
          columns: [
            { key: 'menu_id', title: '菜单唯一标识', type: 'text', minWidth: 150 },
            {
              key: 'name',
              title: '菜单名称',
              type: 'html',
              minWidth: 200,
              align: 'left',
              formatter: function (val, row, column, index) {
                let icon = row.icon || 'el-icon-tickets';
                if (icon.indexOf('vk-icon') > -1) icon = 'vk-icon ' + icon;
                return `<i class="${icon}" style="margin-right: 10px;"></i><span>${row.name}</span>`;
              },
            },
            { key: 'url', title: '菜单URL', type: 'text', minWidth: 300, align: 'left' },
            { key: 'sort', title: '排序值', type: 'number', minWidth: 80 },
            { key: 'permission', title: '菜单内置权限表', type: 'text', width: 150, defaultValue: '无' },
            { key: 'parent_id', title: '父级菜单Id', type: 'text', minWidth: 150, align: 'left' },
          ],
        },
      };
    },
    mounted() {
      this.init();
    },
    methods: {
      // 初始化
      init() {
        let { value } = this;
        this.$emit('input', value);
      },
      // 监听 - 页面打开
      onOpen() {
        let { value = {} } = this;
        let treeData = vk.pubfn.arrayToTree(value.pluginMenus, {
          id: 'menu_id',
          parent_id: 'parent_id',
          children: 'children',
        });
        this.form1.data.menus = value.pluginMenus;
        this.table1.data = treeData;
      },
      // 监听 - 页面关闭
      onClose() {
        this.$refs.form1.resetForm(); // 关闭时，重置表单
      },
      // 监听 - 提交成功后
      onFormSuccess() {
        this.value.show = false; // 关闭页面
        this.$emit('success');
      },
    },
    // 监听属性
    watch: {},
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped></style>

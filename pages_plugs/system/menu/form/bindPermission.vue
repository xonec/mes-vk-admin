<template>
  <vk-data-dialog v-model="value.show" :title="page.title" :top="page.top" :width="page.width" mode="form" @open="onOpen" @closed="onClose">
    <!-- 页面主体内容开始 -->
    <vk-data-form
      v-loading="page.loading"
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
      <template v-slot:refresh>
        <div style="margin-left: 30px">
          <span style="color: #66b1ff; text-decoration: underline; cursor: pointer" @click="getList()">刷新数据</span>
        </div>
      </template>

      <template v-slot:permissionList>
        <el-tree
          ref="tree"
          :data="data.treeData"
          :node-key="data.nodeKey"
          :default-checked-keys="data.checkedKeys"
          :props="{
            children: 'children',
            label: 'label',
          }"
          show-checkbox
          default-expand-all
          expand-on-click-node
        ></el-tree>
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
            item: '',
          };
        },
      },
    },
    data: function () {
      // 组件创建时，进行数据初始化
      return {
        data: {
          list: [],
          info: {},
          // 权限的树形结构数据
          treeData: [],
          // 默认选中的权限列表
          checkedKeys: [],
          // 树的唯一标识
          nodeKey: 'permission_id',
        },
        page: {
          title: '权限赋予',
          submitText: '确定',
          cancelText: '关闭',
          showCancel: true,
          top: '7vh',
          width: '800px',
          loading: false,
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {
            menu_id: '',
            reset: true,
            permissionList: [],
          },
          // 表单属性
          props: {
            // 表单请求地址
            action: 'admin/system/menu/sys/bindPermission',
            // 表单字段显示规则
            columns: [
              // 常用字段类型
              { key: 'refresh', title: '', type: 'text', showLabel: false },
              { key: 'permissionList', title: '权限列表', type: 'text' },
            ],
            // 表单验证规则
            rules: {},
            labelWidth: '100px',
            beforeAction: (formData) => {
              let checkedKeys = this.$refs.tree.getCheckedKeys();
              let halfCheckedKeys = this.$refs.tree.getHalfCheckedKeys();
              let allCheckedKeys = checkedKeys.concat(halfCheckedKeys);
              // 去除空属性
              for (let i = 0; i < allCheckedKeys.length; i++) {
                if (vk.pubfn.isNull(allCheckedKeys[i])) {
                  allCheckedKeys.splice(i, 1);
                  i--;
                }
              }
              formData.permissionList = allCheckedKeys;
              return formData;
            },
          },
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
        let { item } = value;
        let { menu_id, name, permission = [] } = item;
        this.page.title = `权限赋予（${name}）`;
        this.data.info = item;
        this.form1.data.menu_id = menu_id;
        this.form1.data.permissionList = permission;
        if (vk.pubfn.isNotNull(this.data.treeData)) {
          this.initData();
          return;
        }
        this.getList();
      },
      getList() {
        // 执行请求
        vk.callFunction({
          url: 'admin/system/permission/sys/getAll',
          data: {},
          loading: { that: this, name: 'page.loading' },
          success: (data) => {
            let rows = [
              {
                label: '全选',
                permission_id: '',
                children: data.rows,
              },
            ];
            // 渲染树
            this.data.treeData = rows;
            this.data.list = data.list;
            this.initData();
          },
        });
      },
      initData() {
        let { value = {} } = this;
        let { item } = value;
        let { menu_id, name, permission = [] } = item;
        let currentPermission = vk.pubfn.copyObject(permission);
        // 设置当前选中用户的权限列表
        // 去除所有含有子元素的权限
        for (let i in this.data.list) {
          let item = this.data.list[i];
          let index = currentPermission.indexOf(item.parent_id);
          if (index > -1) {
            currentPermission.splice(index, 1);
          }
        }
        this.data.checkedKeys = currentPermission;
        this.$refs.tree.setCheckedKeys(currentPermission);
      },
      // 监听 - 页面关闭
      onClose() {
        this.$refs.form1.resetForm(); // 关闭时，重置表单
      },
      // 监听 - 提交成功后
      onFormSuccess(res) {
        this.$set(this.value.item, 'permission', this.form1.data.permissionList);
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

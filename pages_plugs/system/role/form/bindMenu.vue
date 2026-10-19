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
      <template v-slot:menuList>
        <el-input placeholder="输入关键字进行搜索" v-model="tree.filterText"> </el-input>
        <div style="margin-top: 5px">
          <el-checkbox v-model="tree.expandAll" @change="expandAllChange">展开/折叠</el-checkbox>
          <el-checkbox v-model="tree.checkAll" @change="checkAllChange" v-if="!tree.filterText">全选/全不选</el-checkbox>
        </div>
        <div class="tree-box">
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
            expand-on-click-node
            :default-expand-all="false"
            :filter-node-method="filterNode"
          ></el-tree>
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
          // 权限的树形结构数据
          treeData: [],
          // 默认选中的权限列表
          checkedKeys: [],
          // 树的唯一标识
          nodeKey: 'menu_id',
        },
        page: {
          title: '菜单赋予',
          submitText: '确定',
          cancelText: '关闭',
          showCancel: true,
          top: '7vh',
          width: '800px',
          loading: false,
        },
        tree: {
          filterText: '',
          expandAll: false,
          checkAll: false,
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {
            role_id: '',
            reset: true,
            menuList: [],
            addPermission: true,
          },
          // 表单属性
          props: {
            // 表单请求地址
            action: 'admin/system/role/sys/bindMenu',
            // 表单字段显示规则
            columns: [
              { key: 'addPermission', title: '同时赋予菜单内置权限', type: 'switch', labelWidth: '160px' },
              { key: 'menuList', title: '菜单', type: 'text' },
            ],
            // 表单验证规则
            rules: {},
            labelWidth: '80px',
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
              formData.menuList = allCheckedKeys;
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
        let { role_id, role_name, menu = [] } = item;

        this.page.title = `菜单赋予（${role_name}）`;

        this.form1.data.role_id = role_id;
        this.form1.data.menuList = menu;
        if (vk.pubfn.isNotNull(this.data.treeData)) {
          this.initData();
          return;
        }
        this.getList();
      },
      getList() {
        vk.callFunction({
          url: 'admin/system/menu/sys/getAll',
          loading: { that: this, name: 'page.loading' },
          data: {},
          success: (data) => {
            // 渲染树
            this.data.treeData = data.rows;
            this.data.list = data.list;
            this.initData();
          },
        });
      },
      initData() {
        let { value = {} } = this;
        let { item } = value;
        let { role_id, role_name, menu = [] } = item;

        let current = vk.pubfn.copyObject(menu);
        // 设置当前选中用户的权限列表
        // 去除所有含有子元素的权限
        for (let i in this.data.list) {
          let item = this.data.list[i];
          let index = current.indexOf(item.parent_id);
          if (index > -1) {
            current.splice(index, 1);
          }
        }
        this.data.checkedKeys = current;
        this.$refs.tree.setCheckedKeys(current);
      },
      // 监听 - 页面关闭
      onClose() {
        this.$refs.form1.resetForm(); // 关闭时，重置表单
      },
      // 监听 - 提交成功后
      onFormSuccess(res) {
        if (res.data.info) {
          this.$set(this.value.item, 'menu', res.data.info.menu);
          this.$set(this.value.item, 'menuList', res.data.info.menuList);
          this.$set(this.value.item, 'stats_count_info', res.data.info.stats_count_info);
        }
        this.value.show = false; // 关闭页面
        this.$emit('success');
      },
      filterNode(value, data) {
        if (!value) return true;
        return data.label.indexOf(value) !== -1;
      },
      // 展开
      expandAllChange(e) {
        this.tree.expandAll = e;
        const nodes = this.$refs.tree.store._getAllNodes();
        for (let i in nodes) {
          nodes[i].expanded = this.tree.expandAll;
        }
      },
      // 全选
      checkAllChange(val) {
        if (val) {
          this.$refs.tree.setCheckedNodes(this.data.treeData);
        } else {
          this.$refs.tree.setCheckedKeys([]);
        }
      },
    },
    // 监听属性
    watch: {
      'tree.filterText'(val) {
        this.$refs.tree.filter(val);
      },
    },
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped>
  .tree-box {
    padding: 10px;
    margin-top: 10px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
  }
</style>

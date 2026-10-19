<template>
  <vk-data-dialog v-model="value.show" :title="page.title" :top="page.top" :width="page.width" :close-on-click-modal="true" mode="form">
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
      :show-cancel="page.showCancel"
      :cancel-text="page.cancelText"
      :submit-text="page.submitText"
      @success="onFormSuccess"
    >
      <template v-slot:parent_id="{ form, keyName }">
        <el-select v-model="form[keyName]" clearable :placeholder="$t('vk.assetLibrary.addCategory.selectParentCategory')" style="width: 100%">
          <el-option v-for="item in availableList" :key="item._id || 'root'" :label="item.name" :value="item._id" :disabled="isDisabledOption(item._id)"></el-option>
        </el-select>
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
            item: {},
            list: [],
            disabledIds: [],
          };
        },
      },
    },
    data: function () {
      // 组件创建时，进行数据初始化
      return {
        page: {
          title: `${this.$t('vk.common.update')}${this.$t('vk.assetLibrary.updateFileCategory.category')}${this.$t('vk.assetLibrary.form.name')}`,
          submitText: this.$t('vk.form.submit'),
          cancelText: this.$t('vk.form.close'),
          showCancel: true,
          top: '14vh',
          width: '450px',
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {},
          // 表单属性
          props: {
            // 表单请求地址
            action: 'admin/system_uni/uni-id-files/categories/sys/update',
            // 表单字段显示规则
            columns: [
              // 常用字段类型
              { key: 'name', title: this.$t('vk.assetLibrary.form.name'), type: 'text' },
              {
                key: 'parent_id',
                title: this.$t('vk.assetLibrary.addCategory.parentCategory'),
                type: 'select',
                placeholder: this.$t('vk.assetLibrary.addCategory.selectParentCategory'),
              },
            ],
            // 表单验证规则
            rules: {
              name: [
                { required: true, message: this.$t('vk.assetLibrary.form.nameRequired'), trigger: 'change' },
                { max: 16, message: this.$t('vk.assetLibrary.form.nameMaxLength', { length: 16 }), trigger: 'change' },
              ],
            },
            labelWidth: '120px',
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
        let { item } = this.value;
        this.form1.data = {
          _id: item._id,
          name: item.name,
          parent_id: item.parent_id || '',
        };
      },
      // 监听 - 页面关闭
      onClose() {
        // this.$refs.form1.resetForm(); // 关闭时，重置表单
      },
      // 监听 - 提交成功后
      onFormSuccess() {
        // 此代码用处是直接将修改结果显示到页面上，而不需要进行数据库查询。
        this.value.item.name = this.form1.data.name;
        this.value.item.parent_id = this.form1.data.parent_id;
        this.value.show = false; // 关闭页面
        this.$emit('success');
      },
      isDisabledOption(id) {
        return this.value.disabledIds && this.value.disabledIds.includes(id);
      },
    },
    watch: {
      'value.show': {
        handler(newValue, oldValue) {
          if (newValue) {
            this.onOpen();
          } else {
            this.onClose();
          }
        },
      },
    },
    // 计算属性
    computed: {
      availableList() {
        return this.value.list || [];
      },
    },
  };
</script>

<style lang="scss" scoped></style>

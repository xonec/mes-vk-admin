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
    ></vk-data-form>
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
          };
        },
      },
    },
    data: function () {
      // 组件创建时，进行数据初始化
      return {
        page: {
          title: `${this.$t('vk.common.update')}${this.$t('vk.assetLibrary.form.name')}`,
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
            action: 'admin/system_uni/uni-id-files/files/sys/update',
            // 表单字段显示规则
            columns: [
              { key: 'display_name', title: this.$t('vk.assetLibrary.form.name'), type: 'text' },
              { key: 'description', title: this.$t('vk.assetLibrary.form.description'), type: 'text' },
            ],
            // 表单验证规则
            rules: {
              display_name: [
                { required: true, message: this.$t('vk.assetLibrary.form.nameRequired'), trigger: 'change' },
                { max: 32, message: this.$t('vk.assetLibrary.form.nameMaxLength', { length: 32 }), trigger: 'change' },
              ],
            },
            labelWidth: '100px',
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
          display_name: item.display_name,
          description: item.description,
        };
      },
      // 监听 - 页面关闭
      onClose() {
        // this.$refs.form1.resetForm(); // 关闭时，重置表单
      },
      // 监听 - 提交成功后
      onFormSuccess() {
        this.value.item.display_name = this.form1.data.display_name;
        this.value.item.description = this.form1.data.description;
        this.value.show = false; // 关闭页面
        this.$emit('success');
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
    computed: {},
  };
</script>

<style lang="scss" scoped></style>

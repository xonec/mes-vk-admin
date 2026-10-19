<template>
  <vk-data-dialog v-model="value.show" :title="page.title" :top="page.top" :width="page.width" mode="form">
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
    ></vk-data-form>
    <!-- 页面主体内容结束 -->
  </vk-data-dialog>
</template>

<script>
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
        page: {
          title: this.$t('vk.user.updatePassword'),
          submitText: this.$t('vk.common.update'),
          cancelText: this.$t('vk.common.close'),
          showCancel: true,
          top: '14vh',
          width: '500px',
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {},
          // 表单属性
          props: {
            // 表单请求地址
            action: 'user/kh/updatePwd',
            // 表单字段显示规则
            columns: [
              { key: 'username', title: this.$t('vk.user.username'), type: 'text', disabled: true },
              { key: 'oldPassword', title: this.$t('vk.user.oldPassword'), type: 'password' },
              { key: 'newPassword', title: this.$t('vk.user.newPassword'), type: 'password' },
              { key: 'newPassword2', title: this.$t('vk.user.confirmNewPassword'), type: 'password' },
            ],
            // 表单验证规则
            rules: {
              oldPassword: [
                { required: true, message: this.$t('vk.user.oldPasswordCannotBeEmpty'), trigger: 'change' },
                { validator: uni.vk.pubfn.validator('pwd'), message: this.$t('vk.user.passwordRule'), trigger: 'change' },
              ],
              newPassword: [
                { required: true, message: this.$t('vk.user.newPasswordCannotBeEmpty'), trigger: 'change' },
                { validator: uni.vk.pubfn.validator('pwd'), message: this.$t('vk.user.passwordRule'), trigger: 'change' },
              ],
              newPassword2: [
                { required: true, message: this.$t('vk.user.confirmNewPasswordTips'), trigger: 'change' },
                { validator: uni.vk.pubfn.validator('pwd'), message: this.$t('vk.user.passwordRule'), trigger: 'change' },
              ],
            },
            labelWidth: '120px',
            beforeAction: (data) => {
              if (data.newPassword !== data.newPassword2) {
                uni.vk.toast(this.$t('vk.user.passwordNotMatch'), 'none');
                return false;
              }
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
        this._input(value);
      },
      _input(value) {
        this.$emit('input', value);
      },
      // 监听 - 页面打开
      onOpen() {
        let { vk, value = {} } = this;
        let { item } = value;
        let userInfo = vk.getVuex('$user.userInfo');
        this.form1.data.username = userInfo.username;
      },
      // 监听 - 页面关闭
      onClose() {
        this.resetForm();
      },
      // 监听 - 提交成功后
      onFormSuccess() {
        this.close();
        this.$emit('success');
      },
      // 打开页面
      open() {
        let { value } = this;
        value.show = true;
        this._input(value);
      },
      // 关闭页面
      close() {
        let { value } = this;
        value.show = false;
        this._input(value);
      },
      // 表单重置
      resetForm() {
        this.$refs.form1.resetForm();
      },
      // 表单提交
      submitForm() {
        this.$refs.form1.submitForm();
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

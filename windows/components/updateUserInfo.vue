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
      return {
        page: {
          title: this.$t('vk.user.updateUserInfo'),
          submitText: this.$t('vk.common.confirm'),
          cancelText: this.$t('vk.common.close'),
          showCancel: true,
          top: '14vh',
          width: '500px',
        },
        form1: {
          data: {
            nickname: '',
            avatar: '',
          },
          props: {
            action: 'user/kh/updateUser',
            columns: [
              { key: 'nickname', title: this.$t('vk.user.nickname'), type: 'text', placeholder: this.$t('vk.user.nickname') },
              { key: 'avatar', title: this.$t('vk.user.avatar'), type: 'file-select', fileType: 'image', multiple: false, imageFit: 'cover' },
            ],
            rules: {
              nickname: [{ required: true, message: this.$t('vk.user.nicknameCannotBeEmpty'), trigger: 'change' }],
              avatar: [{ required: true, message: this.$t('vk.user.avatarCannotBeEmpty'), trigger: 'change' }],
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
      init() {
        let { value } = this;
        this._input(value);
      },
      _input(value) {
        this.$emit('input', value);
      },
      onOpen() {
        let { vk } = this;
        let userInfo = vk.getVuex('$user.userInfo');
        this.form1.data.nickname = userInfo.nickname || '';
        this.form1.data.avatar = userInfo.avatar || '';
      },
      onClose() {
        this.resetForm();
      },
      onFormSuccess() {
        let { vk } = this;
        let { nickname, avatar } = this.form1.data;
        let userInfo = vk.getVuex('$user.userInfo');
        userInfo.nickname = nickname;
        userInfo.avatar = avatar;
        vk.setVuex('$user.userInfo', userInfo);
        this.close();
        this.$emit('success');
      },
      open() {
        let { value } = this;
        value.show = true;
        this._input(value);
      },
      close() {
        let { value } = this;
        value.show = false;
        this._input(value);
      },
      resetForm() {
        this.$refs.form1.resetForm();
      },
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
    computed: {},
  };
</script>

<style lang="scss" scoped></style>

<template>
  <vk-data-dialog v-model="value.show" :title="page.title" :top="page.top" :width="page.width" mode="form" @open="onOpen" @closed="onClose">
    <!-- 页面主体内容开始 -->
    <vk-data-form
      ref="form1"
      :form-type="value.mode"
      v-loading="page.loading"
      v-model="form1.data"
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
      <template v-slot:user_id>
        <div style="display: flex; align-items: center">
          <el-avatar v-if="data.avatar" :src="data.avatar" fit="cover"></el-avatar>
          <span style="margin-left: 10px">{{ data.nickname }}（ID：{{ data._id }}）</span>
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
        // 页面基础数据
        page: {
          title: '重置密码',
          submitText: '修改',
          cancelText: '关闭',
          showCancel: true,
          top: '7vh',
          width: '600px',
          loading: false,
        },
        data: {},
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {
            user_id: '',
            password: '',
          },
          // 表单属性
          props: {
            // 表单请求地址
            action: 'admin/system/user/sys/resetPassword',
            // 表单字段显示规则
            columns: [
              { key: 'user_id', title: '用户', type: 'text' },
              { key: 'password', title: '新密码', type: 'password', showPassword: true },
            ],
            // 表单验证规则
            rules: {
              user_id: [{ required: true, message: 'user_id不能为空', trigger: 'change' }],
              password: [
                { required: true, message: '新密码不能为空', trigger: 'change' },
                { validator: vk.pubfn.validator('password'), message: '密码长度在6~18之间，只能包含字母、数字和下划线', trigger: 'change' },
              ],
            },
            // label宽度
            labelWidth: '100px',
            // label对其方式
            labelPosition: 'left',
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
        let { item = {} } = this.value;
        let data = vk.pubfn.copyObject(item);
        this.data = data;
        this.form1.data = {
          user_id: data._id,
          password: '',
        };
      },
      // 监听 - 页面关闭
      onClose() {
        this.$refs.form1.resetForm(); // 关闭时，重置表单
      },
      // 表单提交成功后
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

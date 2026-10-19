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
      :show-cancel="page.showCancel"
      :cancel-text="page.cancelText"
      :submit-text="page.submitText"
      @success="onFormSuccess"
    >
      <template v-slot:key="{ form, keyName, column }">
        <div>
          <vk-data-input type="text" v-model="form[keyName]" :placeholder="column.tips"></vk-data-input>
          <vk-data-tips v-if="column.tips" :tips="column.tips" :show="true"></vk-data-tips>
          <div class="tips">微信扫下方小程序码进入首页，点击底部会员中心-申请API key，将得到的key填写到此处并保存</div>
          <div class="qrcode">
            <image :src="qrcode" mode="aspectFit" class="image"></image>
            <div class="text">使用微信扫一扫</div>
          </div>
        </div>
      </template>
    </vk-data-form>
    <!-- 页面主体内容结束 -->
  </vk-data-dialog>
</template>

<script>
  let vk = uni.vk; // vk实例
  import { qrcodeKey } from '../image.json';
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
        qrcode: qrcodeKey,
        page: {
          title: '设置API Key',
          submitText: '确定',
          cancelText: '关闭',
          showCancel: true,
          top: '7vh',
          width: '600px',
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {},
          // 表单属性
          props: {
            // 表单请求地址
            action: 'plugs/lucky-draw/admin/sys.luckyDraw.setKey',
            // 表单字段显示规则
            columns: [{ key: 'key', title: 'API key', type: 'text', tips: '请输入发起活动小助手的API Key' }],
            // 表单验证规则
            rules: {
              key: [
                { required: true, message: '请输入API Key', trigger: 'blur' },
                { min: 32, max: 32, message: 'API Key长度必须是32位', trigger: 'blur' },
              ],
            },
            // 左侧label的宽度
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
        let { item = {} } = this.value;
        // 每次打开时，重新设置表单的值 = value.item 的值，item通过 vk.pubfn.openForm('表单名',{ item:{ _id:"1" } }) 传递值
        this.form1.data = vk.pubfn.copyObject(item);
      },
      // 监听 - 页面关闭
      onClose() {
        //this.$refs.form1.resetForm(); // 关闭时，重置表单
      },
      // 监听 - 提交成功后
      onFormSuccess() {
        this.value.show = false; // 关闭页面
        this.$emit('success');
      },
    },
    watch: {},
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped>
  .qrcode {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: 20px;

    .image {
      width: 180px;
      height: 180px;
      margin-right: 60px;
    }

    .text {
      margin-right: 60px;
      color: #0abd60;
    }
  }

  .tips {
    font-size: 12px;
    line-height: 1.5;
    color: red;
  }
</style>

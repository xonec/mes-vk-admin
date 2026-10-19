<template>
  <vk-data-dialog v-model="value.show" :title="page.title" :top="page.top" :width="page.width" :close-on-click-modal="true" center @open="onOpen" @closed="onClose">
    <div class="help">
      <div class="qrcode">
        <image :src="qrcode" mode="aspectFit" class="image"></image>
      </div>
      <div class="tips">微信扫一扫上方小程序码查看抽奖小助手使用教程</div>
    </div>
    <template v-slot:footer>
      <el-button :loading="page.loading" type="primary" size="medium" style="width: 80px" @click="close">{{ page.submitText }}</el-button>
    </template>
  </vk-data-dialog>
</template>

<script>
  let vk = uni.vk; // vk实例
  import { qrcodeHelp } from '../image.json';
  export default {
    props: {
      value: {
        type: Object,
        default: function () {
          return {
            show: false,
            item: {},
          };
        },
      },
    },
    data: function () {
      // 组件创建时，进行数据初始化
      return {
        qrcode: qrcodeHelp,
        page: {
          title: '抽奖小助手使用教程',
          submitText: '关闭',
          top: '7vh',
          width: '600px',
          loading: false,
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
        let { item = {} } = value;
        //this.form1 = vk.pubfn.copyObject(item);
      },
      // 监听 - 页面关闭
      onClose() {},
      close() {
        this.value.show = false; // 关闭页面
      },
    },
    watch: {},
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped>
  .help {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }
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
    }
  }
  .tips {
    margin-top: 15px;
    font-size: 12px;
    line-height: 1.5;
    color: #0abd60;
  }
</style>

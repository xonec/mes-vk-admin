<template xlang="wxml" minapp="mpvue">
  <view class="vk-data-qrcode" v-if="canvasId && text !== '' && !loading">
    <!-- #ifndef MP-ALIPAY -->
    <canvas class="vk-data-qrcode-canvas" :canvas-id="canvasId" :style="{ width: cpSize + 'px', height: cpSize + 'px' }" />
    <!-- #endif -->
    <!-- #ifdef MP-ALIPAY -->
    <canvas :id="canvasId" :width="cpSize" :height="cpSize" class="vk-data-qrcode-canvas" />
    <!-- #endif -->
    <image class="image" v-show="show" :src="result" :style="{ width: cpSize + 'px', height: cpSize + 'px' }" v-if="result" />
    <view class="loading-text" :style="'width: ' + size + unit + ';height: ' + size + unit + ';'" v-else>
      {{ actualLoadingText }}
    </view>
  </view>
  <view class="loading-text" :style="'width: ' + size + unit + ';height: ' + size + unit + ';'" v-else>
    {{ actualLoadingText }}
  </view>
</template>

<script>
  import QRCode from './qrcode.js';
  import VueI18n from 'vue-i18n';
  import messages from './locale/index.js';
  let qrcode;

  export default {
    name: 'vk-data-qrcode',
    props: {
      value: {
        type: String,
      },
      text: {
        type: String,
        default: '',
      },
      size: {
        type: Number,
        default: 200,
      },
      unit: {
        type: String,
        default: 'rpx',
      },
      show: {
        type: Boolean,
        default: true,
      },
      background: {
        type: String,
        default: '#ffffff',
      },
      foreground: {
        type: String,
        default: '#000000',
      },
      pdground: {
        type: String,
        default: '#000000',
      },
      image: {
        type: String,
        default: '',
      },
      imageSize: {
        type: Number,
        default: 40,
      },
      lv: {
        type: Number,
        default: 3,
      },
      onval: {
        type: Boolean,
        default: true,
      },
      loadMake: {
        type: Boolean,
        default: true,
      },
      usingComponents: {
        type: Boolean,
        default: true,
      },
      showLoading: {
        type: Boolean,
        default: false,
      },
      loadingText: {
        type: String,
        default: '',
      },
      // 让组件强制进入loading状态
      loading: {
        type: Boolean,
        default: false,
      },
      language: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        result: '',
        canvasId: '',
      };
    },
    methods: {
      t(key) {
        return this._i18n.t(key);
      },
      _makeCode() {
        if (!this._empty(this.text)) {
          qrcode = new QRCode({
            context: this, // 上下文环境
            canvasId: this.canvasId, // canvas-id
            usingComponents: this.usingComponents, // 是否是自定义组件
            showLoading: this.showLoading, // 是否显示loading
            loadingText: this.actualLoadingText, // loading文字
            text: this.text, // 生成内容
            size: this.cpSize, // 二维码大小
            background: this.background, // 背景色
            foreground: this.foreground, // 前景色
            pdground: this.pdground, // 定位角点颜色
            correctLevel: this.lv, // 容错级别
            image: this.image, // 二维码图标
            imageSize: this.imageSize, // 二维码图标大小
            cbResult: (res) => {
              // 生成二维码的回调
              this._result(res);
            },
          });
        } else {
          uni.showToast({
            title: this.t('vk.qrcode.contentEmpty'),
            icon: 'none',
            duration: 2000,
          });
        }
      },
      _clearCode() {
        this._result('');
        qrcode.clear();
      },
      _saveCode() {
        if (this.result != '') {
          uni.saveImageToPhotosAlbum({
            filePath: this.result,
            success: () => {
              uni.showToast({
                title: this.t('vk.qrcode.saveSuccess'),
                icon: 'success',
                duration: 2000,
              });
            },
          });
        }
      },
      _result(res) {
        this.result = res;
        this.$emit('result', res);
        this.$emit('input', res);
      },
      _empty(v) {
        let tp = typeof v,
          rt = false;
        if (tp == 'number' && String(v) == '') {
          rt = true;
        } else if (tp == 'undefined') {
          rt = true;
        } else if (tp == 'object') {
          if (JSON.stringify(v) == '{}' || JSON.stringify(v) == '[]' || v == null) rt = true;
        } else if (tp == 'string') {
          if (v == '' || v == 'undefined' || v == 'null' || v == '{}' || v == '[]') rt = true;
        } else if (tp == 'function') {
          rt = false;
        }
        return rt;
      },
      getBase64() {
        return this.result;
      },
    },
    watch: {
      size: function (n, o) {
        if (n != o && !this._empty(n)) {
          this.cSize = n;
          if (!this._empty(this.text)) {
            setTimeout(() => {
              this._makeCode();
            }, 100);
          }
        }
      },
      text: function (n, o) {
        if (this.onval) {
          if (n != o && !this._empty(n)) {
            if (this.textTimer) clearTimeout(this.textTimer);
            this.textTimer = setTimeout(() => {
              this._makeCode();
            }, 300);
          }
        }
      },
      language: function (val) {
        this._i18n.locale = val || uni.getLocale() || 'zh-Hans';
      },
    },
    computed: {
      actualLoadingText() {
        return this.loadingText || this.t('vk.qrcode.loadingText');
      },
      cpSize() {
        if (this.unit == 'rpx') {
          return uni.upx2px(this.size);
        } else {
          return this.size;
        }
      },
    },
    created() {
      this._i18n = new VueI18n({
        locale: this.language || uni.getLocale() || 'zh-Hans',
        messages,
      });
    },
    mounted: function () {
      this.canvasId = 'vk-data-qrcode-canvas-' + Math.floor(Math.random() * 1000000);
      if (this.loadMake) {
        if (!this._empty(this.text)) {
          setTimeout(() => {
            this._makeCode();
          }, 100);
        }
      }
    },
  };
</script>
<style lang="scss" scoped>
  .vk-data-qrcode {
    position: relative;

    .image {
      display: block;
    }
  }

  .loading-text {
    color: #9a9a9a;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .vk-data-qrcode-canvas {
    position: fixed;
    top: -99999rpx;
    left: -99999rpx;
    z-index: -99999;
  }
</style>

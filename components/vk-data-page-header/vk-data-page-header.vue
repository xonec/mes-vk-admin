<template>
  <div class="vk-data-page-header" v-if="showCom" :style="styleCom">
    <div class="header-group">
      <div class="header-title">
        <slot> {{ title }} </slot>
      </div>
      <div class="header-sub-title">
        <slot name="sub-title"> {{ subTitle }} </slot>
      </div>
    </div>
    <div>
      <slot name="right">
        <el-button v-if="showBack" size="mini" type="primary" @click="_backBtn">{{ backText }}</el-button>
      </slot>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'vk-data-page-header',
    props: {
      // 主标题
      title: {
        type: String,
      },
      // 副标题
      subTitle: {
        type: String,
      },
      // 是否显示返回按钮
      showBack: {
        type: Boolean,
      },
      // 背景颜色
      backgroundColor: {
        type: String,
        default: '#ffffff',
      },
      // 底部间距（支持数字或字符串，数字单位为 px）
      bottom: {
        type: [Number, String],
        default: 8,
      },
      // 圆角大小（支持数字或字符串，数字单位为 px）
      radius: {
        type: [Number, String],
        default: 'var(--border-radius)',
      },
      // 返回按钮文字
      backText: {
        type: String,
        default() {
          return this.$t('vk.common.back');
        },
      },
    },
    data: function () {
      // 组件创建时，进行数据初始化
      return {};
    },
    mounted() {
      this.init();
    },
    methods: {
      // 初始化
      init() {},
      // 点击事件，触发 click 事件供父组件监听
      _onClick() {
        this.$emit('click');
      },
      // 返回按钮点击事件，触发 back 事件供父组件监听
      _backBtn() {
        this.$emit('back');
      },
    },
    // 计算属性
    computed: {
      // 是否显示组件：仅在 PC 端且有标题或副标题时显示
      showCom() {
        let { vk, title, subTitle } = this;
        return vk.getVuex('$app.isPC') && (title || subTitle);
      },
      // 计算样式：处理背景颜色、底部间距、圆角
      styleCom() {
        let { backgroundColor, bottom, radius } = this;
        return {
          backgroundColor,
          marginBottom: !isNaN(bottom) ? `${bottom}px` : bottom,
          borderRadius: !isNaN(radius) ? `${radius}px` : radius,
        };
      },
    },
  };
</script>

<style lang="scss" scoped>
  .vk-data-page-header {
    height: 60px;
    padding: 15px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px #f5f5f5 solid;
    box-sizing: border-box;

    .header-group {
      display: flex;
      align-items: center;
      justify-content: center;
      word-break: keep-all;
    }

    .header-title {
      font-weight: 500;
      color: #333;
      font-size: 18px;
      font-weight: bold;
    }

    .header-sub-title {
      margin-left: 10px;
      margin-top: 3px;
      font-size: 14px;
      color: #999;
    }
  }

  // 笔记本电脑、小屏幕电脑适配
  @media screen and (max-width: 1600px) {
    .vk-data-page-header {
      height: 50px;
      padding: 10px 16px;

      .header-title {
        font-size: 16px;
      }

      .header-sub-title {
        font-size: 13px;
      }
    }
  }
</style>

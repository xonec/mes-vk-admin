<template>
  <div class="page-body">
    <image src="../../static/icon/icon-500.svg"></image>
    <div class="title">
      <span class="code">500</span>
      <span class="tips">{{ $t('vk.error.serverErrorTips') }}</span>
      <span class="tips">{{ errMsg }}</span>
      <span class="btn" @tap="toHome">{{ $t('vk.error.backToHome') }}</span>
    </div>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        errMsg: '',
      };
    },
    onLoad(query) {
      this.errMsg = query.errMsg || '';
    },
    methods: {
      toHome() {
        uni.vk.navigateToHome();
      },
    },
  };
</script>

<style lang="scss" scoped>
  page {
    width: 100%;
    height: 100%;
    background-color: #f5f7f9;
  }
  .page-body {
    display: flex;
    padding-top: 125px;
    justify-content: center;

    .title {
      display: flex;
      flex-direction: column;
      padding-top: 60px;
      margin-left: 100px;
    }
    .code {
      margin-bottom: 24px;
      color: #515a6e;
      font-weight: 600;
      font-size: 72px;
      line-height: 72px;
    }
    .tips {
      margin-bottom: 16px;
      color: #808695;
      font-size: 20px;
      line-height: 28px;
    }
    .btn {
      display: inline-block;
      color: #fff;
      background-color: #2d8cf0;
      border-color: #2d8cf0;
      width: 150px;
      height: 42px;
      border-radius: 3px;
      text-align: center;
      line-height: 42px;
    }
    .btn:hover {
      cursor: pointer;
      background-color: #57a3f3 !important;
    }
  }
</style>

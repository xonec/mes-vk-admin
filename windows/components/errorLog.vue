<template>
  <vk-data-dialog v-model="value.show" :title="page.title" :top="page.top" :width="page.width" mode="form">
    <div class="page-body">
      <!-- 自定义按钮区域开始 -->
      <div class="btns-box">
        <el-row>
          <el-button size="small" icon="el-icon-delete" @click="clearErrorLog">{{ $t('vk.errorLog.clearLog') }}</el-button>
        </el-row>
      </div>
      <!-- 自定义按钮区域结束 -->

      <!-- 表格组件开始 -->
      <vk-data-table
        ref="table1"
        :data="errLogsCom"
        :columns="table1.columns"
        :row-no="true"
        :height="600"
        :custom-right-btns="customRightBtnsList"
        @custom-right-btns="customRightBtns"
      ></vk-data-table>
      <!-- 表格组件结束 -->
    </div>
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
          title: this.$t('vk.errorLog.title'),
          top: '7vh',
          width: '1250px',
        },
        table1: {
          show: false,
          columns: [
            { key: 'info', title: this.$t('vk.errorLog.type'), type: 'text', width: 160 },
            { key: 'route', title: this.$t('vk.errorLog.pageUrl'), type: 'text', width: 240 },
            { key: 'err', title: this.$t('vk.errorLog.errorInfo'), type: 'text', minWidth: 260 },
            { key: 'time', title: this.$t('vk.errorLog.timeAgo'), type: 'dateDiff', width: 120 },
            { key: 'timeStr', title: this.$t('vk.errorLog.occurTime'), type: 'text', width: 120 },
          ],
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
      // 清除错误日志
      clearErrorLog() {
        let { vk } = this;
        vk.vuex.dispatch('$error/clear');
        this.close();
      },
      // 错误日志表格的右侧自定义按钮点击事件
      customRightBtns(row, btn) {
        if (btn.title === this.$t('vk.errorLog.baidu')) {
          window.open(`https://www.baidu.com/baidu?wd=${row.err}`);
        } else if (btn.title === this.$t('vk.errorLog.google')) {
          window.open(`https://www.google.com/search?q=${row.err}`);
        }
      },
      // 监听 - 页面打开
      onOpen() {},
      // 监听 - 页面关闭
      onClose() {},
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
      customRightBtnsList() {
        return [
          { title: this.$t('vk.errorLog.baidu'), icon: 'el-icon-document' },
          { title: this.$t('vk.errorLog.google'), icon: 'el-icon-document' },
        ];
      },
      errLogsCom() {
        return this.vk.getVuex('$error.logs');
      },
    },
  };
</script>

<style lang="scss" scoped></style>

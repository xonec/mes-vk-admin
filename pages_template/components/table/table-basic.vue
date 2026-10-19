<!-- 基础用法 -->
<template>
  <div>
    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">表格基础用法</div>
      </div>

      <div class="vk-page-card-table">
        <vk-data-table ref="table1" :data="table1.data" :columns="table1.columns" :row-no="true" :top="0"></vk-data-table>
      </div>
    </div>
  </div>
</template>

<script>
  let vk = uni.vk; // vk实例

  export default {
    data() {
      // 页面数据变量
      return {
        // 字段显示规则
        table1: {
          // 表格数据
          data: [],
          // 表格字段显示规则
          columns: [
            { key: '_id', title: '用户ID', type: 'text', width: 200 },
            { key: 'username', title: '用户名', type: 'text', width: 200 },
            { key: 'nickname', title: '用户昵称', type: 'text', width: 200 },
            { key: 'mobile', title: '手机号', type: 'text', width: 200 },
            { key: 'comment', title: '备注', type: 'text', minWidth: 200 },
          ],
        },
      };
    },
    // 监听 - 页面每次【加载时】执行(如：前进)
    onLoad(options = {}) {
      vk = this.vk;
      this.options = options;
      this.init(options);
    },
    // 监听 - 页面【首次渲染完成时】执行。注意如果渲染速度快，会在页面进入动画完成前触发
    onReady() {},
    // 监听 - 页面每次【显示时】执行(如：前进和返回) (页面每次出现在屏幕上都触发，包括从下级页面点返回露出当前页面)
    onShow() {},
    // 监听 - 页面每次【隐藏时】执行(如：返回)
    onHide() {},
    // 函数
    methods: {
      // 页面数据初始化函数
      init(options) {
        let list = [];
        for (let i = 1; i <= 10000; i++) {
          let s = i;
          if (i < 10) {
            s = '0' + i;
          }
          list.push({
            _id: i + '',
            username: `用户名${s}`,
            nickname: `用户昵称${s}`,
            mobile: `尾号${s}`,
            comment: `用户${s}的备注`,
          });
        }
        this.table1.data = list;
      },
    },
    // 监听属性
    watch: {},
    // 计算属性
    computed: {},
  };
</script>
<style lang="scss" scoped></style>

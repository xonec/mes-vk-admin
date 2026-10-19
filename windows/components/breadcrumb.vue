<template>
  <div class="mini-none">
    <div style="display: flex">
      <div v-for="(item, index) in menuMapCom" :key="index" @click="pageTo(item)" class="top-bar">
        <div class="item-content" v-if="item.name">
          {{ item.name }}
          <span v-if="index !== menuMapCom.length - 1" class="item-content-text"> / </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    props: {},
    data: function () {
      // 组件创建时，进行数据初始化
      return {};
    },
    mounted() {},
    methods: {
      pageTo(item = {}) {
        let { vk } = this;
        if (item.url) {
          vk.navigateTo(item.url);
        }
      },
    },
    watch: {},
    // 计算属性
    computed: {
      menuMapCom() {
        return this.vk.getVuex('$app.menuMap');
      },
    },
  };
</script>

<style lang="scss" scoped>
  .top-bar {
    margin-left: 10px;
    cursor: pointer;
  }
  .top-bar:first-child {
    margin-left: 0px;
  }
  .item-content {
    color: #606266;
  }
  .item-content:hover {
    color: #409eff;
  }
  .item-content-text {
    margin-left: 10px;
    color: #a3a9a9;
    font-weight: bold;
  }
</style>

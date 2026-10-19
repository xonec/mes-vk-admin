<template>
  <el-alert type="warning" show-icon class="stat-alert">
    <template slot="title">
      <div class="stat-alert-content">
        <span class="stat-alert-text">{{ text }}</span>
        <el-link type="warning" :underline="false" @click="$emit('refresh')" class="stat-alert-link">刷新</el-link>
      </div>
      <slot></slot>
    </template>
  </el-alert>
</template>

<script>
  export default {
    props: {
      text: {
        type: String,
        default: '统计数据每隔 5 分钟更新一次',
      },
    },
  };
</script>

<style lang="scss" scoped>
  .stat-alert {
    margin-bottom: 10px;
  }

  .stat-alert-content {
    display: flex;
    padding: 5px 0;
    align-items: center;
  }

  .stat-alert-text {
    font-size: 13px;
    margin-right: 12px;
  }

  .stat-alert-link {
    font-size: 13px;
    text-decoration: underline;
  }
</style>

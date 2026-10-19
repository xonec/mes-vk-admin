<template>
  <!-- 万能表单 -->
  <div v-if="scene === 'form'">
    <el-input :value="value" @input="_input"></el-input>
  </div>
  <!-- 万能表格 -->
  <div v-else-if="scene === 'table'">
    <span>{{ value }}</span>
  </div>
  <!-- 万能表格详情 -->
  <div v-else-if="scene === 'detail'">
    <span>{{ value }}</span>
  </div>
</template>

<script>
  export default {
    props: {
      // 双向绑定的值
      value: {
        type: String,
        default: '',
      },
      // 字段规则
      column: {
        type: Object,
        default: function () {
          return {};
        },
      },
      // 当前场景 form 万能表单 table 万能表格 detail 表格详情页
      scene: {
        type: String,
        default: 'form',
      },
    },
    data() {
      return {};
    },
    // 组件加载完成时触发
    mounted() {},
    // 组件函数
    methods: {
      _input(value) {
        // 固定顺序，先input，再change
        this.$emit('input', value);
        this.$emit('change', value);
      },
    },
    // 监听器
    watch: {},
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped></style>

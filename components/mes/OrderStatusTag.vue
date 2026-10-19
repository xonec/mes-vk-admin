<template>
  <span class="mes-order-tag" :class="'mes-order-tag--' + tone">{{ label }}</span>
</template>

<script>
  /** 订单状态彩色标签：已停用优先于订单状态（与旧后台文案一致）。 */
  export default {
    name: 'OrderStatusTag',
    props: {
      status: { type: String, default: 'draft' },
      enabled: { type: Boolean, default: true },
    },
    computed: {
      tone() {
        if (this.enabled === false) return 'disabled';
        return this.status === 'confirmed' ? 'confirmed' : 'draft';
      },
      label() {
        if (this.enabled === false) return '已停用';
        return this.status === 'confirmed' ? '已确认' : '草稿';
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-order-tag {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
    border: 1px solid transparent;
    border-radius: 3px;
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
  }
  .mes-order-tag--draft { color: #4a5f8a; background: #eef2fb; border-color: #d9e2f7; }
  .mes-order-tag--confirmed { color: #00695f; background: rgba(0, 133, 119, .1); border-color: rgba(0, 133, 119, .22); }
  .mes-order-tag--disabled { color: #8a8f98; background: #f1f2f4; border-color: #e3e5e8; }
</style>

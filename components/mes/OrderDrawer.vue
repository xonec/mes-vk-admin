<template>
  <el-drawer :visible="visible" :with-header="false" size="560px" direction="rtl" :close-on-click-modal="!saving" :show-close="false" @update:visible="(value) => (!value && !saving ? $emit('close') : null)">
    <div class="mes-drawer">
      <div class="mes-drawer-head">
        <div>
          <div class="mes-drawer-title">订单详情</div>
          <div class="mes-drawer-sub">{{ orderNo }}</div>
        </div>
        <el-button size="mini" :disabled="saving" @click="$emit('close')">关闭</el-button>
      </div>

      <div v-loading="loading" element-loading-text="正在读取订单…" class="mes-drawer-body">
        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mes-drawer-alert"></el-alert>

        <template v-if="record">
          <div class="mes-drawer-section-title">基本信息（只读）</div>
          <div class="mes-drawer-grid">
            <div class="mes-drawer-field"><span class="mes-drawer-label">订单号</span><span>{{ record.orderNo }}</span></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">状态</span><OrderStatusTag :status="record.orderStatus" :enabled="record.enabled !== false"></OrderStatusTag></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">批号</span><span class="mes-drawer-ellipsis" :title="record.batchNo">{{ record.batchNo || '—' }}</span></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">产品编码</span><span>{{ record.productCode || '—' }}</span></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">产品名称</span><span class="mes-drawer-ellipsis" :title="record.productName">{{ record.productName || '—' }}</span></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">包装规格</span><span class="mes-drawer-ellipsis" :title="record.packSpec">{{ record.packSpec || '—' }}</span></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">计划产量</span><span>{{ record.plannedQty == null ? '—' : record.plannedQty }}</span></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">客户</span><span class="mes-drawer-ellipsis" :title="record.customerName">{{ record.customerName || '—' }}</span></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">包装方案</span><span class="mes-drawer-ellipsis" :title="record.planName">{{ record.planName || '—' }}</span></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">更新时间</span><span>{{ updatedText }}</span></div>
            <div class="mes-drawer-field"><span class="mes-drawer-label">当前版本</span><span>V{{ record.version == null ? '—' : record.version }}</span></div>
          </div>

          <div class="mes-drawer-section-title">计划时间（本批只开放此项编辑）</div>
          <el-form label-width="100px" size="small" @submit.native.prevent>
            <el-form-item label="计划开始">
              <el-date-picker v-model="form.planStartAt" type="datetime" value-format="timestamp" placeholder="未排期" clearable style="width: 100%"></el-date-picker>
            </el-form-item>
            <el-form-item label="计划结束">
              <el-date-picker v-model="form.planEndAt" type="datetime" value-format="timestamp" placeholder="未排期" clearable style="width: 100%"></el-date-picker>
            </el-form-item>
          </el-form>
          <div class="mes-drawer-tip">允许只填一个或都留空（甘特视为未排期）；都填时必须「结束晚于开始」。范围 2020-01-01 ~ 2035-12-31，最终以服务端校验为准。</div>
          <el-alert v-if="formError" :title="formError" type="error" :closable="false" show-icon class="mes-drawer-alert"></el-alert>
        </template>
        <div v-else-if="!loading && !error" class="mes-drawer-empty">订单不存在或已被删除。</div>
      </div>

      <div class="mes-drawer-footer">
        <el-button size="small" :disabled="saving" @click="$emit('close')">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" :disabled="loading || !record" @click="save">保存计划时间</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script>
  import { callCloud, formatTime } from '@/utils/call-operations.js';
  import OrderStatusTag from '@/components/mes/OrderStatusTag.vue';

  const PLAN_START_MIN = new Date(2020, 0, 1).getTime();
  const PLAN_START_MAX = new Date(2036, 0, 1).getTime() - 1;

  /** 订单抽屉：全量读取后只编辑计划起止时间，其余字段只读，写回走 production-orders.upsert。 */
  export default {
    name: 'OrderDrawer',
    components: { OrderStatusTag },
    props: {
      visible: { type: Boolean, default: false },
      orderNo: { type: String, default: '' },
    },
    data() {
      return {
        loading: false,
        saving: false,
        error: '',
        formError: '',
        record: null,
        form: { planStartAt: null, planEndAt: null },
      };
    },
    computed: {
      updatedText() {
        return this.record ? formatTime(this.record.updatedAt) : '';
      },
    },
    watch: {
      visible(value) {
        if (value) this.load();
        else this.reset();
      },
      orderNo() {
        if (this.visible) this.load();
      },
    },
    methods: {
      reset() {
        this.record = null;
        this.error = '';
        this.formError = '';
        this.form = { planStartAt: null, planEndAt: null };
      },
      /** 用 get 拉全量记录（含 materials），避免用列表投影字段回写丢字段。 */
      async load() {
        if (!this.orderNo) return;
        this.loading = true;
        this.error = '';
        this.formError = '';
        this.record = null;
        try {
          const record = await callCloud('orders', 'get', { orderNo: this.orderNo });
          if (!record) {
            this.error = '订单不存在或已被删除';
            return;
          }
          this.record = record;
          this.form = {
            planStartAt: Number.isInteger(record.planStartAt) ? record.planStartAt : null,
            planEndAt: Number.isInteger(record.planEndAt) ? record.planEndAt : null,
          };
        } catch (error) {
          this.error = error && error.message ? error.message : String(error);
        } finally {
          this.loading = false;
        }
      },
      validate() {
        const { planStartAt, planEndAt } = this.form;
        for (const [value, label] of [[planStartAt, '计划开始时间'], [planEndAt, '计划结束时间']]) {
          if (value == null || value === '') continue;
          if (!Number.isInteger(value)) return label + '格式不正确';
          if (value < PLAN_START_MIN || value > PLAN_START_MAX) return label + '须在 2020-01-01 至 2035-12-31 之间';
        }
        if (planStartAt != null && planEndAt != null && planEndAt <= planStartAt) return '计划结束时间须晚于计划开始时间';
        return '';
      },
      /** 只覆盖计划时间；其余字段原样提交由服务端重新校验。 */
      async save() {
        if (this.saving || !this.record) return;
        this.formError = this.validate();
        if (this.formError) return;
        this.saving = true;
        try {
          await callCloud('orders', 'upsert', {
            record: { ...this.record, planStartAt: this.form.planStartAt || null, planEndAt: this.form.planEndAt || null },
            expectedVersion: Number(this.record.version) || 1,
          });
          this.$message.success('计划时间已保存');
          this.$emit('saved');
          this.$emit('close');
        } catch (error) {
          this.formError = (error && error.message ? error.message : String(error)) + (error && error.code === 409 ? ' 请关闭后重新打开订单再保存。' : '');
        } finally {
          this.saving = false;
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-drawer { display: flex; flex-direction: column; height: 100vh; }
  .mes-drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #ebeef5; }
  .mes-drawer-title { font-size: 16px; font-weight: 600; color: #303133; }
  .mes-drawer-sub { margin-top: 2px; font-size: 12px; color: #909399; }
  .mes-drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; }
  .mes-drawer-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid #ebeef5; }
  .mes-drawer-section-title { margin: 4px 0 10px; font-size: 13px; font-weight: 600; color: #303133; }
  .mes-drawer-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; margin-bottom: 18px; }
  .mes-drawer-field { display: flex; gap: 8px; font-size: 13px; color: #303133; min-width: 0; }
  .mes-drawer-label { flex: 0 0 68px; color: #909399; }
  .mes-drawer-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mes-drawer-tip { font-size: 12px; line-height: 1.6; color: #909399; margin-bottom: 10px; }
  .mes-drawer-alert { margin-bottom: 12px; }
  .mes-drawer-empty { padding: 24px 0; color: #909399; }
</style>

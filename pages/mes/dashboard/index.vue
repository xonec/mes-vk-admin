<template>
  <div>
    <div class="vk-page-card vk-page-search-card">
      <div class="mes-vk-hero">
        <div>
          <div class="mes-vk-title">生产工作台</div>
          <div class="mes-vk-hint">当日工单、排班与待处理事项集中查看。数据直调 production-operations（bootstrap + dashboard），只读。</div>
        </div>
        <div class="mes-vk-tags">
          <el-date-picker v-model="query.date" type="date" value-format="yyyy-MM-dd" size="small" style="width: 150px" @change="load"></el-date-picker>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon></el-alert>
    </div>

    <div v-loading="loading" element-loading-text="正在读取工作台…">
      <el-row :gutter="12" class="mes-vk-metrics">
        <el-col v-for="item in metricCards" :key="item.key" :span="4">
          <div class="vk-page-card mes-vk-metric" :class="item.tone">
            <div class="mes-vk-metric-value">{{ item.value }}</div>
            <div class="mes-vk-metric-label">{{ item.label }}</div>
          </div>
        </el-col>
      </el-row>

      <div class="vk-page-card">
        <div class="vk-page-card-toolbar"><div class="vk-page-card-title">快捷入口</div><div class="mes-vk-source">已迁移页面</div></div>
        <div class="mes-vk-links">
          <el-button v-for="link in quickLinks" :key="link.url" size="small" icon="el-icon-right" @click="go(link.url)">{{ link.text }}</el-button>
        </div>
      </div>

      <el-alert v-if="allZero" :title="'当日（' + query.date + '）云端暂无工单、排班与待处理异常；可切换日期或在旧后台确认是否已导入排班。'" type="info" :closable="false" show-icon class="mes-vk-alert"></el-alert>

      <div class="vk-page-card">
        <div class="vk-page-card-toolbar"><div class="vk-page-card-title">当日工单 <span class="mes-vk-count">最近 {{ data.jobs.length }} 单</span></div></div>
        <div v-if="!jobRows.length" class="mes-vk-empty">当日没有工单（按计划日期或生产中状态统计）。</div>
        <vk-data-table v-else :data="jobRows" :columns="jobColumns" :row-no="true" :top="0" :pagination="false"></vk-data-table>
      </div>

      <div class="vk-page-card">
        <div class="vk-page-card-toolbar"><div class="vk-page-card-title">当日排班 <span class="mes-vk-count">{{ data.schedules.length }} 条</span></div></div>
        <div v-if="!scheduleRows.length" class="mes-vk-empty">当日没有排班；排班需在旧后台导入或在下一批排班页导入后生成。</div>
        <vk-data-table v-else :data="scheduleRows" :columns="scheduleColumns" :row-no="true" :top="0" :pagination="false"></vk-data-table>
      </div>

      <div class="vk-page-card">
        <div class="vk-page-card-toolbar"><div class="vk-page-card-title">待处理异常 <span class="mes-vk-count">{{ data.exceptions.length }} 条</span></div></div>
        <div v-if="!exceptionRows.length" class="mes-vk-empty">当日没有待处理异常。</div>
        <vk-data-table v-else :data="exceptionRows" :columns="exceptionColumns" :row-no="true" :top="0" :pagination="false"></vk-data-table>
      </div>
    </div>
  </div>
</template>

<script>
  import { callOperations, formatTime } from '@/utils/call-operations.js';
  import { shiftTimeLabel } from '@/utils/shift-presets.js';

  const STATE_TEXT = { planned: '待开工', running: '生产中', paused: '已暂停', completed: '已完工' };

  export default {
    data() {
      const today = new Date();
      const pad = (value) => String(value).padStart(2, '0');
      return {
        loading: false,
        error: '',
        query: { date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` },
        data: { counts: {}, jobs: [], schedules: [], exceptions: [] },
        quickLinks: [
          { text: '排班列表', url: '/pages/mes/schedules/list' },
          { text: '订单列表', url: '/pages/mes/orders/list' },
          { text: '工单列表', url: '/pages/mes/jobs/list' },
          { text: '考勤记录', url: '' },
          { text: '基础数据', url: '/pages/mes/foundation/list?type=processes' },
          { text: '操作日志', url: '/pages/mes/audit/list' },
        ],
        jobColumns: [
          { key: 'batchNo', title: '批号', type: 'text', width: 170 },
          { key: 'productName', title: '产品', type: 'text', width: 160 },
          { key: 'processName', title: '工序', type: 'text', width: 130 },
          { key: 'workshopName', title: '车间', type: 'text', width: 130 },
          { key: 'qtyText', title: '数量', type: 'text', width: 120 },
          { key: 'stateText', title: '状态', type: 'text', width: 100 },
          { key: 'updatedText', title: '更新时间', type: 'text', width: 170 },
        ],
        scheduleColumns: [
          { key: 'date', title: '生产日', type: 'text', width: 110 },
          { key: 'personName', title: '员工', type: 'text', width: 110 },
          { key: 'workshopName', title: '车间', type: 'text', width: 130 },
          { key: 'shiftName', title: '班次', type: 'text', width: 100 },
          { key: 'processName', title: '工序', type: 'text', width: 130 },
          { key: 'timeText', title: '班次时间', type: 'text' },
        ],
        exceptionColumns: [
          { key: 'batchNo', title: '批号', type: 'text', width: 170 },
          { key: 'kindText', title: '异常类型', type: 'text', width: 140 },
          { key: 'description', title: '描述', type: 'text' },
          { key: 'authorName', title: '提交人', type: 'text', width: 110 },
          { key: 'updatedText', title: '时间', type: 'text', width: 170 },
        ],
      };
    },
    computed: {
      /** 当日云端无任何数据时给出整体说明，避免一排 0 没有解释。 */
      allZero() {
        const counts = this.data.counts || {};
        return !counts.jobs && !counts.running && !counts.completed && !counts.openExceptions && !counts.pendingHandovers && !(this.data.schedules || []).length;
      },
      metricCards() {
        const counts = this.data.counts || {};
        return [
          { key: 'jobs', label: '当日工单', value: counts.jobs || 0, tone: '' },
          { key: 'running', label: '生产中', value: counts.running || 0, tone: 'info' },
          { key: 'completed', label: '已完工', value: counts.completed || 0, tone: 'success' },
          { key: 'exceptions', label: '待处理异常', value: counts.openExceptions || 0, tone: 'danger' },
          { key: 'handovers', label: '待接班', value: counts.pendingHandovers || 0, tone: 'warning' },
          { key: 'schedules', label: '当日排班数', value: (this.data.schedules || []).length, tone: '' },
        ];
      },
      jobRows() {
        return (this.data.jobs || []).map((row) => ({
          ...row,
          qtyText: `${row.goodQty || 0} / ${row.plannedQty || 0}`,
          stateText: STATE_TEXT[row.state] || row.state || '—',
          updatedText: formatTime(row.updatedAt),
        }));
      },
      scheduleRows() {
        return (this.data.schedules || []).map((row) => ({ ...row, timeText: row.kind === 'rest' ? '休息' : shiftTimeLabel(row) }));
      },
      exceptionRows() {
        return (this.data.exceptions || []).map((row) => ({ ...row, kindText: row.kind || row.type || '—', updatedText: formatTime(row.updatedAt) }));
      },
    },
    onLoad() { this.load(); },
    methods: {
      async load() {
        if (this.loading) return;
        this.loading = true;
        this.error = '';
        try {
          const data = await callOperations('dashboard', { date: this.query.date });
          this.data = { date: data.date, counts: data.counts || {}, jobs: data.jobs || [], schedules: data.schedules || [], exceptions: data.exceptions || [] };
        } catch (error) {
          this.data = { counts: {}, jobs: [], schedules: [], exceptions: [] };
          this.error = error && error.message ? error.message : String(error);
        } finally {
          this.loading = false;
        }
      },
      go(url) {
        if (!url) return this.$message.info('该页面尚未迁移到新后台，请继续使用旧后台');
        uni.navigateTo({ url });
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-vk-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .mes-vk-title { font-size: 16px; font-weight: 600; color: #303133; }
  .mes-vk-hint { margin-top: 4px; font-size: 12px; line-height: 1.6; color: #909399; }
  .mes-vk-tags { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
  .mes-vk-metrics { margin-bottom: 12px; }
  .mes-vk-metric { padding: 16px; border-left: 3px solid #909399; margin-bottom: 12px; min-height: 78px; }
  .mes-vk-metric.info { border-left-color: #409eff; }
  .mes-vk-metric.success { border-left-color: #67c23a; }
  .mes-vk-metric.danger { border-left-color: #f56c6c; }
  .mes-vk-metric.warning { border-left-color: #e6a23c; }
  .mes-vk-metric-value { font-size: 24px; font-weight: 600; color: #303133; line-height: 1.2; }
  .mes-vk-metric-label { margin-top: 6px; font-size: 12px; color: #909399; }
  .mes-vk-links { display: flex; flex-wrap: wrap; gap: 8px; }
  .mes-vk-count { margin-left: 8px; font-size: 12px; font-weight: 400; color: #909399; }
  .mes-vk-source { font-size: 12px; color: #909399; }
  .mes-vk-empty { padding: 18px 4px; font-size: 13px; color: #909399; }
  .mes-vk-alert { margin-bottom: 12px; }
</style>

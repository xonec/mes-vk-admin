<template>
  <div class="mes-calendar">
    <div class="mes-calendar-head">
      <div class="mes-calendar-title">
        <span class="mes-calendar-month">{{ monthLabel }}</span>
        <span v-if="loading" class="mes-calendar-loading">加载中…</span>
      </div>
      <div class="mes-calendar-actions">
        <el-button size="mini" icon="el-icon-arrow-left" :disabled="loading" @click="shiftMonth(-1)"></el-button>
        <el-button size="mini" :disabled="loading" @click="goToday">今天</el-button>
        <el-button size="mini" @click="shiftMonth(1)" :disabled="loading"><i class="el-icon-arrow-right"></i></el-button>
      </div>
    </div>
    <div v-if="error" class="mes-calendar-error">
      {{ error }}
      <el-button size="mini" type="text" @click="$emit('retry')">重试</el-button>
    </div>
    <div class="mes-calendar-week"><span v-for="label in weekLabels" :key="label">{{ label }}</span></div>
    <div class="mes-calendar-grid">
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="mes-calendar-cell"
        :class="{ 'is-out': !cell.inMonth, 'is-today': cell.date === today, 'is-selected': cell.date === selectedDate, 'is-loaded': cell.data && cell.data.work > 0 }"
        @click="cell.inMonth && $emit('select', cell.date)"
      >
        <div class="mes-calendar-day">{{ cell.day }}</div>
        <div v-if="cell.data" class="mes-calendar-badges">
          <span v-if="cell.data.work" class="mes-calendar-badge mes-calendar-badge--work">出勤 {{ cell.data.work }}</span>
          <span v-if="cell.data.rest" class="mes-calendar-badge mes-calendar-badge--rest">休 {{ cell.data.rest }}</span>
          <span v-if="cell.data.leave" class="mes-calendar-badge mes-calendar-badge--leave">假 {{ cell.data.leave }}</span>
        </div>
      </div>
    </div>
    <div class="mes-calendar-legend">
      <span><i class="mes-calendar-dot mes-calendar-dot--work"></i>有排班（出勤）</span>
      <span><i class="mes-calendar-dot mes-calendar-dot--rest"></i>休息</span>
      <span><i class="mes-calendar-dot mes-calendar-dot--leave"></i>请假</span>
      <span class="mes-calendar-hint">点击日期可把下方明细切到当天</span>
    </div>
    <div v-if="!loading && !error && !dayCount" class="mes-calendar-empty">本月暂无排班。</div>
  </div>
</template>

<script>
  const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

  /** 排班月历：只做展示与选择，数据由父页面用 scheduleCalendar 拉取后传入。 */
  export default {
    name: 'ScheduleCalendar',
    props: {
      month: { type: String, default: '' },
      days: { type: Array, default: () => [] },
      selectedDate: { type: String, default: '' },
      loading: { type: Boolean, default: false },
      error: { type: String, default: '' },
    },
    data() {
      return { weekLabels: WEEK_LABELS };
    },
    computed: {
      monthLabel() {
        const [year, month] = String(this.month || '').split('-');
        return `${year || '—'}年${Number(month) || 0}月`;
      },
      dayMap() {
        return new Map((this.days || []).map((item) => [item.date, item]));
      },
      dayCount() {
        return (this.days || []).length;
      },
      today() {
        return this.format(new Date());
      },
      cells() {
        const [year, month] = String(this.month || '').split('-').map(Number);
        if (!year || !month) return [];
        const first = new Date(year, month - 1, 1);
        const offset = (first.getDay() + 6) % 7; // 周一为一周起点
        const total = new Date(year, month, 0).getDate();
        const cells = [];
        const pad = (value) => String(value).padStart(2, '0');
        for (let index = 0; index < offset; index++) cells.push({ key: 'pad-' + index, inMonth: false, day: '' });
        for (let day = 1; day <= total; day++) {
          const date = `${year}-${pad(month)}-${pad(day)}`;
          cells.push({ key: date, date, day, inMonth: true, data: this.dayMap.get(date) || null });
        }
        while (cells.length % 7 !== 0) cells.push({ key: 'tail-' + cells.length, inMonth: false, day: '' });
        return cells;
      },
    },
    methods: {
      format(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${date.getFullYear()}-${month}-${day}`;
      },
      /** 翻月：只发 month 事件，取数由父页面负责（缓存也在父页面）。 */
      shiftMonth(delta) {
        const [year, month] = String(this.month || '').split('-').map(Number);
        if (!year || !month) return;
        const target = new Date(year, month - 1 + delta, 1);
        this.$emit('change-month', this.format(target).slice(0, 7));
      },
      goToday() {
        this.$emit('change-month', this.format(new Date()).slice(0, 7));
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-calendar-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .mes-calendar-month { font-size: 15px; font-weight: 600; color: #303133; }
  .mes-calendar-loading { margin-left: 8px; font-size: 12px; color: #909399; }
  .mes-calendar-actions { display: flex; gap: 6px; }
  .mes-calendar-error { margin-bottom: 8px; font-size: 13px; color: #f56c6c; }
  .mes-calendar-week { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 12px; color: #909399; padding-bottom: 6px; }
  .mes-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .mes-calendar-cell { min-height: 64px; padding: 6px; border: 1px solid #ebeef5; border-radius: 4px; background: #fff; cursor: pointer; transition: background .15s, border-color .15s; }
  .mes-calendar-cell:hover { border-color: #c6e2ff; background: #f7faff; }
  .mes-calendar-cell.is-out { background: #fafafa; border-color: #f2f4f7; cursor: default; }
  .mes-calendar-cell.is-today .mes-calendar-day { color: #f56c6c; font-weight: 700; }
  .mes-calendar-cell.is-selected { border-color: #409eff; background: #ecf5ff; }
  .mes-calendar-cell.is-loaded { border-color: #d7e8ff; }
  .mes-calendar-day { font-size: 13px; color: #303133; }
  .mes-calendar-badges { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 4px; }
  .mes-calendar-badge { font-size: 11px; line-height: 16px; padding: 0 4px; border-radius: 2px; white-space: nowrap; }
  .mes-calendar-badge--work { color: #00695f; background: rgba(0, 133, 119, .1); }
  .mes-calendar-badge--rest { color: #606266; background: #f0f2f5; }
  .mes-calendar-badge--leave { color: #b88230; background: rgba(230, 162, 60, .12); }
  .mes-calendar-legend { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 10px; font-size: 12px; color: #909399; }
  .mes-calendar-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }
  .mes-calendar-dot--work { background: #008577; }
  .mes-calendar-dot--rest { background: #c0c4cc; }
  .mes-calendar-dot--leave { background: #e6a23c; }
  .mes-calendar-hint { margin-left: auto; color: #b1b5bb; }
  .mes-calendar-empty { margin-top: 8px; font-size: 13px; color: #909399; }
</style>

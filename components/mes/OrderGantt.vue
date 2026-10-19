<template>
  <div class="mes-gantt">
    <div v-if="loading" class="mes-gantt-loading">加载中…</div>

    <div class="mes-gantt-toolbar">
      <div class="mes-gantt-range">{{ rangeLabel }}</div>
      <div class="mes-gantt-toolbar-actions">
        <span class="mes-gantt-legend">
          <i class="mes-gantt-dot mes-gantt-dot--confirmed"></i>已确认
          <i class="mes-gantt-dot mes-gantt-dot--draft"></i>草稿
          <i class="mes-gantt-dot mes-gantt-dot--disabled"></i>已停用
        </span>
        <el-radio-group v-model="labelMode" size="mini">
          <el-radio-button label="day">日</el-radio-button>
          <el-radio-button label="week">周</el-radio-button>
        </el-radio-group>
        <el-select v-model="zoom" size="mini" style="width: 92px">
          <el-option label="紧凑" value="compact"></el-option>
          <el-option label="标准" value="normal"></el-option>
          <el-option label="宽松" value="wide"></el-option>
        </el-select>
        <el-button v-if="todayLeft !== null" size="mini" @click="scrollToToday">定位今天</el-button>
      </div>
    </div>

    <div v-if="!rows.length" class="mes-gantt-empty">
      暂无订单。
      <span class="mes-gantt-empty-hint">先在列表视图新增订单，再填写计划起止时间。</span>
    </div>
    <div v-else-if="!scheduledRows.length" class="mes-gantt-empty">
      还没有订单填写计划起止时间。
      <span class="mes-gantt-empty-hint">填写后横条会按 计划开始 → 计划结束 显示在这里。</span>
    </div>
    <div v-else ref="scroller" class="mes-gantt-scroll">
      <div class="mes-gantt-header">
        <div class="mes-gantt-label mes-gantt-label--head"><span class="mes-gantt-label-title">订单 / 产品</span></div>
        <div class="mes-gantt-track mes-gantt-track--head" :style="{ width: totalWidth + 'px' }">
          <div class="mes-gantt-months">
            <div v-for="band in monthBands" :key="band.key" class="mes-gantt-month" :style="{ left: band.left + 'px', width: band.width + 'px' }">{{ band.label }}</div>
          </div>
          <div class="mes-gantt-ticks">
            <div v-for="tick in ticks" :key="tick.key" class="mes-gantt-tick" :class="{ 'is-weekend': tick.weekend, 'is-major': tick.major }" :style="{ left: tick.left + 'px', width: tick.width + 'px' }">
              <span class="mes-gantt-tick-label">{{ tick.label }}</span>
            </div>
          </div>
          <div v-if="todayLeft !== null" class="mes-gantt-today mes-gantt-today--head" :style="{ left: todayLeft + 'px' }"></div>
        </div>
      </div>

      <div v-for="row in scheduledRows" :key="row.orderNo" class="mes-gantt-row" @click="$emit('open', row)">
        <div class="mes-gantt-label">
          <div class="mes-gantt-label-line">
            <span class="mes-gantt-order" :title="row.orderNo">{{ row.orderNo }}</span>
            <OrderStatusTag :status="row.orderStatus" :enabled="row.enabled !== false"></OrderStatusTag>
          </div>
          <span class="mes-gantt-product" :title="row.productName || ''">{{ row.productName || '—' }}</span>
          <span class="mes-gantt-meta" :title="(row.batchNo || '') + ' · ' + barRange(row)">{{ row.batchNo || '—' }} · {{ barRange(row) }}</span>
        </div>
        <div class="mes-gantt-track" :style="{ width: totalWidth + 'px' }">
          <div class="mes-gantt-grid">
            <div v-for="tick in ticks" :key="'grid-' + tick.key" class="mes-gantt-grid-cell" :class="{ 'is-weekend': tick.weekend, 'is-major': tick.major, 'is-month-start': tick.monthStart }" :style="{ left: tick.left + 'px', width: tick.width + 'px' }"></div>
          </div>
          <div class="mes-gantt-bar" :class="'mes-gantt-bar--' + tone(row)" :style="{ left: barLeft(row) + 'px', width: barWidth(row) + 'px' }" :title="barTitle(row)">
            <span v-if="barWidth(row) >= 78" class="mes-gantt-bar-text">{{ row.orderNo }}</span>
          </div>
          <div v-if="todayLeft !== null" class="mes-gantt-today" :style="{ left: todayLeft + 'px' }"></div>
        </div>
      </div>
    </div>

    <div v-if="rows.length" class="mes-gantt-unscheduled">
      <div class="mes-gantt-unscheduled-head">
        <span class="mes-gantt-unscheduled-title">未排期</span>
        <span class="mes-gantt-unscheduled-count">{{ unscheduledRows.length }} 单</span>
        <span class="mes-gantt-unscheduled-hint">缺少计划起止时间的订单，点击可打开抽屉补填计划时间。</span>
      </div>
      <div v-if="unscheduledRows.length" class="mes-gantt-chips">
        <div v-for="row in unscheduledRows" :key="'chip-' + row.orderNo" class="mes-gantt-chip" :title="(row.orderNo || '') + ' / ' + (row.productName || '')" @click="$emit('open', row)">
          <OrderStatusTag :status="row.orderStatus" :enabled="row.enabled !== false"></OrderStatusTag>
          <span class="mes-gantt-chip-order">{{ row.orderNo }}</span>
          <span class="mes-gantt-chip-name">{{ row.productName || '—' }}</span>
        </div>
      </div>
      <span v-else class="mes-gantt-none">全部订单都已排期。</span>
    </div>
  </div>
</template>

<script>
  import OrderStatusTag from '@/components/mes/OrderStatusTag.vue';

  const DAY = 86400000;
  const ZOOM = { compact: 24, normal: 44, wide: 64 };
  const PLAN_START_MIN = Date.UTC(2020, 0, 1);
  const PLAN_START_MAX = Date.UTC(2036, 0, 1) - 1;

  /** 订单级甘特：一条横条 = 一张订单的计划起止；纯 CSS 定位，无外部依赖。 */
  export default {
    name: 'OrderGantt',
    components: { OrderStatusTag },
    props: {
      rows: { type: Array, default: () => [] },
      loading: { type: Boolean, default: false },
    },
    data() {
      return { zoom: 'normal', labelMode: 'day' };
    },
    computed: {
      dayWidth() {
        return ZOOM[this.zoom] || ZOOM.normal;
      },
      scheduledRows() {
        return this.rows.filter((row) => this.validRange(row)).sort((a, b) => a.planStartAt - b.planStartAt);
      },
      unscheduledRows() {
        return this.rows.filter((row) => !this.validRange(row));
      },
      bounds() {
        const starts = this.scheduledRows.map((row) => row.planStartAt);
        const ends = this.scheduledRows.map((row) => row.planEndAt);
        const today = this.startOfDay(Date.now());
        if (!starts.length) return { start: today - 3 * DAY, end: today + 11 * DAY };
        return { start: this.startOfDay(Math.min(...starts)), end: this.startOfDay(Math.max(...ends)) + DAY };
      },
      spanDays() {
        return Math.max(1, Math.round((this.bounds.end - this.bounds.start) / DAY));
      },
      totalWidth() {
        return Math.max(720, this.spanDays * this.dayWidth);
      },
      ticks() {
        const list = [];
        for (let index = 0; index < this.spanDays; index++) {
          const day = this.bounds.start + index * DAY;
          const date = new Date(day);
          const weekDay = date.getDay();
          const weekStart = weekDay === 1;
          const monthStart = date.getDate() === 1;
          const showLabel = this.labelMode === 'day' || weekStart || monthStart;
          list.push({
            key: 'day-' + index,
            label: showLabel ? this.pad(date.getMonth() + 1) + '/' + this.pad(date.getDate()) : '',
            left: index * this.dayWidth,
            width: this.dayWidth,
            weekend: weekDay === 0 || weekDay === 6,
            major: this.labelMode === 'day' ? index === 0 : weekStart || monthStart,
            monthStart,
          });
        }
        return list;
      },
      monthBands() {
        const bands = [];
        let cursor = new Date(this.bounds.start);
        let guard = 0;
        while (cursor.getTime() < this.bounds.end && guard++ < 62) {
          const year = cursor.getFullYear();
          const month = cursor.getMonth();
          const monthStart = new Date(year, month, 1).getTime();
          const nextMonth = new Date(year, month + 1, 1).getTime();
          const from = Math.max(this.bounds.start, monthStart);
          const to = Math.min(this.bounds.end, nextMonth);
          bands.push({
            key: year + '-' + month,
            label: year + '年' + (month + 1) + '月',
            left: Math.round((from - this.bounds.start) / DAY) * this.dayWidth,
            width: Math.max(0, Math.round((to - from) / DAY) * this.dayWidth),
          });
          cursor = new Date(year, month + 1, 1);
        }
        return bands;
      },
      todayLeft() {
        const today = this.startOfDay(Date.now());
        if (today < this.bounds.start || today >= this.bounds.end) return null;
        return Math.round((today - this.bounds.start) / DAY) * this.dayWidth;
      },
      rangeLabel() {
        return this.formatDay(this.bounds.start) + ' ~ ' + this.formatDay(this.bounds.end - DAY);
      },
    },
    methods: {
      pad(value) {
        return String(value).padStart(2, '0');
      },
      startOfDay(timestamp) {
        const date = new Date(timestamp);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      },
      formatDay(timestamp) {
        const date = new Date(timestamp);
        return date.getFullYear() + '-' + this.pad(date.getMonth() + 1) + '-' + this.pad(date.getDate());
      },
      validRange(row) {
        const start = Number(row.planStartAt);
        const end = Number(row.planEndAt);
        return Number.isInteger(start) && Number.isInteger(end) && start >= PLAN_START_MIN && end <= PLAN_START_MAX && end > start;
      },
      tone(row) {
        if (row.enabled === false) return 'disabled';
        return row.orderStatus === 'confirmed' ? 'confirmed' : 'draft';
      },
      barLeft(row) {
        return Math.round((this.startOfDay(row.planStartAt) - this.bounds.start) / DAY) * this.dayWidth;
      },
      barWidth(row) {
        const start = this.startOfDay(row.planStartAt);
        const end = this.startOfDay(row.planEndAt) + DAY;
        return Math.max(this.dayWidth * 0.6, Math.round((end - start) / DAY) * this.dayWidth);
      },
      barRange(row) {
        return this.formatDay(row.planStartAt) + ' → ' + this.formatDay(row.planEndAt);
      },
      barTitle(row) {
        const status = row.enabled === false ? '已停用' : row.orderStatus === 'confirmed' ? '已确认' : '草稿';
        return `订单 ${row.orderNo}\n批号 ${row.batchNo || '—'}\n${status} · ${this.barRange(row)}`;
      },
      /** 定位今天：把今天所在位置滚动到可视区左侧 1/3 处。 */
      scrollToToday() {
        if (this.todayLeft === null || !this.$refs.scroller) return;
        const scroller = this.$refs.scroller;
        const labelWidth = 260;
        scroller.scrollLeft = Math.max(0, labelWidth + this.todayLeft - scroller.clientWidth / 3);
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-gantt { font-size: 13px; }
  .mes-gantt-loading { padding: 12px 4px; color: #909399; }
  .mes-gantt-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  .mes-gantt-range { font-size: 12px; color: #606266; }
  .mes-gantt-toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .mes-gantt-legend { font-size: 12px; color: #909399; display: inline-flex; align-items: center; gap: 4px; }
  .mes-gantt-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-left: 6px; }
  .mes-gantt-dot--confirmed { background: #008577; }
  .mes-gantt-dot--draft { background: #5b7cc4; }
  .mes-gantt-dot--disabled { background: #b9bdc4; }
  .mes-gantt-empty { padding: 22px 4px; color: #909399; }
  .mes-gantt-empty-hint { margin-left: 6px; color: #b1b5bb; }
  .mes-gantt-scroll { overflow-x: auto; border: 1px solid #ebeef5; border-radius: 4px; }
  .mes-gantt-header, .mes-gantt-row { display: flex; min-width: 900px; }
  .mes-gantt-header { position: sticky; top: 0; z-index: 2; background: #fafafa; border-bottom: 1px solid #ebeef5; }
  .mes-gantt-row { border-bottom: 1px solid #f2f4f7; cursor: pointer; }
  .mes-gantt-row:hover { background: #f7faff; }
  .mes-gantt-label { width: 260px; flex: 0 0 260px; padding: 8px 10px; border-right: 1px solid #ebeef5; background: #fff; min-width: 0; }
  .mes-gantt-label--head { display: flex; align-items: center; }
  .mes-gantt-label-title { font-weight: 600; color: #303133; }
  .mes-gantt-label-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .mes-gantt-order { font-weight: 600; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mes-gantt-product { display: block; margin-top: 2px; color: #606266; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mes-gantt-meta { display: block; margin-top: 2px; color: #909399; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mes-gantt-track { position: relative; flex: 1 0 auto; min-width: 0; }
  .mes-gantt-track--head { height: 64px; }
  .mes-gantt-months { position: relative; height: 28px; border-bottom: 1px solid #f0f2f5; }
  .mes-gantt-month { position: absolute; top: 0; height: 28px; line-height: 28px; padding-left: 6px; font-size: 12px; color: #606266; border-left: 1px solid #ebeef5; box-sizing: border-box; overflow: hidden; white-space: nowrap; }
  .mes-gantt-ticks { position: relative; height: 36px; }
  .mes-gantt-tick { position: absolute; top: 0; height: 36px; border-left: 1px solid #f0f2f5; box-sizing: border-box; }
  .mes-gantt-tick.is-weekend { background: #fafafa; }
  .mes-gantt-tick.is-major { border-left-color: #dcdfe6; }
  .mes-gantt-tick-label { display: block; padding-left: 3px; line-height: 36px; font-size: 11px; color: #a8abb2; white-space: nowrap; }
  .mes-gantt-grid { position: absolute; inset: 0; }
  .mes-gantt-grid-cell { position: absolute; top: 0; bottom: 0; border-left: 1px solid #f5f7fa; box-sizing: border-box; }
  .mes-gantt-grid-cell.is-weekend { background: #fafafa; }
  .mes-gantt-grid-cell.is-month-start { border-left-color: #e4e7ed; }
  .mes-gantt-row .mes-gantt-track { height: 56px; }
  .mes-gantt-bar { position: absolute; top: 14px; height: 28px; border-radius: 4px; display: flex; align-items: center; padding: 0 6px; box-sizing: border-box; }
  .mes-gantt-bar--confirmed { background: rgba(0, 133, 119, .88); color: #fff; }
  .mes-gantt-bar--draft { background: rgba(91, 124, 196, .88); color: #fff; }
  .mes-gantt-bar--disabled { background: rgba(150, 154, 160, .55); color: #fff; }
  .mes-gantt-bar-text { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mes-gantt-today { position: absolute; top: 0; bottom: 0; width: 2px; background: #f56c6c; opacity: .75; pointer-events: none; }
  .mes-gantt-today--head { bottom: 0; }
  .mes-gantt-unscheduled { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #ebeef5; }
  .mes-gantt-unscheduled-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .mes-gantt-unscheduled-title { font-weight: 600; color: #303133; }
  .mes-gantt-unscheduled-count { font-size: 12px; color: #909399; }
  .mes-gantt-unscheduled-hint { font-size: 12px; color: #b1b5bb; }
  .mes-gantt-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .mes-gantt-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 320px; padding: 4px 8px; border: 1px solid #ebeef5; border-radius: 4px; background: #fafafa; cursor: pointer; }
  .mes-gantt-chip:hover { border-color: #c6e2ff; background: #ecf5ff; }
  .mes-gantt-chip-order { font-weight: 600; color: #303133; }
  .mes-gantt-chip-name { color: #909399; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mes-gantt-none { font-size: 12px; color: #909399; }
</style>

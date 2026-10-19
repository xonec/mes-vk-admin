<template>
  <div class="mes-preview-table">
    <el-table :data="rows" border size="small" :max-height="420" empty-text="当前筛选没有记录" :row-class-name="rowClass">
      <el-table-column label="来源 / 行号" width="170">
        <template slot-scope="{ row }">
          <div class="cell-stack">
            <span class="ellipsis" :title="row.sourceFile">{{ row.sourceFile }}</span>
            <span class="cell-note">{{ row.sourceSheet ? row.sourceSheet + ' · 第 ' + row.line + ' 行' : row.generated ? '完整日表自动补齐' : '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="人员 / 日期" width="130">
        <template slot-scope="{ row }">
          <div class="cell-stack">
            <span>{{ row.record ? row.record.personName : row.personName || '—' }}</span>
            <span class="cell-note">{{ row.record ? row.record.date : row.originalDate || '—' }}</span>
            <span v-if="row.record && !row.record.personId && !row.requiresPersonSelection" class="cell-note">导入时自动建档</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="班次 / 工序" width="150">
        <template slot-scope="{ row }">
          <div class="cell-stack">
            <span>{{ row.record ? (row.record.kind === 'rest' ? absenceLabel(row.record) : name('shifts', row.record.shiftId)) : row.shiftName || '—' }}</span>
            <span class="cell-note">{{ row.record ? (row.record.kind === 'rest' ? absenceLabel(row.record) + ' · 0 小时' : name('processes', row.record.processId)) : row.processName || '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="时间 / 岗位" width="140">
        <template slot-scope="{ row }">
          <div v-if="row.record" class="cell-stack">
            <span>{{ row.record.kind === 'rest' ? '—' : timeText(row.record) }}</span>
            <span class="cell-note">{{ row.record.post || '未指定岗位' }}</span>
          </div>
          <span v-else class="cell-note">—</span>
        </template>
      </el-table-column>
      <el-table-column label="批号 / 备注" min-width="160">
        <template slot-scope="{ row }">
          <div class="cell-stack">
            <span class="ellipsis" :title="row.record ? (row.record.batchNos || []).join('、') : ''">{{ row.record ? (row.record.batchNos || []).join('、') || '待派工' : '—' }}</span>
            <span class="cell-note ellipsis" :title="row.sourceNote || (row.record && row.record.note) || ''">{{ row.sourceNote || (row.record && row.record.note) || '无备注' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="180">
        <template slot-scope="{ row }">
          <div class="cell-stack">
            <el-tag size="mini" :type="stateTag(row)">{{ previewStateName(row) }}</el-tag>
            <span class="cell-note ellipsis" :title="previewMessage(row)">{{ previewMessage(row) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template slot-scope="{ row }">
          <el-button v-if="row.record && !row.excluded" type="text" size="mini" :disabled="disabled || hasImportResults" @click="$emit('review', row)">{{ previewState(row) === 'pending' ? '核对' : '编辑' }}</el-button>
          <el-button type="text" size="mini" :disabled="disabled || hasImportResults" @click="$emit('exclude', row)">{{ row.excluded ? '恢复' : '跳过' }}</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="mes-preview-pagination">
      <el-pagination
        background
        :total="rows.length"
        :page-size="pageSize"
        :current-page="page"
        :page-sizes="[20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="(value) => (page = value)"
        @size-change="(value) => { pageSize = value; page = 1; }"
      ></el-pagination>
    </div>
  </div>
</template>

<script>
  const MINUTES = (value) => Number(String(value || '00:00').slice(0, 2)) * 60 + Number(String(value || '00:00').slice(3));
  export default {
    name: 'SchedulePreviewTable',
    props: {
      rows: { type: Array, default: () => [] },
      disabled: { type: Boolean, default: false },
      hasImportResults: { type: Boolean, default: false },
      // 页面传入的纯函数（预览状态、目录名称），避免子组件复制业务规则。
      previewState: { type: Function, required: true },
      previewStateName: { type: Function, required: true },
      previewMessage: { type: Function, required: true },
      name: { type: Function, required: true },
    },
    data() {
      return { page: 1, pageSize: 20 };
    },
    computed: {
      pagedRows() {
        return this.rows.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
      },
    },
    watch: {
      rows() {
        if (this.page > 1 && !this.pagedRows.length) this.page = 1;
        else if (this.page > 1 && this.rows.length <= (this.page - 1) * this.pageSize) this.page = 1;
      },
    },
    methods: {
      rowClass({ row }) {
        const state = this.previewState(row);
        if (state === 'error' || state === 'failure') return 'mes-row-problem';
        if (state === 'pending') return 'mes-row-pending';
        if (state === 'excluded') return 'mes-row-excluded';
        if (state === 'success') return 'mes-row-done';
        return '';
      },
      stateTag(row) {
        return ({ excluded: 'info', error: 'danger', pending: 'warning', ready: 'success', failure: 'danger', success: 'success' })[this.previewState(row)] || 'info';
      },
      absenceLabel(record) {
        return record && record.absenceType === 'leave' ? '请假' : '休息';
      },
      timeText(record) {
        const start = record.startTime || '—';
        const end = record.endTime || '—';
        const offset = (value) => (Number(value) === 1 ? '次日' : '当天');
        const hours = (Number(record.endDayOffset || 0) * 1440 + MINUTES(end) - Number(record.startDayOffset || 0) * 1440 - MINUTES(start)) / 60;
        return offset(record.startDayOffset || 0) + ' ' + start + ' → ' + offset(record.endDayOffset == null ? Number(record.startDayOffset || 0) + (end <= start ? 1 : 0) : record.endDayOffset) + ' ' + end + (hours > 0 ? ' · ' + (Math.round(hours * 10) / 10) + 'h' : '');
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-preview-table .cell-stack {
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.5;
  }
  .mes-preview-table .cell-note {
    color: #909399;
    font-size: 12px;
  }
  .mes-preview-table .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mes-preview-table :deep(.mes-row-problem) {
    background: #fef0f0;
  }
  .mes-preview-table :deep(.mes-row-pending) {
    background: #fdf6ec;
  }
  .mes-preview-table :deep(.mes-row-excluded) {
    color: #b1b3b8;
  }
  .mes-preview-table :deep(.mes-row-done) {
    background: #f0f9eb;
  }
  .mes-preview-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
  }
</style>

<template>
  <div>
    <div class="vk-page-card vk-page-search-card">
      <div class="mes-vk-hero">
        <div>
          <div class="mes-vk-title">操作日志</div>
          <div class="mes-vk-hint">服务端记录的实际操作人、时间、原因和版本。数据直调 production-operations 的 audit（只读）。</div>
        </div>
        <div class="mes-vk-tags">
          <el-tag size="small" type="success">只读</el-tag>
          <el-tag v-if="responseTime" size="small" type="info">本次请求 {{ responseTime }} ms</el-tag>
        </div>
      </div>
      <el-form :inline="true" size="small" @submit.native.prevent>
        <el-form-item label="资料类型">
          <el-select v-model="query.type" style="width: 160px" @change="search(1)">
            <el-option v-for="item in types" :key="item.value" :label="item.text" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="批号或资料名称" clearable style="width: 220px" @keyup.enter.native="search(1)"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" :loading="loading" @click="search(1)">查询</el-button>
          <el-button icon="el-icon-refresh-left" :disabled="loading" @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">审计记录 <span class="mes-vk-count">共 {{ total }} 条</span></div>
        <div class="mes-vk-source">数据源：production-operations.audit</div>
      </div>
      <div v-loading="loading" element-loading-text="正在读取操作日志…" class="vk-page-card-table">
        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mes-vk-alert"></el-alert>
        <vk-data-table :data="rows" :columns="columns" :row-no="true" :top="0" :pagination="false" :max-height="tableHeight"></vk-data-table>
        <div class="mes-vk-pagination">
          <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="total" :page-size="query.pageSize" :current-page="query.page" :page-sizes="[20, 50]" @current-change="search" @size-change="sizeChange"></el-pagination>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { callOperations, formatTime } from '@/utils/call-operations.js';

  const TYPES = [
    { value: 'jobs', text: '工单执行' },
    { value: 'schedules', text: '排班' },
    { value: 'handovers', text: '交接班' },
    { value: 'exceptions', text: '异常' },
    { value: 'attendance', text: '考勤记录' },
    { value: 'personnel', text: '人员' },
    { value: 'processes', text: '工序' },
    { value: 'shifts', text: '班次' },
    { value: 'resources', text: '设备与模具' },
    { value: 'workshops', text: '车间' },
    { value: 'claims', text: '人员认领审核' },
  ];

  export default {
    data() {
      return {
        loading: false,
        error: '',
        responseTime: 0,
        rows: [],
        total: 0,
        types: TYPES,
        query: { type: 'jobs', keyword: '', page: 1, pageSize: 20 },
        columns: [
          { key: 'label', title: '资料', type: 'text', width: 180 },
          { key: 'actionText', title: '动作', type: 'text', width: 90 },
          { key: 'versionText', title: '版本', type: 'text', width: 100 },
          { key: 'actorName', title: '操作人', type: 'text', width: 120 },
          { key: 'timeText', title: '操作时间', type: 'text', width: 180 },
          { key: 'reason', title: '原因', type: 'text' },
        ],
      };
    },
    computed: {
      tableHeight() {
        return Math.max(360, window.innerHeight - 430);
      },
    },
    onLoad() {
      this.search(1);
    },
    methods: {
      /** 读取审计记录；服务端分页，关键字由服务端过滤。 */
      async search(page) {
        const current = Number(page) || this.query.page;
        this.query.page = current;
        this.loading = true;
        this.error = '';
        const started = Date.now();
        try {
          const data = await callOperations('audit', {
            type: this.query.type,
            keyword: this.query.keyword,
            page: current,
            pageSize: this.query.pageSize,
          });
          this.rows = (data.list || []).map((row) => ({
            ...row,
            actionText: row.action === 'create' ? '新建' : row.action === 'update' ? '修改' : (row.action || '—'),
            versionText: `V${row.previousVersion == null ? 0 : row.previousVersion} → V${row.version == null ? '—' : row.version}`,
            timeText: formatTime(row.at),
          }));
          this.total = Number(data.total) || 0;
        } catch (error) {
          this.rows = [];
          this.total = 0;
          this.error = error && error.message ? error.message : String(error);
        } finally {
          this.responseTime = Date.now() - started;
          this.loading = false;
        }
      },
      sizeChange(size) {
        this.query.pageSize = Number(size) || 20;
        this.search(1);
      },
      reset() {
        this.query.type = 'jobs';
        this.query.keyword = '';
        this.search(1);
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-vk-hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }
  .mes-vk-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
  .mes-vk-hint {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.6;
    color: #909399;
  }
  .mes-vk-tags {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  .mes-vk-count {
    margin-left: 8px;
    font-size: 12px;
    font-weight: 400;
    color: #909399;
  }
  .mes-vk-source {
    font-size: 12px;
    color: #909399;
  }
  .mes-vk-alert {
    margin-bottom: 12px;
  }
  .mes-vk-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>

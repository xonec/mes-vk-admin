<template>
  <div>
    <div class="vk-page-card vk-page-search-card">
      <div class="mes-vk-hero">
        <div>
          <div class="mes-vk-title">工单执行</div>
          <div class="mes-vk-hint">只读列表：数据直调 production-operations.listJobs（批号/产品/工序车间/进度/状态）。执行详情与操作留到下一批。</div>
        </div>
        <div class="mes-vk-tags"><el-tag v-if="responseTime" size="small" type="info">本次请求 {{ responseTime }} ms</el-tag></div>
      </div>
      <div class="mes-vk-chips">
        <el-button v-for="item in states" :key="item.value" size="small" :type="query.state === item.value ? 'primary' : 'default'" @click="changeState(item.value)">{{ item.text }}</el-button>
      </div>
      <el-form :inline="true" size="small" @submit.native.prevent>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="批号 / 产品编码 / 产品名称 / 工序" clearable style="width: 280px" @keyup.enter.native="search(1)"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" :loading="loading" @click="search(1)">查询</el-button>
          <el-button icon="el-icon-refresh-left" :disabled="loading" @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mes-vk-alert"></el-alert>
    </div>

    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">工单清单 <span class="mes-vk-count">共 {{ total }} 单</span></div>
        <div class="mes-vk-source">数据源：production-operations.listJobs</div>
      </div>
      <div v-loading="loading" element-loading-text="正在读取工单…" class="vk-page-card-table">
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

  const STATE_TEXT = { planned: '待开工', running: '生产中', paused: '已暂停', completed: '已完工' };

  export default {
    data() {
      return {
        loading: false,
        error: '',
        responseTime: 0,
        rows: [],
        total: 0,
        states: [
          { value: '', text: '全部' },
          { value: 'planned', text: '待开工' },
          { value: 'running', text: '生产中' },
          { value: 'paused', text: '已暂停' },
          { value: 'completed', text: '已完工' },
        ],
        query: { state: '', keyword: '', page: 1, pageSize: 20 },
        columns: [
          { key: 'batchNo', title: '生产批号', type: 'text', width: 170 },
          { key: 'productName', title: '产品', type: 'text', width: 180 },
          { key: 'productCode', title: '产品编码', type: 'text', width: 130 },
          { key: 'processName', title: '工序', type: 'text', width: 130 },
          { key: 'workshopName', title: '车间', type: 'text', width: 130 },
          { key: 'progressText', title: '生产进度', type: 'text', width: 170 },
          { key: 'stateText', title: '状态', type: 'text', width: 100 },
          { key: 'updatedText', title: '更新时间', type: 'text', width: 170 },
        ],
      };
    },
    computed: {
      tableHeight() {
        return Math.max(360, window.innerHeight - 470);
      },
    },
    onLoad() {
      this.search(1);
    },
    methods: {
      async search(page) {
        const current = Number(page) || this.query.page;
        this.query.page = current;
        this.loading = true;
        this.error = '';
        const started = Date.now();
        try {
          const data = await callOperations('listJobs', {
            page: current,
            pageSize: this.query.pageSize,
            keyword: this.query.keyword,
            state: this.query.state,
          });
          this.total = Number(data.total) || 0;
          this.rows = (data.list || []).map((row) => ({
            ...row,
            progressText: `合格 ${row.goodQty || 0} / ${row.targetQty == null ? '—' : row.targetQty}`,
            stateText: STATE_TEXT[row.state] || row.state || '—',
            updatedText: formatTime(row.updatedAt),
          }));
        } catch (error) {
          this.rows = [];
          this.total = 0;
          this.error = error && error.message ? error.message : String(error);
        } finally {
          this.responseTime = Date.now() - started;
          this.loading = false;
        }
      },
      changeState(state) {
        this.query.state = state;
        this.search(1);
      },
      sizeChange(size) {
        this.query.pageSize = Number(size) || 20;
        this.search(1);
      },
      reset() {
        this.query = { state: '', keyword: '', page: 1, pageSize: this.query.pageSize };
        this.search(1);
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-vk-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .mes-vk-title { font-size: 16px; font-weight: 600; color: #303133; }
  .mes-vk-hint { margin-top: 4px; font-size: 12px; line-height: 1.6; color: #909399; }
  .mes-vk-tags { display: flex; gap: 8px; flex-shrink: 0; }
  .mes-vk-chips { display: flex; gap: 8px; margin-bottom: 12px; }
  .mes-vk-alert { margin-top: 8px; }
  .mes-vk-count { margin-left: 8px; font-size: 12px; font-weight: 400; color: #909399; }
  .mes-vk-source { font-size: 12px; color: #909399; }
  .mes-vk-pagination { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>

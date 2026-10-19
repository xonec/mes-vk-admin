<template>
  <div>
    <div class="vk-page-card vk-page-search-card">
      <div class="mes-vk-hero">
        <div>
          <div class="mes-vk-title">生产订单</div>
          <div class="mes-vk-hint">只读列表：数据直调 production-orders.list（订单号/批号/产品/计划产量/客户方案/状态）。甘特图与抽屉编辑留到下一批。</div>
        </div>
        <div class="mes-vk-tags">
          <el-tag v-if="responseTime" size="small" type="info">本次请求 {{ responseTime }} ms</el-tag>
        </div>
      </div>
      <div class="mes-vk-viewbar">
        <el-radio-group v-model="viewMode" size="small" @change="switchView">
          <el-radio-button label="list">列表</el-radio-button>
          <el-radio-button label="gantt">甘特</el-radio-button>
        </el-radio-group>
        <span class="mes-vk-source">甘特按订单计划起止时间显示；未填写计划时间的订单列在「未排期」。</span>
      </div>
      <el-tabs v-model="query.tab" @tab-click="search(1)">
        <el-tab-pane label="全部" name="all"></el-tab-pane>
        <el-tab-pane label="草稿" name="draft"></el-tab-pane>
        <el-tab-pane label="已确认" name="confirmed"></el-tab-pane>
        <el-tab-pane label="已停用" name="disabled"></el-tab-pane>
      </el-tabs>
      <el-form :inline="true" size="small" @submit.native.prevent>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="订单号 / 批号 / 产品 / 客户" clearable style="width: 240px" @keyup.enter.native="search(1)"></el-input>
        </el-form-item>
        <el-form-item label="更新时间">
          <el-date-picker v-model="query.updatedRange" type="daterange" value-format="yyyy-MM-dd" range-separator="至" start-placeholder="开始" end-placeholder="结束" @change="search(1)"></el-date-picker>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" :loading="loading" @click="search(1)">查询</el-button>
          <el-button icon="el-icon-refresh-left" :disabled="loading" @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mes-vk-alert"></el-alert>
    </div>

    <order-drawer :visible="drawerVisible" :order-no="drawerOrderNo" @close="drawerVisible = false" @saved="refresh" @closed="drawerOrderNo = ''"></order-drawer>

    <div class="vk-page-card">
      <div v-if="viewMode === 'list'" class="vk-page-card-toolbar">
        <div class="vk-page-card-title">订单列表 <span class="mes-vk-count">共 {{ total }} 单</span></div>
        <div class="mes-vk-source">数据源：production-orders.list</div>
      </div>
      <div v-loading="loading" element-loading-text="正在读取订单…" class="vk-page-card-table">
        <el-alert v-if="viewMode === 'gantt'" title="甘特只加载当前筛选的前 200 单（服务端列表上限）；如需更多请缩小筛选范围。" type="info" :closable="false" show-icon class="mes-vk-alert"></el-alert>
        <vk-data-table v-if="viewMode === 'list'" :data="rows" :columns="columns" :row-no="true" :top="0" :pagination="false" :max-height="tableHeight" :custom-right-btns="rowButtons"></vk-data-table>
        <order-gantt v-else :rows="ganttRows" :loading="loading" @open="openDrawer"></order-gantt>
        <div v-if="viewMode === 'list'" class="mes-vk-pagination">
          <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="total" :page-size="query.pageSize" :current-page="query.page" :page-sizes="[20, 50]" @current-change="search" @size-change="sizeChange"></el-pagination>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { callCloud, formatTime } from '@/utils/call-operations.js';
  import OrderGantt from '@/components/mes/OrderGantt.vue';
  import OrderDrawer from '@/components/mes/OrderDrawer.vue';

  export default {
    components: { OrderGantt, OrderDrawer },
    data() {
      return {
        loading: false,
        error: '',
        responseTime: 0,
        rows: [],
        ganttRows: [],
        total: 0,
        viewMode: 'list',
        drawerVisible: false,
        drawerOrderNo: '',
        query: { tab: 'all', keyword: '', updatedRange: [], page: 1, pageSize: 20 },
        columns: [
          { key: 'orderNo', title: '订单号', type: 'text', width: 150 },
          { key: 'batchNo', title: '批号', type: 'text', width: 160 },
          { key: 'productCode', title: '产品编码', type: 'text', width: 130 },
          { key: 'productName', title: '产品名称', type: 'text', width: 160 },
          { key: 'planQtyText', title: '计划产量', type: 'text', width: 100 },
          { key: 'customerText', title: '客户 / 方案', type: 'text', width: 190 },
          { key: 'statusText', title: '状态', type: 'text', width: 100 },
          { key: 'updatedText', title: '更新时间', type: 'text', width: 170 },
        ],
      };
    },
    computed: {
      tableHeight() {
        return Math.max(360, window.innerHeight - 520);
      },
    },
    onLoad() {
      this.search(1);
    },
    computed: {
      rowButtons() {
        return [{ title: '详情', type: 'primary', onClick: (row) => this.openDrawer(row) }];
      },
    },
    methods: {
      /** 打开抽屉（列表行或甘特横条）。 */
      openDrawer(row) {
        if (!row || !row.orderNo) return;
        this.drawerOrderNo = row.orderNo;
        this.drawerVisible = true;
      },
      /** 切换视图：甘特需要一次多拉（服务端上限 200）。 */
      switchView() {
        if (this.viewMode === 'gantt') this.loadGantt();
        else this.search(1);
      },
      refresh() {
        if (this.viewMode === 'gantt') this.loadGantt();
        else this.search(this.query.page);
      },
      /** 甘特取数：同筛选条件，一次 200 条。 */
      async loadGantt() {
        this.loading = true;
        this.error = '';
        const started = Date.now();
        try {
          const params = { ...this.buildParams(), page: 1, pageSize: 200 };
          const data = await callCloud('orders', 'list', params);
          this.ganttRows = data.list || [];
          this.total = Number(data.total) || 0;
        } catch (error) {
          this.ganttRows = [];
          this.error = error && error.message ? error.message : String(error);
        } finally {
          this.responseTime = Date.now() - started;
          this.loading = false;
        }
      },
      /** 组装列表参数；订单状态与更新时间由服务端过滤，不做前端假过滤。 */
      buildParams() {
        const params = { page: this.query.page, pageSize: this.query.pageSize, keyword: this.query.keyword };
        if (this.query.tab === 'disabled') params.status = 'disabled';
        else if (this.query.tab === 'draft' || this.query.tab === 'confirmed') params.orderStatus = this.query.tab;
        if (this.query.updatedRange && this.query.updatedRange.length === 2) {
          params.updatedFrom = new Date(this.query.updatedRange[0] + 'T00:00:00').getTime();
          params.updatedTo = new Date(this.query.updatedRange[1] + 'T23:59:59').getTime();
        }
        return params;
      },
      async search(page) {
        const current = Number(page) || this.query.page;
        this.query.page = current;
        this.loading = true;
        this.error = '';
        const started = Date.now();
        try {
          if (this.viewMode === 'gantt') {
            await this.loadGantt();
            return;
          }
          const data = await callCloud('orders', 'list', this.buildParams());
          this.total = Number(data.total) || 0;
          this.rows = (data.list || []).map((row) => ({
            ...row,
            planQtyText: row.plannedQty == null || row.plannedQty === '' ? '—' : row.plannedQty,
            customerText: `${row.customerName || '—'} / ${row.planName || '—'}`,
            statusText: row.enabled === false ? '已停用' : row.orderStatus === 'confirmed' ? '已确认' : '草稿',
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
      sizeChange(size) {
        this.query.pageSize = Number(size) || 20;
        this.search(1);
      },
      reset() {
        this.query = { tab: 'all', keyword: '', updatedRange: [], page: 1, pageSize: this.query.pageSize };
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
  .mes-vk-alert { margin-top: 8px; }
  .mes-vk-count { margin-left: 8px; font-size: 12px; font-weight: 400; color: #909399; }
  .mes-vk-source { font-size: 12px; color: #909399; }
  .mes-vk-pagination { display: flex; justify-content: flex-end; margin-top: 12px; }
  .mes-vk-viewbar { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
</style>

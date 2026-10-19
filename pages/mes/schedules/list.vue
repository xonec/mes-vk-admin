<template>
  <div>
    <div class="vk-page-card vk-page-search-card">
      <div class="mes-vk-hero">
        <div>
          <div class="mes-vk-title">排班列表</div>
          <div class="mes-vk-hint">数据直调 production-operations.listSchedules（只读）。日期范围与关键字由服务端过滤；工序/班次/车间在当前日期范围内本地过滤（范围过大时请先缩小日期）。导入向导：本地解析 Excel → 预览核对 → 分批写入（200 人次/批，断点续传）。</div>
        </div>
        <div class="mes-vk-tags">
          <el-tag size="small" type="success">只读</el-tag>
          <el-tag v-if="responseTime" size="small" type="info">本次读取 {{ responseTime }} ms</el-tag>
          <el-button size="small" type="primary" icon="el-icon-upload2" @click="openImport">导入排班</el-button>
        </div>
      </div>
      <el-form :inline="true" size="small" @submit.native.prevent>
        <el-form-item label="生产日期">
          <el-date-picker v-model="query.dateRange" type="daterange" value-format="yyyy-MM-dd" range-separator="至" start-placeholder="开始" end-placeholder="结束" :clearable="false" style="width: 260px" @change="reload"></el-date-picker>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="员工 / 班次 / 工序" clearable style="width: 200px" @keyup.enter.native="reload"></el-input>
        </el-form-item>
        <el-form-item label="工序">
          <el-select v-model="query.processId" clearable placeholder="全部工序" style="width: 170px" @change="query.page = 1">
            <el-option v-for="row in catalogs.processes" :key="row._id" :label="row.name" :value="row._id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="班次">
          <el-select v-model="query.shiftId" clearable placeholder="全部班次" style="width: 150px" @change="query.page = 1">
            <el-option v-for="row in catalogs.shifts" :key="row._id" :label="row.name" :value="row._id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="车间">
          <el-select v-model="query.workshopId" clearable placeholder="全部车间" style="width: 160px" @change="query.page = 1">
            <el-option v-for="row in catalogs.workshops" :key="row._id" :label="row.name" :value="row._id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" style="width: 110px" @change="query.page = 1">
            <el-option label="启用" value="active"></el-option>
            <el-option label="已停用" value="disabled"></el-option>
            <el-option label="全部" value=""></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-refresh" :loading="loading" @click="reload">刷新</el-button>
        </el-form-item>
        <div class="mes-vk-tip">工序 / 班次 / 车间为「当前日期范围内」筛选：服务端只按日期范围与关键字过滤，其余条件在已加载的范围内匹配。</div>
      </el-form>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon></el-alert>
      <el-alert v-if="truncated" :title="'日期范围内共 ' + serverTotal + ' 条，超过单次读取上限 1200 条，当前只加载前 1200 条；请缩小日期范围后再筛选。'" type="warning" :closable="false" show-icon class="mes-vk-alert"></el-alert>
    </div>

    <div class="vk-page-card mes-vk-calendar-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">排班日历</div>
        <div class="mes-vk-source">数据源：production-operations.scheduleCalendar（按月）</div>
      </div>
      <schedule-calendar :month="calendarMonth" :days="calendarDays" :selected-date="selectedDate" :loading="calendarLoading" :error="calendarError" @change-month="changeCalendarMonth" @select="selectCalendarDate" @retry="loadCalendar(calendarMonth, true)"></schedule-calendar>
    </div>

    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">排班明细 <span class="mes-vk-count">共 {{ filteredRows.length }} 条</span></div>
        <div class="mes-vk-source">数据源：production-operations.listSchedules</div>
      </div>
      <div v-loading="loading" element-loading-text="正在读取排班…" class="vk-page-card-table">
        <vk-data-table :data="pagedRows" :columns="columns" :row-no="true" :top="0" :pagination="false" :max-height="tableHeight"></vk-data-table>
        <div class="mes-vk-pagination">
          <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="filteredRows.length" :page-size="query.pageSize" :current-page="query.page" :page-sizes="[50, 100]" @current-change="(page) => (query.page = page)"></el-pagination>
        </div>
      </div>
    </div>

    <schedule-import-wizard :visible="importVisible" :catalogs="catalogs" :default-workshop-id="importDefaultWorkshopId" @close="importVisible = false" @imported="onImported"></schedule-import-wizard>
  </div>
</template>

<script>
  import { callOperations } from '@/utils/call-operations.js';
  import { shiftTimeLabel } from '@/utils/shift-presets.js';
  import ScheduleCalendar from '@/components/mes/ScheduleCalendar.vue';
  import ScheduleImportWizard from '@/components/mes/ScheduleImportWizard.vue';

  const LOAD_CAP = 1200;

  export default {
    components: { ScheduleCalendar, ScheduleImportWizard },
    data() {
      const end = new Date();
      const start = new Date(end.getTime() - 6 * 86400000);
      const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return {
        loading: false,
        error: '',
        responseTime: 0,
        truncated: false,
        serverTotal: 0,
        rows: [],
        catalogs: { workshops: [], processes: [], shifts: [], personnel: [], resources: [] },
        importVisible: false,
        calendarMonth: '',
        calendarDays: [],
        calendarLoading: false,
        calendarError: '',
        calendarCache: {},
        selectedDate: '',
        query: {
          dateRange: [format(start), format(end)],
          keyword: '',
          processId: '',
          shiftId: '',
          workshopId: '',
          status: 'active',
          page: 1,
          pageSize: 50,
        },
        columns: [
          { key: 'date', title: '生产日', type: 'text', width: 110 },
          { key: 'personName', title: '员工', type: 'text', width: 110 },
          { key: 'workshopName', title: '车间', type: 'text', width: 130 },
          { key: 'shiftName', title: '班次', type: 'text', width: 110 },
          { key: 'processName', title: '工序', type: 'text', width: 130 },
          { key: 'timeText', title: '班次时间', type: 'text', width: 220 },
          { key: 'hoursText', title: '计划工时', type: 'text', width: 100 },
          { key: 'batchText', title: '批号', type: 'text', width: 190 },
          { key: 'statusText', title: '状态', type: 'text', width: 90 },
        ],
      };
    },
    computed: {
      filteredRows() {
        return this.rows
          .filter((row) => {
            const matchProcess = !this.query.processId || row.processId === this.query.processId;
            const matchShift = !this.query.shiftId || row.shiftId === this.query.shiftId;
            const matchWorkshop = !this.query.workshopId || row.workshopId === this.query.workshopId;
            const matchStatus = this.query.status === '' || (this.query.status === 'active' ? row.enabled !== false : row.enabled === false);
            return matchProcess && matchShift && matchWorkshop && matchStatus;
          })
          .map((row) => ({
            ...row,
            timeText: row.kind === 'rest' ? (row.absenceType === 'leave' ? '请假' : '休息') : shiftTimeLabel(row),
            hoursText: row.kind === 'rest' ? '0 小时' : `${row.plannedHours == null ? row.workHours || 0 : row.plannedHours} 小时`,
            batchText: (row.batchNos || []).join('、') || '—',
            statusText: row.enabled === false ? '已停用' : '启用',
          }));
      },
      pagedRows() {
        return this.filteredRows.slice((this.query.page - 1) * this.query.pageSize, this.query.page * this.query.pageSize);
      },
      tableHeight() {
        return Math.max(360, window.innerHeight - 520);
      },
      /** 导入向导默认车间：当前筛选车间优先，否则单车间自动选中。 */
      importDefaultWorkshopId() {
        if (this.query.workshopId) return this.query.workshopId;
        const workshops = (this.catalogs.workshops || []).filter((row) => row.enabled !== false);
        return workshops.length === 1 ? workshops[0]._id : '';
      },
    },
    onLoad() {
      const now = new Date();
      this.calendarMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      this.loadCatalogs();
      this.loadCalendar(this.calendarMonth);
      this.reload();
    },
    methods: {
      /** 月历取数：按 month 缓存，翻回不重复请求。 */
      async loadCalendar(month, force = false) {
        if (!month) return;
        this.calendarMonth = month;
        if (!force && this.calendarCache[month]) {
          this.calendarDays = this.calendarCache[month];
          return;
        }
        this.calendarLoading = true;
        this.calendarError = '';
        try {
          const data = await callOperations('scheduleCalendar', { month });
          const days = (data && data.days) || [];
          this.calendarCache[month] = days;
          this.calendarDays = days;
        } catch (error) {
          this.calendarDays = [];
          this.calendarError = error && error.message ? error.message : String(error);
        } finally {
          this.calendarLoading = false;
        }
      },
      changeCalendarMonth(month) {
        if (this.calendarLoading || month === this.calendarMonth) return;
        this.loadCalendar(month);
      },
      /** 点选日期：把明细列表日期范围切到当天并刷新。 */
      selectCalendarDate(date) {
        this.selectedDate = date;
        this.query.dateRange = [date, date];
        this.reload();
      },
      /** 目录资料用于工序/班次/车间筛选；失败不阻塞列表。 */
      async loadCatalogs() {
        try {
          const data = await callOperations('bootstrap');
          this.catalogs = { workshops: [], processes: [], shifts: [], ...(data && data.catalogs) };
        } catch (error) {
          this.$message.warning('基础目录读取失败，工序/班次筛选不可用：' + (error && error.message ? error.message : error));
        }
      },
      /** 打开导入向导；向导走本地解析 + 分批导入，成功后由 onImported 刷新本页。 */
      openImport() {
        this.importVisible = true;
      },
      /** 导入完成后刷新日历与明细，并切到刚导入的日期便于核对。 */
      async onImported(event) {
        this.importVisible = false;
        const date = event && event.date;
        this.calendarCache = {};
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          this.query.dateRange = [date, date];
          this.selectedDate = date;
          await this.loadCalendar(date.slice(0, 7), true);
        } else {
          await this.loadCalendar(this.calendarMonth, true);
        }
        await this.loadCatalogs();
        await this.reload();
      },
      /** 按日期范围+关键字由服务端过滤；超过上限截断并提示。 */
      async reload() {
        if (this.loading) return;
        this.query.page = 1;
        this.loading = true;
        this.error = '';
        this.truncated = false;
        const started = Date.now();
        try {
          const base = {
            dateFrom: this.query.dateRange[0],
            dateTo: this.query.dateRange[1],
            keyword: this.query.keyword,
            includeDisabled: true,
          };
          const first = await callOperations('listSchedules', { ...base, page: 1, pageSize: 1 });
          this.serverTotal = Number(first.total) || 0;
          const target = Math.min(this.serverTotal, LOAD_CAP);
          this.truncated = this.serverTotal > LOAD_CAP;
          const rows = [];
          for (let page = 1; rows.length < target; page++) {
            const data = await callOperations('listSchedules', { ...base, page, pageSize: 50 });
            const list = data.list || [];
            rows.push(...list);
            if (!list.length || !data.total || page * 50 >= Math.min(data.total, LOAD_CAP)) break;
          }
          this.rows = rows.slice(0, target);
        } catch (error) {
          this.rows = [];
          this.serverTotal = 0;
          this.error = error && error.message ? error.message : String(error);
        } finally {
          this.responseTime = Date.now() - started;
          this.loading = false;
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-vk-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .mes-vk-title { font-size: 16px; font-weight: 600; color: #303133; }
  .mes-vk-hint { margin-top: 4px; font-size: 12px; line-height: 1.6; color: #909399; max-width: 900px; }
  .mes-vk-tags { display: flex; gap: 8px; flex-shrink: 0; }
  .mes-vk-alert { margin-top: 8px; }
  .mes-vk-count { margin-left: 8px; font-size: 12px; font-weight: 400; color: #909399; }
  .mes-vk-source { font-size: 12px; color: #909399; }
  .mes-vk-pagination { display: flex; justify-content: flex-end; margin-top: 12px; }
  .mes-vk-calendar-card { margin-bottom: 12px; }
  .mes-vk-tip { width: 100%; font-size: 12px; color: #909399; line-height: 1.6; margin: 0 0 8px; }
</style>

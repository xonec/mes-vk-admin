<template>
  <el-dialog
    :visible.sync="dialogVisible"
    width="94%"
    top="3vh"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    custom-class="mes-import-dialog"
    title="导入排班 Excel"
    @closed="onClosed"
  >
    <div class="mes-import-wizard">
      <!-- 一、选择文件与导入设置 -->
      <div class="mes-wizard-card">
        <div class="mes-wizard-head">
          <span class="mes-wizard-title">1. 选择文件与导入设置</span>
          <el-button type="text" size="mini" :disabled="busy" @click="resetAll">清空当前导入</el-button>
        </div>
        <el-form :inline="true" size="small" class="mes-wizard-form">
          <el-form-item label="车间">
            <el-select v-model="batchSettings.workshopId" placeholder="请选择车间" style="width: 220px" :disabled="busy" @change="onWorkshopChange">
              <el-option v-for="item in workshopOptions" :key="item._id" :label="item.name" :value="item._id"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="导入方式">
            <el-radio-group v-model="batchSettings.replaceDay" :disabled="busy" @change="resetPreview">
              <el-radio-button :label="true">完整日表</el-radio-button>
              <el-radio-button :label="false">补充排班</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <div class="mes-wizard-tip">
          {{
            batchSettings.replaceDay
              ? '完整日表：本车间未列出的人员自动记为休息；全部记录通过核对后才能导入；未上传日期保持原记录。'
              : '补充排班：保留原有安排，可跳过问题行。'
          }}
        </div>

        <div class="mes-upload-zone" :class="{ 'is-busy': busy }" @click="chooseFile" @dragover.prevent @drop.prevent="dropFiles">
          <i class="el-icon-upload"></i>
          <div class="mes-upload-title">{{ fileLoading ? fileProgress : importFiles.length ? '重新选择排班文件' : '点击选择或拖入排班文件' }}</div>
          <div class="mes-wizard-tip">可一次选择多个文件 · Excel / CSV · 每个文件不超过 5MB · 本地解析，不上传原文件</div>
        </div>

        <div v-if="importFiles.length" class="mes-file-list">
          <div v-for="file in importFiles" :key="file.id" class="mes-file-item">
            <div class="mes-file-main">
              <span class="ellipsis" :title="file.name">{{ file.name }}</span>
              <span class="mes-wizard-tip" :class="{ 'is-error': !!file.error }">{{ file.error || (file.duplicateOf ? '重复文件，已跳过（与 ' + file.duplicateOf + ' 同哈希）' : file.loaded ? '读取完成' : '读取中…') }}</span>
            </div>
            <el-button type="text" size="mini" :disabled="busy" @click="removeFile(file.id)">移除</el-button>
          </div>
        </div>

        <div v-if="sheets.length" class="mes-sheet-box">
          <el-button type="text" size="mini" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '收起列设置' : '列设置 / 工作表（' + sheets.length + ' 个工作表）' }}</el-button>
          <div v-if="showAdvanced" class="mes-sheet-config">
            <div v-for="(sheet, index) in sheets" :key="sheet.id" class="mes-sheet-item" :class="{ 'is-active': index === sheetIndex }">
              <el-checkbox :value="sheet.selected" :disabled="busy" @change="(value) => toggleSheet(sheet, value)"></el-checkbox>
              <span class="ellipsis">{{ sheet.fileName }} / {{ sheet.name }} · {{ sheet.rows.length }} 行</span>
              <el-button type="text" size="mini" :disabled="busy" @click="selectSheet(index)">调整列</el-button>
            </div>
            <el-form v-if="currentSheet" label-width="120px" size="mini" class="mes-mapping-form">
              <el-form-item label="表格格式">
                <el-select v-model="currentSheet.config.mode" style="width: 200px" @change="updateMapping">
                  <el-option label="一人一行（班次列）" value="rows"></el-option>
                  <el-option label="早中晚横列表（多人展开）" value="wide"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="第一条数据行">
                <el-input-number v-model="currentSheet.config.startLine" :min="1" :max="100000" controls-position="right" style="width: 140px" @change="updateMapping"></el-input-number>
              </el-form-item>
              <template v-if="currentSheet.config.mode === 'wide'">
                <el-form-item v-for="field in wideColumnFields" :key="field.key" :label="field.label">
                  <el-select v-model="currentSheet.config[field.key]" :placeholder="field.required ? '必选' : '不导入'" clearable style="width: 260px" @change="updateMapping">
                    <el-option v-for="column in columnOptions" :key="column.value" :label="column.text" :value="column.value"></el-option>
                  </el-select>
                </el-form-item>
              </template>
              <template v-else>
                <el-form-item label="横列表默认班制">
                  <el-select v-model="currentSheet.config.systemHours" style="width: 260px" @change="updateMapping">
                    <el-option :value="8" label="8 小时：早 8–16，中 16–24，夜次日 0–8"></el-option>
                    <el-option :value="12" label="12 小时：早 8–20，中／夜 20–次日 8"></el-option>
                  </el-select>
                </el-form-item>
                <el-form-item v-for="field in rowColumnFields" :key="field.key" :label="field.label">
                  <el-select v-model="currentSheet.config[field.key]" :placeholder="field.required ? '必选' : '不导入'" clearable style="width: 260px" @change="updateMapping">
                    <el-option v-for="column in columnOptions" :key="column.value" :label="column.text" :value="column.value"></el-option>
                  </el-select>
                </el-form-item>
              </template>
            </el-form>
          </div>
        </div>

        <div v-if="versionConflicts.length" class="mes-wizard-warning">
          <div>同一天有不同版本，请选择要采用的文件：</div>
          <div v-for="day in versionConflicts" :key="day.date" class="mes-version-row">
            <span>{{ day.date }}</span>
            <el-select :value="dayFileChoice[day.date]" size="mini" style="width: 260px" @change="(value) => chooseDaySource(day.date, value)">
              <el-option v-for="source in day.sources" :key="source.id" :label="source.name" :value="source.id"></el-option>
            </el-select>
          </div>
        </div>

        <el-alert v-if="importError" class="mes-wizard-alert" :title="importError" type="error" :closable="false" show-icon></el-alert>

        <div class="mes-wizard-footer-row">
          <span class="mes-wizard-tip">{{ previewing ? '正在读取原排班并生成预览…' : previewReady ? '预览已就绪，核对下方排班后再导入。' : sheets.length ? '点击「生成预览」开始核对。' : '选择文件后自动识别日期、班次和工序。' }}</span>
          <el-button size="small" :disabled="busy" :loading="previewing" @click="preview">{{ previewReady ? '重新生成预览' : '生成预览' }}</el-button>
        </div>
      </div>

      <!-- 二、预览 -->
      <div v-if="previews.length" class="mes-wizard-card">
        <div class="mes-wizard-head">
          <span class="mes-wizard-title">2. 待导入排班</span>
          <span class="mes-wizard-tip">{{ dayCount }} 天 · 共 {{ previews.length }} 条 · 可导入 {{ eligibleCount }} 条<span v-if="problemRows.length"> · {{ problemRows.length }} 条需处理</span></span>
        </div>
        <div v-if="problemRows.length" class="mes-wizard-warning">
          <span>{{ problemRows.length }} 条记录需要处理{{ batchSettings.replaceDay ? '；完整日表必须全部通过核对才能导入' : '' }}。</span>
          <el-button type="text" size="mini" @click="switchTab('problems')">只看问题</el-button>
        </div>
        <div class="mes-wizard-toolbar">
          <el-radio-group v-model="previewTab" size="mini">
            <el-radio-button label="all">全部（{{ previews.length }}）</el-radio-button>
            <el-radio-button label="problems">需处理（{{ problemRows.length }}）</el-radio-button>
            <el-radio-button label="ready">可导入（{{ eligibleCount }}）</el-radio-button>
            <el-radio-button label="people">按人汇总</el-radio-button>
          </el-radio-group>
          <el-input v-model="previewKeyword" size="mini" clearable placeholder="人员 / 日期 / 批号" style="width: 220px"></el-input>
        </div>
        <schedule-preview-table
          v-if="previewTab !== 'people'"
          :rows="filteredPreviews"
          :disabled="importing"
          :has-import-results="hasImportResults"
          :preview-state="previewState"
          :preview-state-name="previewStateName"
          :preview-message="previewMessage"
          :name="name"
          @exclude="togglePreview"
          @review="reviewRow"
        ></schedule-preview-table>
        <template v-else>
          <el-table :data="pagedPeople" border size="small" :max-height="420" empty-text="当前筛选没有记录">
            <el-table-column prop="date" label="日期" width="110"></el-table-column>
            <el-table-column prop="personName" label="人员" width="120"></el-table-column>
            <el-table-column label="状态" width="100">
              <template slot-scope="{ row }">{{ row.record && row.record.kind === 'rest' ? (row.record.absenceType === 'leave' ? '请假' : '休息') : '出勤' }}</template>
            </el-table-column>
            <el-table-column label="工序" min-width="180">
              <template slot-scope="{ row }">{{ row.processNames && row.processNames.length ? row.processNames.join('、') : '—' }}</template>
            </el-table-column>
            <el-table-column label="工时" width="90">
              <template slot-scope="{ row }">{{ row.hours ? Math.round(row.hours * 10) / 10 + ' h' : '—' }}</template>
            </el-table-column>
            <el-table-column label="来源" min-width="200">
              <template slot-scope="{ row }">{{ row.rows.length }} 行 · {{ sourceText(row.rows) }}</template>
            </el-table-column>
          </el-table>
          <div class="mes-preview-pagination">
            <el-pagination
              background
              :total="peopleRows.length"
              :page-size="20"
              :current-page="peoplePage"
              layout="total, prev, pager, next"
              @current-change="(value) => (peoplePage = value)"
            ></el-pagination>
          </div>
        </template>
      </div>

      <!-- 三、导入进度 -->
      <div v-if="importStage || importing || hasImportResults" class="mes-wizard-card">
        <div class="mes-wizard-head">
          <span class="mes-wizard-title">{{ importStage }}</span>
          <span class="mes-wizard-tip">{{ importStats.processed }} / {{ rowsTotal }} 人次 · 成功 {{ importStats.success }} · 失败 {{ importStats.failure }}</span>
        </div>
        <el-progress :percentage="progressPercent" :status="progressStatus" :stroke-width="14"></el-progress>
        <div v-if="importNotice" class="mes-wizard-success">{{ importNotice }}</div>
      </div>

      <div class="mes-wizard-sticky-footer">
        <span class="mes-wizard-tip">每批 200 人次；失败会从断点续传，重试沿用同一 requestId，不会重复写。</span>
        <div>
          <el-button size="small" :disabled="importing" @click="close">关闭</el-button>
          <el-button
            type="primary"
            size="small"
            :loading="importing"
            :disabled="!canImport"
            @click="importRows"
          >{{ importing ? '处理中…' : importStage === '完成' ? '已导入' : hasImportResults ? '继续导入' : '导入排班' }}</el-button>
        </div>
      </div>
    </div>

    <!-- 行核对（问题行） -->
    <el-dialog :visible.sync="reviewVisible" width="520px" title="核对排班时间与人员" append-to-body :close-on-click-modal="false">
      <el-form v-if="reviewingRow" label-width="120px" size="small">
        <el-form-item label="表格类型">
          <el-select v-model="reviewForm.kind" @change="changeReviewKind">
            <el-option label="出勤" value="work"></el-option>
            <el-option label="休息" value="rest"></el-option>
            <el-option label="请假" value="leave"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="reviewingRow.requiresPersonSelection" label="同名人员">
          <el-select v-model="reviewForm.personId" filterable placeholder="选择唯一工号">
            <el-option v-for="person in personOptions" :key="person._id" :label="person.name + '（' + (person.employeeNo || person.code || '') + '）'" :value="person._id"></el-option>
          </el-select>
        </el-form-item>
        <template v-if="reviewForm.kind !== 'rest'">
          <el-form-item label="班次">
            <el-select v-model="reviewForm.shiftId" @change="changeReviewShift">
              <el-option v-for="shift in catalogsLocal.shifts" :key="shift._id" :label="shift.name" :value="shift._id"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="开始">
            <el-select v-model="reviewForm.startDayOffset" style="width: 110px">
              <el-option v-for="day in dayOptions" :key="day.value" :label="day.text" :value="day.value"></el-option>
            </el-select>
            <el-time-picker v-model="reviewForm.startTime" value-format="HH:mm" format="HH:mm" placeholder="开始时间" style="width: 130px"></el-time-picker>
          </el-form-item>
          <el-form-item label="结束">
            <el-select v-model="reviewForm.endDayOffset" style="width: 110px">
              <el-option v-for="day in dayOptions" :key="day.value" :label="day.text" :value="day.value"></el-option>
            </el-select>
            <el-time-picker v-model="reviewForm.endTime" value-format="HH:mm" format="HH:mm" placeholder="结束时间" style="width: 130px"></el-time-picker>
          </el-form-item>
        </template>
        <el-form-item v-if="reviewForm.kind !== 'work'" label="非出勤状态">
          <el-radio-group v-model="reviewForm.absenceType">
            <el-radio label="rest">休息</el-radio>
            <el-radio label="leave">请假</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-alert v-if="reviewError" :title="reviewError" type="error" :closable="false" show-icon></el-alert>
      </el-form>
      <div class="mes-review-footer">
        <el-button size="small" @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" size="small" @click="saveReview">确认核对</el-button>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script>
  import { callOperations } from '@/utils/call-operations.js';
  import { readScheduleFile, previewScheduleBatch, checkScheduleBatch, scheduleDateSources } from '@/utils/schedule-import.js';
  import { completeScheduleRest, summarizeSchedulePeople } from '@/utils/schedule-import-rules.js';
  import { resolveScheduleProcesses } from '@/utils/schedule-processes.js';
  import { DAY_OPTIONS, applyShift } from '@/utils/shift-presets.js';
  import { createImportSession, importFingerprint, importStats as importStatsOf, progressOf, runImportWorkflow, createdAccountHint, IMPORT_CHUNK_SIZE, FINISH_PAGE_SIZE } from '@/utils/schedule-import-session.js';
  import SchedulePreviewTable from '@/components/mes/SchedulePreviewTable.vue';

  const blankMapping = () => ({ mode: 'rows', systemHours: 8, note: '', early: '', middle: '', late: '', startLine: 2, date: '', shiftId: '', processId: '', personId: '', post: '', batchNos: '', startTime: '', endTime: '' });
  const COLUMN_ALIASES = {
    date: /^(日期|生产日期|排班日期)$/,
    shiftId: /^(班次|班别)$/,
    processId: /^(工序|工序名称)$/,
    personId: /^(人员|姓名|员工|工号)$/,
    post: /^(岗位|职位)$/,
    batchNos: /^(批号|生产批号)$/,
    note: /^(备注|说明)$/,
    startTime: /^(开始时间|上班时间)$/,
    endTime: /^(结束时间|下班时间)$/,
  };
  const STAGE_TEXT = {
    preparing: '准备人员与排班',
    writing: '正在分批写入排班',
    finishing: '全部写入成功，正在更新旧排班',
    done: '完成',
    paused: '部分失败，可按原内容重试',
  };

  export default {
    name: 'ScheduleImportWizard',
    components: { SchedulePreviewTable },
    props: {
      visible: { type: Boolean, default: false },
      catalogs: { type: Object, default: () => ({}) },
      defaultWorkshopId: { type: String, default: '' },
    },
    data() {
      return {
        dialogVisible: false,
        catalogsLocal: { workshops: [], processes: [], shifts: [], personnel: [], resources: [] },
        fileLoading: false,
        fileProgress: '',
        importFiles: [],
        sheets: [],
        sheetIndex: 0,
        showAdvanced: false,
        batchSettings: { workshopId: '', replaceDay: true },
        dayFileChoice: {},
        processMappings: {},
        processPlans: [],
        versionConflicts: [],
        previewing: false,
        previews: [],
        previewReady: false,
        previewTab: 'all',
        previewKeyword: '',
        peoplePage: 1,
        previousScope: [],
        importError: '',
        importing: false,
        importStage: '',
        importNotice: '',
        importResults: {},
        importSession: null,
        reviewingRow: null,
        reviewForm: {},
        reviewError: '',
        reviewVisible: false,
        dayOptions: DAY_OPTIONS,
        wideColumnFields: [
          { key: 'date', label: '排班日期列', required: true },
          { key: 'processId', label: '工序名称列', required: true },
          { key: 'early', label: '早班人员列', required: true },
          { key: 'middle', label: '中班人员列', required: true },
          { key: 'late', label: '晚班人员列', required: true },
          { key: 'batchNos', label: '批次列', required: false },
          { key: 'note', label: '备注列', required: false },
        ],
        rowColumnFields: [
          { key: 'date', label: '日期列', required: true },
          { key: 'shiftId', label: '班次列', required: true },
          { key: 'processId', label: '工序列', required: true },
          { key: 'personId', label: '人员列', required: true },
          { key: 'post', label: '岗位列', required: false },
          { key: 'batchNos', label: '批号列', required: false },
          { key: 'note', label: '备注列', required: false },
          { key: 'startTime', label: '开始时间列', required: false },
          { key: 'endTime', label: '结束时间列', required: false },
        ],
      };
    },
    computed: {
      busy() {
        return this.fileLoading || this.previewing || this.importing;
      },
      workshopOptions() {
        return (this.catalogsLocal.workshops || []).filter((row) => row.enabled !== false);
      },
      currentSheet() {
        return this.sheets[this.sheetIndex] || null;
      },
      columnOptions() {
        const rows = (this.currentSheet && this.currentSheet.rows) || [];
        const width = rows.slice(0, 10).reduce((max, row) => Math.max(max, row.length), 0);
        return Array.from({ length: width }, (_, index) => ({ value: index, text: `${index + 1} 列 · ${String((rows[0] || [])[index] || '').slice(0, 40) || '无标题'}` }));
      },
      checkedPreviews() {
        if (!this.previews.length) return [];
        return checkScheduleBatch(this.previews);
      },
      selectedPreviews() {
        return this.checkedPreviews.filter((row) => !row.excluded);
      },
      selectedRows() {
        return this.selectedPreviews.filter((row) => !row.error && !row.batchError && row.record && (!row.requiresPersonSelection || row.record.personId) && (!row.needsTimeReview || row.timeReviewed));
      },
      eligibleCount() {
        return this.selectedRows.length;
      },
      dayCount() {
        return new Set(this.checkedPreviews.filter((row) => row.record).map((row) => row.record.date)).size;
      },
      problemRows() {
        return this.checkedPreviews.filter((row) => ['pending', 'error', 'failure'].includes(this.previewState(row)));
      },
      filteredPreviews() {
        const keyword = this.previewKeyword.trim().toLowerCase();
        return this.checkedPreviews.filter((row) => {
          if (this.previewTab === 'problems' && !['pending', 'error', 'failure'].includes(this.previewState(row))) return false;
          if (this.previewTab === 'ready' && !(this.previewState(row) === 'ready' || this.previewState(row) === 'success')) return false;
          if (!keyword) return true;
          const record = row.record || {};
          const text = [row.personName, record.personName, record.date, row.originalDate, row.processName, (record.batchNos || []).join(' '), row.sourceFile].filter(Boolean).join(' ').toLowerCase();
          return text.indexOf(keyword) > -1;
        });
      },
      peopleRows() {
        return summarizeSchedulePeople(this.filteredPreviews);
      },
      pagedPeople() {
        return this.peopleRows.slice((this.peoplePage - 1) * 20, this.peoplePage * 20);
      },
      rowsTotal() {
        return this.selectedRows.length;
      },
      hasImportResults() {
        return Object.keys(this.importResults).length > 0;
      },
      importStats() {
        return importStatsOf(this.importSession);
      },
      progressPercent() {
        if (!this.importSession) return 0;
        const total = this.rowsTotal;
        if (!total) return 0;
        if (this.importStage === STAGE_TEXT.writing) return progressOf(this.importSession.writtenChunks, total).percent;
        if (this.importStage === STAGE_TEXT.finishing) return 100;
        if (this.hasImportResults) return Math.round((this.importStats.processed / total) * 100);
        return progressOf(this.importSession.preparedChunks, total).percent;
      },
      progressStatus() {
        if (this.importStage === '完成') return 'success';
        if (this.importStage === STAGE_TEXT.paused) return 'exception';
        return undefined;
      },
      canImport() {
        if (!this.previewReady || this.busy || this.importStage === '完成') return false;
        if (!this.eligibleCount) return false;
        if (this.batchSettings.replaceDay && this.eligibleCount !== this.previews.length) return false;
        return true;
      },
      personOptions() {
        return (this.catalogsLocal.personnel || []).filter((row) => row.enabled !== false && row.workshopId === this.batchSettings.workshopId);
      },
    },
    watch: {
      visible(value) {
        if (value) this.open();
        else this.dialogVisible = false;
      },
      dialogVisible(value) {
        if (!value) this.$emit('close');
      },
      previewTab() {
        this.peoplePage = 1;
      },
      previewKeyword() {
        this.peoplePage = 1;
      },
    },
    mounted() {
      if (this.visible) this.open();
    },
    methods: {
      /** 打开向导：重置预览与导入状态，恢复上次车间与工序映射。 */
      open() {
        this.catalogsLocal = {
          workshops: (this.catalogs.workshops || []).slice(),
          processes: (this.catalogs.processes || []).slice(),
          shifts: (this.catalogs.shifts || []).slice(),
          personnel: (this.catalogs.personnel || []).slice(),
          resources: (this.catalogs.resources || []).slice(),
        };
        this.importFiles = [];
        this.sheets = [];
        this.sheetIndex = 0;
        this.dayFileChoice = {};
        this.resetPreview();
        this.importError = '';
        this.importNotice = '';
        this.importStage = '';
        this.importResults = {};
        this.importSession = null;
        this.reviewVisible = false;
        const saved = this.readStorage('mes-schedule-import-scope', {});
        const workshops = this.workshopOptions;
        const workshopId = workshops.some((row) => row._id === this.defaultWorkshopId)
          ? this.defaultWorkshopId
          : workshops.some((row) => row._id === this.batchSettings.workshopId)
            ? this.batchSettings.workshopId
            : workshops.some((row) => row._id === saved.workshopId)
              ? saved.workshopId
              : workshops.length === 1
                ? workshops[0]._id
                : '';
        this.batchSettings = { workshopId, replaceDay: true };
        this.restoreProcessMappings();
        this.dialogVisible = true;
      },
      close() {
        if (this.importing) {
          this.$message.warning('导入进行中，请等待当前批次完成');
          return;
        }
        this.dialogVisible = false;
      },
      onClosed() {
        this.$emit('close');
      },
      resetPreview() {
        this.previews = [];
        this.previewReady = false;
        this.previewTab = 'all';
        this.previewKeyword = '';
        this.peoplePage = 1;
        this.previousScope = [];
        this.importResults = {};
        this.importStage = '';
        this.importNotice = '';
        this.importSession = null;
        this.importError = '';
        this.versionConflicts = [];
      },
      resetAll() {
        if (this.busy) return;
        this.importFiles = [];
        this.sheets = [];
        this.sheetIndex = 0;
        this.dayFileChoice = {};
        this.resetPreview();
      },
      readStorage(key, fallback) {
        try {
          const value = uni.getStorageSync(key);
          return value && typeof value === 'object' ? value : fallback;
        } catch (_) {
          return fallback;
        }
      },
      writeStorage(key, value) {
        try {
          uni.setStorageSync(key, value);
        } catch (_) {}
      },
      onWorkshopChange() {
        this.writeStorage('mes-schedule-import-scope', { workshopId: this.batchSettings.workshopId });
        this.restoreProcessMappings();
        this.resetPreview();
      },
      restoreProcessMappings() {
        if (!this.batchSettings.workshopId) {
          this.processMappings = {};
          return;
        }
        const saved = this.readStorage('mes-schedule-process-mappings:' + this.batchSettings.workshopId, {});
        this.processMappings = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
      },
      chooseFile() {
        if (this.busy) return;
        // #ifdef H5
        uni.chooseFile({
          count: Number.MAX_SAFE_INTEGER,
          type: 'all',
          extension: ['xlsx', 'xls', 'csv'],
          success: (result) => this.loadFiles(result.tempFiles || []),
          fail: (result) => {
            if (!/cancel/.test(result.errMsg || '')) this.importError = '文件选择失败，请重新选择。';
          },
        });
        // #endif
        // #ifndef H5
        this.importError = '请在电脑浏览器后台导入本地 Excel 文件。';
        // #endif
      },
      dropFiles(event) {
        const transfer = event.dataTransfer || (event.originalEvent && event.originalEvent.dataTransfer);
        if (transfer && transfer.files) this.loadFiles(Array.from(transfer.files));
      },
      /** 逐文件解析并让出主线程，保持进度文字与按钮响应；空表、重复哈希单独标记。 */
      async loadFiles(files) {
        if (this.busy || !files.length) return;
        this.fileLoading = true;
        this.resetPreview();
        this.importFiles = [];
        this.sheets = [];
        this.sheetIndex = 0;
        this.dayFileChoice = {};
        try {
          for (let index = 0; index < files.length; index += 1) {
            this.fileProgress = '正在读取 ' + (index + 1) + ' / ' + files.length + ' 个文件';
            await new Promise((resolve) => setTimeout(resolve, 0));
            const file = files[index];
            const entry = { id: 'file:' + index, name: file.name || '排班文件 ' + (index + 1), error: '', fileHash: '', duplicateOf: '', loaded: false };
            this.importFiles.push(entry);
            try {
              const data = await readScheduleFile(file);
              entry.fileHash = data.fileHash;
              const duplicate = this.importFiles.find((item) => item.id !== entry.id && item.loaded && data.fileHash && item.fileHash === data.fileHash && !item.error && !item.duplicateOf);
              if (duplicate) {
                entry.duplicateOf = duplicate.name;
                continue;
              }
              const first = data.sheets.findIndex((sheet) => sheet.rows.slice(1).some((row) => row.some((value) => String(value == null ? '' : value).trim())));
              if (first < 0) throw new Error('文件只有表头或空行，没有可导入的数据');
              data.sheets.forEach((sheet, sheetIndex) => {
                this.sheets.push({
                  ...sheet,
                  id: entry.id + ':sheet:' + sheetIndex,
                  fileId: entry.id,
                  fileName: entry.name,
                  fileHash: data.fileHash,
                  selected: sheetIndex === first,
                  config: this.defaultMapping(sheet),
                });
              });
              entry.loaded = true;
            } catch (error) {
              entry.error = (error && error.message) || '文件读取失败，请重新选择';
            }
          }
          this.selectSheet(0);
        } finally {
          this.fileLoading = false;
          this.fileProgress = '';
        }
        if (this.sheets.length && !this.importFiles.some((file) => file.error) && this.batchSettings.workshopId) await this.preview();
      },
      defaultMapping(sheet) {
        if (sheet.wide) return { ...blankMapping(), ...sheet.mapping, startLine: 2 };
        const mapping = blankMapping();
        const headers = sheet.rows[0] || [];
        Object.keys(COLUMN_ALIASES).forEach((key) => {
          const index = headers.findIndex((value) => COLUMN_ALIASES[key].test(String(value).trim()));
          if (index >= 0) mapping[key] = index;
        });
        return mapping;
      },
      selectSheet(index) {
        this.sheetIndex = Math.max(0, Math.min(index, this.sheets.length - 1));
      },
      toggleSheet(sheet, selected) {
        if (this.busy) return;
        sheet.selected = selected;
        this.resetPreview();
      },
      removeFile(fileId) {
        if (this.busy) return;
        const removed = this.importFiles.find((file) => file.id === fileId);
        const ids = new Set(
          this.importFiles
            .filter((file) => file.id === fileId || (removed && !removed.duplicateOf && removed.fileHash && file.fileHash === removed.fileHash))
            .map((file) => file.id)
        );
        this.importFiles = this.importFiles.filter((file) => !ids.has(file.id));
        this.sheets = this.sheets.filter((sheet) => !ids.has(sheet.fileId));
        this.sheetIndex = 0;
        this.resetPreview();
      },
      updateMapping() {
        if (this.busy) return;
        this.resetPreview();
      },
      chooseDaySource(date, value) {
        this.dayFileChoice = { ...this.dayFileChoice, [date]: value };
        this.resetPreview();
      },
      /** 生成本地预览：人员范围 + 工序映射由服务端只读接口补齐，不写任何数据。 */
      async preview() {
        if (this.busy) return;
        this.resetPreview();
        if (this.importFiles.some((file) => file.error)) {
          this.importError = '有文件读取失败，请重新选择或移除失败文件后再预览';
          return;
        }
        if (!this.batchSettings.workshopId) {
          this.importError = '请选择本批导入车间';
          return;
        }
        const workshop = (this.catalogsLocal.workshops || []).find((row) => row._id === this.batchSettings.workshopId);
        if (!workshop || workshop.enabled === false) {
          this.importError = '所选车间已停用，请重新选择车间';
          return;
        }
        this.previewing = true;
        this.importError = '';
        try {
          const dates = scheduleDateSources(this.sheets, this.dayFileChoice);
          this.versionConflicts = dates.filter((day) => !day.chosen);
          if (this.versionConflicts.length) throw new Error('同一天存在不同版本，请选择要采用的文件');
          const dayFileChoice = Object.fromEntries(dates.map((day) => [day.date, day.chosen]));
          let scopePersonnel = this.catalogsLocal.personnel;
          if (this.batchSettings.replaceDay) {
            scopePersonnel = [];
            let cursor = '';
            do {
              const result = await callOperations('scheduleImportScope', { ...this.batchSettings, importRuleVersion: 3, scopeType: 'personnel', paged: true, cursor });
              if (result.importRuleVersion !== 3 || !Array.isArray(result.rows)) throw new Error('服务端排班范围接口版本不匹配，请先上传新版 production-operations');
              scopePersonnel.push(...result.rows);
              cursor = result.nextCursor || '';
            } while (cursor);
            this.catalogsLocal = {
              ...this.catalogsLocal,
              personnel: [...new Map([...this.catalogsLocal.personnel, ...scopePersonnel].map((row) => [row._id, row])).values()],
            };
          }
          const resolved = await resolveScheduleProcesses(this.sheets, { ...this.batchSettings, dayFileChoice }, this.catalogsLocal, this.processMappings);
          this.catalogsLocal = resolved.catalogs;
          this.processPlans = resolved.plans;
          const source = await previewScheduleBatch(this.sheets, { ...this.batchSettings, dayFileChoice, processMappings: resolved.mappings, processErrors: resolved.errors }, this.catalogsLocal);
          this.previews = completeScheduleRest(source, scopePersonnel, this.batchSettings);
          if (this.batchSettings.replaceDay) {
            this.previousScope = [];
            for (const date of [...new Set(this.previews.filter((row) => row.record).map((row) => row.record.date))]) {
              const scope = { date, rows: [] };
              let cursor = '';
              do {
                const result = await callOperations('scheduleImportScope', { workshopId: this.batchSettings.workshopId, importRuleVersion: 3, date, paged: true, cursor });
                if (result.paginationVersion !== 1 || result.importRuleVersion !== 3) throw new Error('服务端排班范围接口版本不匹配，请先上传新版 production-operations');
                scope.rows.push(...result.rows);
                cursor = result.nextCursor || '';
              } while (cursor);
              this.previousScope.push(scope);
            }
          }
          this.previewReady = true;
        } catch (error) {
          this.previews = [];
          this.previousScope = [];
          this.importError = (error && error.message) || String(error);
        } finally {
          this.previewing = false;
        }
      },
      switchTab(tab) {
        this.previewTab = tab;
      },
      previewState(row) {
        if (row.excluded) return 'excluded';
        if (row.error || row.batchError) return 'error';
        const result = this.resultFor(row.previewId);
        if (result.ok === true) return 'success';
        if (result.ok === false) return 'failure';
        return (row.requiresPersonSelection && !row.record.personId) || (row.needsTimeReview && !row.timeReviewed) ? 'pending' : 'ready';
      },
      previewStateName(row) {
        return { excluded: '已跳过', error: '需修正', pending: '待核对', ready: '可导入', failure: '导入失败', success: '已导入' }[this.previewState(row)];
      },
      previewMessage(row) {
        return (
          (row.excluded ? '本条不导入；可点击恢复' : '') ||
          row.error ||
          row.batchError ||
          this.resultFor(row.previewId).message ||
          (row.requiresPersonSelection && !row.record.personId
            ? '同名人员，请选择唯一工号'
            : row.needsTimeReview && !row.timeReviewed
              ? row.reviewReason || '原表含特殊时间，请核对'
              : row.timeReviewed && row.needsTimeReview
                ? '已人工核对'
                : row.timeRule || '')
        );
      },
      resultFor(previewId) {
        return this.importResults[previewId] || {};
      },
      togglePreview(row) {
        if (this.busy || this.hasImportResults) return;
        const source = this.previews.find((item) => item.previewId === row.previewId);
        if (source) source.excluded = !source.excluded;
        this.resetSessionOnly();
      },
      resetSessionOnly() {
        this.importSession = null;
        this.importResults = {};
        this.importStage = '';
        this.importNotice = '';
        this.importError = '';
      },
      reviewRow(row) {
        if (this.busy || this.hasImportResults || !row || !row.record) return;
        this.reviewingRow = this.previews.find((item) => item.previewId === row.previewId);
        this.reviewForm = JSON.parse(JSON.stringify(row.record));
        this.reviewError = '';
        this.reviewVisible = true;
      },
      changeReviewKind(value) {
        if (value === 'rest' || value === 'leave') {
          this.reviewForm.absenceType = value;
          this.reviewForm.kind = 'rest';
        }
      },
      changeReviewShift(shiftId) {
        const shift = (this.catalogsLocal.shifts || []).find((row) => row._id === shiftId);
        if (shift) this.reviewForm = applyShift(this.reviewForm, shift);
      },
      saveReview() {
        const row = this.reviewingRow;
        if (!row || this.busy) return;
        this.reviewError = '';
        const form = this.reviewForm;
        if (row.requiresPersonSelection && !form.personId) {
          this.reviewError = '请选择唯一工号对应的人员';
          return;
        }
        if (form.kind !== 'rest') {
          if (!form.shiftId) {
            this.reviewError = '请选择班次';
            return;
          }
          if (![form.startTime, form.endTime].every((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || ''))) {
            this.reviewError = '时间须为 HH:mm';
            return;
          }
          const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
          const duration = Number(form.endDayOffset) * 1440 + minutes(form.endTime) - Number(form.startDayOffset) * 1440 - minutes(form.startTime);
          if (![form.startDayOffset, form.endDayOffset].every((value) => [0, 1].includes(Number(value))) || duration <= 0 || duration > 1440) {
            this.reviewError = '请核对当天／次日，时长须大于 0 且不超过 24 小时';
            return;
          }
        }
        const previousPerson = row.record.personId;
        row.record = { ...form, importSource: { ...(form.importSource || {}), appliedTimeRule: '人工核对时间' } };
        row.timePriority = 4;
        row.timeRule = '人工核对时间';
        row.timeReviewed = true;
        if (previousPerson !== form.personId) this.refreshRestRows();
        this.reviewVisible = false;
        this.reviewingRow = null;
        this.resetSessionOnly();
      },
      refreshRestRows() {
        const reviewed = new Map(this.previews.filter((row) => row.generated && row.timePriority === 4).map((row) => [row.previewId, row]));
        const scopePersonnel = this.staffScope();
        this.previews = completeScheduleRest(this.previews.filter((row) => !row.generated), scopePersonnel, this.batchSettings).map((row) => reviewed.get(row.previewId) || row);
      },
      staffScope() {
        return (this.catalogsLocal.personnel || []).filter((row) => row.enabled !== false);
      },
      sourceText(rows) {
        const files = [...new Set(rows.map((row) => row.sourceFile).filter(Boolean))];
        return files.length > 2 ? files.slice(0, 2).join('、') + ' 等 ' + files.length + ' 个文件' : files.join('、');
      },
      name(type, id) {
        const item = ((this.catalogsLocal && this.catalogsLocal[type]) || []).find((row) => row._id === id);
        return item ? item.name : '资料已失效';
      },
      /** 导入前把预览阶段自动建档的新工序真正保存到基础资料。 */
      async saveImportProcesses(rows) {
        const used = new Set(rows.filter((row) => row.kind === 'work').map((row) => row.processId));
        const pending = (this.catalogsLocal.processes || []).filter((row) => row.importPending && used.has(row._id));
        for (const process of pending) {
          let record;
          try {
            record = await callOperations('saveCatalog', { type: 'processes', expectedVersion: 0, record: { code: process.code, name: process.name, workshopId: process.workshopId, posts: [], enabled: true, changeReason: '排班导入自动建立工序' } });
          } catch (error) {
            if (error.code !== 409) throw error;
            const latest = await callOperations('bootstrap');
            record = ((latest.catalogs || {}).processes || []).find((item) => item._id === process._id);
            if (!record || record.enabled === false || record.workshopId !== process.workshopId) throw error;
          }
          if (!record || record._id !== process._id) throw new Error('工序保存结果不完整，请按原内容重试');
          this.catalogsLocal.processes = this.catalogsLocal.processes.map((item) => (item._id === process._id ? record : item));
        }
      },
      confirmImport(payload) {
        const message = payload.replaceDay
          ? '将按车间和日期写入完整排班：本车间未列出人员记为休息、0 工时；全部成功后移除被替换的旧排班。请核对预览后确认导入。'
          : '将自动分批补充或更新排班，并为新人员建立待绑定档案。是否导入？';
        return new Promise((resolve) => {
          this.$confirm(message, '导入排班', { confirmButtonText: '导入', cancelButtonText: '取消', type: 'warning' })
            .then(() => resolve(true))
            .catch(() => resolve(false));
        });
      },
      onStage(stage) {
        this.importStage = STAGE_TEXT[stage] || stage;
      },
      onNotice(notice) {
        if (notice.stage === 'preparing') {
          this.importNotice = '已准备 ' + Math.min(notice.offset + IMPORT_CHUNK_SIZE, notice.total) + ' / ' + notice.total + ' 人次；本次自动建档 ' + notice.created + ' 人。' + createdAccountHint(notice.createdPeople);
        } else if (notice.stage === 'writing') {
          const stats = this.importStats;
          this.importNotice = '已处理 ' + stats.processed + ' / ' + this.rowsTotal + ' 人次：' + stats.success + ' 成功，' + stats.failure + ' 失败。';
        } else if (notice.stage === 'finishing') {
          this.importNotice = '本批 ' + this.rowsTotal + ' 人次已全部写入；累计停用 ' + notice.removed + ' 条旧排班。';
        }
      },
      validatePrepared(selected, prepared) {
        if (!Array.isArray(prepared) || prepared.length !== selected.length) throw new Error('人员准备结果不完整，已暂停导入，请按原内容重试');
        const finalRows = checkScheduleBatch(selected.map((row, index) => ({ ...row, record: prepared[index] })));
        const conflicts = finalRows.filter((row) => row.batchError);
        if (conflicts.length) throw new Error('人员匹配后发现重复或时间冲突：' + conflicts[0].batchError + ' 请重新核对后预览');
      },
      /** 分批导入：prepare(200) → 写入前再核对 → import(200, requestId 幂等) → finish(20)。 */
      async importRows() {
        if (!this.canImport) return;
        const selected = this.selectedRows;
        if (this.batchSettings.replaceDay && (selected.length !== this.previews.length || this.previews.some((row) => row.excluded))) {
          this.importError = '完整日表须全部记录通过核对，不能跳过错误或人员后清理旧排班；请修正，或切换为补充排班';
          return;
        }
        const rows = selected.map((row) => ({
          ...row.record,
          changeReason: (row.record.changeReason || '') + '；来源：' + row.sourceFile + ' / ' + row.sourceSheet + ' 第' + row.line + '行',
        }));
        const previewIds = selected.map((row) => row.previewId);
        const payload = { rows, workshopId: this.batchSettings.workshopId, replaceDay: this.batchSettings.replaceDay };
        const fingerprint = importFingerprint(payload);
        const fresh = !this.importSession || this.importSession.fingerprint !== fingerprint;
        if (fresh) {
          if (!(await this.confirmImport(payload))) return;
          this.importSession = createImportSession(fingerprint);
          this.importResults = {};
        }
        this.importing = true;
        this.importError = '';
        this.importNotice = '';
        try {
          await this.saveImportProcesses(rows);
          const snapshots = this.previousScope.flatMap((scope) => scope.rows);
          const scopes = this.previousScope.filter((scope) => selected.some((row) => row.record.date === scope.date)).map((scope) => ({ date: scope.date, rows: JSON.parse(JSON.stringify(scope.rows)) }));
          const transport = {
            prepare: (data) => callOperations('prepareScheduleImport', data, { timeout: 60000 }),
            write: (data) => callOperations('importSchedules', data, { timeout: 60000 }),
            finish: (data) => callOperations('finishScheduleImport', data, { timeout: 60000 }),
          };
          const result = await runImportWorkflow({
            session: this.importSession,
            rows,
            previewIds,
            workshopId: payload.workshopId,
            replaceDay: payload.replaceDay,
            snapshots,
            scopes,
            transport,
            onStage: (stage) => this.onStage(stage),
            onNotice: (notice) => this.onNotice(notice),
            validatePrepared: (prepared) => this.validatePrepared(selected, prepared),
          });
          if (result.allSucceeded) {
            this.importStage = '完成';
            this.importNotice =
              selected.length + ' 人次导入完成；自动建档 ' + this.importSession.created + ' 人，停用旧排班 ' + this.importSession.removed + ' 条。' + createdAccountHint(this.importSession.createdPeople);
            this.$emit('imported', { date: selected[0] && selected[0].record.date });
          }
        } catch (error) {
          if (error && error.code === 409) {
            this.resetPreview();
            this.importError = '排班在预览后发生变化，请重新生成预览。';
          } else {
            if (this.importSession) this.importStage = error && error.partial ? '部分失败，可按原内容重试' : '导入中断，可按原内容重试';
            this.importError = ((error && error.message) || String(error)) + ' 已完成的分批会保留，重试会接续处理。';
          }
        } finally {
          this.importing = false;
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-import-wizard {
    max-height: 82vh;
    overflow-y: auto;
    padding-right: 4px;
  }
  .mes-wizard-card {
    border: 1px solid #ebeef5;
    border-radius: 6px;
    padding: 14px 16px;
    margin-bottom: 12px;
    background: #fff;
  }
  .mes-wizard-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }
  .mes-wizard-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }
  .mes-wizard-tip {
    color: #909399;
    font-size: 12px;
    line-height: 1.6;
  }
  .mes-wizard-tip.is-error {
    color: #f56c6c;
  }
  .mes-wizard-form {
    margin-bottom: 0;
  }
  .mes-upload-zone {
    margin: 10px 0;
    padding: 22px 16px;
    border: 1px dashed #c0c4cc;
    border-radius: 6px;
    background: #fafafa;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .mes-upload-zone:hover {
    border-color: #409eff;
    background: #f0f7ff;
  }
  .mes-upload-zone.is-busy {
    pointer-events: none;
    opacity: 0.7;
  }
  .mes-upload-zone i {
    font-size: 28px;
    color: #909399;
  }
  .mes-upload-title {
    margin: 6px 0 2px;
    font-size: 14px;
    color: #303133;
  }
  .mes-file-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 180px;
    overflow-y: auto;
    margin-bottom: 8px;
  }
  .mes-file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 10px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    font-size: 13px;
  }
  .mes-file-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }
  .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mes-sheet-box {
    margin: 8px 0;
  }
  .mes-sheet-config {
    margin-top: 6px;
    border-top: 1px dashed #ebeef5;
    padding-top: 8px;
  }
  .mes-sheet-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px;
    font-size: 13px;
    border-radius: 4px;
  }
  .mes-sheet-item.is-active {
    background: #f0f7ff;
  }
  .mes-sheet-item .ellipsis {
    flex: 1;
  }
  .mes-mapping-form {
    margin-top: 8px;
    max-height: 260px;
    overflow-y: auto;
    padding: 8px 10px;
    background: #fafafa;
    border-radius: 4px;
  }
  .mes-wizard-warning {
    margin-top: 10px;
    padding: 10px 12px;
    border: 1px solid #faecd8;
    background: #fdf6ec;
    border-radius: 4px;
    color: #b88230;
    font-size: 13px;
    line-height: 1.7;
  }
  .mes-version-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
  }
  .mes-wizard-alert {
    margin-top: 10px;
  }
  .mes-wizard-footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #ebeef5;
  }
  .mes-wizard-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .mes-wizard-success {
    margin-top: 10px;
    padding: 10px 12px;
    border: 1px solid #e1f3d8;
    background: #f0f9eb;
    border-radius: 4px;
    color: #67c23a;
    font-size: 13px;
    line-height: 1.7;
  }
  .mes-wizard-sticky-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 4px 0;
    border-top: 1px solid #ebeef5;
    position: sticky;
    bottom: 0;
    background: #fff;
  }
  .mes-preview-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
  }
  .mes-review-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }
</style>

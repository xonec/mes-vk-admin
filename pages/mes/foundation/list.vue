<template>
  <div>
    <div class="vk-page-card vk-page-search-card">
      <div class="mes-vk-hero">
        <div>
          <div class="mes-vk-title">{{ pageTitle }}</div>
          <div class="mes-vk-hint">{{ typeHint }} 数据直调 production-operations（bootstrap / saveCatalog），与旧后台同一套规则与版本校验。</div>
        </div>
        <div class="mes-vk-tags">
          <el-tag size="small" type="warning">基础数据</el-tag>
          <el-tag v-if="loadMs" size="small" type="info">读取 {{ loadMs }} ms</el-tag>
        </div>
      </div>
      <el-form :inline="true" size="small" @submit.native.prevent>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="编码 / 名称" clearable style="width: 200px" @keyup.enter.native="query.page = 1"></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" style="width: 110px" @change="query.page = 1">
            <el-option label="启用" value="active"></el-option>
            <el-option label="已停用" value="disabled"></el-option>
            <el-option label="全部" value=""></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="showWorkshopFilter" label="车间">
          <el-select v-model="query.workshopId" clearable placeholder="全部车间" style="width: 180px" @change="query.page = 1">
            <el-option v-for="row in catalogs.workshops" :key="row._id" :label="row.name" :value="row._id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-refresh" :loading="loading" @click="reload">刷新</el-button>
          <el-button type="success" icon="el-icon-plus" :disabled="loading" @click="edit(null)">新增{{ typeLabel }}</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">资料清单 <span class="mes-vk-count">共 {{ filteredRows.length }} 条</span></div>
        <div class="mes-vk-source">数据源：bootstrap（读）/ saveCatalog（写）</div>
      </div>
      <div v-loading="loading" element-loading-text="正在读取基础资料…" class="vk-page-card-table">
        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mes-vk-alert"></el-alert>
        <vk-data-table :data="pagedRows" :columns="columns" :row-no="true" :top="0" :pagination="false" :custom-right-btns="rowButtons"></vk-data-table>
        <div class="mes-vk-pagination">
          <el-pagination background layout="total, prev, pager, next, jumper" :total="filteredRows.length" :page-size="query.pageSize" :current-page="query.page" @current-change="(page) => (query.page = page)"></el-pagination>
        </div>
      </div>
    </div>

    <el-dialog :visible.sync="showEditor" :title="(form._id ? '编辑' : '新增') + typeLabel" width="680px" :close-on-click-modal="false" @closed="formError = ''">
      <el-form v-if="showEditor" label-width="120px" size="small" @submit.native.prevent>
        <el-form-item label="编码" required>
          <el-input v-model="form.code" :disabled="!!form._id" placeholder="1～40 位字母、数字、点、下划线或短横线"></el-input>
          <div v-if="form._id" class="mes-vk-tip">编码创建后不可修改；如需更名请新建并停用旧资料。</div>
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="资料名称"></el-input>
        </el-form-item>

        <template v-if="type === 'processes'">
          <el-form-item label="所属车间" required>
            <el-select v-model="form.workshopId" placeholder="选择车间" style="width: 100%">
              <el-option v-for="row in catalogs.workshops" :key="row._id" :label="row.name" :value="row._id"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="岗位清单">
            <el-input v-model="form.postsText" type="textarea" :rows="4" placeholder="每行一个岗位，例如：操作、复核、包装"></el-input>
          </el-form-item>
        </template>

        <template v-if="type === 'shifts'">
          <el-form-item v-if="!form._id" label="标准预设">
            <div class="mes-vk-presets">
              <el-button v-for="preset in shiftPresets" :key="preset.code" size="mini" @click="usePreset(preset)">{{ preset.name }}</el-button>
            </div>
          </el-form-item>
          <el-form-item label="班制 / 班别">
            <el-select v-model="form.systemHours" placeholder="自定义可留空" clearable style="width: 160px">
              <el-option label="8 小时" :value="8"></el-option>
              <el-option label="12 小时" :value="12"></el-option>
            </el-select>
            <el-select v-model="form.shiftSlot" placeholder="自定义可留空" clearable style="width: 180px; margin-left: 10px">
              <el-option label="早班" value="early"></el-option>
              <el-option label="中班" value="middle"></el-option>
              <el-option label="夜班" value="night"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="开始时间" required>
            <el-select v-model="form.startDayOffset" style="width: 90px">
              <el-option v-for="item in dayOptions" :key="item.value" :label="item.text" :value="item.value"></el-option>
            </el-select>
            <el-time-picker v-model="form.startTime" value-format="HH:mm" format="HH:mm" placeholder="开始" style="width: 130px; margin-left: 10px"></el-time-picker>
          </el-form-item>
          <el-form-item label="结束时间" required>
            <el-select v-model="form.endDayOffset" style="width: 90px">
              <el-option v-for="item in dayOptions" :key="item.value" :label="item.text" :value="item.value"></el-option>
            </el-select>
            <el-time-picker v-model="form.endTime" value-format="HH:mm" format="HH:mm" placeholder="结束" style="width: 130px; margin-left: 10px"></el-time-picker>
          </el-form-item>
          <el-form-item label="时间摘要">
            <span class="mes-vk-tip">{{ shiftTimeLabel(form) }}</span>
          </el-form-item>
        </template>

        <template v-if="type === 'resources'">
          <el-form-item label="类型">
            <el-tag size="small" :type="form.kind === 'mould' ? 'warning' : 'success'">{{ form.kind === 'mould' ? '模具' : '设备' }}</el-tag>
          </el-form-item>
          <el-form-item label="所属车间" required>
            <el-select v-model="form.workshopId" placeholder="选择车间" style="width: 100%" @change="form.processId = ''">
              <el-option v-for="row in catalogs.workshops" :key="row._id" :label="row.name" :value="row._id"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="适用工序" required>
            <el-select v-model="form.processId" placeholder="选择工序" style="width: 100%">
              <el-option v-for="row in workshopProcesses" :key="row._id" :label="row.name" :value="row._id"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="参数与规格">
            <el-input v-model="form.parameters" type="textarea" :rows="3" placeholder="参数、规格、注意事项"></el-input>
          </el-form-item>
        </template>

        <el-form-item label="启用资料">
          <el-switch v-model="form.enabled"></el-switch>
        </el-form-item>
        <el-form-item v-if="form._id" label="修改原因" required>
          <el-input v-model="form.changeReason" type="textarea" :rows="2" placeholder="说明本次资料、权限或启停变更原因"></el-input>
        </el-form-item>
        <el-alert v-if="formError" :title="formError" type="error" :closable="false" show-icon class="mes-vk-alert"></el-alert>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="showEditor = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
  import { callOperations } from '@/utils/call-operations.js';
  import { SHIFT_PRESETS, DAY_OPTIONS, shiftTimeLabel } from '@/utils/shift-presets.js';

  const TYPES = { workshops: '车间信息', processes: '工序信息', shifts: '班次设置', resources: '设备与模具' };
  const TYPE_HINTS = {
    workshops: '车间是排班、人员和工单的数据范围。',
    processes: '设置工序所属车间与允许的岗位（一行一个）。',
    shifts: '先选标准预设再保存；8 小时夜班为次日 00:00—08:00。',
    resources: '按实际设备或模具登记，开工时选用并记录参数。',
  };
  const RESOURCE_KINDS = { equipment: '设备', mould: '模具' };

  function blank(kind) {
    return {
      code: '', name: '', enabled: true, workshopId: '', postsText: '',
      systemHours: '', shiftSlot: '', startDayOffset: 0, endDayOffset: 0, startTime: '', endTime: '',
      kind: kind || '', processId: '', parameters: '', changeReason: '',
    };
  }

  export default {
    data() {
      return {
        type: 'workshops',
        resourceKind: 'equipment',
        loading: false,
        saving: false,
        error: '',
        loadMs: 0,
        catalogs: { workshops: [], processes: [], shifts: [], personnel: [], resources: [] },
        query: { keyword: '', status: 'active', workshopId: '', page: 1, pageSize: 20 },
        showEditor: false,
        form: blank(),
        formError: '',
        shiftPresets: SHIFT_PRESETS,
        dayOptions: DAY_OPTIONS,
      };
    },
    computed: {
      typeLabel() {
        return this.type === 'resources' ? RESOURCE_KINDS[this.resourceKind] : (TYPES[this.type] || '资料').replace('信息', '').replace('设置', '');
      },
      pageTitle() {
        return this.type === 'resources' ? this.typeLabel + '信息' : TYPES[this.type];
      },
      typeHint() {
        return TYPE_HINTS[this.type] || '';
      },
      showWorkshopFilter() {
        return !['workshops', 'shifts'].includes(this.type);
      },
      sourceRows() {
        return this.catalogs[this.type] || [];
      },
      decoratedRows() {
        return this.sourceRows
          .filter((row) => (this.type !== 'resources' || row.kind === this.resourceKind))
          .filter((row) => {
            const keyword = this.query.keyword.trim().toLowerCase();
            const matchKeyword = !keyword || `${row.code} ${row.name}`.toLowerCase().includes(keyword);
            const matchStatus = this.query.status === '' || (this.query.status === 'active' ? row.enabled !== false : row.enabled === false);
            const matchWorkshop = !this.query.workshopId || row.workshopId === this.query.workshopId;
            return matchKeyword && matchStatus && matchWorkshop;
          })
          .map((row) => this.decorate(row));
      },
      filteredRows() {
        return this.decoratedRows;
      },
      pagedRows() {
        return this.filteredRows.slice((this.query.page - 1) * this.query.pageSize, this.query.page * this.query.pageSize);
      },
      workshopProcesses() {
        return (this.catalogs.processes || []).filter((row) => row.workshopId === this.form.workshopId);
      },
      columns() {
        const columns = [{ key: 'code', title: '编码', type: 'text', width: 140 }, { key: 'name', title: '名称', type: 'text', width: 180 }];
        if (this.type === 'processes') columns.push({ key: 'workshopText', title: '所属车间', type: 'text', width: 140 }, { key: 'detailText', title: '岗位清单', type: 'text' });
        else if (this.type === 'shifts') columns.push({ key: 'detailText', title: '班次时间', type: 'text', width: 260 }, { key: 'systemHoursText', title: '班制', type: 'text', width: 90 });
        else if (this.type === 'resources') columns.push({ key: 'kindText', title: '类型', type: 'text', width: 80 }, { key: 'workshopText', title: '车间', type: 'text', width: 140 }, { key: 'detailText', title: '适用工序', type: 'text', width: 150 }, { key: 'parameters', title: '参数', type: 'text' });
        else columns.push({ key: 'workshopText', title: '用途', type: 'text' });
        columns.push({ key: 'statusText', title: '状态', type: 'text', width: 90 }, { key: 'version', title: '版本', type: 'text', width: 70 });
        return columns;
      },
      rowButtons() {
        return [
          { title: '编辑', type: 'primary', onClick: (row) => this.edit(row) },
          { title: '停用', type: 'danger', disabled: (row) => row.enabled === false, onClick: (row) => this.toggle(row, false) },
          { title: '启用', type: 'success', disabled: (row) => row.enabled !== false, onClick: (row) => this.toggle(row, true) },
        ];
      },
    },
    onLoad(query = {}) {
      const type = TYPES[query.type] ? query.type : 'workshops';
      const kind = query.kind === 'mould' ? 'mould' : 'equipment';
      this.type = type;
      this.resourceKind = kind;
      this.form = blank(kind);
      this.reload();
    },
    methods: {
      shiftTimeLabel,
      /** 把资料转成表格显示字段，不改原数据。 */
      decorate(row) {
        const workshop = (this.catalogs.workshops || []).find((item) => item._id === row.workshopId);
        const process = (this.catalogs.processes || []).find((item) => item._id === row.processId);
        let detailText = '';
        if (this.type === 'processes') detailText = (row.posts || []).join(' / ') || '未限制岗位';
        else if (this.type === 'shifts') detailText = this.shiftTimeLabel(row);
        else if (this.type === 'resources') detailText = process ? process.name : '—';
        else detailText = workshop ? '车间基础资料' : '—';
        return {
          ...row,
          workshopText: workshop ? workshop.name : '—',
          kindText: RESOURCE_KINDS[row.kind] || '—',
          systemHoursText: row.systemHours ? row.systemHours + ' 小时' : '自定义',
          detailText,
          statusText: row.enabled === false ? '已停用' : '启用',
        };
      },
      /** 读取目录资料（bootstrap 一次拿全量，页面本地筛选）。 */
      async reload() {
        if (this.loading) return;
        this.loading = true;
        this.error = '';
        const started = Date.now();
        try {
          const data = await callOperations('bootstrap');
          this.catalogs = { workshops: [], processes: [], shifts: [], personnel: [], resources: [], ...(data && data.catalogs) };
        } catch (error) {
          this.error = error && error.message ? error.message : String(error);
        } finally {
          this.loadMs = Date.now() - started;
          this.loading = false;
        }
      },
      usePreset(preset) {
        this.form = { ...this.form, ...JSON.parse(JSON.stringify(preset)), changeReason: this.form.changeReason };
      },
      /** 打开新增（row 为空）或编辑：字段回填与旧后台一致。 */
      edit(row) {
        this.showEditor = true;
        this.formError = '';
        if (!row) {
          this.form = blank(this.type === 'resources' ? this.resourceKind : '');
          return;
        }
        this.form = {
          ...blank(this.type === 'resources' ? this.resourceKind : ''),
          ...JSON.parse(JSON.stringify(row)),
          postsText: (row.posts || []).join('\n'),
          systemHours: row.systemHours == null ? '' : row.systemHours,
          startDayOffset: Number(row.startDayOffset) || 0,
          endDayOffset: row.endDayOffset == null ? (row.endTime <= row.startTime ? 1 : 0) : Number(row.endDayOffset),
          changeReason: '',
        };
      },
      /** 组装保存载荷：字段与旧后台 saveCatalog 契约一致。 */
      buildRecord() {
        const form = this.form;
        const record = { code: String(form.code).trim(), name: String(form.name).trim(), enabled: form.enabled !== false };
        if (form._id) record._id = form._id;
        if (this.type === 'processes') {
          record.workshopId = form.workshopId;
          record.posts = [...new Set(String(form.postsText || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
        } else if (this.type === 'shifts') {
          record.systemHours = form.systemHours === '' || form.systemHours == null ? null : Number(form.systemHours);
          record.shiftSlot = form.shiftSlot || '';
          record.startTime = form.startTime || '';
          record.endTime = form.endTime || '';
          record.startDayOffset = Number(form.startDayOffset) || 0;
          record.endDayOffset = Number(form.endDayOffset) || 0;
        } else if (this.type === 'resources') {
          record.kind = form.kind || this.resourceKind;
          record.workshopId = form.workshopId;
          record.processId = form.processId;
          record.parameters = form.parameters || '';
        }
        if (form._id) record.changeReason = String(form.changeReason || '').trim();
        return record;
      },
      requiredField() {
        const form = this.form;
        const required = [['code', '编码'], ['name', '名称']];
        if (this.type === 'processes') required.push(['workshopId', '所属车间']);
        if (this.type === 'shifts') required.push(['startTime', '开始时间'], ['endTime', '结束时间']);
        if (this.type === 'resources') required.push(['workshopId', '所属车间'], ['processId', '适用工序']);
        if (form._id) required.push(['changeReason', '修改原因']);
        return required.find(([key]) => !String(form[key] == null ? '' : form[key]).trim());
      },
      async save() {
        if (this.saving) return;
        this.formError = '';
        const missing = this.requiredField();
        if (missing) {
          this.formError = '请填写或选择' + missing[1];
          return;
        }
        const record = this.buildRecord();
        this.saving = true;
        try {
          await callOperations('saveCatalog', { type: this.type, record, expectedVersion: Number(this.form.version) || 0 });
          this.showEditor = false;
          this.$message.success('资料已保存');
          await this.reload();
        } catch (error) {
          this.formError = (error && error.message ? error.message : String(error)) + (error && error.code === 409 ? ' 请刷新后重新打开最新记录。' : '');
        } finally {
          this.saving = false;
        }
      },
      /** 启停需要填写原因（服务端更新必须留原因）。 */
      async toggle(row, enabled) {
        let reason = '';
        try {
          const result = await this.$prompt('请输入' + (enabled ? '启用' : '停用') + '原因', (enabled ? '启用' : '停用') + row.name, {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputPlaceholder: '例如：设备报废停用 / 恢复生产启用',
            inputValidator: (value) => (String(value || '').trim() ? true : '原因不能为空'),
          });
          reason = String(result.value || '').trim();
        } catch (error) {
          return;
        }
        try {
          await callOperations('saveCatalog', {
            type: this.type,
            expectedVersion: Number(row.version) || 0,
            record: { ...row, enabled, changeReason: reason },
          });
          this.$message.success(enabled ? '已启用' : '已停用');
          await this.reload();
        } catch (error) {
          this.$message.error(error && error.message ? error.message : String(error));
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-vk-page {
    padding-bottom: 8px;
  }
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
  .mes-vk-tip {
    font-size: 12px;
    color: #909399;
    line-height: 1.6;
  }
  .mes-vk-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .mes-vk-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>

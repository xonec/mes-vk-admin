<template>
  <div class="mes-import">
    <div class="mes-import-heading">
      <div>
        <div class="mes-import-title">员工账号批量创建</div>
        <div class="mes-import-note">工号必填；登录账号可选（留空默认取工号，唯一）。身份证仅在后台显示；初始密码 = 登录账号。复制自旧后台逻辑，独立组件，不依赖旧后台 store / router。</div>
      </div>
      <el-button size="small" icon="el-icon-folder-opened" :loading="busy" @click="choose">选择人员 Excel</el-button>
    </div>
    <div v-if="fileName" class="mes-import-note mes-import-summary">{{ fileName }} · {{ rows.length }} 人 · 待创建 <b>{{ readyCount }}</b> · 已有/已创建 {{ completedCount }} · 需处理 {{ issueCount }}</div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mes-import-alert"></el-alert>
    <div v-if="progress" class="mes-import-note">{{ progress }}</div>
    <template v-if="rows.length">
      <div class="mes-import-actions">
        <el-button size="small" :disabled="busy" @click="preview">重新核对云端账号</el-button>
        <el-button size="small" type="primary" :disabled="busy || !readyCount || hasUncheckedRows" :loading="busy" @click="create">创建 {{ readyCount }} 个账号</el-button>
      </div>
      <el-table :data="rows" size="mini" border max-height="380" :row-key="(row) => row.sourceSheet + ':' + row.line">
        <el-table-column prop="employeeNo" label="工号" width="120"></el-table-column>
        <el-table-column label="登录账号" width="130">
          <template slot-scope="{ row }">{{ row.account || '默认 = 工号' }}</template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" width="100"></el-table-column>
        <el-table-column prop="idCard" label="身份证" width="180"></el-table-column>
        <el-table-column label="来源" width="150">
          <template slot-scope="{ row }">{{ row.sourceSheet }} · 第 {{ row.line }} 行</template>
        </el-table-column>
        <el-table-column label="状态" min-width="220">
          <template slot-scope="{ row }">
            <el-tag size="mini" :type="tagType(row.state)">{{ stateText(row.state) }}</el-tag>
            <span class="mes-import-message">{{ row.message || '待核对' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<script>
  import { callUniIdCo } from '@/utils/call-operations.js';
  import { readEmployeeAccounts } from '@/utils/employee-account-import.js';

  const STATE_TEXT = {
    pending: '待核对',
    ready: '可创建',
    existing: '已有账号',
    created: '已创建',
    conflict: '资料冲突',
    invalid: '本地校验失败',
    error: '创建结果未确认',
  };

  export default {
    name: 'EmployeeAccountImport',
    data() {
      return {
        rows: [],
        fileName: '',
        busy: false,
        error: '',
        progress: '',
      };
    },
    computed: {
      readyCount() {
        return this.rows.filter((row) => row.state === 'ready').length;
      },
      completedCount() {
        return this.rows.filter((row) => ['created', 'existing'].includes(row.state)).length;
      },
      issueCount() {
        return this.rows.filter((row) => ['invalid', 'conflict', 'error'].includes(row.state)).length;
      },
      hasUncheckedRows() {
        return this.rows.some((row) => !['ready', 'existing', 'created', 'invalid', 'conflict'].includes(row.state));
      },
    },
    methods: {
      stateText(state) {
        return STATE_TEXT[state] || state || '—';
      },
      tagType(state) {
        if (['created', 'existing', 'ready'].includes(state)) return 'success';
        if (['conflict', 'error'].includes(state)) return 'danger';
        if (state === 'invalid') return 'warning';
        return 'info';
      },
      errorMessage(cause) {
        return (cause && (cause.errMsg || cause.message)) || '请求失败，请重新核对云端结果';
      },
      /** 登录账号留空则不传 account，由服务端按契约默认取工号。 */
      payload(row) {
        return { employeeNo: row.employeeNo, name: row.name, idCard: row.idCard, ...(row.account ? { account: row.account } : {}) };
      },
      /** 选择本地文件：仅工号/姓名/身份证/登录账号参与后续接口请求。 */
      async choose() {
        if (this.busy) return;
        this.error = '';
        let file;
        try {
          const selected = await new Promise((resolve, reject) => uni.chooseFile({ count: 1, type: 'all', extension: ['xlsx', 'xls', 'csv'], success: resolve, fail: reject }));
          file = selected.tempFiles && selected.tempFiles[0];
        } catch (cause) {
          if (!/cancel/i.test(String((cause && cause.errMsg) || ''))) this.error = this.errorMessage(cause);
          return;
        }
        if (!file) return;
        await this.loadFile(file);
      },
      /** 解析 + 云端预检；供选择文件与自动化验证共用。 */
      async loadFile(file) {
        if (this.busy) return;
        this.busy = true;
        this.error = '';
        this.progress = '';
        this.rows = [];
        this.fileName = '';
        try {
          this.rows = await readEmployeeAccounts(file);
          this.fileName = file.name || '人员表';
        } catch (cause) {
          this.error = this.errorMessage(cause);
          return;
        } finally {
          this.busy = false;
        }
        await this.preview();
      },
      /** 云端预检不写库；任一请求失败即停止，保留结果供重试。 */
      async preview() {
        if (this.busy) return;
        this.busy = true;
        this.error = '';
        this.rows.forEach((row) => { if (row.state !== 'invalid') { row.state = 'pending'; row.message = '待核对'; } });
        try {
          for (const [index, row] of this.rows.entries()) {
            if (row.state === 'invalid') continue;
            this.progress = '正在核对 ' + (index + 1) + ' / ' + this.rows.length;
            const result = await callUniIdCo('previewEmployeeAccount', this.payload(row));
            if (!result || !['ready', 'existing', 'conflict'].includes(result.state)) throw new Error('云端预检结果不完整，请重新核对');
            row.state = result.state;
            row.message = result.message || '';
          }
          this.progress = '云端核对完成；已有账号不修改密码，资料冲突需人工处理。';
        } catch (cause) {
          this.error = this.errorMessage(cause);
          this.progress = '核对中断，请重试；未核对记录不能创建。';
        } finally {
          this.busy = false;
        }
      },
      /** 逐行建号并展示服务端结果；中断后重新核对即可安全重试。 */
      async create() {
        if (this.busy || !this.readyCount || this.hasUncheckedRows) return;
        this.busy = true;
        this.error = '';
        const selected = this.rows.filter((row) => row.state === 'ready');
        let changed = false;
        try {
          for (const [index, row] of selected.entries()) {
            this.progress = '正在创建 ' + (index + 1) + ' / ' + selected.length;
            try {
              const result = await callUniIdCo('createEmployeeAccount', this.payload(row));
              if (!result || !['created', 'existing', 'conflict'].includes(result.state)) throw new Error('云端建号结果不完整，请重新核对');
              row.state = result.state;
              row.message = result.message || '';
              changed = changed || result.state === 'created' || result.state === 'existing';
            } catch (cause) {
              row.state = 'error';
              row.message = '结果未确认，请重新核对云端账号';
              throw cause;
            }
          }
          this.progress = '批量创建结束，结果见下表。';
        } catch (cause) {
          this.error = this.errorMessage(cause);
          this.progress = '已停止后续创建，请先重新核对云端账号。';
        } finally {
          this.busy = false;
          if (changed) this.$emit('created');
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  .mes-import {
    padding: 4px 2px;
  }
  .mes-import-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .mes-import-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }
  .mes-import-note {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.6;
    color: #909399;
  }
  .mes-import-summary {
    color: #606266;
  }
  .mes-import-alert {
    margin-top: 10px;
  }
  .mes-import-actions {
    display: flex;
    gap: 8px;
    margin: 12px 0;
  }
  .mes-import-message {
    margin-left: 8px;
    font-size: 12px;
    color: #909399;
  }
</style>

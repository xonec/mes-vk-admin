<template>
  <div>
    <div class="vk-page-card vk-page-search-card">
      <div class="mes-vk-hero">
        <div>
          <div class="mes-vk-title">账号与权限</div>
          <div class="mes-vk-hint">账号 = uni-id-users（与旧后台、现场端同一套）；工号/登录账号来自员工档案（mes_employee_accounts）。后台角色用 vk / uni-id 角色；业务权限仍由 production-operations 按人员档案（职责/车间）判定，不另建用户体系。</div>
        </div>
        <div class="mes-vk-tags">
          <el-tag size="small" type="warning">账号体系</el-tag>
          <el-tag v-if="loadMs" size="small" type="info">读取 {{ loadMs }} ms</el-tag>
        </div>
      </div>
      <el-form :inline="true" size="small" @submit.native.prevent>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="登录账号 / 工号 / 姓名" clearable style="width: 220px" @keyup.enter.native="query.page = 1"></el-input>
        </el-form-item>
        <el-form-item label="账号状态">
          <el-select v-model="query.status" style="width: 120px" @change="query.page = 1">
            <el-option label="正常" :value="0"></el-option>
            <el-option label="已封禁" :value="1"></el-option>
            <el-option label="全部" value=""></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="员工档案">
          <el-select v-model="query.profile" style="width: 130px" @change="query.page = 1">
            <el-option label="已建工号" value="has"></el-option>
            <el-option label="无员工档案" value="none"></el-option>
            <el-option label="全部" value=""></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button type="success" icon="el-icon-plus" :disabled="loading" @click="openCreate">单个建号</el-button>
          <el-button icon="el-icon-upload2" :disabled="loading" @click="showImport = true">批量建号</el-button>
        </el-form-item>
      </el-form>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mes-vk-alert"></el-alert>
    </div>

    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">账号列表 <span class="mes-vk-count">共 {{ filteredRows.length }} 个</span></div>
        <div class="mes-vk-source">数据源：user-admin.listUsers + 员工档案关联（工号/账号）</div>
      </div>
      <div v-loading="loading" element-loading-text="正在读取账号…" class="vk-page-card-table">
        <vk-data-table :data="pagedRows" :columns="columns" :row-no="true" :top="0" :pagination="false" :custom-right-btns="rowButtons"></vk-data-table>
        <div class="mes-vk-pagination">
          <el-pagination background layout="total, prev, pager, next, jumper" :total="filteredRows.length" :page-size="query.pageSize" :current-page="query.page" @current-change="(page) => (query.page = page)"></el-pagination>
        </div>
      </div>
    </div>

    <!-- 批量建号（复制自旧后台逻辑的独立组件） -->
    <el-dialog :visible.sync="showImport" title="批量建号（Excel）" width="1080px" top="5vh" :close-on-click-modal="false">
      <employee-account-import ref="importPanel" @created="onImportCreated"></employee-account-import>
      <span slot="footer"><el-button size="small" @click="showImport = false">关闭</el-button></span>
    </el-dialog>

    <!-- 编辑员工档案 -->
    <el-dialog :visible.sync="showProfile" title="编辑员工档案" width="560px" :close-on-click-modal="false" @closed="profileError = ''">
      <el-form label-width="110px" size="small">
        <el-form-item label="登录账号">
          <el-tag size="small" type="info">{{ profileRow.account || profileRow.username }}</el-tag>
          <span class="mes-vk-tip">账号为登录名；工号是档案编码，两者可不同。</span>
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="profileForm.name" placeholder="员工姓名"></el-input>
        </el-form-item>
        <el-form-item label="工号">
          <el-input v-model="profileForm.employeeNo" placeholder="6～20 位数字"></el-input>
          <div class="mes-vk-tip">只改档案编码，不影响登录与历史归属。</div>
        </el-form-item>
        <el-form-item label="登录账号">
          <el-input v-model="profileForm.account" placeholder="uni-id 用户名规则"></el-input>
          <div class="mes-vk-tip">修改后旧登录名立即失效，密码不变，需要重新登录。</div>
        </el-form-item>
        <el-alert v-if="profileError" :title="profileError" type="error" :closable="false" show-icon></el-alert>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="showProfile = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="saveProfile">保存</el-button>
      </span>
    </el-dialog>

    <!-- 单个建号 -->
    <el-dialog :visible.sync="showCreate" title="单个建号" width="560px" :close-on-click-modal="false" @closed="createError = ''">
      <el-form label-width="110px" size="small">
        <el-form-item label="姓名" required>
          <el-input v-model="createForm.name" placeholder="员工姓名"></el-input>
        </el-form-item>
        <el-form-item label="工号" required>
          <el-input v-model="createForm.employeeNo" placeholder="6～20 位数字"></el-input>
        </el-form-item>
        <el-form-item label="登录账号">
          <el-input v-model="createForm.account" placeholder="留空默认等于工号"></el-input>
        </el-form-item>
        <el-form-item label="身份证号">
          <el-input v-model="createForm.idCard" placeholder="可留空；用于员工档案"></el-input>
        </el-form-item>
        <div class="mes-vk-tip">初始密码 = 登录账号；建号前会做工号/账号/身份证占用预检。</div>
        <el-alert v-if="createError" :title="createError" type="error" :closable="false" show-icon class="mes-vk-alert"></el-alert>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="showCreate = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="saveCreate">建号</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
  import { callCloud, callUniIdCo, formatTime } from '@/utils/call-operations.js';
  import EmployeeAccountImport from '@/components/mes/EmployeeAccountImport.vue';

  const STATUS_TEXT = { 0: '正常', 1: '已封禁', 2: '审核中', 3: '审核失败', 4: '已注销' };

  export default {
    components: { EmployeeAccountImport },
    data() {
      return {
        loading: false,
        saving: false,
        loadMs: 0,
        error: '',
        rows: [],
        query: { keyword: '', status: '', profile: '', page: 1, pageSize: 20 },
        showProfile: false,
        profileRow: {},
        profileForm: { name: '', employeeNo: '', account: '' },
        profileError: '',
        showImport: false,
        showCreate: false,
        createForm: { name: '', employeeNo: '', account: '', idCard: '' },
        createError: '',
        columns: [
          { key: 'account', title: '登录账号', type: 'text', width: 150 },
          { key: 'employeeNo', title: '工号', type: 'text', width: 120 },
          { key: 'nameText', title: '姓名', type: 'text', width: 120 },
          { key: 'roleText', title: '角色', type: 'text', width: 160 },
          { key: 'statusText', title: '账号状态', type: 'text', width: 100 },
          { key: 'registerText', title: '注册时间', type: 'text', width: 170 },
        ],
      };
    },
    computed: {
      filteredRows() {
        const keyword = this.query.keyword.trim().toLowerCase();
        return this.rows
          .filter((row) => {
            const matchKeyword = !keyword || [row.account, row.username, row.employeeNo, row.nickname].some((value) => String(value || '').toLowerCase().includes(keyword));
            const matchStatus = this.query.status === '' || Number(row.status) === Number(this.query.status);
            const matchProfile = this.query.profile === '' || (this.query.profile === 'has' ? !!row.employeeNo : !row.employeeNo);
            return matchKeyword && matchStatus && matchProfile;
          })
          .map((row) => ({ ...row, statusText: STATUS_TEXT[row.status] || '未知', roleText: (row.role || []).join('、') || '普通用户' }));
      },
      pagedRows() {
        return this.filteredRows.slice((this.query.page - 1) * this.query.pageSize, this.query.page * this.query.pageSize);
      },
      rowButtons() {
        return [{ title: '编辑档案', type: 'primary', onClick: (row) => this.openProfile(row) }];
      },
    },
    onLoad() {
      this.load();
    },
    methods: {
      /** 读取全部账号：user-admin.listUsers 分页拉完（现在 112 个），本地筛选。 */
      async load() {
        if (this.loading) return;
        this.loading = true;
        this.error = '';
        const started = Date.now();
        try {
          const rows = [];
          for (let page = 1; page <= 20; page++) {
            const data = await callCloud('userAdmin', 'listUsers', { page, pageSize: 100, normalOnly: false });
            rows.push(...(data.list || []));
            if (!data.hasMore) break;
          }
          this.rows = rows;
        } catch (error) {
          this.rows = [];
          this.error = error && error.message ? error.message : String(error);
        } finally {
          this.loadMs = Date.now() - started;
          this.loading = false;
        }
      },
      openProfile(row) {
        this.profileRow = row;
        this.profileForm = { name: row.nickname && row.nickname !== row.username ? row.nickname : '', employeeNo: row.employeeNo || '', account: row.account || row.username || '' };
        this.profileError = '';
        this.showProfile = true;
      },
      /** 只提交有变化的字段；改登录账号需二次确认（旧登录名立即失效）。 */
      async saveProfile() {
        if (this.saving) return;
        this.profileError = '';
        const payload = { uid: this.profileRow._id };
        const name = String(this.profileForm.name || '').trim();
        const employeeNo = String(this.profileForm.employeeNo || '').trim();
        const account = String(this.profileForm.account || '').trim();
        if (name && name !== (this.profileRow.nickname || '')) payload.name = name;
        if (employeeNo && employeeNo !== (this.profileRow.employeeNo || '')) payload.employeeNo = employeeNo;
        if (account && account !== (this.profileRow.account || this.profileRow.username || '')) payload.account = account;
        if (Object.keys(payload).length === 1) {
          this.profileError = '没有需要保存的修改';
          return;
        }
        if (payload.account) {
          try {
            await this.$confirm('修改登录账号后，旧登录名立即失效，密码不变，需要重新登录。确认修改？', '确认修改登录账号', { type: 'warning', confirmButtonText: '确认修改', cancelButtonText: '取消' });
          } catch (error) {
            return;
          }
        }
        this.saving = true;
        try {
          await callUniIdCo('updateEmployeeAccount', payload);
          this.$message.success('员工档案已保存');
          this.showProfile = false;
          await this.load();
        } catch (error) {
          this.profileError = error && error.message ? error.message : String(error);
        } finally {
          this.saving = false;
        }
      },
      onImportCreated() {
        this.load();
      },
      openCreate() {
        this.createForm = { name: '', employeeNo: '', account: '', idCard: '' };
        this.createError = '';
        this.showCreate = true;
      },
      /** 建号前预检占用；成功后刷新列表。 */
      async saveCreate() {
        if (this.saving) return;
        this.createError = '';
        const name = String(this.createForm.name || '').trim();
        const employeeNo = String(this.createForm.employeeNo || '').trim();
        const account = String(this.createForm.account || '').trim();
        const idCard = String(this.createForm.idCard || '').trim();
        if (!name) return (this.createError = '请填写姓名');
        if (!/^\d{6,20}$/.test(employeeNo)) return (this.createError = '工号须为 6～20 位数字');
        this.saving = true;
        try {
          const preview = await callUniIdCo('previewEmployeeAccount', { name, employeeNo, account, idCard });
          const blocked = ['employeeNo', 'account', 'idCard'].filter((key) => preview && preview[key] && (preview[key].occupied || preview[key].exists || preview[key].conflict));
          if (blocked.length) throw new Error('预检未通过：' + blocked.map((key) => ({ employeeNo: '工号', account: '登录账号', idCard: '身份证' })[key]).join('、') + '已被占用');
          const result = await callUniIdCo('createEmployeeAccount', { name, employeeNo, account, idCard });
          this.$message.success('建号成功' + (result && result.account ? '：' + result.account : ''));
          this.showCreate = false;
          await this.load();
        } catch (error) {
          this.createError = error && error.message ? error.message : String(error);
        } finally {
          this.saving = false;
        }
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
    max-width: 900px;
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
    margin-top: 10px;
  }
  .mes-vk-tip {
    margin-left: 8px;
    font-size: 12px;
    color: #909399;
    line-height: 1.6;
  }
  .mes-vk-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>

<template>
  <div>
    <div class="vk-page-card vk-page-search-card">
      <div class="mes-vk-hero">
        <div>
          <div class="mes-vk-title">OCR 识别配置</div>
          <div class="mes-vk-hint">读取：doc-ocr.getConfig（Key 脱敏，仅返回是否已配置）；保存：doc-ocr.setConfig（合并保存 + updatedAt 版本校验）。供应商只允许改名称/启用，接口地址与 Key 不下发、不覆盖；模型链与提示词可直接编辑。</div>
        </div>
        <div class="mes-vk-tags">
          <el-tag size="small" type="warning">系统配置</el-tag>
          <el-tag v-if="updatedText" size="small" type="info">更新于 {{ updatedText }}</el-tag>
        </div>
      </div>
      <div class="mes-vk-actions">
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">重新读取</el-button>
        <el-button size="small" type="primary" icon="el-icon-check" :loading="saving" :disabled="loading" @click="save">保存全部修改</el-button>
      </div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="mes-vk-alert"></el-alert>
    </div>

    <div v-loading="loading" element-loading-text="正在读取 OCR 配置…">
      <div class="vk-page-card">
        <div class="vk-page-card-toolbar"><div class="vk-page-card-title">运行状态</div></div>
        <el-row :gutter="12">
          <el-col :span="6"><div class="mes-vk-metric"><div class="mes-vk-metric-value">{{ flowModeText }}</div><div class="mes-vk-metric-label">当前识别流程</div></div></el-col>
          <el-col :span="6"><div class="mes-vk-metric"><div class="mes-vk-metric-value">{{ keySet ? '已配置' : '未配置' }}</div><div class="mes-vk-metric-label">大模型 Key（{{ sourceText }}）</div></div></el-col>
          <el-col :span="6"><div class="mes-vk-metric"><div class="mes-vk-metric-value">{{ ocrSpaceKeySet ? '已配置' : '未配置' }}</div><div class="mes-vk-metric-label">OCR.space 兜底 Key</div></div></el-col>
          <el-col :span="6"><div class="mes-vk-metric"><div class="mes-vk-metric-value">{{ usage.globalUsed }} / {{ usage.globalLimit || '不限' }}</div><div class="mes-vk-metric-label">今日模型调用（{{ usage.date }}）</div></div></el-col>
        </el-row>
      </div>

      <div class="vk-page-card">
        <div class="vk-page-card-toolbar"><div class="vk-page-card-title">通道与限额</div><div class="mes-vk-source">保存会覆盖生产识别配置，请确认后再点</div></div>
        <el-form label-width="150px" size="small">
          <el-form-item label="识别流程">
            <el-radio-group v-model="form.flowMode">
              <el-radio label="model-first">大模型优先（失败/额度不足走免费 OCR 兜底）</el-radio>
              <el-radio label="screen-first">免费 OCR 优先（兜底 OCR 引擎顺序）</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="兜底 OCR 引擎">
            <el-select v-model="form.ocrSpaceEngine" style="width: 220px">
              <el-option v-for="item in engineOptions" :key="item.value" :label="item.text" :value="item.value"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="单次超时（毫秒）"><el-input-number v-model="form.timeout" :min="5000" :max="60000" :step="1000"></el-input-number></el-form-item>
          <el-form-item label="每模型最多尝试"><el-input-number v-model="form.maxAttempts" :min="1" :max="3"></el-input-number></el-form-item>
          <el-form-item label="模型全局每日上限"><el-input-number v-model="form.dailyLimit" :min="0" :step="50"></el-input-number><span class="mes-vk-tip">0 = 不限</span></el-form-item>
          <el-form-item label="模型每用户每日上限"><el-input-number v-model="form.userDailyLimit" :min="0" :step="10"></el-input-number></el-form-item>
        </el-form>
      </div>

      <div class="vk-page-card">
        <div class="vk-page-card-toolbar">
          <div class="vk-page-card-title">供应商</div>
          <div class="mes-vk-source">接口地址与 Key 只读；更换 Key 属敏感操作，后续单独提供入口</div>
        </div>
        <el-table :data="providerRows" size="small" border>
          <el-table-column prop="name" label="名称" width="200"></el-table-column>
          <el-table-column prop="type" label="类型" width="120"></el-table-column>
          <el-table-column prop="apiUrl" label="接口地址" min-width="260"></el-table-column>
          <el-table-column label="Key" width="120">
            <template slot-scope="{ row }"><el-tag size="mini" :type="row.keySet ? 'success' : 'info'">{{ row.keySet ? '已配置' : '未配置' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="启用" width="90">
            <template slot-scope="{ row }"><el-switch v-model="row.enabled"></el-switch></template>
          </el-table-column>
        </el-table>
      </div>

      <div class="vk-page-card">
        <div class="vk-page-card-toolbar">
          <div class="vk-page-card-title">模型链</div>
          <div class="mes-vk-actions"><el-button size="mini" icon="el-icon-plus" @click="addStep">新增步骤</el-button></div>
        </div>
        <el-table :data="chainRows" size="small" border>
          <el-table-column label="顺序" width="90">
            <template slot-scope="{ $index }">
              <el-button size="mini" icon="el-icon-top" :disabled="$index === 0" @click="moveStep($index, -1)"></el-button>
              <el-button size="mini" icon="el-icon-bottom" :disabled="$index === chainRows.length - 1" @click="moveStep($index, 1)"></el-button>
            </template>
          </el-table-column>
          <el-table-column label="供应商" width="200">
            <template slot-scope="{ row }">
              <el-select v-model="row.providerId" size="small">
                <el-option v-for="provider in chainProviders" :key="provider.id" :label="provider.name" :value="provider.id"></el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="图片模型" min-width="200">
            <template slot-scope="{ row }"><el-input v-model="row.model" size="small" placeholder="模型 ID"></el-input></template>
          </el-table-column>
          <el-table-column label="文本模型" min-width="200">
            <template slot-scope="{ row }"><el-input v-model="row.textModel" size="small" placeholder="留空同图片模型"></el-input></template>
          </el-table-column>
          <el-table-column label="启用" width="90">
            <template slot-scope="{ row }"><el-switch v-model="row.enabled"></el-switch></template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template slot-scope="{ $index }"><el-button size="mini" type="danger" :disabled="chainRows.length <= 1" @click="removeStep($index)">删除</el-button></template>
          </el-table-column>
        </el-table>
      </div>

      <div class="vk-page-card">
        <div class="vk-page-card-toolbar"><div class="vk-page-card-title">提示词</div><div class="mes-vk-source">每项不能为空，最长 20000 字符</div></div>
        <el-tabs v-model="promptTab">
          <el-tab-pane v-for="tab in promptTabs" :key="tab.key" :label="tab.label" :name="tab.key">
            <el-input v-model="prompts[tab.key]" type="textarea" :rows="10" placeholder="提示词内容"></el-input>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script>
  import { callCloud, formatTime } from '@/utils/call-operations.js';

  export default {
    data() {
      return {
        loading: false,
        saving: false,
        error: '',
        updatedAt: 0,
        config: {},
        usage: { date: '', globalUsed: 0, globalLimit: 0, userDailyLimit: 0, ownKeyUsers: 0 },
        keySet: false,
        source: '',
        ocrSpaceKeySet: false,
        providerRows: [],
        chainRows: [],
        prompts: { contentPrompt: '', bomPrompt: '', orderPrompt: '' },
        promptTab: 'contentPrompt',
        promptTabs: [
          { key: 'contentPrompt', label: '内容识别' },
          { key: 'bomPrompt', label: 'BOM 补充规则' },
          { key: 'orderPrompt', label: '订单补充规则' },
        ],
        engineOptions: [
          { value: 2, text: '引擎 2 · 通用识别' },
          { value: 3, text: '引擎 3 · 表格 / 手写' },
          { value: 1, text: '引擎 1 · 旧版兼容' },
        ],
        form: { flowMode: 'model-first', ocrSpaceEngine: 2, timeout: 35000, maxAttempts: 2, dailyLimit: 200, userDailyLimit: 100 },
      };
    },
    computed: {
      flowModeText() { return this.form.flowMode === 'screen-first' ? '免费 OCR 优先' : '大模型优先'; },
      sourceText() { return ({ db: '库内配置', env: '环境变量', default: '默认值' })[this.source] || this.source || '—'; },
      updatedText() { return this.updatedAt ? formatTime(this.updatedAt) : ''; },
      chainProviders() { return this.providerRows.filter((provider) => provider.type !== 'ocrspace'); },
    },
    onLoad() { this.load(); },
    methods: {
      /** 读取配置：Key 只拿 keySet/maskedKey，不存明文。 */
      async load() {
        if (this.loading) return;
        this.loading = true;
        this.error = '';
        try {
          const data = await callCloud('ocr', 'getConfig');
          const config = data.config || {};
          this.config = config;
          this.updatedAt = Number(data.updatedAt) || 0;
          this.keySet = !!data.keySet;
          this.source = data.source || '';
          this.ocrSpaceKeySet = !!data.ocrSpaceKeySet;
          this.usage = data.usage || this.usage;
          this.form = {
            flowMode: config.flowMode === 'screen-first' ? 'screen-first' : 'model-first',
            ocrSpaceEngine: [1, 2, 3].includes(Number(config.ocrSpaceEngine)) ? Number(config.ocrSpaceEngine) : 2,
            timeout: Number(config.timeout) || 35000,
            maxAttempts: Number(config.maxAttempts) || 2,
            dailyLimit: Number(config.dailyLimit) || 0,
            userDailyLimit: Number(config.userDailyLimit) || 0,
          };
          this.providerRows = (config.providers || []).map((provider) => ({ id: provider.id, type: provider.type, name: provider.name, apiUrl: provider.apiUrl, keySet: !!provider.keySet, enabled: provider.enabled !== false }));
          this.chainRows = (config.modelChain || []).map((step) => ({ id: step.id, providerId: step.providerId, model: step.model || '', textModel: step.textModel || '', enabled: step.enabled !== false }));
          this.prompts = {};
          for (const tab of this.promptTabs) this.prompts[tab.key] = (config && config[tab.key]) || '';
        } catch (error) {
          this.error = error && error.message ? error.message : String(error);
        } finally {
          this.loading = false;
        }
      },
      addStep() {
        const provider = this.chainProviders[0];
        if (!provider) return this.$message.warning('没有可用的文本/图片模型供应商');
        this.chainRows.push({ id: 'step-' + Date.now().toString(36), providerId: provider.id, model: '', textModel: '', enabled: true });
      },
      moveStep(index, delta) {
        const target = index + delta;
        if (target < 0 || target >= this.chainRows.length) return;
        const rows = this.chainRows.slice();
        const [item] = rows.splice(index, 1);
        rows.splice(target, 0, item);
        this.chainRows = rows;
      },
      removeStep(index) {
        if (this.chainRows.length <= 1) return;
        this.chainRows.splice(index, 1);
      },
      /** 保存：不提交任何 Key 字段；供应商只提交 id/type/name/apiUrl/enabled，服务端按同地址保留原 Key。 */
      async save() {
        if (this.saving || this.loading) return;
        this.error = '';
        for (const tab of this.promptTabs) if (!String(this.prompts[tab.key] || '').trim()) return (this.error = '提示词「' + tab.label + '」不能为空');
        for (const step of this.chainRows) if (!String(step.model || '').trim()) return (this.error = '模型链存在未填写图片模型的步骤');
        this.saving = true;
        try {
          const config = {
            ...this.form,
            providers: this.providerRows.map((provider) => ({ id: provider.id, type: provider.type, name: provider.name, apiUrl: provider.apiUrl, enabled: provider.enabled !== false })),
            modelChain: this.chainRows.map((step) => ({ id: step.id, providerId: step.providerId, model: step.model.trim(), textModel: (step.textModel || step.model).trim(), enabled: step.enabled !== false })),
          };
          for (const tab of this.promptTabs) config[tab.key] = String(this.prompts[tab.key] || '').trim();
          await callCloud('ocr', 'setConfig', { config, expectedUpdatedAt: this.updatedAt });
          this.$message.success('OCR 配置已保存');
          await this.load();
        } catch (error) {
          this.error = (error && error.message ? error.message : String(error)) + (error && error.code === 409 ? ' 请重新读取配置后再保存。' : '');
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
    max-width: 980px;
  }
  .mes-vk-tags {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  .mes-vk-actions {
    display: flex;
    gap: 8px;
  }
  .mes-vk-alert {
    margin-top: 10px;
  }
  .mes-vk-metric {
    padding: 14px 16px;
    border-left: 3px solid #409eff;
    background: #f5f7fa;
    margin-bottom: 8px;
  }
  .mes-vk-metric-value {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
  .mes-vk-metric-label {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }
  .mes-vk-source {
    font-size: 12px;
    color: #909399;
  }
  .mes-vk-tip {
    margin-left: 10px;
    font-size: 12px;
    color: #909399;
  }
</style>

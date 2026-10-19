/**
 * 订单抽屉单元测试：只验证计划时间校验与 upsert 载荷契约（不连云端、不写数据）。
 * 运行：node tests/order-drawer.test.cjs
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const FILE = path.resolve(__dirname, '../components/mes/OrderDrawer.vue');
let passed = 0;
let failed = 0;

/** 提取 <script> 并用替身替换 import，返回组件选项。 */
function loadComponent({ callCloud }) {
  let script = fs.readFileSync(FILE, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  script = script
    .replace(/^\s*import .*?;\s*$/gm, '')
    .replace('export default', 'module.exports =');
  const context = {
    console,
    setTimeout,
    clearTimeout,
    callCloud,
    formatTime: (value) => (value ? String(value) : '—'),
    OrderStatusTag: {},
    module: { exports: {} },
    exports: {},
  };
  vm.runInNewContext(script, context, { filename: FILE });
  return context.module.exports;
}

/** 用组件选项构建可调用方法的实例（不启动 Vue）。 */
function createInstance(overrides = {}) {
  const calls = [];
  const component = loadComponent({ callCloud: async (target, action, payload) => { calls.push({ target, action, payload }); if (overrides.callCloud) return overrides.callCloud(target, action, payload); return {}; } });
  const state = component.data();
  for (const [key, fn] of Object.entries(component.methods || {})) state[key] = fn.bind(state);
  state.$message = { success: () => {}, error: () => {} };
  state.emits = [];
  state.$emit = (name, payload) => state.emits.push({ name, payload });
  return { state, calls, component };
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (error) {
    failed++;
    console.error('  ✗ ' + name + ': ' + error.message);
  }
}

const RECORD = {
  _id: 'order:568393',
  orderNo: '568393',
  batchNo: 'OPJV26X1002',
  productCode: '1306008144',
  productName: 'FoYes分离乳清蛋白粉(雪顶蜜瓜味)',
  packSpec: '6瓶/箱',
  plannedQty: 795,
  materials: [{ name: '标签', qty: 1 }],
  orderStatus: 'draft',
  enabled: true,
  version: 3,
  planStartAt: null,
  planEndAt: null,
};

(async () => {
  await test('计划结束早于开始时报错', async () => {
    const { state } = createInstance();
    state.form = { planStartAt: 1781092800000, planEndAt: 1781092800000 };
    assert.equal(state.validate(), '计划结束时间须晚于计划开始时间');
    state.form = { planStartAt: 1781092800000, planEndAt: 1780272000000 };
    assert.equal(state.validate(), '计划结束时间须晚于计划开始时间');
  });

  await test('超出允许范围报错（2020-01-01 ~ 2035-12-31）', async () => {
    const { state } = createInstance();
    state.form = { planStartAt: new Date(2019, 11, 31).getTime(), planEndAt: null };
    assert.match(state.validate(), /2020-01-01 至 2035-12-31/);
    state.form = { planStartAt: null, planEndAt: new Date(2036, 0, 2).getTime() };
    assert.match(state.validate(), /2020-01-01 至 2035-12-31/);
  });

  await test('允许只填一个或都留空', async () => {
    const { state } = createInstance();
    state.form = { planStartAt: null, planEndAt: null };
    assert.equal(state.validate(), '');
    state.form = { planStartAt: new Date(2026, 5, 1, 8, 0).getTime(), planEndAt: null };
    assert.equal(state.validate(), '');
    state.form = { planStartAt: null, planEndAt: new Date(2026, 5, 10, 20, 0).getTime() };
    assert.equal(state.validate(), '');
  });

  await test('校验不通过时不发起保存', async () => {
    const { state, calls } = createInstance();
    state.record = { ...RECORD };
    state.form = { planStartAt: 1781092800000, planEndAt: 1780272000000 };
    await state.save();
    assert.equal(calls.length, 0);
    assert.match(state.formError, /计划结束时间须晚于计划开始时间/);
  });

  await test('保存载荷保留全量字段并带 expectedVersion', async () => {
    const { state, calls } = createInstance();
    state.record = { ...RECORD };
    const start = new Date(2026, 5, 1, 8, 0).getTime();
    const end = new Date(2026, 5, 10, 20, 0).getTime();
    state.form = { planStartAt: start, planEndAt: end };
    await state.save();
    assert.equal(calls.length, 1);
    const { target, action, payload } = calls[0];
    assert.equal(target, 'orders');
    assert.equal(action, 'upsert');
    assert.equal(payload.expectedVersion, 3);
    assert.equal(payload.record.orderNo, RECORD.orderNo);
    assert.equal(payload.record.materials.length, 1);
    assert.equal(payload.record.planStartAt, start);
    assert.equal(payload.record.planEndAt, end);
    assert.ok(state.emits.some((item) => item.name === 'saved'));
    assert.ok(state.emits.some((item) => item.name === 'close'));
  });

  await test('清空计划时间时提交 null', async () => {
    const { state, calls } = createInstance();
    state.record = { ...RECORD, planStartAt: 1, planEndAt: 2 };
    state.form = { planStartAt: null, planEndAt: null };
    await state.save();
    assert.equal(calls[0].payload.record.planStartAt, null);
    assert.equal(calls[0].payload.record.planEndAt, null);
  });

  await test('409 冲突提示重新打开订单', async () => {
    const { state } = createInstance({ callCloud: async () => { const error = new Error('订单已被修改，请重新加载后核对'); error.code = 409; throw error; } });
    state.record = { ...RECORD };
    state.form = { planStartAt: new Date(2026, 5, 1, 8, 0).getTime(), planEndAt: null };
    await state.save();
    assert.match(state.formError, /重新打开订单/);
    assert.equal(state.saving, false);
  });

  await test('详情加载回填计划时间与版本', async () => {
    const { state } = createInstance({ callCloud: async () => ({ ...RECORD, planStartAt: 111, planEndAt: 222, version: 4 }) });
    state.orderNo = '568393';
    await state.load();
    assert.equal(state.record.version, 4);
    assert.equal(state.form.planStartAt, 111);
    assert.equal(state.form.planEndAt, 222);
    assert.equal(state.loading, false);
  });

  await test('订单不存在时给出明确错误且不显示详情', async () => {
    const { state } = createInstance({ callCloud: async () => null });
    state.orderNo = '999999';
    await state.load();
    assert.equal(state.record, null);
    assert.match(state.error, /订单不存在/);
  });

  console.log('\n订单抽屉：' + passed + ' passed, ' + failed + ' failed');
  process.exitCode = failed ? 1 : 0;
})();

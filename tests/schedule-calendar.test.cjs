/**
 * 排班日历纯逻辑测试：月份网格、周一为起点、徽标数据映射、翻月事件（不连云端）。
 * 运行：node tests/schedule-calendar.test.cjs
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const FILE = path.resolve(__dirname, '../components/mes/ScheduleCalendar.vue');
let passed = 0;
let failed = 0;

function loadComponent() {
  let script = fs.readFileSync(FILE, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  script = script.replace(/^\s*import .*?;\s*$/gm, '').replace('export default', 'module.exports =');
  const context = { console, module: { exports: {} }, exports: {} };
  vm.runInNewContext(script, context, { filename: FILE });
  return context.module.exports;
}

/** 构建带 props + computed + 事件记录的实例。 */
function createInstance(props = {}) {
  const component = loadComponent();
  const state = Object.assign(component.data(), { emits: [], $emit(name, payload) { this.emits.push({ name, payload }); } }, props);
  for (const [key, fn] of Object.entries(component.methods || {})) state[key] = fn.bind(state);
  for (const [key, def] of Object.entries(component.computed || {})) {
    const getter = typeof def === 'function' ? def : def.get;
    Object.defineProperty(state, key, { get: getter.bind(state) });
  }
  return state;
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

(async () => {
  await test('2026-06 网格：周一开头，35 格，首格 06-01', async () => {
    const state = createInstance({ month: '2026-06', days: [] });
    assert.equal(state.monthLabel, '2026年6月');
    assert.equal(state.cells.length % 7, 0);
    assert.equal(state.cells.length, 35);
    assert.equal(state.cells[0].inMonth, true);
    assert.equal(state.cells[0].date, '2026-06-01');
    assert.equal(state.cells[29].date, '2026-06-30');
    assert.equal(state.cells.filter((cell) => cell.inMonth).length, 30);
  });

  await test('月份首日不是周一时补齐前置空格（2026-03 周日开头 → 6 个空位）', async () => {
    const state = createInstance({ month: '2026-03', days: [] });
    const pads = state.cells.filter((cell) => !cell.inMonth);
    assert.equal(state.cells[6].date, '2026-03-01');
    assert.equal(pads.slice(0, 6).every((cell) => !cell.date), true);
  });

  await test('徽标数据按日期映射到格子', async () => {
    const days = [
      { date: '2026-06-01', work: 127, rest: 32, leave: 8 },
      { date: '2026-06-06', work: 26, rest: 132, leave: 0 },
    ];
    const state = createInstance({ month: '2026-06', days });
    assert.equal(state.cells.find((cell) => cell.date === '2026-06-01').data.work, 127);
    assert.equal(state.cells.find((cell) => cell.date === '2026-06-06').data.rest, 132);
    assert.equal(state.cells.find((cell) => cell.date === '2026-06-02').data, null);
    assert.equal(state.dayCount, 2);
  });

  await test('翻月与今天：发 change-month 事件且格式为 YYYY-MM', async () => {
    const state = createInstance({ month: '2026-01' });
    state.shiftMonth(-1);
    state.shiftMonth(1);
    state.goToday();
    const months = state.emits.filter((item) => item.name === 'change-month').map((item) => item.payload);
    assert.equal(months[0], '2025-12');
    assert.equal(months[1], '2026-02');
    assert.match(months[2], /^\d{4}-\d{2}$/);
  });

  await test('非法月份不渲染格子也不发翻月事件', async () => {
    const state = createInstance({ month: '' });
    assert.equal(state.cells.length, 0);
    state.shiftMonth(1);
    assert.equal(state.emits.length, 0);
  });

  console.log('\n排班日历：' + passed + ' passed, ' + failed + ' failed');
  process.exitCode = failed ? 1 : 0;
})();

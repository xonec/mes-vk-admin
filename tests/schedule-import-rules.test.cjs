const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');

/** 运行实际纯函数模块，保持项目无额外测试依赖。 */
function load(relative, imports = {}) {
  const original = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  const exported = [...original.matchAll(/export\s+(?:(?:async\s+)?function|const)\s+(\w+)/g)].map(item => item[1]);
  const source = original.replace(/^import .*?;$/gm, '').replace(/export\s+(?=(?:async\s+)?function|const)/g, '') + '\nresult = {' + exported.join(',') + '};';
  const context = { ...imports };
  vm.runInNewContext(source, context, { filename: relative });
  return context.result;
}
const shiftsModule = load('utils/shift-presets.js');
const sharedRules = load('utils/shared/schedule-batch.js');
const shifts = shiftsModule.SHIFT_PRESETS.map(row => ({ ...row, _id: 'shift:' + row.code }));
const rules = load('utils/schedule-import-rules.js', { ...shiftsModule, ...sharedRules });
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
function parse(note, column = 'middle') {
  const people = { early: [], middle: [], late: [], [column]: ['测试人员'] };
  const parsed = rules.scheduleNoteRules(note, people);
  const base = shiftsModule.applyShift({date:'2026-06-01',kind:'work'}, shiftsModule.matchShift(shifts,8,column));
  return { parsed, applied: rules.applyScheduleNote(base,'测试人员',column,parsed,shifts) };
}
test('6月原表的12；00-0：00识别为次日00:00且工时为12小时', () => {
  const {parsed,applied} = parse('测试人员（12；00-0：00）');
  assert.equal(parsed.issues.length,0);
  assert.equal(applied.record.startTime,'12:00');
  assert.equal(applied.record.endTime,'00:00');
  assert.equal(applied.record.endDayOffset,1);
  assert.equal(applied.record.plannedHours,12);
});
test('单数字8:00开始时间识别为08:00且保留12小时', () => {
  const {applied} = parse('测试人员(8:00-20:00)','early');
  assert.equal(applied.record.startTime,'08:00');
  assert.equal(applied.record.endTime,'20:00');
  assert.equal(applied.record.plannedHours,12);
});
test('0:00-8:00属于次日夜班且工时为8小时', () => {
  const {applied} = parse('测试人员(0:00-8:00)','late');
  assert.equal(applied.record.startTime,'00:00');
  assert.equal(applied.record.endTime,'08:00');
  assert.equal(applied.record.startDayOffset,1);
  assert.equal(applied.record.endDayOffset,1);
  assert.equal(applied.record.plannedHours,8);
});
test('24:00结束时间转为次日00:00', () => {
  const {applied} = parse('测试人员(16:00-24:00)');
  assert.equal(applied.record.endTime,'00:00');
  assert.equal(applied.record.endDayOffset,1);
  assert.equal(applied.record.plannedHours,8);
});
test('只有12:00上班时预设12:00–20:00', () => {
  const {applied} = parse('12:00上班','early');
  assert.equal(applied.record.startTime,'12:00');
  assert.equal(applied.record.endTime,'20:00');
  assert.equal(applied.record.plannedHours,8);
});
test('非法时间提示人工核对并保留有效默认班次', () => {
  const {parsed,applied} = parse('测试人员(25:00-8:00)');
  assert.ok(parsed.issues.length);
  assert.equal(applied.record.startTime,'16:00');
  assert.equal(applied.record.endTime,'00:00');
});
test('跨旧归属的本车间未列人员均补齐休息，其他车间不参与', () => {
  const source = [{previewId:'a',record:{date:'2026-06-27',personId:'p1',personName:'甲',kind:'work'}}];
  const people = [{_id:'p1',name:'甲',workshopId:'w1',teamId:'legacy1'}, {_id:'p2',name:'乙',workshopId:'w1',teamId:'legacy2'}, {_id:'p3',name:'丙',workshopId:'w2'}];
  const result = rules.completeScheduleRest(source,people,{replaceDay:true,workshopId:'w1'});
  assert.equal(result.length,2);
  assert.equal(result[1].record.personId,'p2');
  assert.equal(result[1].record.kind,'rest');
});
console.log(JSON.stringify({passed,failed:0}));

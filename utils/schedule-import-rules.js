import { matchShift, applyShift } from '@/utils/shift-presets.js';
import { scheduleBatchIsValid } from './shared/schedule-batch.js';

/** 导入规则版本；写入排班记录的 importSource.ruleVersion，改动规则时递增。 */
export const SCHEDULE_RULE_VERSION = '2026-10-14.1';
const PEOPLE_SEPARATOR = /[,，、;；\n]+/;
const SLOT_NAMES = { early: '早班', middle: '中班', late: '晚班' };
const minutes = value => { const [hour, minute] = value.split(':'); return Number(hour) * 60 + Number(minute); };
const clock = value => String(Math.floor(value / 60) % 24).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
const personKey = row => row.personId || 'name:' + row.personName;
const periodKey = row => [row.shiftId, row.startDayOffset, row.startTime, row.endDayOffset, row.endTime].join('|');

/** 人员栏只按明确分隔符拆分；备注中的姓名不用于自动建档。 */
export function schedulePeople(value) { return String(value || '').split(PEOPLE_SEPARATOR).map(name => name.trim()).filter(Boolean); }
/** 保留带连字符的原始批次及 A/B 后缀，关联订单时另作精确匹配。 */
export function scheduleBatches(value) {
  const values = [...new Set(String(value || '').split(/[,，、;；\s]+/).filter(Boolean))];
  if (values.some(item => !scheduleBatchIsValid(item))) throw new Error('批次格式不完整，请核对原表；可包含字母、数字及连字符');
  return values;
}
/** 将生产日的时间转为当天／次日；24:00 只可作为结束时刻。 */
function explicitPeriod(start, end) {
  const valid = value => /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(value) || value === '24:00';
  if (!valid(start) || !valid(end) || start === '24:00') throw new Error('备注时间无效，请核对');
  const startMinute = minutes(start), endMinute = minutes(end);
  const startAbsolute = startMinute + (startMinute < 480 ? 1440 : 0);
  let endAbsolute = endMinute === 1440 ? 1440 : Math.floor(startAbsolute / 1440) * 1440 + endMinute;
  if (endAbsolute <= startAbsolute) endAbsolute += 1440;
  if (endAbsolute > 2879 || endAbsolute - startAbsolute > 1440) throw new Error('备注时间超出当天／次日，请核对');
  return { startTime: clock(startAbsolute), endTime: clock(endAbsolute), startDayOffset: Math.floor(startAbsolute / 1440), endDayOffset: Math.floor(endAbsolute / 1440) };
}
/** 将实际时间挂到相应班次；4小时、12点上班等仍冻结实际起止时间。 */
function timeShift(period, column, shifts) {
  const duration = period.endDayOffset * 1440 + minutes(period.endTime) - period.startDayOffset * 1440 - minutes(period.startTime);
  const standard12 = duration === 720 && ['08:00', '20:00'].includes(period.startTime);
  const slot = standard12 ? period.startTime === '08:00' ? 'early' : 'late' : period.startDayOffset === 1 || period.startTime >= '20:00' ? 'late' : column === 'late' ? 'middle' : column;
  return { ...period, shiftId: matchShift(shifts, standard12 ? 12 : 8, slot)._id, plannedHours: duration / 60 };
}
/** 解析整行班制、指定人员时间和仅上班时间；不从工作说明推算下班时间。 */
export function scheduleNoteRules(note, peopleByColumn) {
  const normalized = String(note || '').replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/(\d)\s*[：;；]\s*(?=\d{2})/g, '$1:');
  const rules = [], issues = [];
  const allPeople = Object.values(peopleByColumn).flat();
  const rowHours = /(?:^|\n)\s*12\s*(?:h|小时)\s*(?=\n|$)/i.test(normalized) ? 12 : null;
  const targets = prefix => {
    const value = prefix.trim();
    if (!value) return { names: allPeople, priority: 2 };
    const slot = Object.keys(SLOT_NAMES).find(key => [SLOT_NAMES[key], key === 'late' ? '夜班' : ''].filter(Boolean).includes(value));
    if (slot) return { names: peopleByColumn[slot], priority: 2 };
    const names = schedulePeople(value), unknown = names.filter(name => !allPeople.includes(name));
    if (unknown.length) issues.push('备注姓名未在本行人员栏：' + unknown.join('、') + '，请核对是否为错字或漏排');
    return { names: names.filter(name => allPeople.includes(name)), priority: 3 };
  };
  for (const line of normalized.split('\n').map(value => value.trim()).filter(Boolean)) {
    const range = line.match(/^([^()]*)\(\s*(\d{1,2}:\d{2})\s*[-—~～至]\s*(\d{1,2}:\d{2})\s*\)\s*$/);
    const begin = line.match(/^(.*?)\s*(\d{1,2}:\d{2})\s*上班\s*$/);
    if (range || begin) {
      const selected = targets((range || begin)[1]);
      try {
        let period;
        if (range) period = explicitPeriod(range[2], range[3]);
        else {
          if (!/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(begin[2])) throw new Error('上班时间无效');
          const end = (minutes(begin[2]) + 480) % 1440;
          period = explicitPeriod(begin[2], clock(end));
        }
        rules.push({ ...selected, period, label: begin ? '仅写上班时间，预设8小时' : '备注明确起止时间' });
      } catch (error) { issues.push(error.message); }
    } else if (/\d{1,2}:\d{2}|上班|结束后下班/.test(line)) issues.push('时间说明需人工核对：' + line);
  }
  return { rowHours, rules, issues };
}
/** 指定人员规则优先于整行班制；不同明确时间不静默覆盖。 */
export function applyScheduleNote(record, personName, column, rules, shifts) {
  const matches = rules.rules.filter(rule => rule.names.includes(personName));
  const priority = Math.max(0, ...matches.map(rule => rule.priority));
  const selected = matches.filter(rule => rule.priority === priority);
  if (!selected.length) return { record, timePriority: 1, timeRule: rules.rowHours ? '整行12小时' : '默认班次', conflict: '' };
  const keys = new Set(selected.map(rule => JSON.stringify(rule.period)));
  return { record: { ...record, ...timeShift(selected[0].period, column, shifts) }, timePriority: priority, timeRule: selected[0].label, conflict: keys.size > 1 ? '同一人员的备注时间不一致，请指定共用时间' : '' };
}
/** 同人同班多工序共用时间；明确个人时间优先，否则8与12小时并存取12小时。 */
export function harmonizeSchedulePeople(previews) {
  const rows = previews.map(row => ({ ...row, record: row.record ? { ...row.record } : null, mergeError: '' }));
  const groups = new Map();
  rows.filter(row => !row.excluded && !row.error && row.record && row.record.kind === 'work').forEach(row => {
    const key = JSON.stringify([row.record.date, personKey(row.record), row.shiftColumn || row.record.shiftId]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  for (const group of groups.values()) {
    const priority = Math.max(...group.map(row => Number(row.timePriority) || 1));
    const candidates = group.filter(row => (Number(row.timePriority) || 1) === priority);
    let chosen = candidates[0];
    if (priority === 1) chosen = candidates.find(row => row.record.startTime === '08:00' && row.record.endTime === '20:00') || candidates.find(row => row.record.startTime === '20:00' && row.record.endTime === '08:00') || chosen;
    const different = candidates.filter(row => periodKey(row.record) !== periodKey(chosen.record));
    const standardMixed = priority === 1 && candidates.some(row => ['08:00|20:00','20:00|08:00'].includes(row.record.startTime + '|' + row.record.endTime)) && candidates.every(row => ['08:00|16:00','08:00|20:00','16:00|00:00','00:00|08:00','20:00|08:00'].includes(row.record.startTime + '|' + row.record.endTime));
    if (different.length && !standardMixed) { group.forEach(row => { row.mergeError = '同人同班存在不同明确时间，请编辑其中一条，统一共用时间'; }); continue; }
    const { shiftId, startTime, endTime, startDayOffset, endDayOffset } = chosen.record;
    group.forEach(row => {
      row.record = { ...row.record, shiftId, startTime, endTime, startDayOffset, endDayOffset };
      row.timeRule = group.length > 1 ? '多工序共用时间 · ' + String(chosen.timeRule || '').replace(/^多工序共用时间 · /, '') : row.timeRule;
      if (row.record.importSource) row.record.importSource = { ...row.record.importSource, appliedTimeRule: row.timeRule };
    });
  }
  return rows;
}
/** 完整日表为范围内未列出人员生成显式休息，未上传日期不生成记录。 */
export function completeScheduleRest(previews, personnel, scope) {
  if (!scope.replaceDay) return previews;
  const dates = [...new Set(previews.filter(row => row.record).map(row => row.record.date))].sort();
  const people = new Map(personnel.filter(row => row.enabled !== false && row.workshopId === scope.workshopId).map(row => [row._id, row]));
  previews.filter(row => row.record && !row.error).forEach(row => { const record = row.record; const key = personKey(record); if (!people.has(key)) people.set(key, { _id: record.personId, name: record.personName }); });
  const generated = [];
  for (const date of dates) {
    const day = previews.filter(row => row.record && row.record.date === date);
    const presentIds = new Set(day.map(row => row.record.personId).filter(Boolean));
    const presentNames = new Set(day.filter(row => !row.record.personId).map(row => row.record.personName));
    for (const [key, person] of people) {
      if (person._id && presentIds.has(person._id) || presentNames.has(person.name) || day.some(row => personKey(row.record) === key)) continue;
      generated.push({ previewId: 'rest:' + date + ':' + key, sourceFile: '完整日表自动补齐', sourceSheet: '', line: '', personName: person.name, generated: true, excluded: false, error: '', timeReviewed: true, timeRule: '当天未列出，默认休息', record: { date, personId: person._id || '', personName: person.name, shiftId: '', processId: '', kind: 'rest', absenceType: 'rest', batchNos: [], post: '', startTime: '00:00', endTime: '00:00', startDayOffset: 0, endDayOffset: 1, enabled: true, note: '完整日表未列出，默认休息', changeReason: '完整日表自动补齐休息', importSource: { ruleVersion: SCHEDULE_RULE_VERSION, generated: true, date, sources: [...new Set(day.map(row => row.sourceFile))], fileHashes: [...new Set(day.map(row => row.record.importSource && row.record.importSource.fileHash).filter(Boolean))] } } });
    }
  }
  return [...previews, ...generated];
}
/** 按日期、人员、班次汇总预览；多工序工时只展示一次。 */
export function summarizeSchedulePeople(previews) {
  const groups = new Map();
  previews.forEach(row => {
    const record = row.record;
    const key = record ? JSON.stringify([record.date, personKey(record), record.kind === 'work' ? record.shiftId : 'absence']) : row.previewId;
    if (!groups.has(key)) groups.set(key, { id: key, date: record ? record.date : row.originalDate, personName: record ? record.personName : row.personName, record, rows: [], processNames: [], hours: 0 });
    const group = groups.get(key); group.rows.push(row);
    if (record && record.kind === 'work') {
      if (row.processName && !group.processNames.includes(row.processName)) group.processNames.push(row.processName);
      group.hours = (Number(record.endDayOffset) * 1440 + minutes(record.endTime) - Number(record.startDayOffset) * 1440 - minutes(record.startTime)) / 60;
    }
  });
  return [...groups.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.personName).localeCompare(String(b.personName), 'zh-CN'));
}

/** 比较预览与旧排班业务字段，按日期展示新增、修改、保留及移除的明细。 */
export function scheduleDifferences(previews, scopes) {
  const rows = previews.filter(row => !row.excluded && !row.error && row.record);
  const byKey = row => JSON.stringify([row.date, row.personId || row.personName, row.shiftId || '', row.processId || '', row.kind || 'work']);
  const business = row => JSON.stringify([row.absenceType || (row.kind === 'rest' ? 'rest' : ''), row.startTime, row.endTime, Number(row.startDayOffset) || 0, row.endDayOffset == null ? (row.endTime <= row.startTime ? 1 : 0) : Number(row.endDayOffset), [...(row.batchNos || [])].sort(), row.note || '', row.post || '']);
  const oldRows = scopes.flatMap(scope => scope.rows), oldByKey = new Map(oldRows.map(row => [byKey(row), row]));
  const seen = new Set(), details = [];
  for (const row of rows) {
    const record = row.record, key = byKey(record), old = oldByKey.get(key);
    seen.add(key);
    details.push({ id: row.previewId, date: record.date, personName: record.personName, processName: row.processName || '', action: old ? business(old) === business(record) ? '保留' : '修改' : '新增', before: old || null, after: record, generated: !!row.generated });
  }
  oldRows.filter(row => !seen.has(byKey(row))).forEach(row => details.push({ id: 'remove:' + row.id, date: row.date, personName: row.personName, processName: row.processName, action: '移除', before: row, after: null }));
  return details.sort((a, b) => a.date.localeCompare(b.date) || a.personName.localeCompare(b.personName, 'zh-CN'));
}

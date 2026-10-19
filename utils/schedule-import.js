import { matchShift, applyShift } from '@/utils/shift-presets.js';
import XLSX from '@/libs/xlsx.full.min.js';
import { hashImageData } from '@/utils/ocr-image-hash.js';
import { SCHEDULE_RULE_VERSION, schedulePeople, scheduleBatches, scheduleNoteRules, applyScheduleNote, harmonizeSchedulePeople } from '@/utils/schedule-import-rules.js';

/** 从本地文件读取排班表，不上传原始 Excel；保留格式化后的编码与日期文字。 */
export async function readScheduleFile(file) {
  if (!file) throw new Error('请选择 Excel 文件');
  const raw = file.file || file;
  if (Number(raw.size || file.size) > 5 * 1024 * 1024) throw new Error('排班文件请控制在 5MB 内');
  let data;
  if (typeof raw.arrayBuffer === 'function') data = await raw.arrayBuffer();
  else {
    // #ifdef H5
    if (typeof Blob !== 'undefined' && raw instanceof Blob) {
      data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('文件读取失败')); reader.readAsArrayBuffer(raw); });
    }
    // #endif
    if (!data) throw new Error('请在电脑浏览器后台选择本地 Excel 文件');
  }
  const bytes = new Uint8Array(data), parts = [];
  for (let offset = 0; offset < bytes.length; offset += 32768) parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)));
  const fileHash = (await hashImageData('data:application/octet-stream;base64,' + btoa(parts.join('')))).hash;
  const workbook = XLSX.read(data, { type: 'array', cellDates: false });
  const sheets = workbook.SheetNames.map(name => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, range: 0, raw: false, defval: '', blankrows: true });
    const header = rows[0] || [];
    const wide = ['工序名称', '早班', '中班', '晚班', '排班日期'].every(label => header.includes(label));
    const mapping = wide ? { mode: 'wide', startRow: 1, processId: header.indexOf('工序名称'), batchNos: header.indexOf('批次'), early: header.indexOf('早班'), middle: header.indexOf('中班'), late: header.indexOf('晚班'), note: header.indexOf('备注'), date: header.indexOf('排班日期') } : null;
    return { name, rows, wide, mapping };
  });
  if (!sheets.some(sheet => sheet.rows.length)) throw new Error('表格没有可导入的内容');
  return { sheets, fileHash };
}

/** 逐表合并预览并保留来源；让出页面线程以便显示处理进度。 */
export async function previewScheduleBatch(sheets, scope, catalogs) {
  const selected = sheets.filter(sheet => sheet.selected);
  if (!selected.length) throw new Error('请至少勾选一个工作表');
  const previews = [];
  for (const sheet of selected) {
    await new Promise(resolve => setTimeout(resolve, 0));
    const mapping = sheet.config;
    const required = mapping.mode === 'wide' ? ['date', 'processId', 'early', 'middle', 'late'] : ['date', 'shiftId', 'processId', 'personId'];
    const source = sheet.fileName + ' / ' + sheet.name;
    if (required.some(key => mapping[key] === '' || mapping[key] == null || Number(mapping[key]) < 0)) throw new Error(source + '：请选择日期、班次、工序和人员对应的列');
    if (!Number.isInteger(Number(mapping.startLine)) || Number(mapping.startLine) < 1) throw new Error(source + '：第一条数据所在行须为正整数');
    let data;
    try { data = previewScheduleRows(sheet.rows, { ...mapping, ...scope, startRow: Number(mapping.startLine) - 1 }, catalogs); }
    catch (error) { throw new Error(source + '：' + error.message); }
    data.rows.forEach((row, index) => {
      const date = row.record ? row.record.date : row.originalDate;
      if (scope.dayFileChoice && scope.dayFileChoice[date] && scope.dayFileChoice[date] !== sheet.fileId) return;
      const filenameDate = (sheet.fileName.match(/\d{4}-\d{2}-\d{2}/) || [])[0];
      if (filenameDate && date && filenameDate !== date) { row.needsTimeReview = true; row.timeReviewed = false; row.reviewReason = '表内日期与文件名日期不一致，请核对'; }
      if (row.record) row.record.importSource = { ruleVersion: SCHEDULE_RULE_VERSION, fileHash: sheet.fileHash, fileName: sheet.fileName, sheetName: sheet.name, line: row.line, column: row.shiftColumn || '', rawDate: row.originalDate || date, rawPerson: row.personName, rawProcess: row.processName || '', rawBatchText: row.rawBatchText || '', rawNote: row.sourceNote || '', appliedTimeRule: row.timeRule || '逐行时间' };
      previews.push({ ...row, previewId: sheet.id + ':' + index, sourceFile: sheet.fileName, sourceSheet: sheet.name, excluded: false });
    });
  }
  if (!previews.length) throw new Error('勾选的工作表没有可导入排班，请检查起始行和人员列');
  return previews;
}

/** 检查整批重复及跨日时间冲突；同班同时间参与不同工序允许并存，与服务端规则一致。 */
export function checkScheduleBatch(previews) {
  const rows = harmonizeSchedulePeople(previews).map(row => ({ ...row, batchError: row.mergeError || '' }));
  const period = record => {
    const base = Date.parse(record.date + 'T00:00:00Z') / 60000;
    const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    const startOffset = Number(record.startDayOffset) || 0;
    const endOffset = record.endDayOffset == null ? startOffset + (record.endTime <= record.startTime ? 1 : 0) : Number(record.endDayOffset);
    return { start: base + startOffset * 1440 + minutes(record.startTime), end: base + endOffset * 1440 + minutes(record.endTime) };
  };
  const source = row => row.sourceFile + ' / ' + row.sourceSheet + ' 第 ' + row.line + ' 行';
  const mark = (left, right, message) => {
    if (!left.batchError) left.batchError = message + source(right);
    if (!right.batchError) right.batchError = message + source(left);
  };
  const people = new Map();
  rows.filter(row => !row.excluded && !row.error && !row.mergeError && row.record).forEach(row => {
    const key = row.record.personId || 'name:' + row.record.personName;
    if (!people.has(key)) people.set(key, []);
    people.get(key).push({ row, ...period(row.record) });
  });
  for (const entries of people.values()) {
    const seen = new Map(), dayStates = new Map(); let active = [];
    for (const entry of entries) { const key = entry.row.record.date; if (!dayStates.has(key)) dayStates.set(key, new Map()); dayStates.get(key).set(entry.row.record.kind, entry.row); }
    entries.sort((a, b) => a.start - b.start || a.end - b.end);
    for (const entry of entries) {
      const a = entry.row.record;
      const key = JSON.stringify([a.date, a.shiftId, a.processId, a.kind]);
      if (seen.has(key)) mark(entry.row, seen.get(key), '同日同班同工序重复，请核对来源：');
      else seen.set(key, entry.row);
      const stateConflict = [...dayStates.get(a.date).entries()].find(([kind]) => kind !== a.kind);
      if (stateConflict) mark(entry.row, stateConflict[1], '同一天同时安排出勤与休息／请假，请核对：');
      if (a.kind !== 'work') continue;
      active = active.filter(other => other.end > entry.start);
      for (const other of active) {
        const b = other.row.record;
        const shared = a.kind === 'work' && b.kind === 'work' && a.shiftId === b.shiftId && entry.start === other.start && entry.end === other.end;
        if (entry.start < other.end && entry.end > other.start && !shared) mark(entry.row, other.row, '人员时间冲突，请修改或跳过：');
      }
      active.push(entry);
    }
  }
  return rows;
}

function cell(row, mapping, field) {
  const index = Number(mapping[field]);
  return mapping[field] === '' || mapping[field] == null || index < 0 ? '' : String(row[index] == null ? '' : row[index]).trim();
}
function matchReference(items, value, label) {
  const active = (items || []).filter(item => item.enabled !== false && (item._id === value || item.code === value || item.name === value));
  if (active.length !== 1) throw new Error(label + (active.length ? '重名，请填写唯一编码' : '未匹配启用资料：' + value));
  return active[0];
}
function importProcess(catalogs, value, mapping) {
  if ((mapping.processErrors || {})[value]) throw new Error(mapping.processErrors[value]);
  return matchReference(catalogs.processes.filter(item => item.workshopId === mapping.workshopId), (mapping.processMappings || {})[value] || value, '工序');
}
function importPerson(catalogs, value, mapping) {
  if (!value) throw new Error('人员姓名或工号不能为空');
  const workshopId = mapping.workshopId;
  if (!workshopId) throw new Error('请先选择导入车间');
  const matches = (catalogs.personnel || []).filter(item => item.workshopId === workshopId && (item._id === value || item.code === value || item.enterpriseEmployeeNo === value || item.name === value));
  if (matches.length === 1) { if (matches[0].enabled === false) throw new Error('此人员已停用，请先核对'); return matches[0]; }
  return { _id: '', name: value, workshopId, needsSelection: matches.length > 1 };
}
function dateText(value) {
  const matched = String(value).match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
  if (!matched) throw new Error('日期请使用 YYYY-MM-DD，例如 2026-10-06');
  const text = matched[1] + '-' + matched[2].padStart(2, '0') + '-' + matched[3].padStart(2, '0');
  const time = new Date(text + 'T12:00:00Z');
  if (Number.isNaN(time.getTime()) || time.toISOString().slice(0, 10) !== text) throw new Error('日期不存在');
  return text;
}

/** 依所选列生成逐行预览；同名人员由管理员选择唯一工号；缺少人员只在实际导入时建档。 */
export function previewScheduleRows(rows, mapping, catalogs) {
  if (mapping.mode === 'wide') return previewWideSchedules(rows, mapping, catalogs);
  const start = Number.isInteger(Number(mapping.startRow)) ? Math.max(0, Number(mapping.startRow)) : 1;
  const seen = new Set();
  const previews = rows.slice(start).map((row, offset) => {
    const line = start + offset + 1;
    if (row.every(value => String(value == null ? '' : value).trim() === '')) return null;
    try {
      const date = dateText(cell(row, mapping, 'date'));
      const shift = matchReference(catalogs.shifts, cell(row, mapping, 'shiftId') || cell(row, mapping, 'shift'), '班次');
      const process = importProcess(catalogs, cell(row, mapping, 'processId') || cell(row, mapping, 'process'), mapping);
      const person = importPerson(catalogs, cell(row, mapping, 'personId') || cell(row, mapping, 'person'), mapping);
      if (person.workshopId !== process.workshopId) throw new Error('人员与工序不属于同一车间');
      const batchText = cell(row, mapping, 'batchNos') || cell(row, mapping, 'batchNo');
      const batchNos = scheduleBatches(batchText);
      const post = cell(row, mapping, 'post');
      if (post && process.posts && process.posts.length && !process.posts.includes(post)) throw new Error('岗位未在该工序配置');
      const startTime = cell(row, mapping, 'startTime') || shift.startTime;
      const endTime = cell(row, mapping, 'endTime') || shift.endTime;
      if (![startTime, endTime].every(value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value))) throw new Error('时间须为 HH:mm 格式');
      if (startTime === endTime) throw new Error('开始与结束时间不能相同');
      const key = [date, shift._id, process._id, person._id || person.name].join('|');
      if (seen.has(key)) throw new Error('表格内日期、班次、工序、人员重复');
      seen.add(key);
      return { line, originalDate: cell(row, mapping, 'date'), processName: process.name, sourceNote: cell(row, mapping, 'note'), rawBatchText: batchText, timePriority: cell(row, mapping, 'startTime') || cell(row, mapping, 'endTime') ? 3 : 1, timeRule: '逐行时间', personName: person.name, requiresPersonSelection: !!person.needsSelection, record: { date, shiftId: shift._id, processId: process._id, personId: person._id, personName: person.name, post, batchNos, startTime, endTime, startDayOffset: Number(shift.startDayOffset) || 0, endDayOffset: shift.endDayOffset == null ? (endTime <= startTime ? 1 : 0) : Number(shift.endDayOffset), kind: 'work', note: cell(row, mapping, 'note'), enabled: true, changeReason: 'Excel 排班导入' }, error: '' };
    } catch (error) { return { line, personName: cell(row, mapping, 'personId') || cell(row, mapping, 'person'), shiftName: cell(row, mapping, 'shiftId'), processName: cell(row, mapping, 'processId'), originalDate: cell(row, mapping, 'date'), sourceNote: cell(row, mapping, 'note'), record: null, error: error.message }; }
  }).filter(Boolean);
  return { rows: previews, validCount: previews.filter(row => !row.error).length };
}

/** 现场横列表：解析整行班制、个人例外与非出勤状态，保留每条来源。 */
export function previewWideSchedules(rows, mapping, catalogs) {
  const start = Math.max(0, Number(mapping.startRow == null ? 1 : mapping.startRow));
  const previews = [];
  rows.slice(start).forEach((row, offset) => {
    const line = start + offset + 1, processText = cell(row, mapping, 'processId');
    const rest = ['休息', '请假'].includes(processText);
    const peopleByColumn = Object.fromEntries(['early', 'middle', 'late'].map(column => [column, schedulePeople(cell(row, mapping, column))]));
    const rules = scheduleNoteRules(cell(row, mapping, 'note'), peopleByColumn);
    let issueAttached = false;
    [['early', '早班'], ['middle', '中班'], ['late', '晚班']].forEach(([column, shiftLabel]) => {
      peopleByColumn[column].forEach(personText => {
        const source = { line, originalDate: cell(row, mapping, 'date'), shiftColumn: column, personName: personText, shiftName: shiftLabel, processName: processText, sourceNote: cell(row, mapping, 'note'), rawBatchText: cell(row, mapping, 'batchNos') };
        try {
          const date = dateText(source.originalDate);
          const person = importPerson(catalogs, personText, mapping);
          const process = rest ? null : importProcess(catalogs, processText, mapping);
          let record = { date, shiftId: '', processId: process ? process._id : '', personId: person._id, personName: person.name, post: '', batchNos: rest ? [] : scheduleBatches(source.rawBatchText || (processText.match(/^返工\s*([A-Za-z0-9-]+)$/) || [])[1] || ''), startTime: '00:00', endTime: '00:00', startDayOffset: 0, endDayOffset: 1, kind: rest ? 'rest' : 'work', absenceType: rest ? processText === '请假' ? 'leave' : 'rest' : '', note: source.sourceNote, enabled: true, changeReason: 'Excel 横列排班导入' };
          let parsed = { record, timePriority: 1, timeRule: processText, conflict: '' };
          if (!rest) {
            record = applyShift(record, matchShift(catalogs.shifts, rules.rowHours || Number(mapping.systemHours) || 8, column));
            parsed = applyScheduleNote(record, personText, column, rules, catalogs.shifts);
          }
          const reviewReason = !rest ? [parsed.conflict, !issueAttached ? rules.issues.join('；') : ''].filter(Boolean).join('；') : '';
          if (rules.issues.length && !rest) issueAttached = true;
          previews.push({ ...source, ...parsed, requiresPersonSelection: !!person.needsSelection, error: '', reviewReason, needsTimeReview: !!reviewReason, timeReviewed: !reviewReason });
        } catch (error) { previews.push({ ...source, record: null, error: error.message, needsTimeReview: false, timeReviewed: false }); }
      });
    });
  });
  return { rows: previews, validCount: previews.filter(row => !row.error).length };
}

/** 同日多文件先比较原始内容；相同内容自动选一份，不同版本必须明确选择。 */
export function scheduleDateSources(sheets, choices = {}) {
  const days = new Map();
  for (const sheet of sheets.filter(item => item.selected)) {
    const config = sheet.config;
    for (const row of sheet.rows.slice(Number(config.startLine) - 1)) {
      let date;
      try { date = dateText(cell(row, config, 'date')); } catch (_) { continue; }
      if (!days.has(date)) days.set(date, new Map());
      const files = days.get(date);
      if (!files.has(sheet.fileId)) files.set(sheet.fileId, { id: sheet.fileId, name: sheet.fileName, signatures: [] });
      files.get(sheet.fileId).signatures.push(JSON.stringify(row.map(value => String(value == null ? '' : value).trim())));
    }
  }
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, files]) => {
    const sources = [...files.values()];
    const identical = new Set(sources.map(source => JSON.stringify(source.signatures.sort()))).size === 1;
    const chosen = sources.some(source => source.id === choices[date]) ? choices[date] : sources.length === 1 || identical ? sources[0].id : '';
    return { date, sources, identical, chosen };
  });
}

import { hashImageData } from '@/utils/ocr-image-hash.js';
import { scheduleBatches } from '@/utils/schedule-import-rules.js';

/** 仅合并空白、全半角差异；不使用模糊匹配合并不同设备或产线。 */
export function processNameKey(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

/** 返工后直接跟完整批号时使用“返工”工序，原名称和批号仍保留在排班来源。 */
function processName(value) {
  const name = String(value || '').trim();
  const match = name.match(/^返工\s*([A-Za-z0-9-]+)$/);
  return match && scheduleBatches(match[1]).includes(match[1]) ? '返工' : name;
}

/** 读取真正参与本批导入的工序，不为未选日期或空人员行创建资料。 */
export function scheduleProcessNames(sheets, dayFileChoice = {}) {
  const names = new Set();
  for (const sheet of sheets.filter(item => item.selected)) {
    const mapping = sheet.config;
    for (const row of sheet.rows.slice(Math.max(0, Number(mapping.startLine) - 1))) {
      const personColumns = mapping.mode === 'wide' ? [mapping.early, mapping.middle, mapping.late] : [mapping.personId];
      if (!personColumns.some(index => index !== '' && index != null && String(row[Number(index)] || '').trim())) continue;
      const rawDate = String(row[Number(mapping.date)] || '').trim();
      const dateParts = rawDate.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
      const date = dateParts ? dateParts[1] + '-' + dateParts[2].padStart(2, '0') + '-' + dateParts[3].padStart(2, '0') : rawDate;
      if (dayFileChoice[date] && dayFileChoice[date] !== sheet.fileId) continue;
      const name = String(row[Number(mapping.processId)] || '').trim();
      if (name && !['休息', '请假'].includes(name)) names.add(name);
    }
  }
  return [...names];
}

/** 预览只准备稳定编码；点击导入时才通过现有基础资料接口保存新工序。 */
export async function resolveScheduleProcesses(sheets, settings, catalogs, overrides = {}) {
  const processes = (catalogs.processes || []).filter(item => !item.importPending);
  const mappings = Object.create(null), errors = Object.create(null), plans = [];
  const candidates = processes.filter(item => item.workshopId === settings.workshopId);
  for (const rawName of scheduleProcessNames(sheets, settings.dayFileChoice)) {
    const name = processName(rawName), key = processNameKey(name);
    const chosen = overrides[rawName];
    let matches = chosen ? candidates.filter(item => item._id === chosen) : candidates.filter(item => item._id === rawName || item.code === rawName || processNameKey(item.name) === key);
    if (chosen && (matches.length !== 1 || matches[0].enabled === false)) matches = [];
    let record, state = 'matched', message = '';
    if (chosen && !matches.length) message = '已保存的工序对应关系已失效，请在高级设置中调整';
    else if (matches.length > 1) message = '同一车间有多个同名工序，请在高级设置中选择一次';
    else if (matches.length && matches[0].enabled === false) message = '对应工序已停用，请启用该工序或在高级设置中调整';
    else if (matches.length) { record = matches[0]; state = record.importPending ? 'new' : 'matched'; }
    else if (name.length > 120) message = '工序名称超过 120 字，请缩短名称后重试';
    else {
      const binary = encodeURIComponent(JSON.stringify([settings.workshopId, key])).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      const { hash } = await hashImageData('data:application/octet-stream;base64,' + btoa(binary));
      const code = 'import-' + hash.slice(0, 32), id = 'ops:processes:' + code;
      const collision = processes.find(item => item._id === id);
      if (collision && (collision.workshopId !== settings.workshopId || collision.enabled === false || processNameKey(collision.name) !== key)) message = '自动工序编码已被其他资料占用，请在高级设置中调整';
      else {
        record = collision || { _id: id, code, name, workshopId: settings.workshopId, posts: [], enabled: true, importPending: true };
        if (!collision) { processes.push(record); candidates.push(record); }
        state = record.importPending ? 'new' : 'matched';
      }
    }
    if (message) errors[rawName] = message;
    else mappings[rawName] = record._id;
    plans.push({ rawName, name: record ? record.name : name, processId: record ? record._id : '', state: message ? 'error' : state, message });
  }
  return { catalogs: { ...catalogs, processes }, mappings, errors, plans };
}

/** 将排班汇总成与原表相同的工序 × 早中晚班视图。 */
export function scheduleGrid(records, shifts = []) {
  const groups = new Map();
  const ordered = [...records].sort((left, right) => {
    const a = left.record || left, b = right.record || right;
    const sourceLine = (item, record) => Number(item.line || record.importSource && record.importSource.line) || Number.MAX_SAFE_INTEGER;
    return Number(a.kind === 'rest') - Number(b.kind === 'rest') || sourceLine(left, a) - sourceLine(right, b);
  });
  for (const item of ordered) {
    const record = item.record || item;
    if (!record) continue;
    const key = record.kind === 'rest' ? 'absence:' + (record.absenceType || 'rest') : record.processId || item.processName;
    if (!groups.has(key)) groups.set(key, { id: key, processName: record.kind === 'rest' ? record.absenceType === 'leave' ? '请假' : '休息' : record.processName || item.processName || '未匹配工序', batches: new Set(), slots: { early: [], middle: [], late: [] }, notes: new Set() });
    const group = groups.get(key), shift = shifts.find(row => row._id === record.shiftId);
    const slot = record.kind === 'rest' ? 'early' : item.shiftColumn || (shift && shift.shiftSlot === 'night' ? 'late' : shift && shift.shiftSlot) || (record.startTime >= '08:00' && record.startTime < '16:00' ? 'early' : record.startTime >= '16:00' ? 'middle' : 'late');
    group.slots[slot in group.slots ? slot : 'early'].push({ id: item.previewId || record._id, name: record.personName || item.personName || '—', record, source: item });
    (record.batchNos || []).forEach(batch => group.batches.add(batch));
    const note = record.note || item.sourceNote;
    if (note && !item.generated && !(record.importSource && record.importSource.generated)) group.notes.add(note);
  }
  return [...groups.values()].map(group => ({ ...group, batches: [...group.batches], notes: [...group.notes] }));
}

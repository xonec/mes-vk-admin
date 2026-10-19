/** 生产日 D 的标准班次：八小时夜班从 D+1 零点开始（与旧后台一致）。 */
export const SHIFT_PRESETS = [
  { code: 'E8', name: '早班（8小时）', systemHours: 8, shiftSlot: 'early', startTime: '08:00', endTime: '16:00', startDayOffset: 0, endDayOffset: 0 },
  { code: 'M8', name: '中班（8小时）', systemHours: 8, shiftSlot: 'middle', startTime: '16:00', endTime: '00:00', startDayOffset: 0, endDayOffset: 1 },
  { code: 'N8', name: '夜班（8小时）', systemHours: 8, shiftSlot: 'night', startTime: '00:00', endTime: '08:00', startDayOffset: 1, endDayOffset: 1 },
  { code: 'E12', name: '早班（12小时）', systemHours: 12, shiftSlot: 'early', startTime: '08:00', endTime: '20:00', startDayOffset: 0, endDayOffset: 0 },
  { code: 'N12', name: '中／夜班（12小时）', systemHours: 12, shiftSlot: 'night', startTime: '20:00', endTime: '08:00', startDayOffset: 0, endDayOffset: 1 },
];

export const DAY_OPTIONS = [{ value: 0, text: '当天' }, { value: 1, text: '次日' }];

/** 显示排班相对日期，兼容旧记录。 */
export function shiftTimeLabel(row) {
  if (!row || !row.startTime || !row.endTime) return '—';
  const start = Number(row.startDayOffset) || 0;
  const end = row.endDayOffset == null ? start + (row.endTime <= row.startTime ? 1 : 0) : Number(row.endDayOffset);
  return (start ? '次日 ' : '当天 ') + row.startTime + ' — ' + (end ? '次日 ' : '当天 ') + row.endTime;
}

/** 导入按班制和班别精确匹配，避免两个早班同名造成误配。 */
export function matchShift(shifts, hours, column) {
  const systemHours = Number(hours) || 8;
  const shiftSlot = column === 'early' ? 'early' : systemHours === 12 || column === 'late' ? 'night' : 'middle';
  const matches = (shifts || []).filter(row => row.enabled !== false && Number(row.systemHours) === systemHours && row.shiftSlot === shiftSlot);
  if (matches.length !== 1) throw new Error('请在基础资料建立唯一启用的 ' + systemHours + ' 小时' + ({ early: '早班', middle: '中班', night: '夜班' })[shiftSlot] + '，并设置班制和班别');
  return matches[0];
}
/** 应用班次并冻结实际时间、相对日期；保留人员的原表备注。 */
export function applyShift(record, shift) {
  return { ...record, shiftId: shift._id, startTime: shift.startTime, endTime: shift.endTime, startDayOffset: Number(shift.startDayOffset) || 0, endDayOffset: shift.endDayOffset == null ? (shift.endTime <= shift.startTime ? 1 : 0) : Number(shift.endDayOffset) };
}

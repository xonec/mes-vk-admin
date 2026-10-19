import { readWorkbookRows } from '@/utils/excel-read.js';

/** 只提取建号所需列（工号/姓名/身份证/可选登录账号）；其他字段和原始 Excel 不会发往云端。 */
const ACCOUNT_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;

/** 本地预检与服务端均校验 18 位居民身份证，不回显错误号码。 */
function validIdentity(value) {
  if (!/^\d{17}[\dX]$/.test(value)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(value[index]) * weight, 0);
  if ('10X98765432'[sum % 11] !== value[17]) return false;
  const birthday = value.slice(6, 10) + '-' + value.slice(10, 12) + '-' + value.slice(12, 14);
  const date = new Date(birthday + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === birthday;
}

/** 解析员工 Excel：表头需含工号、姓名、身份证号（可选登录账号）。 */
export async function readEmployeeAccounts(file) {
  const sheets = await readWorkbookRows(file);
  const rows = [];
  for (const sheet of sheets) {
    const headerIndex = sheet.rows.slice(0, 10).findIndex((row) => row.includes('工号') && row.includes('姓名') && (row.includes('身份证号') || row.includes('身份证')));
    if (headerIndex < 0) continue;
    const header = sheet.rows[headerIndex];
    const accountColumn = ['登录账号', '账号', 'username'].map((label) => header.indexOf(label)).find((index) => index >= 0);
    const columns = {
      employeeNo: header.indexOf('工号'),
      name: header.indexOf('姓名'),
      idCard: header.includes('身份证号') ? header.indexOf('身份证号') : header.indexOf('身份证'),
      ...(accountColumn >= 0 ? { account: accountColumn } : {}),
    };
    sheet.rows.slice(headerIndex + 1).forEach((source, offset) => {
      const record = Object.fromEntries(Object.entries(columns).map(([key, index]) => [key, String(source[index] || '').trim()]));
      if (!Object.values(record).some(Boolean)) return;
      record.idCard = record.idCard.toUpperCase();
      record.account = String(record.account || '').trim();
      const errors = [];
      if (!/^\d{6,20}$/.test(record.employeeNo)) errors.push('工号须为6～20位数字');
      if (record.account && !ACCOUNT_PATTERN.test(record.account)) errors.push('登录账号须为4～32位字母、数字、下划线或短横线');
      if (!record.name || record.name.length > 60) errors.push('请核对姓名');
      if (!validIdentity(record.idCard)) errors.push('身份证格式、日期或校验位不正确');
      rows.push({ ...record, sourceSheet: sheet.name, line: headerIndex + offset + 2, state: errors.length ? 'invalid' : 'pending', message: errors.join('；') });
    });
  }
  if (!rows.length) throw new Error('未找到人员，请检查表头是否包含工号、姓名、身份证号（可选列：登录账号）');
  for (const key of ['employeeNo', 'idCard', 'account']) {
    const groups = new Map();
    rows.forEach((row) => { if (row[key]) { const group = groups.get(row[key]) || []; group.push(row); groups.set(row[key], group); } });
    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      group.forEach((row) => {
        row.state = 'invalid';
        row.message += (row.message ? '；' : '') + (key === 'employeeNo' ? '工号重复' : key === 'account' ? '登录账号重复' : '身份证重复') + '，请核对来源行';
      });
    }
  }
  return rows;
}

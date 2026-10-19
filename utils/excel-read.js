import XLSX from '@/libs/xlsx.full.min.js';

/**
 * 读取本地 Excel 的全部工作表行（二维数组），用于后台批量导入。
 * 只解析，不校验业务规则；原始文件不上传云端。
 */
export async function readWorkbookRows(file) {
  if (!file) throw new Error('请选择 Excel 文件');
  const raw = file.file || file;
  if (Number(raw.size || file.size) > 5 * 1024 * 1024) throw new Error('文件请控制在 5MB 内');
  let data;
  if (typeof raw.arrayBuffer === 'function') data = await raw.arrayBuffer();
  else {
    // #ifdef H5
    if (typeof Blob !== 'undefined' && raw instanceof Blob) {
      data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsArrayBuffer(raw);
      });
    }
    // #endif
    if (!data) throw new Error('请在电脑浏览器后台选择本地 Excel 文件');
  }
  const workbook = XLSX.read(data, { type: 'array', cellDates: false });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, range: 0, raw: false, defval: '', blankrows: true }),
  }));
}

/**
 * 排班导入会话与分批状态机（纯函数 + 可注入传输层，不依赖 uni / 页面）。
 *
 * 设计目标：
 * 1. requestId / sessionId 一次导入固定，重试用同一个 → 服务端按幂等处理，不会重复写。
 * 2. preparedChunks / writtenChunks / finishedPages 按 offset / 日期分页记录，重试跳过已完成。
 * 3. 失败语义：409（版本冲突）不自动重试；网络类失败自动重试 1 次；部分行失败停止后续批次但保留结果。
 * 4. 页面只负责把 callOperations 包成 transport，测试用 mock transport 验证断点续传、409、
 *    部分失败、响应丢失四种情况。
 */

/** 服务端单次 prepare/import 上限 200 行。 */
export const IMPORT_CHUNK_SIZE = 200;
/** finish 接口每页最多 20 条旧排班快照。 */
export const FINISH_PAGE_SIZE = 20;

/** 一次导入内容的指纹；行内容、车间、完整日表开关任一变化都要重新生成预览和会话。 */
export function importFingerprint(payload) {
  return JSON.stringify(payload === undefined ? null : payload);
}

/** 一次导入固定 requestId/sessionId；重试沿用，服务端据此幂等。 */
export function createImportSession(fingerprint, options = {}) {
  const now = typeof options.now === 'function' ? options.now() : Date.now();
  const random = typeof options.random === 'function' ? options.random() : Math.random();
  return {
    fingerprint,
    requestId: 'admin-' + now.toString(36) + '-' + random.toString(36).slice(2, 12),
    preparedChunks: {},
    writtenChunks: {},
    failedChunks: {},
    finishedPages: {},
    results: {},
    created: 0,
    createdPeople: [],
    removed: 0,
  };
}

/** 按分片大小切出所有 offset。 */
export function chunkOffsets(total, size = IMPORT_CHUNK_SIZE) {
  const count = Math.max(0, Number(total) || 0);
  const offsets = [];
  for (let offset = 0; offset < count; offset += size) offsets.push(offset);
  return offsets;
}

/** 尚未完成的 offset（doneMap 里无对应标记）。 */
export function pendingOffsets(doneMap, total, size = IMPORT_CHUNK_SIZE) {
  const done = doneMap || {};
  return chunkOffsets(total, size).filter((offset) => !done[offset]);
}

/** 汇总准备结果；缺片时给出可续传的错误，而不是静默截断。 */
export function preparedRows(session, total, size = IMPORT_CHUNK_SIZE) {
  if (!session) throw new Error('导入会话不存在，请重新生成预览');
  const rows = [];
  for (const offset of chunkOffsets(total, size)) {
    const chunk = session.preparedChunks[offset];
    if (!Array.isArray(chunk)) throw new Error('人员准备未完成，请点击「继续导入」从断点续传');
    rows.push(...chunk);
  }
  return rows;
}

/** 进度：已完成的批次 / 总批次。 */
export function progressOf(doneMap, total, size = IMPORT_CHUNK_SIZE) {
  const offsets = chunkOffsets(total, size);
  const done = offsets.filter((offset) => !!(doneMap || {})[offset]).length;
  return { done, total: offsets.length, percent: offsets.length ? Math.round((done / offsets.length) * 100) : 0 };
}

/** 导入结果统计（成功/失败条数，供进度条与提示使用）。 */
export function importStats(session) {
  const results = Object.values((session && session.results) || {});
  return {
    processed: results.length,
    success: results.filter((item) => item && item.ok === true).length,
    failure: results.filter((item) => item && item.ok === false).length,
  };
}

/** 收尾计划：完整日表在全部写入成功后，逐日停用未保留的旧排班，按 20 条/页切分。 */
export function finishPlan(scopes, keepIds, size = FINISH_PAGE_SIZE) {
  const keep = keepIds instanceof Set ? keepIds : new Set(keepIds || []);
  const tasks = [];
  for (const scope of scopes || []) {
    const rows = (scope.rows || []).filter((row) => !keep.has(row.id));
    for (let offset = 0; offset < rows.length; offset += size) {
      tasks.push({ key: scope.date + ':' + offset, date: scope.date, offset, rows: rows.slice(offset, offset + size) });
    }
  }
  return tasks;
}

/** 收尾计划里尚未完成的分页。 */
export function pendingFinishTasks(session, tasks) {
  const done = (session && session.finishedPages) || {};
  return (tasks || []).filter((task) => !done[task.key]);
}

/**
 * 校验并记录单批写入结果。
 * @return {Boolean} 该批是否全部成功
 */
export function recordWriteResults(session, chunk, previewIds, results) {
  if (!Array.isArray(results) || results.length !== chunk.length) throw new Error('导入结果不完整，已暂停后续处理，请按原内容重试');
  const seen = new Set();
  results.forEach((result) => {
    if (!result || typeof result.ok !== 'boolean') throw new Error('导入结果状态不正确，已暂停收尾');
    const index = Number(result.row) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= chunk.length || seen.has(index)) throw new Error('导入结果行号或状态不正确，已暂停收尾');
    seen.add(index);
    session.results[previewIds[index]] = result;
  });
  if (seen.size !== chunk.length) throw new Error('导入结果缺少部分行，旧排班保持原状，请按原内容重试');
  return results.every((result) => result.ok === true);
}

/** 包装一次传输调用：409 与部分失败不重试，其它异常最多自动重试 retry 次。 */
async function invokeWithRetry(transportCall, { retry, wait, label }) {
  let attempts = 0;
  for (;;) {
    try {
      return await transportCall();
    } catch (error) {
      if (error && (error.code === 409 || error.partial)) throw error;
      if (attempts >= retry) throw error;
      attempts += 1;
      await wait(attempts, label);
    }
  }
}

/**
 * 执行一次导入（可重复调用，自动从断点续传）。
 *
 * @param {Object} options
 * @param {Object} options.session   createImportSession 的返回值（页面持有）
 * @param {Array}  options.rows      选中的预览行对应的排班记录（与 previewIds 等长）
 * @param {Array}  options.previewIds 选中预览行的 previewId（与 rows 等长）
 * @param {String} options.workshopId
 * @param {Boolean} options.replaceDay 是否按完整日表更新
 * @param {Array}  options.snapshots 替换前的旧排班快照 [{ date, rows }]
 * @param {Array}  options.scopes    收尾用的逐日旧排班快照 [{ date, rows }]
 * @param {Object} options.transport { prepare, write, finish } 传输层
 * @param {Function} options.onStage 阶段回调 (stage) → preparing | writing | finishing | done | paused
 * @param {Function} options.onNotice 进度回调 ({ stage, offset, total, ... })
 * @param {Number} options.retry 网络类失败自动重试次数，默认 1
 * @param {Function} options.wait 重试前等待 (attempt, label) => Promise
 * @return {Object} { allSucceeded, session }
 */
export async function runImportWorkflow(options) {
  const {
    session,
    rows,
    previewIds,
    workshopId,
    replaceDay,
    snapshots = [],
    scopes = [],
    transport,
    onStage = () => {},
    onNotice = () => {},
    retry = 1,
    wait = () => Promise.resolve(),
  } = options || {};
  if (!session) throw new Error('导入会话不存在，请重新生成预览');
  if (!transport || typeof transport.prepare !== 'function' || typeof transport.write !== 'function' || typeof transport.finish !== 'function') throw new Error('导入传输层未配置');
  if (!Array.isArray(rows) || !Array.isArray(previewIds)) throw new Error('导入参数不完整');
  if (rows.length !== previewIds.length) throw new Error('导入行与预览行不一致，请重新生成预览');

  onStage('preparing');
  for (const offset of pendingOffsets(session.preparedChunks, rows.length)) {
    const chunk = rows.slice(offset, offset + IMPORT_CHUNK_SIZE);
    const previousRows = snapshots.filter((old) => chunk.some((row) => row.date === old.date && row.shiftId === old.shiftId && row.processId === old.processId && row.kind === old.kind && (row.personId ? row.personId === old.personId : row.personName === old.personName)));
    const data = await invokeWithRetry(
      () => transport.prepare({ rows: chunk, workshopId, importRuleVersion: 3, replaceDay, previousRows }),
      { retry, wait, label: 'prepare' }
    );
    if (!data || !Array.isArray(data.rows) || data.rows.length !== chunk.length) throw new Error('人员准备结果不完整，已暂停导入，请按原内容重试');
    session.preparedChunks[offset] = data.rows;
    session.created += Number(data.created) || 0;
    for (const person of data.createdPeople || []) {
      if (!session.createdPeople.some((row) => row.personId === person.personId)) session.createdPeople.push(person);
    }
    onNotice({ stage: 'preparing', offset, total: rows.length, created: session.created, createdPeople: session.createdPeople.slice() });
  }

  const prepared = preparedRows(session, rows.length);
  // 人员匹配后（同名合并/自动建档）可能产生新的重复或时间冲突，写入前再核对一次。
  if (typeof options.validatePrepared === 'function') await options.validatePrepared(prepared);
  onStage('writing');
  for (const offset of pendingOffsets(session.writtenChunks, prepared.length)) {
    const chunk = prepared.slice(offset, offset + IMPORT_CHUNK_SIZE);
    const chunkPreviewIds = previewIds.slice(offset, offset + IMPORT_CHUNK_SIZE);
    const replacement = replaceDay ? snapshots.filter((old) => chunk.some((row) => row.date === old.date && row.personId === old.personId)) : [];
    // 同一 offset 重试必须沿用同一个 requestId，服务端据此幂等，不会重复写。
    const requestId = session.requestId + ':' + offset;
    const data = await invokeWithRetry(
      () => transport.write({ rows: chunk, requestId, sessionId: session.requestId, replacePrevious: replacement }),
      { retry, wait, label: 'write' }
    );
    const allOk = recordWriteResults(session, chunk, chunkPreviewIds, data && data.results);
    if (allOk) session.writtenChunks[offset] = true;
    else session.failedChunks[offset] = true;
    onNotice({ stage: 'writing', offset, total: prepared.length, requestId, allOk, results: data.results });
    if (!allOk) {
      const error = new Error('部分行导入失败，已停止后续批次；已完成的分批会保留，可按原内容重试');
      error.partial = true;
      throw error;
    }
  }

  const allSucceeded = rows.every((row, index) => {
    if (row === null || typeof row === 'undefined') return false;
    const result = session.results[previewIds[index]];
    return !!result && result.ok === true;
  });
  if (replaceDay && allSucceeded) {
    onStage('finishing');
    const tasks = finishPlan(
      scopes,
      new Set(prepared.map((row) => row._id))
    );
    for (const task of pendingFinishTasks(session, tasks)) {
      const data = await invokeWithRetry(
        () => transport.finish({ workshopId, importRuleVersion: 3, date: task.date, paged: true, sessionId: session.requestId, previousRows: task.rows }),
        { retry, wait, label: 'finish' }
      );
      if (!data || data.paginationVersion !== 1) throw new Error('云端未支持分批收尾，请更新云函数后重试');
      session.finishedPages[task.key] = true;
      session.removed += Number(data.removed) || 0;
      onNotice({ stage: 'finishing', key: task.key, removed: session.removed });
    }
  }
  onStage(allSucceeded ? 'done' : 'paused');
  return { allSucceeded, session };
}

/** 给调用方拼提示文案：自动建档人员还没有登录账号。 */
export function createdAccountHint(people) {
  const list = people || [];
  if (!list.length) return '';
  const names = list.slice(0, 5).map((item) => (item && item.name) || '').filter(Boolean).join('、');
  return ' 其中 ' + list.length + ' 人尚无登录账号（' + names + (list.length > 5 ? ' 等' : '') + '），请到「账号与权限 → 批量建号」建号。';
}

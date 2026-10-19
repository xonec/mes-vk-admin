const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');

/** 运行实际纯函数模块，保持项目无额外测试依赖。 */
function load(relative, imports = {}) {
  const original = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  const exported = [...original.matchAll(/export\s+(?:(?:async\s+)?function|const)\s+(\w+)/g)].map((item) => item[1]);
  const source = original.replace(/^import .*?;$/gm, '').replace(/export\s+(?=(?:async\s+)?function|const)/g, '') + '\nresult = {' + exported.join(',') + '};';
  const context = { ...imports };
  vm.runInNewContext(source, context, { filename: relative });
  return context.result;
}

const sessionUtil = load('utils/schedule-import-session.js');
let passed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log('PASS ' + name);
    });
}

/** 生成 rows / previewIds；mock transport 记录调用并可按脚本返回或抛错。 */
function setup(count = 450) {
  const rows = Array.from({ length: count }, (_, index) => ({ _id: 'schedule:' + index, date: '2026-06-01', personId: 'p' + index, kind: 'work', startTime: '08:00', endTime: '16:00' }));
  const previewIds = rows.map((_, index) => 'preview:' + index);
  const session = sessionUtil.createImportSession('fingerprint-1');
  const calls = { prepare: [], write: [], finish: [] };
  const transport = {
    prepare: async (data) => {
      calls.prepare.push(data);
      return { rows: data.rows.map((row, index) => ({ ...row, personId: row.personId || 'auto-' + index })), created: 1, createdPeople: [{ personId: 'auto-1', name: '新人员' }] };
    },
    write: async (data) => {
      calls.write.push(data);
      return { results: data.rows.map((row, index) => ({ row: index + 1, ok: true })) };
    },
    finish: async (data) => {
      calls.finish.push(data);
      return { paginationVersion: 1, removed: 1 };
    },
  };
  return { rows, previewIds, session, calls, transport };
}

async function run(options) {
  return sessionUtil.runImportWorkflow({
    replaceDay: true,
    snapshots: [],
    scopes: [],
    onStage: () => {},
    onNotice: () => {},
    ...options,
  });
}

async function main() {
  await test('分片与进度：450 行切成 0/200/400，已完成 1 片时进度 33%', () => {
    const plain = (value) => JSON.parse(JSON.stringify(value));
    assert.deepEqual(plain(sessionUtil.chunkOffsets(450)), [0, 200, 400]);
    assert.deepEqual(plain(sessionUtil.pendingOffsets({ 0: true }, 450)), [200, 400]);
    const progress = sessionUtil.progressOf({ 0: true }, 450);
    assert.equal(progress.done, 1);
    assert.equal(progress.total, 3);
    assert.equal(progress.percent, 33);
  });

  await test('完整导入：prepare/write 各 3 批，收尾 1 页，全部成功', async () => {
    const context = setup(450);
    const result = await run({ ...context, scopes: [{ date: '2026-06-01', rows: [{ id: 'old:1' }, { id: 'old:2' }] }] });
    assert.equal(result.allSucceeded, true);
    assert.equal(context.calls.prepare.length, 3);
    assert.equal(context.calls.write.length, 3);
    assert.equal(context.calls.finish.length, 1);
    assert.equal(context.calls.write[0].requestId, context.session.requestId + ':0');
    assert.equal(context.calls.write[2].rows.length, 50);
    assert.equal(context.session.removed, 1);
    assert.equal(context.session.created, 3);
    assert.equal(Object.keys(context.session.results).length, 450);
  });

  await test('网络类失败自动重试一次，requestId 保持不变（响应丢失不会重复写）', async () => {
    const context = setup(2);
    let first = true;
    context.transport.write = async (data) => {
      context.calls.write.push(data);
      if (first) {
        first = false;
        const error = new Error('网络中断');
        error.code = 'NETWORK';
        throw error;
      }
      return { results: data.rows.map((row, index) => ({ row: index + 1, ok: true })) };
    };
    const result = await run({ ...context });
    assert.equal(result.allSucceeded, true);
    assert.equal(context.calls.write.length, 2);
    assert.equal(context.calls.write[0].requestId, context.calls.write[1].requestId);
  });

  await test('断点续传：第二批重试耗尽后中断，恢复时跳过已准备/已写入批次', async () => {
    const context = setup(450);
    let failOnce = false;
    context.transport.write = async (data) => {
      context.calls.write.push(data);
      if (data.requestId.endsWith(':200') && !failOnce) {
        failOnce = true;
        throw new Error('网络中断');
      }
      return { results: data.rows.map((row, index) => ({ row: index + 1, ok: true })) };
    };
    await assert.rejects(run({ ...context, retry: 0 }), /网络中断/);
    assert.equal(context.session.writtenChunks[0], true);
    assert.equal(context.session.writtenChunks[200], undefined);
    const preparedBefore = context.calls.prepare.length;
    const writesBefore = context.calls.write.length;

    const result = await run({ ...context, retry: 0 });
    assert.equal(result.allSucceeded, true);
    assert.equal(context.calls.prepare.length, preparedBefore, '准备阶段应全部跳过');
    assert.equal(context.calls.write.length, writesBefore + 2, '只重试 200/400 两批');
    assert.equal(context.calls.write[writesBefore].requestId, context.session.requestId + ':200');
    assert.equal(context.calls.write[writesBefore].requestId, context.calls.write[writesBefore - 1].requestId, '重试沿用上一次失败请求的 requestId');
  });

  await test('409 版本冲突不自动重试，抛出带 code 的错误', async () => {
    const context = setup(2);
    context.transport.prepare = async () => {
      context.calls.prepare.push({});
      const error = new Error('版本冲突');
      error.code = 409;
      throw error;
    };
    await assert.rejects(run({ ...context, retry: 1 }), (error) => error.code === 409);
    assert.equal(context.calls.prepare.length, 1);
  });

  await test('单批部分行失败：停止后续批次、记录失败行、不执行收尾', async () => {
    const context = setup(450);
    context.transport.write = async (data) => {
      context.calls.write.push(data);
      return { results: data.rows.map((row, index) => ({ row: index + 1, ok: !(index === 0 && data.requestId.endsWith(':0')) })) };
    };
    await assert.rejects(run({ ...context }), (error) => error.partial === true);
    assert.equal(context.calls.write.length, 1, '第一批失败后不再写后续批次');
    assert.equal(context.calls.finish.length, 0);
    assert.equal(context.session.writtenChunks[0], undefined);
    assert.equal(context.session.failedChunks[0], true);
    const stats = sessionUtil.importStats(context.session);
    assert.equal(stats.failure, 1);
    assert.equal(stats.processed, 200);
  });

  await test('收尾分页断点续传：已完成的收尾页跳过，停用数量累加', async () => {
    const context = setup(2);
    const scopes = [
      { date: '2026-06-01', rows: Array.from({ length: 25 }, (_, index) => ({ id: 'old:a' + index })) },
      { date: '2026-06-02', rows: Array.from({ length: 25 }, (_, index) => ({ id: 'old:b' + index })) },
    ];
    let finishCalls = 0;
    context.transport.finish = async (data) => {
      finishCalls += 1;
      context.calls.finish.push(data);
      if (finishCalls === 2) throw new Error('收尾网络中断');
      return { paginationVersion: 1, removed: 20 };
    };
    await assert.rejects(run({ ...context, scopes, retry: 0 }), /收尾网络中断/);
    assert.equal(context.session.removed, 20);
    const finishedKeys = Object.keys(context.session.finishedPages);
    assert.equal(finishedKeys.length, 1);

    context.transport.finish = async (data) => {
      context.calls.finish.push(data);
      return { paginationVersion: 1, removed: 5 };
    };
    const result = await run({ ...context, scopes, retry: 0 });
    assert.equal(result.allSucceeded, true);
    assert.equal(Object.keys(context.session.finishedPages).length, 4, '4 个收尾分页全部完成');
    assert.equal(context.session.removed, 20 + 15);
  });

  await test('准备后校验钩子：发现人员合并冲突时停止，不进入写入', async () => {
    const context = setup(2);
    await assert.rejects(
      run({ ...context, validatePrepared: () => { throw new Error('人员匹配后发现重复或时间冲突'); } }),
      /人员匹配后发现重复或时间冲突/
    );
    assert.equal(context.calls.write.length, 0);
  });

  await test('写入结果校验：行号/状态不合法时报错，不会误标完成', async () => {
    const context = setup(2);
    context.transport.write = async (data) => ({ results: data.rows.map(() => ({ row: 0, ok: true })) });
    await assert.rejects(run({ ...context }), /导入结果行号或状态不正确/);
    assert.equal(context.session.writtenChunks[0], undefined);
  });

  await test('自动建档提示：只列前 5 人并提示批量建号', () => {
    const hint = sessionUtil.createdAccountHint(Array.from({ length: 7 }, (_, index) => ({ name: '人员' + index })));
    assert.match(hint, /7 人尚无登录账号/);
    assert.match(hint, /人员4/);
    assert.doesNotMatch(hint, /人员5/);
    assert.equal(sessionUtil.createdAccountHint([]), '');
  });

  console.log('\n导入会话状态机：' + passed + ' passed, 0 failed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

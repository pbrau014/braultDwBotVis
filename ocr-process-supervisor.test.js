'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runSupervisedProcess } = require('../src/ocr-process-supervisor');
const { createSerialTaskQueue } = require('../src/serial-task-queue');

async function fixtureScript(source) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-supervised-child-'));
  const script = path.join(dir, 'child.js');
  await fs.writeFile(script, source);
  return { dir, script };
}

test('independent supervisor timeout kills child tree and waits for close confirmation', async () => {
  const fixture = await fixtureScript("process.stdin.resume(); setInterval(() => {}, 1000);\n");
  try {
    const started = Date.now();
    await assert.rejects(
      runSupervisedProcess({ command: process.execPath, args: [fixture.script], inputBuffer: Buffer.from('x'), timeoutMs: 250, terminationTimeoutMs: 2000 }),
      error => error.code === 'SUPERVISED_OCR_TIMEOUT' && error.closeConfirmed === true,
    );
    assert.ok(Date.now() - started < 3000, 'supervisor should not wait for the child task to settle cooperatively');
  } finally {
    await fs.rm(fixture.dir, { recursive: true, force: true });
  }
});

test('serial queue starts recovery task only after timed-out supervised child closes', async () => {
  const hanging = await fixtureScript("process.stdin.resume(); setInterval(() => {}, 1000);\n");
  const success = await fixtureScript("process.stdout.write('recovered');\n");
  const events = [];
  const queue = createSerialTaskQueue({ maxPending: 3, timeoutMs: 5000 });
  try {
    const first = queue.run(async () => {
      events.push('first-start');
      try {
        await runSupervisedProcess({ command: process.execPath, args: [hanging.script], timeoutMs: 250, terminationTimeoutMs: 2000 });
      } finally {
        events.push('first-settled-after-supervisor');
      }
    });
    const second = queue.run(async () => {
      events.push('second-start');
      const result = await runSupervisedProcess({ command: process.execPath, args: [success.script], timeoutMs: 2000 });
      return result.stdout;
    });
    await assert.rejects(first, error => error.code === 'SUPERVISED_OCR_TIMEOUT' && error.closeConfirmed === true);
    assert.equal(await second, 'recovered');
    assert.ok(events.indexOf('first-settled-after-supervisor') < events.indexOf('second-start'));
  } finally {
    await fs.rm(hanging.dir, { recursive: true, force: true });
    await fs.rm(success.dir, { recursive: true, force: true });
  }
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSerialTaskQueue } = require('../src/serial-task-queue');

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

test('serial task queue never overlaps jobs and continues after a rejected task', async () => {
  const queue = createSerialTaskQueue({ maxPending: 4, timeoutMs: 1000 });
  let active = 0;
  let maximumActive = 0;
  const work = value => queue.run(async () => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await delay(15);
    active -= 1;
    if (value === 'reject') throw new Error('expected failure');
    return value;
  });
  const one = work('one');
  const rejected = work('reject');
  const three = work('three');
  assert.equal(await one, 'one');
  await assert.rejects(rejected, /expected failure/);
  assert.equal(await three, 'three');
  await queue.drain();
  assert.equal(maximumActive, 1);
  assert.deepEqual(queue.stats(), { active: 0, outstanding: 0, queued: 0, maxPending: 4, closed: false, halted: false });
});

test('serial task queue rejects excess pending work explicitly', async () => {
  const queue = createSerialTaskQueue({ maxPending: 1, timeoutMs: 1000 });
  let unblock;
  const first = queue.run(() => new Promise(resolve => { unblock = resolve; }));
  await delay(0);
  await assert.rejects(queue.run(async () => 'not accepted'), error => error.code === 'SERIAL_QUEUE_FULL');
  unblock('done');
  assert.equal(await first, 'done');
});

test('serial task timeout runs cleanup, waits for task cancellation, then allows the next job', async () => {
  const events = [];
  let cancelWork;
  const queue = createSerialTaskQueue({
    maxPending: 3,
    timeoutMs: 25,
    settleTimeoutMs: 100,
    onTimeout: async error => {
      events.push(`cleanup:${error.code}`);
      cancelWork();
      await delay(10);
      events.push('cleanup-done');
    },
  });
  const timed = queue.run(() => new Promise((resolve, reject) => {
    cancelWork = () => reject(new Error('terminated'));
  }));
  const next = queue.run(async () => { events.push('next'); return 'ok'; });
  await assert.rejects(timed, error => error.code === 'SERIAL_TASK_TIMEOUT');
  assert.equal(await next, 'ok');
  assert.deepEqual(events, ['cleanup:SERIAL_TASK_TIMEOUT', 'cleanup-done', 'next']);
  assert.equal(queue.stats().halted, false);
});

test('serial task queue fails closed rather than overlapping an operation that ignores timeout cleanup', async () => {
  const queue = createSerialTaskQueue({ maxPending: 3, timeoutMs: 20, settleTimeoutMs: 35 });
  const stuck = queue.run(() => new Promise(() => {}));
  await delay(1);
  const alreadyQueued = queue.run(async () => 'must never run');
  await assert.rejects(stuck, error => error.code === 'SERIAL_TASK_UNSETTLED');
  await assert.rejects(alreadyQueued, error => error.code === 'SERIAL_TASK_UNSETTLED');
  await assert.rejects(queue.run(async () => 'must not run'), error => error.code === 'SERIAL_TASK_UNSETTLED');
  assert.deepEqual(queue.stats(), { active: 0, outstanding: 0, queued: 0, maxPending: 3, closed: true, halted: true });
});


test('serial task queue fails closed if timeout cleanup itself never settles', async () => {
  const queue = createSerialTaskQueue({
    maxPending: 3,
    timeoutMs: 15,
    settleTimeoutMs: 30,
    onTimeout: async () => new Promise(() => {}),
  });
  const stuck = queue.run(() => new Promise(() => {}));
  const alreadyQueued = queue.run(async () => 'must never run');
  await assert.rejects(stuck, error => error.code === 'SERIAL_TASK_UNSETTLED');
  await assert.rejects(alreadyQueued, error => error.code === 'SERIAL_TASK_UNSETTLED');
  assert.equal(queue.stats().halted, true);
  assert.equal(queue.stats().closed, true);
});

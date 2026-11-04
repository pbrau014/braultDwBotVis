'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createWatchedWorker } = require('../src/ocr-watchdog');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('OCR operation watchdog confirms thread exit before creating a recovery worker', async () => {
  const events = [];
  let created = 0;
  const worker = createWatchedWorker(async () => {
    const id = ++created;
    events.push(`create:${id}`);
    return {
      worker: { async terminate() { events.push(`thread-exit:${id}`); await delay(5); return 0; } },
      async setParameters() { return undefined; },
      async recognize() {
        if (id === 1) return new Promise(() => {});
        return { data: { text: 'recovered' } };
      },
      async terminate() { events.push(`wrapper-terminate:${id}`); },
    };
  }, { operationTimeoutMs: 30, terminationTimeoutMs: 100 });

  await assert.rejects(worker.recognize(Buffer.from('first')), error => error.code === 'OCR_OPERATION_TIMEOUT');
  const result = await worker.recognize(Buffer.from('second'));
  assert.equal(result.data.text, 'recovered');
  assert.ok(events.indexOf('thread-exit:1') < events.indexOf('create:2'), 'recovery worker must not start before prior worker exit is confirmed');
  await worker.terminate();
});

test('OCR watchdog fails closed when worker thread termination cannot be confirmed', async () => {
  let created = 0;
  const worker = createWatchedWorker(async () => {
    created += 1;
    return {
      worker: { async terminate() { await delay(150); return 0; } },
      async recognize() { return new Promise(() => {}); },
      async setParameters() {},
      async terminate() {},
    };
  }, { operationTimeoutMs: 20, terminationTimeoutMs: 25 });

  await assert.rejects(worker.recognize(Buffer.from('stall')), error => error.code === 'SERIAL_TASK_UNSETTLED');
  await assert.rejects(worker.recognize(Buffer.from('must not overlap')), error => error.code === 'SERIAL_TASK_UNSETTLED');
  assert.equal(created, 1, 'a new worker must not start after unconfirmed termination');
});

test('parameter-update timeout is logged, terminates the old worker, and gates replacement until exit', async () => {
  const events = [];
  let created = 0;
  const worker = createWatchedWorker(async () => {
    const id = ++created;
    return {
      worker: { async terminate() { events.push({ event: 'thread-exit', id }); await delay(5); return 0; } },
      async setParameters() {
        if (id === 1) return new Promise(() => {});
        events.push({ event: 'parameters-complete', id });
      },
      async recognize() { return { data: { text: 'ok' } }; },
      async terminate() { events.push({ event: 'wrapper-terminate', id }); },
    };
  }, {
    operationTimeoutMs: 30,
    terminationTimeoutMs: 100,
    logger: event => events.push(event),
  });

  await assert.rejects(worker.setParameters({ psm: 6 }), error => error.code === 'OCR_OPERATION_TIMEOUT');
  await worker.setParameters({ psm: 6 });
  const timeout = events.findIndex(e => e.event === 'operation-timeout' && e.operation === 'setParameters');
  const oldExit = events.findIndex(e => e.event === 'thread-exit' && e.id === 1);
  const initialized = events.map((e, i) => e.event === 'worker-initialized' ? i : -1).filter(i => i >= 0);
  const replacement = initialized[1] ?? -1;
  assert.ok(timeout >= 0, 'parameter timeout must be observable');
  assert.ok(oldExit > timeout, 'underlying worker exit must follow the timeout');
  assert.ok(replacement > oldExit, 'replacement worker cannot initialize before old worker exit');
  assert.equal(created, 2);
  await worker.terminate();
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createWorker } = require('../src/ocr-worker');

test('native Tesseract worker termination aborts the active child process promptly', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX process-group cancellation fixture; Windows process cancellation remains covered by the process timeout');
    return;
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-fake-tesseract-'));
  const executable = path.join(dir, 'fake-tesseract.sh');
  const prior = {
    TESSERACT_BIN: process.env.TESSERACT_BIN,
    OCR_ENGINE: process.env.OCR_ENGINE,
    OCR_PROCESS_TIMEOUT_MS: process.env.OCR_PROCESS_TIMEOUT_MS,
  };
  const restoreEnv = () => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  try {
    await fs.writeFile(executable, '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "tesseract 5.0 test"; exit 0; fi\nsleep 60\n', { mode: 0o755 });
    await fs.chmod(executable, 0o755);
    process.env.TESSERACT_BIN = executable;
    process.env.OCR_ENGINE = 'native';
    process.env.OCR_PROCESS_TIMEOUT_MS = '60000';

    const worker = await createWorker('eng');
    const recognition = worker.recognize(Buffer.from('deliberately not an image'));
    await new Promise(resolve => setTimeout(resolve, 100));
    const started = Date.now();
    await worker.terminate();
    await assert.rejects(recognition, /aborted after the OCR job timed out or was cancelled/i);
    assert.ok(Date.now() - started < 3000, 'worker termination should not wait for the 60-second process timeout');
  } finally {
    restoreEnv();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

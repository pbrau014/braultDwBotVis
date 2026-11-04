'use strict';
// Cross-platform equivalents for the two POSIX-only process-group fixtures. These
// invoke a real child Node process through the production cancellation code and
// assert the operation settles only after the child's close event is observed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const processor = require('../src/image-processor');
const { __test: ocrTest } = require('../src/ocr-worker');

async function makeHangingChildScript() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-child-close-'));
  const script = path.join(dir, 'hang.js');
  await fs.writeFile(script, "process.stdin.resume(); setInterval(() => {}, 1000);\n");
  return { dir, script };
}

test('cross-platform ImageMagick process timeout confirms child close', async () => {
  const { dir, script } = await makeHangingChildScript();
  try {
    const started = Date.now();
    await assert.rejects(
      processor.__test.runImageMagick([], Buffer.from('image input'), {
        command: process.execPath, argsPrefix: [script], timeoutMs: 250, usePosixTimeout: false,
      }),
      error => /exceeded its 250 ms processing timeout/i.test(error.message)
        && !/did not confirm process exit/i.test(error.message),
    );
    assert.ok(Date.now() - started < 2500, 'timeout should settle after confirmed child close and cleanup');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('cross-platform native OCR cancellation confirms child close', async () => {
  const { dir, script } = await makeHangingChildScript();
  const controller = new AbortController();
  try {
    const recognition = ocrTest.runNativeTesseract(Buffer.from('image input'), 'eng', 3, '', controller.signal, {
      command: process.execPath, argsPrefix: [script], timeoutMs: 60_000, usePosixTimeout: false,
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const started = Date.now();
    controller.abort();
    await assert.rejects(recognition, /aborted after the OCR job timed out or was cancelled/i);
    assert.ok(Date.now() - started < 2500, 'cancellation should settle after confirmed child close, not after the full process timeout');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

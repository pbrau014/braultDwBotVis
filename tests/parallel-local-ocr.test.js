'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runParallelLocalReaders } = require('../src/parallel-local-ocr');

test('Tesseract.js, native Tesseract and PaddleOCR are started concurrently on identical original bytes', async () => {
    const imageBuffer = Buffer.from('original-screenshot');
    const started = [];
    let release;
    const barrier = new Promise(resolve => { release = resolve; });
    const run = runParallelLocalReaders({
        imageBuffer,
        env: { PADDLEOCR_MODEL_MANIFEST: 'models/manifest.json' },
        readerRunner: async ({ engine, imageBuffer: bytes }) => {
            started.push({ engine, bytes });
            if (started.length === 3) release();
            await barrier;
            return { status: 'success', output: { engine } };
        },
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(started.map(item => item.engine).sort(), ['native', 'paddleocr', 'tesseractjs']);
    assert.ok(started.every(item => item.bytes === imageBuffer));
    const result = await run;
    assert.equal(result.status, 'complete');
    assert.equal(result.readers.native.status, 'success');
    assert.equal(result.readers.tesseractjs.status, 'success');
    assert.equal(result.readers.paddleocr.status, 'success');
});

test('PaddleOCR is visibly blocked when its pinned model manifest is not configured', async () => {
    const result = await runParallelLocalReaders({
        imageBuffer: Buffer.from('image'),
        env: {},
        readerRunner: async ({ engine }) => ({ engine, status: 'success' }),
    });
    assert.equal(result.status, 'partial');
    assert.equal(result.readers.paddleocr.status, 'blocked');
    assert.equal(result.readers.native.status, 'success');
    assert.equal(result.readers.tesseractjs.status, 'success');
});

test('a failed local reader is recorded without hiding successful readers', async () => {
    const result = await runParallelLocalReaders({
        imageBuffer: Buffer.from('image'),
        env: { PADDLEOCR_MODEL_MANIFEST: 'models/manifest.json' },
        readerRunner: async ({ engine }) => {
            if (engine === 'native') throw Object.assign(new Error('not installed'), { code: 'NATIVE_MISSING' });
            return { status: 'success' };
        },
    });
    assert.equal(result.status, 'partial');
    assert.equal(result.readers.native.errorCode, 'NATIVE_MISSING');
    assert.equal(result.readers.tesseractjs.status, 'success');
    assert.equal(result.readers.paddleocr.status, 'success');
});

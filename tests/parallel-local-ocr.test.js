'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runParallelLocalReaders } = require('../src/parallel-local-ocr');
const { reconcileParallelLocalReaderEvidence } = require('../src/bot');

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

test('parallel local-reader outputs are compared field-by-field without replacing the primary record', () => {
    const localRecord = {
        result: 'Victory', player: 'PlayerA', map: 'Shards', mode: 'Random Battle',
        battleStart: '28.09.2024 17:04', credits: '123456', freeXp: '456',
        damage: '123456', xp: '6646',
    };
    const result = reconcileParallelLocalReaderEvidence({
        status: 'partial',
        readers: {
            native: { status: 'success', sourceSha256: 'abc', output: { record: { ...localRecord, damage: '123457' } } },
            paddleocr: { status: 'blocked', reason: 'model manifest missing' },
        },
    }, localRecord);
    assert.equal(result.status, 'partial');
    assert.equal(result.readers.native.fields.result.status, 'agreement');
    assert.equal(result.readers.native.fields.damage.status, 'disagreement');
    assert.equal(result.readers.native.fields.damage.candidateValue, '123457');
    assert.equal(result.readers.paddleocr.status, 'blocked');
    assert.equal(localRecord.damage, '123456');
});

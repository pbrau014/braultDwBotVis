'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { resolveLocalTesseractAssets } = require('../src/ocr-worker');

test('Tesseract.js fallback resolves language, Node worker, and every core asset from local paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-local-tess-assets-'));
  const lang = path.join(root, 'lang');
  const worker = path.join(root, 'worker', 'index.js');
  const core = path.join(root, 'core');
  const previous = Object.fromEntries(['TESSERACT_LANG_PATH','TESSERACT_WORKER_PATH','TESSERACT_CORE_PATH'].map(k => [k, process.env[k]]));
  try {
    await fs.mkdir(lang, { recursive: true });
    await fs.mkdir(path.dirname(worker), { recursive: true });
    await fs.mkdir(core, { recursive: true });
    await fs.writeFile(path.join(lang, 'eng.traineddata'), 'synthetic language model');
    await fs.writeFile(worker, '/* synthetic node worker path fixture */');
    for (const file of ['tesseract-core.wasm.js','tesseract-core-simd.wasm.js','tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js']) {
      await fs.writeFile(path.join(core, file), '/* synthetic local core path fixture */');
    }
    process.env.TESSERACT_LANG_PATH = lang;
    process.env.TESSERACT_WORKER_PATH = worker;
    process.env.TESSERACT_CORE_PATH = core;
    const assets = resolveLocalTesseractAssets('eng');
    assert.equal(assets.langPath, lang);
    assert.equal(assets.workerPath, worker);
    assert.equal(assets.corePath, core);
    for (const target of [assets.langPath, assets.workerPath, assets.corePath]) assert.ok(path.isAbsolute(target));
  } finally {
    for (const [k, v] of Object.entries(previous)) v === undefined ? delete process.env[k] : process.env[k] = v;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('Tesseract.js fallback errors clearly when a local language model is unavailable', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-local-tess-missing-'));
  const previous = process.env.TESSERACT_LANG_PATH;
  try {
    process.env.TESSERACT_LANG_PATH = root;
    assert.throws(() => resolveLocalTesseractAssets('eng'), /local language model not found/i);
  } finally {
    if (previous === undefined) delete process.env.TESSERACT_LANG_PATH;
    else process.env.TESSERACT_LANG_PATH = previous;
    await fs.rm(root, { recursive: true, force: true });
  }
});

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { resolveLocalTesseractAssets } = require('../src/ocr-worker');
const pkg = require('../package.json');
const { version: jsVersion } = require('tesseract.js/package.json');
const { version: coreVersion } = require('tesseract.js-core/package.json');
const assets = resolveLocalTesseractAssets('eng');
const files = [
  path.join(assets.langPath, 'eng.traineddata'), assets.workerPath,
  ...['tesseract-core.wasm.js','tesseract-core-simd.wasm.js','tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js'].map(name => path.join(assets.corePath, name)),
];
const report = {
  package: { name: pkg.name, version: pkg.version, engines: pkg.engines },
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  engine: { tesseractJs: jsVersion, tesseractJsCore: coreVersion },
  configuredEngine: String(process.env.OCR_ENGINE || 'auto').toLowerCase(),
  assets: files.map(file => ({ path: file, exists: fs.existsSync(file), sizeBytes: fs.statSync(file).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })),
  allAssetsPresent: files.every(file => fs.existsSync(file)),
};
console.log(JSON.stringify(report, null, 2));
if (!report.allAssetsPresent) process.exitCode = 1;

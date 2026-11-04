#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { spawn } = require('node:child_process');
const python = process.env.PADDLEOCR_PYTHON_BIN || process.env.OPENCV_PYTHON_BIN || process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const script = path.join(__dirname, 'benchmark_paddleocr_local.py');
const child = spawn(python, [script, ...process.argv.slice(2)], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', windowsHide: true, shell: false });
child.on('error', error => { console.error(`Could not start local Python (${python}): ${error.message}`); process.exitCode = 3; });
child.on('exit', (code, signal) => { if (signal) { console.error(`Local PaddleOCR benchmark ended with signal ${signal}`); process.exitCode = 3; } else process.exitCode = code ?? 3; });

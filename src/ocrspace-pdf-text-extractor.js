'use strict';

const { spawn } = require('node:child_process');

async function extractPdfText(pdfPath, executable = process.env.GHOSTSCRIPT_BIN || 'gswin64c.exe', {
    timeoutMs = 30000, maxOutputBytes = 1024 * 1024
} = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(executable, ['-q', '-dBATCH', '-dNOPAUSE', '-sDEVICE=txtwrite', '-sOutputFile=-', pdfPath], {
            windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe']
        });
        const stdout = [];
        const stderr = [];
        let total = 0;
        let stderrBytes = 0;
        let settled = false;
        const finish = (error, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (error) reject(error); else resolve(value);
        };
        const timer = setTimeout(() => {
            child.kill();
            const error = new Error('Ghostscript searchable-PDF text extraction timed out.');
            error.code = 'OCRSPACE_PDF_TEXT_TIMEOUT';
            finish(error);
        }, timeoutMs);
        child.stdout.on('data', chunk => {
            total += chunk.length;
            if (total > maxOutputBytes) {
                child.kill();
                const error = new Error('Searchable-PDF text output exceeded its bounded limit.');
                error.code = 'OCRSPACE_PDF_TEXT_TOO_LARGE';
                finish(error);
                return;
            }
            stdout.push(chunk);
        });
        child.stderr.on('data', chunk => {
            if (stderrBytes < 16384) {
                const kept = chunk.subarray(0, 16384 - stderrBytes);
                stderr.push(kept);
                stderrBytes += kept.length;
            }
        });
        child.on('error', error => finish(error));
        child.on('close', code => {
            if (code !== 0) {
                const error = new Error('Ghostscript txtwrite failed (exit ' + code + '): ' + Buffer.concat(stderr).toString('utf8').slice(0, 1000));
                error.code = 'OCRSPACE_PDF_TEXT_EXTRACTION_FAILED';
                finish(error);
                return;
            }
            finish(null, Buffer.concat(stdout, total).toString('utf8'));
        });
    });
}

module.exports = { extractPdfText };

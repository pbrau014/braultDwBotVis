'use strict';

// One image per isolated process. The supervising parent can hard-kill this
// process tree independently if the main thread or Tesseract worker stops making
// progress. Screenshot bytes arrive only over stdin; the temp file contains only
// the structured result, not the original image.
process.env.OCR_IMAGE_CHILD = '1';
if (process.env.OCR_NON_OCR_NETWORK_RESTRICTED === '1') require('./block-network');
const fs = require('node:fs/promises');
const bot = require('../src/bot');
const outputPath = process.argv[2];

(async () => {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    const buffer = Buffer.concat(chunks);
    if (!buffer.length) throw new Error('Supervised OCR child received an empty image.');
    try {
        const output = await bot.extractText(buffer);
        await fs.writeFile(outputPath, JSON.stringify({ ok: true, output }));
    } catch (error) {
        await fs.writeFile(outputPath, JSON.stringify({ ok: false, error: error.message, code: error.code || null }));
        process.exitCode = 1;
    } finally {
        try { await bot.terminateOcrWorker(); } catch (error) {
            if (process.env.OCR_DEBUG_TIMINGS === '1') console.error(`[OCR-CHILD] worker cleanup: ${error.message}`);
            process.exitCode = 1;
        }
    }
})().catch(async error => {
    try { await fs.writeFile(outputPath, JSON.stringify({ ok: false, error: error.message, code: error.code || null })); } catch {}
    console.error(`[OCR-CHILD] fatal: ${error.message}`);
    process.exitCode = 1;
});

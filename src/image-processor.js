'use strict';

// Portable image preprocessing adapter. Sharp is intentionally not required:
// ImageMagick's CLI is used to decode, resize, normalize, sharpen and crop images.
// This avoids native Node ABI / platform-specific sharp binary install failures.
const { spawn, spawnSync } = require('node:child_process');

function assertDimensions(width, height, options = {}) {
    const w = Number(width);
    const h = Number(height);
    const maxDimension = Math.max(2048, Number(options.maxDimension) || 12000);
    const maxPixels = Math.max(1_000_000, Number(options.maxPixels) || 40_000_000);
    if (!Number.isSafeInteger(w) || !Number.isSafeInteger(h) || w < 1 || h < 1) {
        throw new Error('The uploaded file does not contain a valid image size. Please upload a PNG, JPG, or WEBP screenshot.');
    }
    if (w > maxDimension || h > maxDimension || w * h > maxPixels) {
        throw new Error(`Image dimensions are too large (${w}×${h}). Maximum dimension is ${maxDimension}px and maximum area is ${maxPixels.toLocaleString()} pixels.`);
    }
    return { width: w, height: h, pixels: w * h };
}

function findPosixTimeout() {
    if (process.platform === 'win32') return null;
    const result = spawnSync('timeout', ['--version'], { stdio: 'ignore' });
    return !result.error && result.status === 0 ? 'timeout' : null;
}
const posixTimeout = findPosixTimeout();

function findImageMagick() {
    const candidates = [process.env.IMAGEMAGICK_BIN, 'magick', 'convert'].filter(Boolean);
    for (const candidate of candidates) {
        const check = spawnSync(candidate, ['-version'], { stdio: 'ignore' });
        if (!check.error && check.status === 0) return candidate;
    }
    return null;
}

const imageMagick = findImageMagick();

function runImageMagick(args, inputBuffer, testOptions = null) {
    const selectedImageMagick = testOptions?.command || imageMagick;
    if (!selectedImageMagick) {
        return Promise.reject(new Error(
            'Image preprocessing needs ImageMagick (magick/convert). Install ImageMagick or set IMAGEMAGICK_BIN.',
        ));
    }

    return new Promise((resolve, reject) => {
        const timeoutMs = Math.max(testOptions ? 100 : 1000, Number(testOptions?.timeoutMs ?? process.env.IMAGEMAGICK_TIMEOUT_MS) || 15000);
        const maxOutputBytes = Math.max(1_000_000, Number(testOptions?.maxOutputBytes ?? process.env.MAX_IMAGEMAGICK_OUTPUT_BYTES) || 100_000_000);
        const usePosixTimeout = testOptions?.usePosixTimeout ?? !testOptions?.command;
        const command = usePosixTimeout && posixTimeout ? posixTimeout : selectedImageMagick;
        const baseArgs = [...(testOptions?.argsPrefix || []), ...args];
        const commandArgs = usePosixTimeout && posixTimeout
            ? ['--signal=TERM', '--kill-after=2s', `${Math.ceil(timeoutMs / 1000)}s`, selectedImageMagick, ...baseArgs]
            : baseArgs;
        const child = spawn(command, commandArgs, { stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
        const stdout = [];
        const stderr = [];
        let outputBytes = 0;
        let stderrBytes = 0;
        let settled = false;
        let failure = null;
        let timer;
        let terminationTimer;
        const cleanupListenersAndTimers = () => {
            clearTimeout(timer);
            clearTimeout(terminationTimer);
        };
        const killTree = () => {
            // Wait for `close` below before resolving/rejecting, rather than treating
            // a kill signal as proof that ImageMagick has already exited.
            try {
                if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL');
                else child.kill('SIGKILL');
            } catch {}
            try { child.stdin?.destroy(); } catch {}
        };
        const fail = (error) => {
            if (settled || failure) return;
            failure = error;
            clearTimeout(timer);
            killTree();
            terminationTimer = setTimeout(() => {
                if (settled) return;
                settled = true;
                cleanupListenersAndTimers();
                const unconfirmed = new Error(`${error.message} ImageMagick did not confirm process exit after termination.`);
                unconfirmed.code = 'SERIAL_TASK_UNSETTLED';
                unconfirmed.cause = error;
                reject(unconfirmed);
            }, 3000);
        };
        timer = setTimeout(() => fail(new Error(`ImageMagick exceeded its ${timeoutMs} ms processing timeout.`)), timeoutMs);
        child.stdout.on('data', (chunk) => {
            if (failure || settled) return;
            outputBytes += chunk.length;
            if (outputBytes > maxOutputBytes) {
                fail(new Error(`ImageMagick output exceeded the ${maxOutputBytes.toLocaleString()} byte safety limit.`));
                return;
            }
            stdout.push(chunk);
        });
        child.stderr.on('data', (chunk) => {
            if (failure || settled || stderrBytes >= 100_000) return;
            const kept = chunk.subarray(0, Math.max(0, 100_000 - stderrBytes));
            stderr.push(kept);
            stderrBytes += kept.length;
        });
        child.on('error', (error) => fail(new Error(`Could not start ImageMagick: ${error.message}`, { cause: error })));
        child.on('close', (code) => {
            if (settled) return;
            settled = true;
            cleanupListenersAndTimers();
            if (failure) {
                reject(failure);
                return;
            }
            if (code !== 0) {
                reject(new Error(`ImageMagick failed (${code}): ${Buffer.concat(stderr).toString('utf8').trim().slice(0, 500)}`));
                return;
            }
            resolve(Buffer.concat(stdout));
        });
        child.stdin.on('error', (error) => { if (error.code !== 'EPIPE') fail(error); });
        child.stdin.end(inputBuffer);
    });
}

async function metadata(inputBuffer) {
    const info = await runImageMagick(['-', '-format', '%w %h', 'info:'], inputBuffer);
    const match = info.toString('utf8').trim().match(/^(\d+)\s+(\d+)$/);
    if (!match) throw new Error(`Could not read image dimensions from ImageMagick output: ${info.toString('utf8').slice(0, 100)}`);
    return { width: Number(match[1]), height: Number(match[2]) };
}

async function prepare(inputBuffer, targetWidth) {
    return runImageMagick([
        '-', '-auto-orient', '-resize', `${Math.max(1, Math.round(targetWidth))}x`,
        '-colorspace', 'Gray', '-normalize', '-unsharp', '0x1+1+0.05', 'png:-',
    ], inputBuffer);
}

async function cropResize(inputBuffer, rect, outputWidth, options = {}) {
    const left = Math.max(0, Math.round(rect.left));
    const top = Math.max(0, Math.round(rect.top));
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const args = ['-', '-crop', `${width}x${height}+${left}+${top}`, '+repage'];
    if (options.channel) {
        const channel = String(options.channel).toUpperCase();
        if (!['R', 'G', 'B'].includes(channel)) {
            throw new TypeError('Image crop channel must be one of R, G, or B.');
        }
        // Separating one source color channel creates a true grayscale image
        // whose contrast can be optimized for low-contrast UI text such as the
        // yellow player/clan row. This is image evidence, not value correction.
        args.push('-channel', channel, '-separate', '+channel');
    } else if (options.grayscale) {
        args.push('-colorspace', 'Gray');
    }
    if (options.contrastStretch) args.push('-contrast-stretch', String(options.contrastStretch));
    if (options.brightnessContrast) args.push('-brightness-contrast', String(options.brightnessContrast));
    if (options.sharpen) args.push('-unsharp', String(options.sharpen));
    args.push('-resize', `${Math.max(1, Math.round(outputWidth))}x`, 'png:-');
    return runImageMagick(args, inputBuffer);
}

function sourceAspectCropRect(pageWidth, pageHeight, sourceWidth, sourceHeight) {
    const values = [pageWidth, pageHeight, sourceWidth, sourceHeight].map(Number);
    if (!values.every(Number.isSafeInteger) || values.some(value => value < 1)) {
        const error = new Error('PDF raster normalization requires positive integer page and source dimensions.');
        error.code = 'OCRSPACE_PDF_SOURCE_DIMENSIONS_INVALID';
        throw error;
    }
    const [pageW, pageH, sourceW, sourceH] = values;
    const pageAspect = pageW / pageH;
    const sourceAspect = sourceW / sourceH;
    // DWBOT result screenshots are landscape and OCR.Space places the source
    // image top-aligned at full PDF-page width. Portrait/letterboxed layouts are
    // not guessed: they must use a separately verified layout strategy.
    if (sourceAspect <= pageAspect) {
        const error = new Error('Source screenshot aspect ratio is not compatible with the verified top-aligned landscape PDF layout.');
        error.code = 'OCRSPACE_PDF_SOURCE_ASPECT_UNSUPPORTED';
        throw error;
    }
    const cropHeight = Math.round(pageW * sourceH / sourceW);
    if (cropHeight < 240 || cropHeight >= pageH) {
        const error = new Error('Source screenshot aspect ratio produced an unsafe or empty PDF content crop.');
        error.code = 'OCRSPACE_PDF_SOURCE_ASPECT_UNSUPPORTED';
        throw error;
    }
    return { left: 0, top: 0, width: pageW, height: cropHeight };
}

async function normalizeSearchablePdfPageRaster(pageRasterBuffer, { sourceWidth, sourceHeight } = {}) {
    if (!Buffer.isBuffer(pageRasterBuffer) || !pageRasterBuffer.length) {
        const error = new Error('Searchable-PDF page raster is empty.');
        error.code = 'OCRSPACE_PDF_RASTER_INVALID';
        throw error;
    }
    const page = await metadata(pageRasterBuffer);
    const cropRect = sourceAspectCropRect(page.width, page.height, sourceWidth, sourceHeight);
    const buffer = await cropResize(pageRasterBuffer, cropRect, page.width);
    const normalized = await metadata(buffer);
    if (normalized.width !== cropRect.width || normalized.height !== cropRect.height) {
        const error = new Error('Normalized PDF raster dimensions do not match the source-aspect crop.');
        error.code = 'OCRSPACE_PDF_RASTER_NORMALIZATION_MISMATCH';
        throw error;
    }
    return {
        buffer,
        normalization: {
            method: 'source-aspect-top-aligned-crop-v1',
            sourceWidth: Number(sourceWidth),
            sourceHeight: Number(sourceHeight),
            pageRasterWidth: page.width,
            pageRasterHeight: page.height,
            cropRect,
            normalizedWidth: normalized.width,
            normalizedHeight: normalized.height,
        },
    };
}

async function prepareOcrSpaceUpload(inputBuffer, maxBytes = 1024 * 1024) {
    if (!Buffer.isBuffer(inputBuffer) || !inputBuffer.length) throw new Error('OCR.Space source image is empty.');
    const attempts = [
        { width: 2600, quality: 86 }, { width: 2200, quality: 82 },
        { width: 1900, quality: 78 }, { width: 1600, quality: 74 },
        { width: 1400, quality: 70 }, { width: 1200, quality: 66 },
    ];
    let last = null;
    for (const attempt of attempts) {
        const output = await runImageMagick([
            '-', '-auto-orient', '-strip', '-colorspace', 'sRGB',
            '-resize', `${attempt.width}x${attempt.width}>`,
            '-sampling-factor', '4:2:0', '-interlace', 'Plane',
            '-quality', String(attempt.quality), 'jpg:-',
        ], inputBuffer);
        if (output.length <= maxBytes) {
            const info = await metadata(output);
            return { buffer: output, filename: 'dwbot-source.jpg', mimeType: 'image/jpeg',
                bytes: output.length, width: info.width, height: info.height,
                resized: true, quality: attempt.quality };
        }
        last = { ...attempt, bytes: output.length };
    }
    const error = new Error(`OCR.Space Free API image remains above ${maxBytes} bytes after bounded re-encoding (last attempt ${last?.width}px/q${last?.quality}: ${last?.bytes} bytes).`);
    error.code = 'OCRSPACE_FILE_TOO_LARGE';
    throw error;
}

async function renderSearchablePdfPage(pdfBuffer, { density = 220, maxDimension = 3200 } = {}) {
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 8 || pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        const error = new Error('OCR.Space returned a file that is not a valid PDF.');
        error.code = 'OCRSPACE_INVALID_PDF';
        throw error;
    }
    const dimension = Math.max(800, Math.min(5000, Number(maxDimension) || 3200));
    return runImageMagick([
        '-density', String(Math.max(72, Math.min(400, Number(density) || 220))),
        'pdf:-[0]', '-background', 'white', '-alpha', 'remove', '-alpha', 'off',
        '-resize', `${dimension}x${dimension}>`, '-strip', 'png:-',
    ], pdfBuffer, { timeoutMs: 60000, maxOutputBytes: 80_000_000 });
}

module.exports = { metadata, prepare, cropResize, prepareOcrSpaceUpload, renderSearchablePdfPage,
    normalizeSearchablePdfPageRaster, sourceAspectCropRect, imageMagick, assertDimensions, __test: { runImageMagick } };

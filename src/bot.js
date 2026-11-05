'use strict';

// ============================================================
// SECTION 1: IMPORTS AND CONFIGURATION
// ============================================================
require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Events,
    Partials,
    PermissionFlagsBits,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
} = require('discord.js');
const { createWorker } = require('./ocr-worker');
const { inspectTargetChannelPermissions } = require('./discord-gateway-diagnostics');
const { isAdminOnlyCommand } = require('./tournament-command-policy');
const { collectOcrSpaceFieldEvidence } = require('./ocrspace-field-evidence');
const { buildSafeOcrSpacePrepassCropPlan } = require('./ocrspace-prepass');
const path = require('node:path');
const { createHash } = require('node:crypto');
const os = require('node:os');
const fs = require('node:fs/promises');
const { runSupervisedProcess } = require('./ocr-process-supervisor');
const imageProcessor = require('./image-processor');
const opencvFieldIsolation = require('./opencv-field-isolation');
const paddleOcrFieldFallback = require('./paddleocr-field-fallback');
const {
    normaliseOcrNumber,
    extractRewardGroups,
    extractFocusedRewards,
    parseLocalizedNumericField,
    selectLocalizedRewardValue,
    hasIndependentRewardFieldValueSupport,
    hasIndependentRewardFieldConflict,
    hasIndependentRewardFieldPrefixConflict,
    selectConsistentRewardTuple,
    reconcileCreditPrefix,
    extractFocusedDamage,
} = require('./number-parser');
const {
    NOT_DETECTED,
    buildBattleRecord,
    getMissingRequiredFields,
    applyCorrections,
    formatBattleRecord,
    makeTournamentExport,
    makeCorrectionPrompt,
    parseModeMap,
    parseBattleStartTime,
    parseIdentityLine,
    validPlayer,
} = require('./battle-record');
const { extractSpatialRibbons } = require('./ribbon-parser');
const Tournament = require('./tournament');
const { createDesktopService } = require('./desktop-service');
const { createDesktopBridge } = require('./desktop-bridge');
const { createSerialTaskQueue } = require('./serial-task-queue');
const { selectDamageCandidates, hasUniqueDamageConsensus, extractFullScreenDamageCandidates } = require('./damage-consensus');
const { FIELD_SPECS, findRewardBaseX, findRewardGeometryAnchor, buildRewardGeometryRects, rewardGeometryValueIsValid, rewardGeometryAnchorDigitsAreUsable, rewardValueMatchesAnchor, rewardGeometryQuorumCanResolveXpTrailingAdornment } = require('./reward-geometry');
// Sharp is not a runtime dependency. ./image-processor uses ImageMagick CLI.

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
const MAX_IMAGE_BYTES =
    Math.max(1, Number(process.env.MAX_IMAGE_MB) || 10) * 1024 * 1024;
const MAX_IMAGE_PIXELS = Math.max(1_000_000, Number(process.env.MAX_IMAGE_PIXELS) || 40_000_000);
const MAX_IMAGE_DIMENSION = Math.max(2048, Number(process.env.MAX_IMAGE_DIMENSION) || 12000);
const OCR_IMAGE_TIMEOUT_MS = Math.max(30_000, Number(process.env.OCR_IMAGE_TIMEOUT_MS) || 90_000);
const MAX_PENDING_OCR_JOBS = Math.min(32, Math.max(1, Math.floor(Number(process.env.MAX_PENDING_OCR_JOBS) || 8)));
const OCR_LANGUAGE = process.env.OCR_LANGUAGE || 'eng';
const TOURNAMENT_ADMIN_IDS = new Set((process.env.TOURNAMENT_ADMIN_IDS || '').split(',').map(v => v.trim()).filter(Boolean));
const TOURNAMENT_STATE_PATH = process.env.TOURNAMENT_STATE_PATH || path.join(process.cwd(), 'data', 'tournament-state.json');
const TOURNAMENT_STORAGE = String(process.env.TOURNAMENT_STORAGE || (process.env.NODE_ENV === 'test' ? 'json' : 'sqlite')).toLowerCase();
const TOURNAMENT_SQLITE_PATH = process.env.TOURNAMENT_SQLITE_PATH || path.join(process.cwd(), 'data', 'tournament-state.sqlite');
const ENABLE_SLASH_COMMANDS = process.env.ENABLE_SLASH_COMMANDS === '1';
const ENABLE_DESKTOP_UI = process.env.ENABLE_DESKTOP_UI === '1';
const WORKBOOK_PATH = path.join(__dirname, '..', 'assets', 'YOLO-Tournament-Workbook.xlsm');
// Every state change is persisted locally immediately. Discord recovery snapshots
// are debounced into one same-channel attachment after a quiet period, preventing
// dozens of redundant attachments during bulk scoring or guided corrections.
const SNAPSHOT_DEBOUNCE_MS = Math.max(0, Number(process.env.SNAPSHOT_DEBOUNCE_MS ?? (process.env.NODE_ENV === 'test' ? 0 : 30_000)) || 0);
const tournamentStore = TOURNAMENT_STORAGE === 'sqlite'
    ? Tournament.createSqliteStore(TOURNAMENT_SQLITE_PATH, { legacyJsonPath: TOURNAMENT_STATE_PATH, mirrorPath: TOURNAMENT_STATE_PATH })
    : Tournament.createStore(TOURNAMENT_STATE_PATH);
let tournamentState = null;
let desktopBridge = null;

// Leave room below Discord's 2,000-character message limit for formatting.
const DISCORD_MESSAGE_LIMIT = 1850;

function runtimeSupported(version = process.versions.node) {
    // Node 22.16.0 is the reproducible baseline. Accept that version and every
    // newer stable Node release so newer Node 22 patches and later majors are valid.
    // The minimum is 22.16.0 because this application uses DatabaseSync's timeout
    // constructor option from node:sqlite, introduced in Node 22.16.0.
    const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(String(version).trim());
    if (!match) return false;
    const [, majorText, minorText, patchText] = match;
    const major = Number(majorText);
    const minor = Number(minorText);
    const patch = Number(patchText);
    return major > 22 || (major === 22 && minor >= 16);
}

// ============================================================
// SECTION 2: DISCORD CLIENT AND OCR STATE
// ============================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
});

// discord.js REST already schedules requests around Discord's dynamic buckets.
// Observe 429 handling without hard-coding limits or creating a competing retry loop.
client.rest.on('rateLimited', (rateLimit) => {
    console.warn(
        `[Discord REST] rate limited: ${rateLimit.method} ${rateLimit.route}; scope=${rateLimit.scope}; global=${Boolean(rateLimit.global)}; retryAfterMs=${Number(rateLimit.retryAfter) || 0}. discord.js REST manager is applying its rate-limit queue.`,
    );
});

let ocrWorker = null;
let ocrWorkerInitialization = null;
let ocrWorkerGeneration = 0;
let isShuttingDown = false;
const pendingRecords = new Map();
let archiveSnapshotTimer = null;
let archiveSnapshotInFlight = null;
const PENDING_CORRECTION_TTL_MS = 30 * 60 * 1000;

// ============================================================
// SECTION 3: ATTACHMENT DOWNLOAD
// ============================================================
async function downloadImage(attachment) {
    if (attachment.size && attachment.size > MAX_IMAGE_BYTES) {
        throw new Error(
            `Image is too large. Maximum allowed size is ${formatMegabytes(MAX_IMAGE_BYTES)} MB.`,
        );
    }

    const response = await fetch(attachment.url, {
        signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
        throw new Error(`Could not download the image (HTTP ${response.status}).`);
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (declaredLength && declaredLength > MAX_IMAGE_BYTES) {
        throw new Error(
            `Image is too large. Maximum allowed size is ${formatMegabytes(MAX_IMAGE_BYTES)} MB.`,
        );
    }

    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
        throw new Error(
            `Image is too large. Maximum allowed size is ${formatMegabytes(MAX_IMAGE_BYTES)} MB.`,
        );
    }
    if (arrayBuffer.byteLength === 0) {
        throw new Error('The downloaded image was empty.');
    }

    return Buffer.from(arrayBuffer);
}

function formatMegabytes(bytes) {
    return (bytes / (1024 * 1024)).toFixed(0);
}

// ============================================================
// SECTION 4: OCR PROCESSING
// ============================================================
async function getOcrWorker() {
    if (ocrWorker) return ocrWorker;
    if (ocrWorkerInitialization) return ocrWorkerInitialization;

    const generation = ocrWorkerGeneration;
    const initialization = (async () => {
        console.log(`Initializing Tesseract OCR (language: ${OCR_LANGUAGE})...`);
        const worker = await createWorker(OCR_LANGUAGE, 1, {
            logger: (progress) => {
                if (progress.status === 'recognizing text' && progress.progress >= 0.99) {
                    console.log('OCR is nearly complete.');
                }
            },
        });
        // A per-image timeout may cancel initialization while createWorker is
        // still resolving. Never publish a stale worker after that cancellation.
        if (generation !== ocrWorkerGeneration) {
            await worker.terminate().catch(() => {});
            throw new Error('OCR worker initialization was cancelled by a processing timeout.');
        }
        ocrWorker = worker;
        console.log('Tesseract OCR is ready.');
        return worker;
    })();
    ocrWorkerInitialization = initialization;

    try {
        return await initialization;
    } finally {
        if (ocrWorkerInitialization === initialization) ocrWorkerInitialization = null;
    }
}

const ocrTaskQueue = createSerialTaskQueue({
    maxPending: MAX_PENDING_OCR_JOBS,
    // Leave the parent-process supervisor enough time to kill and observe a stuck
    // per-image child before the outer serial queue reaches its own deadline.
    timeoutMs: OCR_IMAGE_TIMEOUT_MS + 12_000,
    onTimeout: async (error) => {
        console.error(`[OCR] ${error.message} Terminating the current worker before the next queued image.`);
        await terminateOcrWorker();
    },
});

// Keep the entire multi-pass image pipeline serialized, not just individual OCR
// calls. Tesseract's parameters are mutable; interleaved image jobs can otherwise
// change each other's page segmentation settings and corrupt fields.
function extractText(imageBuffer) {
    return ocrTaskQueue.run(() => process.env.OCR_IMAGE_CHILD === '1'
        ? extractTextUnlocked(imageBuffer)
        : runSupervisedExtraction(imageBuffer));
}

function buildSourceEvidence(attachment, imageBuffer, sourceContext = {}) {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new TypeError('Source evidence requires the non-empty original image buffer.');
    }
    return {
        platform: 'discord',
        messageId: String(sourceContext.messageId || ''),
        channelId: String(sourceContext.channelId || ''),
        messageUrl: String(sourceContext.messageUrl || ''),
        attachmentId: String(attachment?.id || sourceContext.attachmentId || ''),
        sha256: createHash('sha256').update(imageBuffer).digest('hex'),
        sizeBytes: imageBuffer.length,
        contentType: String(attachment?.contentType || ''),
        retrievedAt: new Date().toISOString(),
    };
}

// Reserve a bounded queue slot before downloading the attachment. This prevents
// a burst of submissions from creating unbounded concurrent downloads/buffers.
function extractTextFromAttachment(attachment, onStart = null, sourceContext = {}) {
    return ocrTaskQueue.run(async () => {
        // Download/validate first, then replace an in-progress correction. A
        // queue-full rejection or invalid/oversized/unavailable attachment must
        // not silently erase the user's previous pending correction.
        const imageBuffer = await downloadImage(attachment);
        const sourceEvidence = buildSourceEvidence(attachment, imageBuffer, sourceContext);
        if (typeof onStart === 'function') await onStart();
        const output = process.env.OCR_IMAGE_CHILD === '1'
            ? await extractTextUnlocked(imageBuffer)
            : await runSupervisedExtraction(imageBuffer);
        return { ...output, sourceEvidence };
    });
}

async function runSupervisedExtraction(imageBuffer) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wows-ocr-supervised-'));
    const resultPath = path.join(tempDir, 'result.json');
    const childScript = path.join(__dirname, '..', 'scripts', 'ocr-image-child.js');
    const timeoutMs = Math.max(100, Number(process.env.OCR_SUPERVISED_TIMEOUT_MS)
        || OCR_IMAGE_TIMEOUT_MS + 5_000);
    const childEnv = {
        ...process.env,
        OCR_IMAGE_CHILD: '1',
        TOURNAMENT_STORAGE: 'json',
        TOURNAMENT_STATE_PATH: path.join(tempDir, 'state.json'),
        TOURNAMENT_SQLITE_PATH: path.join(tempDir, 'state.sqlite'),
    };
    try {
        let childResult = null;
        let runError = null;
        try {
            await runSupervisedProcess({
                command: process.execPath,
                // Propagate only preload flags (such as the explicit no-network
                // guard), never runner flags such as --test or --eval.
                args: [
                    ...(() => {
                        const inherited = [];
                        for (let i = 0; i < process.execArgv.length; i += 1) {
                            const arg = process.execArgv[i];
                            if (arg === '--require' || arg === '-r' || arg === '--import') {
                                if (process.execArgv[i + 1]) inherited.push(arg, process.execArgv[++i]);
                            } else if (arg.startsWith('--require=') || arg.startsWith('--import=')) inherited.push(arg);
                        }
                        return inherited;
                    })(),
                    childScript,
                    resultPath,
                ],
                inputBuffer: imageBuffer,
                env: childEnv,
                cwd: path.dirname(__dirname),
                timeoutMs,
                terminationTimeoutMs: 5_000,
                maxOutputBytes: Math.max(1_000_000, Number(process.env.OCR_CHILD_MAX_OUTPUT_BYTES) || 10 * 1024 * 1024),
                onOutput: process.env.OCR_DEBUG_TIMINGS === '1'
                    ? (stream, chunk) => {
                        const text = chunk.toString('utf8').replace(/\s+$/, '');
                        if (text) console.log(`[OCR-CHILD:${stream}] ${text.slice(-2000)}`);
                    }
                    : undefined,
            });
        } catch (error) {
            runError = error;
        }
        try {
            childResult = JSON.parse(await fs.readFile(resultPath, 'utf8'));
        } catch {
            if (runError) {
                const error = new Error(`${runError.message}${runError.closeConfirmed ? ' (child closure confirmed)' : ''}`, { cause: runError });
                error.code = runError.code || 'SUPERVISED_OCR_CHILD_FAILED';
                error.closeConfirmed = runError.closeConfirmed === true;
                throw error;
            }
            throw new Error('Supervised OCR child exited without writing its structured result.');
        }
        if (!childResult?.ok) {
            const error = new Error(childResult?.error || runError?.message || 'Supervised OCR child failed without a diagnostic.');
            error.code = childResult?.code || runError?.code || 'SUPERVISED_OCR_CHILD_FAILED';
            error.closeConfirmed = runError?.closeConfirmed === true || !runError;
            throw error;
        }
        if (runError) {
            const error = new Error(`Supervised OCR child returned a result but did not exit cleanly: ${runError.message}`, { cause: runError });
            error.code = runError.code || 'SUPERVISED_OCR_CHILD_FAILED';
            error.closeConfirmed = runError.closeConfirmed === true;
            throw error;
        }
        return childResult.output;
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

async function extractTextUnlocked(imageBuffer) {
    try {
        return await extractTextCore(imageBuffer);
    } finally {
        // Each screenshot receives a fresh worker. This bounds cross-image state
        // carry-over and makes lifecycle failures attributable to one image.
        // Set OCR_RECYCLE_WORKER_PER_IMAGE=0 only for explicit comparative tests.
        if (process.env.OCR_RECYCLE_WORKER_PER_IMAGE !== '0') await terminateOcrWorker();
    }
}

async function extractTextCore(imageBuffer) {
    const imageStartedAt = Date.now();
    const ensureImageBudget = () => {
        const elapsed = Date.now() - imageStartedAt;
        if (elapsed > OCR_IMAGE_TIMEOUT_MS) {
            throw new Error(`OCR exceeded the ${Math.round(OCR_IMAGE_TIMEOUT_MS / 1000)} second per-image time budget. Please retry or manually enter the required values.`);
        }
    };
    ensureImageBudget();
    const metadata = await imageProcessor.metadata(imageBuffer);
    ensureImageBudget();
    const { width: sourceWidth, height: sourceHeight } = imageProcessor.assertDimensions(metadata.width, metadata.height, {
        maxDimension: MAX_IMAGE_DIMENSION, maxPixels: MAX_IMAGE_PIXELS,
    });
    // OpenCV is a local geometry assistant only. It never emits accepted values;
    // the established Tesseract passes, parsers and ambiguity checks remain the
    // authority. Missing Python/OpenCV fails back to the existing OCR pipeline.
    const ocrSpaceConfigured = process.env.OCRSPACE_ENABLED === '1' && Boolean(String(process.env.OCRSPACE_API_KEY || '').trim());
    // OCR.Space-first prepass: OpenCV supplies geometry only. Identity geometry is
    // used as an exclusion boundary and is never uploaded. If a safe crop cannot
    // be proven, the remote prepass skips it and local OCR continues unchanged.
    const cvAnalysis = await opencvFieldIsolation.analyze(imageBuffer, { force: ocrSpaceConfigured });
    let ocrSpacePrepassEvidence = { status: 'disabled', reason: 'OCRSPACE_ENABLED/key not configured', requests: 0, evidence: [] };
    if (ocrSpaceConfigured) {
        try {
            const cropPlan = buildSafeOcrSpacePrepassCropPlan({ regions: cvAnalysis?.regions || {}, width: sourceWidth, height: sourceHeight });
            const remaining = Math.max(1000, OCR_IMAGE_TIMEOUT_MS - (Date.now() - imageStartedAt) - 45000);
            if (cropPlan.length && remaining >= 1000) {
                ocrSpacePrepassEvidence = await collectOcrSpaceFieldEvidence({
                    env: { ...process.env, OCRSPACE_MAX_CROPS: process.env.OCRSPACE_MAX_CROPS || '4',
                        OCRSPACE_STAGE_BUDGET_MS: String(Math.min(20000, remaining)) },
                    cropPlan,
                    buildCrop: async spec => imageProcessor.cropResize(imageBuffer, spec.rect,
                        Math.max(600, Math.min(1800, Math.round(spec.rect.width * 2.5))),
                        { grayscale: true, contrastStretch: '0.5%x0.5%', sharpen: '0x1+1+0.02' }),
                });
            } else {
                ocrSpacePrepassEvidence = { status: 'skipped', reason: 'no geometrically safe non-identifying crops or insufficient time budget', requests: 0, evidence: [] };
            }
        } catch (error) {
            ocrSpacePrepassEvidence = { status: 'failed', reason: String(error && error.code || 'OCRSPACE_PREPASS_ERROR'), requests: 0, evidence: [] };
        }
    }
    ensureImageBudget();
    const worker = await getOcrWorker();
    // Enlarge smaller screenshots and boost contrast before OCR, with a bounded
    // maximum width to limit CPU and memory usage.
    const targetWidth = Math.min(2600, Math.max(1800, sourceWidth));
    const preparedBuffer = await imageProcessor.prepare(imageBuffer, targetWidth);
    const preparedMetadata = await imageProcessor.metadata(preparedBuffer);
    const imageWidth = Number(preparedMetadata.width) || targetWidth;
    const imageHeight = Number(preparedMetadata.height) || Math.round(targetWidth * (Number(metadata.height) / sourceWidth));

    let ocrPassIndex = 0;
    const runOcr = async (inputBuffer, psm, dimensions, transform = null) => {
        ensureImageBudget();
        const passIndex = ++ocrPassIndex;
        const passStartedAt = Date.now();
        if (process.env.OCR_DEBUG_TIMINGS === '1') console.log(`[OCR] pass ${passIndex} start (PSM ${psm}, ${inputBuffer.length} bytes)`);
        await worker.setParameters({ tessedit_pageseg_mode: String(psm) });
        // Tesseract.js v6 disables structured OCR output by default and exposes
        // lines under data.blocks[].paragraphs[].lines[]. Request both text and
        // blocks, while retaining the legacy data.lines fallback for v5.
        const result = await worker.recognize(inputBuffer, {}, { text: true, blocks: true });
        if (process.env.OCR_DEBUG_TIMINGS === '1') console.log(`[OCR] pass ${passIndex} done in ${Date.now() - passStartedAt} ms`);
        const rawLines = Array.isArray(result.data.lines) && result.data.lines.length
            ? result.data.lines
            : (Array.isArray(result.data.blocks)
                ? result.data.blocks.flatMap((block) =>
                    (block.paragraphs || []).flatMap((paragraph) => paragraph.lines || []),
                )
                : []);
        const mapBox = (box) => {
            if (!box) return box;
            if (!transform) return { ...box };
            return {
                x0: transform.left + box.x0 / transform.scale,
                y0: transform.top + box.y0 / transform.scale,
                x1: transform.left + box.x1 / transform.scale,
                y1: transform.top + box.y1 / transform.scale,
            };
        };
        const lines = rawLines.map((line) => ({
            ...line,
            bbox: mapBox(line.bbox),
        }));
        // Keep word boxes as well as lines. Numeric OCR often mistakes the nearby
        // coin icon for a digit; individual word boxes let us crop just the numeral
        // and re-read it without the adjacent icon.
        const rawWords = Array.isArray(result.data.blocks)
            ? result.data.blocks.flatMap((block) =>
                (block.paragraphs || []).flatMap((paragraph) =>
                    (paragraph.lines || []).flatMap((line) => line.words || []),
                ),
            )
            : rawLines.flatMap((line) => line.words || []);
        const words = rawWords.map((word) => ({
            text: String(word.text || '').trim(),
            confidence: Number(word.confidence) || 0,
            bbox: mapBox(word.bbox),
        })).filter((word) => word.text && word.bbox);
        return {
            text: (result.data.text || '').trim(),
            lines,
            words,
            confidence: Number(result.data.confidence) || 0,
            imageWidth: dimensions.width,
            imageHeight: dimensions.height,
            pageSegmentationMode: psm,
        };
    };

    const standard = await runOcr(preparedBuffer, 3, { width: imageWidth, height: imageHeight });
    const sparse = await runOcr(preparedBuffer, 11, { width: imageWidth, height: imageHeight });

    // OCR small UI regions separately as well. The player/ship and reward lines
    // are tiny relative to the sea background, while ribbons/missions and the map
    // plus start time sit in consistent areas of the results screen. Region boxes
    // are mapped back into the full screenshot coordinate system for layout checks.
    const runCrop = async (name, rect, outputWidth, psm = 6) => {
        ensureImageBudget();
        rect.width = Math.min(rect.width, imageWidth - rect.left);
        rect.height = Math.min(rect.height, imageHeight - rect.top);
        if (rect.width < 2 || rect.height < 2) return { text: '', lines: [], confidence: 0, imageWidth, imageHeight, pageSegmentationMode: psm };
        // Avoid extreme upscaling on narrow numeric crops. Text can become
        // over-smoothed when a 150-pixel crop is enlarged 8–10×; a bounded 3.5×
        // scale is sufficient after the full screenshot has already been enlarged.
        const effectiveOutputWidth = Math.max(1, Math.min(outputWidth, Math.round(rect.width * 3.5)));
        const scale = effectiveOutputWidth / rect.width;
        const cropBuffer = await imageProcessor.cropResize(preparedBuffer, rect, effectiveOutputWidth);
        return runOcr(cropBuffer, psm, { width: imageWidth, height: imageHeight }, {
            left: rect.left, top: rect.top, scale,
        });
    };

    // Read result title/subtitle from the original screenshot. This small crop
    // avoids losing muted Victory/Defeat lettering during global normalization.
    const runSourceCrop = async (rect, outputWidth, psm = 6, options = {}) => {
        ensureImageBudget();
        const left = Math.max(0, Math.round(rect.left));
        const top = Math.max(0, Math.round(rect.top));
        const safeRect = {
            left,
            top,
            width: Math.max(1, Math.min(Math.round(rect.width), sourceWidth - left)),
            height: Math.max(1, Math.min(Math.round(rect.height), sourceHeight - top)),
        };
        const effectiveOutputWidth = Math.max(1, Math.round(outputWidth));
        const cropBuffer = await imageProcessor.cropResize(imageBuffer, safeRect, effectiveOutputWidth, options);
        // Return source-image crop word boxes in the same prepared-image coordinate
        // space as runCrop. This makes OCR-derived geometry comparable across the
        // original and normalized pipelines instead of accidentally using crop-local
        // pixels as screen coordinates.
        const preparedPerSource = imageWidth / sourceWidth;
        const cropPerSource = effectiveOutputWidth / safeRect.width;
        const transform = {
            left: safeRect.left * preparedPerSource,
            top: safeRect.top * preparedPerSource,
            scale: cropPerSource / preparedPerSource,
        };
        const attempt = await runOcr(cropBuffer, psm, { width: imageWidth, height: imageHeight }, transform);
        attempt.sourceCrop = { ...safeRect, outputWidth: effectiveOutputWidth, transform };
        return attempt;
    };

    const cvRegion = (name, minimumScore = 0.12) => {
        const region = cvAnalysis?.regions?.[name];
        if (!region?.rect || Number(region.score) < minimumScore ||
            !Number.isFinite(Number(cvAnalysis.width)) || !Number.isFinite(Number(cvAnalysis.height))) return null;
        // Normalize against the decoder's dimensions. This also handles a source
        // whose EXIF orientation changes the dimensions reported by ImageMagick.
        const sx = sourceWidth / Number(cvAnalysis.width);
        const sy = sourceHeight / Number(cvAnalysis.height);
        const rect = {
            left: Math.max(0, Math.round(Number(region.rect.left) * sx)),
            top: Math.max(0, Math.round(Number(region.rect.top) * sy)),
            width: Math.max(1, Math.round(Number(region.rect.width) * sx)),
            height: Math.max(1, Math.round(Number(region.rect.height) * sy)),
        };
        rect.width = Math.min(rect.width, sourceWidth - rect.left);
        rect.height = Math.min(rect.height, sourceHeight - rect.top);
        if (rect.width < 8 || rect.height < 6) return null;
        return { ...region, rect };
    };

    const identityRect = {
        left: Math.round(imageWidth * 0.08),
        top: Math.round(imageHeight * 0.12),
        width: Math.round(imageWidth * 0.65),
        height: Math.round(imageHeight * 0.30),
    };
    const identity = await runCrop('identity', { ...identityRect }, 2200, 6);
    const identitySparse = await runCrop('identity-sparse', { ...identityRect }, 2200, 11);
    const performance = await runCrop('performance', {
        left: Math.round(imageWidth * 0.08),
        top: Math.round(imageHeight * 0.28),
        width: Math.round(imageWidth * 0.80),
        height: Math.round(imageHeight * 0.42),
    }, 2400, 6);
    const missions = await runCrop('missions', {
        left: Math.round(imageWidth * 0.08),
        top: Math.round(imageHeight * 0.61),
        width: Math.round(imageWidth * 0.72),
        height: Math.round(imageHeight * 0.27),
    }, 2100, 6);
    const metaRect = {
        left: Math.round(imageWidth * 0.54),
        top: Math.round(imageHeight * 0.10),
        width: Math.max(1, Math.round(imageWidth * 0.44)),
        height: Math.max(1, Math.round(imageHeight * 0.18)),
    };
    const metadataOcr = await runCrop('metadata', { ...metaRect }, 2100, 6);
    const metadataSparse = await runCrop('metadata-sparse', { ...metaRect }, 2100, 11);
    // The result title can begin left of 12% on 16:9/4:3-scaled screens.
    // Starting at 12% clipped the first letters on the user's 201950 screenshot,
    // which left only a single weak full-screen result read. Include the full title
    // and subtitle in three complementary passes so a correct result can corroborate.
    const resultTitleRect = {
        left: Math.round(sourceWidth * 0.06),
        top: Math.round(Number(metadata.height) * 0.15),
        width: Math.round(sourceWidth * 0.42),
        height: Math.round(Number(metadata.height) * 0.20),
    };
    const resultTitle = await runSourceCrop({ ...resultTitleRect }, 1900, 6);
    const resultTitleSparse = await runSourceCrop({ ...resultTitleRect }, 1900, 11);
    // Raw-source recovery reads avoid blur introduced by whole-image normalization.
    // These are independent passes so the record builder still applies consensus.
    const sourceIdentityRect = {
        left: Math.round(sourceWidth * 0.12),
        top: Math.round(Number(metadata.height) * 0.25),
        width: Math.round(sourceWidth * 0.60),
        height: Math.round(Number(metadata.height) * 0.085),
    };
    const sourceIdentity = await runSourceCrop({ ...sourceIdentityRect }, 2200, 6, {
        grayscale: true, contrastStretch: '1%x1%', sharpen: '0x1+1+0.02',
    });
    const sourceIdentitySparse = await runSourceCrop({ ...sourceIdentityRect }, 2200, 11, {
        grayscale: true, contrastStretch: '1%x1%', sharpen: '0x1+1+0.02',
    });
    // Tight player-only crops exclude the adjacent ship name and preserve the
    // visually distinctive clan tag. These reads are independent evidence, not
    // string substitutions; acceptance still requires an agreeing spelling.
    // The identity line is a long clan/player string, not a short token. The old
    // tight crop started mid-name on common 1650x900 screenshots and was also too
    // high, producing truncated/conflicting variants that vetoed the full identity
    // line. This wider row crop retains the complete clan/player text plus a little
    // ship text; parseIdentityLine stops after the identity rather than trusting the
    // adjacent ship label.
    const sourceIdentityTightRect = {
        left: Math.round(sourceWidth * 0.08),
        top: Math.round(sourceHeight * 0.27),
        width: Math.round(sourceWidth * 0.28),
        height: Math.round(sourceHeight * 0.07),
    };
    const sourceIdentityTightPsm7 = await runSourceCrop({ ...sourceIdentityTightRect }, 1800, 7, {
        grayscale: true, sharpen: '0x1+1+0.03',
    });
    const sourceIdentityTightPsm8 = await runSourceCrop({ ...sourceIdentityTightRect }, 1800, 8, {
        grayscale: true, sharpen: '0x1+1+0.03',
    });
    // Rescue player strings on layouts where the clan prefix starts closer to
    // the left edge or the identity baseline shifts vertically. Only invoke this
    // extra work when the existing independent OCR passes do not produce two
    // agreeing, syntactically valid player identities. These are still ordinary
    // identity candidates; the existing weighted consensus rejects disagreements.
    const sourceIdentityRescueReads = [];
    const priorIdentityReads = [identity, identitySparse, sourceIdentity, sourceIdentitySparse,
        sourceIdentityTightPsm7, sourceIdentityTightPsm8, standard, sparse];
    const priorIdentityCounts = new Map();
    for (const attempt of priorIdentityReads) {
        const parsedIdentity = parseIdentityLine(String(attempt.text || '')).player;
        if (!validPlayer(parsedIdentity)) continue;
        const key = String(parsedIdentity).toLowerCase();
        priorIdentityCounts.set(key, (priorIdentityCounts.get(key) || 0) + 1);
    }
    const identityCountRanks = [...priorIdentityCounts.values()].sort((a, b) => b - a);
    const hasIdentityAgreement = identityCountRanks.some((count) => count >= 2);
    const closeIdentityCompetition = identityCountRanks.length > 1 &&
        identityCountRanks[0] - identityCountRanks[1] <= 2;
    const identityNeedsRescue = !hasIdentityAgreement || closeIdentityCompetition;
    const sourceIdentityTightRescueReads = [];
    if (identityNeedsRescue) {
        const identityRescueRects = [
            { left: Math.round(sourceWidth * 0.025), top: Math.round(sourceHeight * 0.19), width: Math.round(sourceWidth * 0.62), height: Math.round(sourceHeight * 0.16) },
            { left: Math.round(sourceWidth * 0.025), top: Math.round(sourceHeight * 0.23), width: Math.round(sourceWidth * 0.62), height: Math.round(sourceHeight * 0.16) },
        ];
        for (const rescueRect of identityRescueRects) {
            for (const psm of [6, 11]) {
                sourceIdentityRescueReads.push(await runSourceCrop({ ...rescueRect }, 2800, psm, {
                    grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '4x14', sharpen: '0x1+1+0.04',
                }));
            }
        }
    }
    // Low-contrast yellow clan/player text can disappear in grayscale crops.
    // A red-channel-only pass preserves its contrast against blue sea backgrounds
    // and has independently recovered exact bracketed identities in the supplied
    // low-contrast screenshots. Run only on unresolved/unstable identity; these
    // reads remain ordinary OCR candidates and must pass strict identity consensus.
    const sourceIdentityColorRescueReads = [];
    if (identityNeedsRescue) {
        const identityColorRescueRects = [
            { left: Math.round(sourceWidth * 0.02), top: Math.round(sourceHeight * 0.23), width: Math.round(sourceWidth * 0.50), height: Math.round(sourceHeight * 0.16) },
            { left: Math.round(sourceWidth * 0.02), top: Math.round(sourceHeight * 0.25), width: Math.round(sourceWidth * 0.50), height: Math.round(sourceHeight * 0.12) },
        ];
        for (const rescueRect of identityColorRescueRects) {
            sourceIdentityColorRescueReads.push(await runSourceCrop({ ...rescueRect }, 3000, 6, {
                channel: 'R', contrastStretch: '0.5%x0.5%', sharpen: '0x1+1+0.04',
            }));
        }
    }

    // Always take two dedicated single-line source reads of the player region.
    // They are only admitted to identity consensus when both PSMs independently
    // parse the same valid player at adequate confidence; otherwise they remain
    // diagnostic evidence and cannot introduce a speculative username.
    const identityTightRescueRect = {
        left: Math.round(sourceWidth * 0.02),
        top: Math.round(sourceHeight * 0.25),
        width: Math.round(sourceWidth * 0.42),
        height: Math.round(sourceHeight * 0.13),
    };
    for (const psm of [7, 8]) {
        sourceIdentityTightRescueReads.push(await runSourceCrop({ ...identityTightRescueRect }, 2600, psm, {
            grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '4x14', sharpen: '0x1+1+0.04',
        }));
    }
    const tightIdentityPlayers = sourceIdentityTightRescueReads.map(attempt => ({
        player: parseIdentityLine(attempt.text || '').player,
        confidence: Number(attempt.confidence) || 0,
    }));
    const tightIdentityAgreement = tightIdentityPlayers.length === 2 &&
        tightIdentityPlayers.every(item => item.player !== NOT_DETECTED && validPlayer(item.player) && item.confidence >= 55) &&
        tightIdentityPlayers[0].player.toLowerCase() === tightIdentityPlayers[1].player.toLowerCase();
    let cvIdentityAttempt = null;
    const cvIdentityRegion = cvRegion('identity', 0.18);
    if (identityNeedsRescue && !tightIdentityAgreement && cvIdentityRegion) {
        cvIdentityAttempt = await runSourceCrop({ ...cvIdentityRegion.rect }, 2600, 7, {
            grayscale: true, contrastStretch: '0.5%x0.5%', sharpen: '0x1+1+0.03',
        });
        cvIdentityAttempt.cvAssisted = true;
        cvIdentityAttempt.cvRegion = cvIdentityRegion;
    }
    const sourceMetadataRect = {
        left: Math.round(sourceWidth * 0.53),
        top: Math.round(Number(metadata.height) * 0.145),
        width: Math.round(sourceWidth * 0.46),
        height: Math.round(Number(metadata.height) * 0.14),
    };
    const sourceMetadata = await runSourceCrop({ ...sourceMetadataRect }, 2600, 6, {
        grayscale: true, contrastStretch: '1%x1%', sharpen: '0x1+1+0.02',
    });
    const sourceMetadataSparse = await runSourceCrop({ ...sourceMetadataRect }, 2600, 11, {
        grayscale: true, contrastStretch: '1%x1%', sharpen: '0x1+1+0.02',
    });
    // The wide metadata crop leaves very small map/mode text under-resolved on
    // screenshots such as Hoffmann. A tighter geometry covers both metadata lines
    // at a higher scale; independent PSM reads are still required by consensus.
    const sourceMetadataTightRect = {
        left: Math.round(sourceWidth * 0.58),
        top: Math.round(Number(metadata.height) * 0.15),
        width: Math.round(sourceWidth * 0.34),
        height: Math.round(Number(metadata.height) * 0.105),
    };
    const sourceMetadataTightReads = [];
    for (const psm of [6, 7, 11]) {
        sourceMetadataTightReads.push(await runSourceCrop({ ...sourceMetadataTightRect }, 2400, psm, {
            grayscale: true, contrastStretch: '1%x1%', sharpen: '0x1+1+0.04',
        }));
    }
    // Isolate the single map/mode line. This makes page segmentation focus on
    // the title rather than mixing the nearby low-contrast timestamp into one line.
    const sourceMapModeRect = {
        left: Math.round(sourceWidth * 0.59),
        top: Math.round(Number(metadata.height) * 0.197),
        width: Math.round(sourceWidth * 0.27),
        height: Math.round(Number(metadata.height) * 0.027),
    };
    const sourceMapModeReads = [];
    for (const psm of [6, 7, 11]) {
        sourceMapModeReads.push(await runSourceCrop({ ...sourceMapModeRect }, 2400, psm, {
            grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '5x16', sharpen: '0x1+1+0.04',
        }));
    }
    // The map/mode row shifts vertically between UI scales. Keep independent
    // upper/lower windows so a crop aimed at one layout cannot clip another.
    const sourceMapModeUpperReads = [];
    const sourceMapModeLowerReads = [];
    const sourceMapModeUpperRect = {
        left: Math.round(sourceWidth * 0.57),
        top: Math.round(Number(metadata.height) * 0.132),
        width: Math.round(sourceWidth * 0.36),
        height: Math.round(Number(metadata.height) * 0.085),
    };
    const sourceMapModeLowerRect = {
        left: Math.round(sourceWidth * 0.57),
        top: Math.round(Number(metadata.height) * 0.218),
        width: Math.round(sourceWidth * 0.36),
        height: Math.round(Number(metadata.height) * 0.046),
    };
    for (const psm of [6, 11]) {
        sourceMapModeUpperReads.push(await runSourceCrop({ ...sourceMapModeUpperRect }, 2600, psm, {
            grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '5x16', sharpen: '0x1+1+0.05',
        }));
        sourceMapModeLowerReads.push(await runSourceCrop({ ...sourceMapModeLowerRect }, 2600, psm, {
            grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '5x16', sharpen: '0x1+1+0.05',
        }));
    }
    // The Hoffmann screenshot's timestamp is lower-contrast than the other UI
    // text. Only run a timestamp-only crop when the existing metadata passes
    // do not already agree on a valid timestamp.
    const baseMetadataReads = [metadataOcr, metadataSparse, sourceMetadata, sourceMetadataSparse,
        ...sourceMetadataTightReads, ...sourceMapModeReads, ...sourceMapModeUpperReads, ...sourceMapModeLowerReads];
    // The map/mode text shifts left as well as vertically between result-screen
    // layouts. The older row crops all began around 57-59% of screen width, which
    // clipped the first map word on several valid screenshots. When either field
    // lacks two agreeing source reads, run a wide raw-source row crop from an
    // earlier x position. Its OCR output is evidence only; normal field consensus
    // and exact expected-value acceptance remain unchanged.
    const sourceMapModeRescueReads = [];
    const recognizedMetadataCounts = { map: new Map(), mode: new Map() };
    for (const attempt of baseMetadataReads) {
        if ((Number(attempt.confidence) || 0) < 35) continue;
        const parsed = parseModeMap(String(attempt.text || ''));
        for (const field of ['map', 'mode']) {
            const value = String(parsed[field] || 'Not detected');
            if (value === 'Not detected') continue;
            const key = value.toLowerCase().replace(/\s+/g, ' ').trim();
            recognizedMetadataCounts[field].set(key, (recognizedMetadataCounts[field].get(key) || 0) + 1);
        }
    }
    // A pair of conflicting OCR values is not stable agreement. Trigger the
    // wide source crop when a field has zero or multiple distinct 2-read groups;
    // only one quorum-backed canonical value is considered stable.
    const hasStableMetadataAgreement = (field) =>
        [...recognizedMetadataCounts[field].values()].filter((count) => count >= 2).length === 1;
    const sourceMapModeReadsHaveValidMap = sourceMapModeReads.some((attempt) => {
        const parsed = parseModeMap(String(attempt.text || ''));
        return parsed.map !== NOT_DETECTED && parsed.mode !== NOT_DETECTED;
    });
    if (!hasStableMetadataAgreement('map') || !hasStableMetadataAgreement('mode') || !sourceMapModeReadsHaveValidMap) {
        const sourceMapModeRescueRects = [
            { left: Math.round(sourceWidth * 0.28), top: Math.round(sourceHeight * 0.12), width: Math.round(sourceWidth * 0.68), height: Math.round(sourceHeight * 0.14) },
            { left: Math.round(sourceWidth * 0.28), top: Math.round(sourceHeight * 0.18), width: Math.round(sourceWidth * 0.68), height: Math.round(sourceHeight * 0.12) },
            // Tight top-right crop retains the complete map/mode title and the
            // timestamp on layouts where the earlier 57-93% window clips the right
            // edge. It is only run when metadata consensus is already unstable.
            { left: Math.round(sourceWidth * 0.70), top: Math.round(sourceHeight * 0.10), width: Math.round(sourceWidth * 0.29), height: Math.round(sourceHeight * 0.13) },
        ];
        for (const rescueRect of sourceMapModeRescueRects) {
            for (const psm of [6, 11]) {
                sourceMapModeRescueReads.push(await runSourceCrop({ ...rescueRect }, 3000, psm, {
                    grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '5x16', sharpen: '0x1+1+0.05',
                }));
            }
        }
    }
    const allBaseMetadataReads = [...baseMetadataReads, ...sourceMapModeRescueReads];
    const baseTimestampGroups = new Map();
    for (const attempt of allBaseMetadataReads) {
        const parsedTime = parseBattleStartTime(attempt.text);
        if (parsedTime === 'Not detected') continue;
        baseTimestampGroups.set(parsedTime, (baseTimestampGroups.get(parsedTime) || 0) + 1);
    }
    let sourceTimeCandidates = [];
    let sourceTimeDiagnostics = [];
    const hasTimestampConsensus = baseTimestampGroups.size === 1 &&
        [...baseTimestampGroups.values()][0] >= 2;
    if (!hasTimestampConsensus) {
        const sourceTimeRects = [
            // Keep only the battle-start line. Earlier versions started too far
            // right and included the map row, so Tesseract truncated the date/time.
            {
                left: Math.round(sourceWidth * 0.58),
                top: Math.round(Number(metadata.height) * 0.154),
                width: Math.round(sourceWidth * 0.34),
                height: Math.round(Number(metadata.height) * 0.047),
            },
            {
                left: Math.round(sourceWidth * 0.58),
                top: Math.round(Number(metadata.height) * 0.218),
                width: Math.round(sourceWidth * 0.34),
                height: Math.round(Number(metadata.height) * 0.052),
            },
        ];
        const sourceTimeReads = [];
        for (const sourceTimeRect of sourceTimeRects) {
            for (const psm of [6, 11]) {
                sourceTimeReads.push(await runSourceCrop({ ...sourceTimeRect }, 2600, psm, {
                    grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '5x16', sharpen: '0x1+1+0.05',
                }));
            }
        }
        sourceTimeDiagnostics = sourceTimeReads.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence, sourceCrop: attempt.sourceCrop }));
        const timeGroups = new Map();
        for (const attempt of sourceTimeReads) {
            const parsed = parseBattleStartTime(attempt.text);
            if (parsed === 'Not detected') continue;
            const group = timeGroups.get(parsed) || [];
            group.push(attempt);
            timeGroups.set(parsed, group);
        }
        const agreeingTimeReads = [...timeGroups.entries()]
            .filter(([, reads]) => reads.length >= 2)
            .sort((a, b) => b[1].length - a[1].length)[0];
        if (agreeingTimeReads) sourceTimeCandidates = agreeingTimeReads[1];
    }
    // Keep this raw-source variant free of contrast stretching: the result title
    // uses muted lettering and stretching can erase its edges on dark screens.
    const resultTitleEnhanced = await runSourceCrop({ ...resultTitleRect }, 2300, 6, {
        grayscale: true, sharpen: '0x1+1+0.02',
    });

    const outcomeFromText = (text) => {
        const value = String(text || '');
        const victory = /\bvictory\b/i.test(value);
        const defeat = /\bdefeat\b/i.test(value);
        return victory === defeat ? '' : (victory ? 'Victory' : 'Defeat');
    };
    const earlyOutcomeReads = [standard, sparse, resultTitle, resultTitleSparse, resultTitleEnhanced]
        .map(attempt => outcomeFromText(attempt.text)).filter(Boolean);
    const earlyOutcomeCounts = new Map();
    for (const outcome of earlyOutcomeReads) earlyOutcomeCounts.set(outcome, (earlyOutcomeCounts.get(outcome) || 0) + 1);
    const hasOutcomeConsensus = earlyOutcomeCounts.size === 1 && [...earlyOutcomeCounts.values()][0] >= 2;
    let cvResultAttempt = null;
    const cvResultRegion = cvRegion('result', 0.18);
    if (!hasOutcomeConsensus && cvResultRegion) {
        cvResultAttempt = await runSourceCrop({ ...cvResultRegion.rect }, 2300, 6, {
            grayscale: true, sharpen: '0x1+1+0.02',
        });
        cvResultAttempt.cvAssisted = true;
        cvResultAttempt.cvRegion = cvResultRegion;
    }

    // Run the CV metadata rescue only when existing raw/full-screen and source
    // reads do not establish each key metadata field. It contributes a candidate,
    // not an override; the record parser still rejects conflicts and unknown values.
    const preCvMetadataReads = [standard, sparse, metadataOcr, metadataSparse, sourceMetadata,
        sourceMetadataSparse, ...sourceMetadataTightReads, ...sourceMapModeReads,
        ...sourceMapModeUpperReads, ...sourceMapModeLowerReads, ...sourceMapModeRescueReads];
    const metadataVoteCounts = { map: new Map(), mode: new Map(), battleStart: new Map() };
    for (const attempt of preCvMetadataReads) {
        const parsed = parseModeMap(String(attempt.text || ''));
        for (const field of ['map', 'mode']) {
            const value = String(parsed[field] || 'Not detected');
            if (value !== 'Not detected') metadataVoteCounts[field].set(value.toLowerCase(), (metadataVoteCounts[field].get(value.toLowerCase()) || 0) + 1);
        }
        const time = parseBattleStartTime(String(attempt.text || ''));
        if (time !== 'Not detected') metadataVoteCounts.battleStart.set(time, (metadataVoteCounts.battleStart.get(time) || 0) + 1);
    }
    const metadataNeedsCv = Object.values(metadataVoteCounts).some(votes => votes.size !== 1 || [...votes.values()][0] < 2);
    let cvMetadataAttempt = null;
    const cvMetadataRegion = cvRegion('metadata', 0.16);
    if (metadataNeedsCv && cvMetadataRegion) {
        cvMetadataAttempt = await runSourceCrop({ ...cvMetadataRegion.rect }, 2700, 6, {
            grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '3x10', sharpen: '0x1+1+0.03',
        });
        cvMetadataAttempt.cvAssisted = true;
        cvMetadataAttempt.cvRegion = cvMetadataRegion;
    }

    // A wide, tall left-panel pass is the resolution/aspect-ratio tolerant anchor
    // source. Older fixed crops remain as supplemental OCR because UI scaling can
    // move the result panel vertically on different screenshot sizes.
    const panelOcr = await runCrop('results-panel', {
        left: Math.round(imageWidth * 0.035),
        top: Math.round(imageHeight * 0.035),
        width: Math.round(imageWidth * 0.84),
        height: Math.round(imageHeight * 0.90),
    }, 2800, 6);
    const panelSparseOcr = await runCrop('results-panel-sparse', {
        left: Math.round(imageWidth * 0.035),
        top: Math.round(imageHeight * 0.035),
        width: Math.round(imageWidth * 0.84),
        height: Math.round(imageHeight * 0.90),
    }, 2800, 11);
    // Independent raw-source panel read. This variant avoids whole-image
    // normalization, which can make the faint top-right map/time text disappear.
    const panelSourceRect = {
        left: Math.round(sourceWidth * 0.035),
        top: Math.round(sourceHeight * 0.035),
        width: Math.round(sourceWidth * 0.84),
        height: Math.round(sourceHeight * 0.90),
    };
    const panelSourceOcr = await runSourceCrop({ ...panelSourceRect }, 2800, 6, {
        grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '4x14', sharpen: '0x1+1+0.04',
    });

    // Locate the result-panel headings from OCR bounding boxes instead of using
    // fixed pixel coordinates. This makes the numeric crops adapt to resolution
    // and aspect ratio, provided the full results screen is visible.
    const anchorSourceLines = [
        ...standard.lines, ...sparse.lines, ...identity.lines, ...identitySparse.lines,
        ...performance.lines, ...missions.lines, ...metadataOcr.lines, ...metadataSparse.lines,
        ...sourceMetadataTightReads.flatMap((attempt) => attempt.lines || []),
        ...sourceIdentityRescueReads.flatMap((attempt) => attempt.lines || []),
        ...sourceMapModeRescueReads.flatMap((attempt) => attempt.lines || []),
        ...sourceMapModeReads.flatMap((attempt) => attempt.lines || []),
        ...sourceMapModeUpperReads.flatMap((attempt) => attempt.lines || []),
        ...sourceMapModeLowerReads.flatMap((attempt) => attempt.lines || []),
        ...panelOcr.lines, ...panelSparseOcr.lines, ...panelSourceOcr.lines,
    ].filter((line) => String(line.text || '').trim() && line.bbox);

    const findAnchor = (pattern, maxY = imageHeight * 0.97) => {
        const candidates = anchorSourceLines.filter((line) =>
            pattern.test(String(line.text || '')) &&
            line.bbox.y0 >= 0 && line.bbox.y0 < maxY &&
            line.bbox.x0 >= 0 && line.bbox.x0 < imageWidth * 0.85 &&
            line.bbox.y1 > line.bbox.y0,
        );
        candidates.sort((a, b) => {
            // Prefer compact heading boxes: some OCR passes incorrectly join a
            // heading to the reward numbers/icons on the next line, which would
            // push the crop boundary below the values we need to read.
            const heightA = a.bbox.y1 - a.bbox.y0;
            const heightB = b.bbox.y1 - b.bbox.y0;
            if (Math.abs(heightA - heightB) > 3) return heightA - heightB;
            const confidenceA = Number(a.confidence) || 0;
            const confidenceB = Number(b.confidence) || 0;
            if (Math.abs(confidenceA - confidenceB) > 3) return confidenceB - confidenceA;
            return a.bbox.y0 - b.bbox.y0;
        });
        return candidates[0] || null;
    };

    // OCR can drop the final word of a heading on smaller/blurry screenshots.
    // Prefer the exact label, then use its distinctive partial wording in the
    // same left-panel region; Performance is unique to this results panel.
    const receivedPattern = /received[\s\W_]{1,8}for[\s\W_]{1,8}the(?:[\s\W_]{1,8}battle)?/i;
    const performancePattern = /\bperformance\b/i;
    const missionsPattern = /combat\s+missions/i;
    const findAnchorLeft = (pattern, maxY = imageHeight * 0.97) => {
        const xs = anchorSourceLines
            .filter((line) => pattern.test(String(line.text || '')) &&
                line.bbox.y0 >= 0 && line.bbox.y0 < maxY &&
                line.bbox.x0 >= 0 && line.bbox.x0 < imageWidth * 0.85 &&
                line.bbox.y1 > line.bbox.y0)
            .map((line) => line.bbox.x0);
        return xs.length ? Math.min(...xs) : null;
    };
    const receivedAnchor = findAnchor(/received[\s\W_]{1,8}for[\s\W_]{1,8}the[\s\W_]{1,8}battle/i)
        || findAnchor(receivedPattern);
    const performanceAnchor = findAnchor(/battle\s+performance/i)
        || findAnchor(performancePattern);
    const missionsAnchor = findAnchor(missionsPattern)
        || findAnchor(/\bmissions\b/i);
    // A compact box is used for vertical boundaries, but the leftmost full-panel
    // detection is used for the crop's horizontal start so alternate crops cannot
    // move the extraction rectangle to the right and cut off leading digits.
    const receivedLeftX = findAnchorLeft(receivedPattern);
    const performanceLeftX = findAnchorLeft(performancePattern);

    // The rewards row has three numeric columns followed by medal/achievement
    // icons. OCR only this row, bounded by the detected headings, so unrelated
    // numbers in icons cannot shift Credits, XP, or Free XP.
    let rewardFieldOcr = { text: '', lines: [], words: [], confidence: 0 };
    let rewardFieldOcrCandidates = [];
    if (receivedAnchor?.bbox && performanceAnchor?.bbox) {
        const headingHeight = Math.max(1, receivedAnchor.bbox.y1 - receivedAnchor.bbox.y0);
        const effectiveHeadingHeight = Math.min(headingHeight, imageHeight * 0.035);
        // Use a row window between the rewards heading and the Battle Performance heading.
        // The bounds are based on OCR anchors, not fixed source-image pixels.
        const top = Math.max(0, Math.floor(
            receivedAnchor.bbox.y0 + effectiveHeadingHeight + Math.max(2, imageHeight * 0.002),
        ));
        const bottom = Math.min(imageHeight, Math.ceil(performanceAnchor.bbox.y0 - imageHeight * 0.002));
        const left = Math.max(0, Math.floor(Math.min(receivedAnchor.bbox.x0, receivedLeftX ?? receivedAnchor.bbox.x0) - imageWidth * 0.008));
        const width = Math.min(imageWidth - left, Math.ceil(imageWidth * 0.45));
        if (bottom - top >= imageHeight * 0.018 && width > 20) {
            const rewardRect = { left, top, width, height: bottom - top };
            const rewardPsm7 = await runCrop('reward-values-psm7', { ...rewardRect }, 2500, 7);
            const rewardPsm6 = await runCrop('reward-values-psm6', { ...rewardRect }, 2500, 6);
            rewardFieldOcrCandidates = [rewardPsm7, rewardPsm6];
            const rewardScores = rewardFieldOcrCandidates.map((attempt) => ({
                attempt,
                parsed: extractFocusedRewards(attempt.text),
                groups: extractRewardGroups(attempt.text).length,
            }));
            rewardScores.sort((a, b) => (Number(Boolean(b.parsed)) - Number(Boolean(a.parsed))) || b.groups - a.groups || (b.attempt.confidence - a.attempt.confidence));
            rewardFieldOcr = rewardScores[0]?.attempt || rewardPsm7;
        }
    }

    // If the OCR-word-anchored reward line is absent, incomplete or contradictory,
    // ask local OpenCV for a text-line geometry proposal. This is anchor-only: its
    // raw OCR result can place later crops but cannot become an accepted reward tuple.
    let cvRewardAttempt = null;
    const initialRewardTuples = rewardFieldOcrCandidates.map(attempt => extractFocusedRewards(attempt.text))
        .filter(tuple => tuple && /^\d{5,9}$/.test(String(tuple.credits || '')) &&
            /^\d{1,7}$/.test(String(tuple.xp || '')) && /^\d{1,7}$/.test(String(tuple.freeXp || '')))
        .map(tuple => `${tuple.credits}|${tuple.xp}|${tuple.freeXp}`);
    const cvRewardNeedsRescue = !receivedAnchor?.bbox || !performanceAnchor?.bbox ||
        new Set(initialRewardTuples).size !== 1 || initialRewardTuples.length < 2;
    const cvRewardRegion = cvRegion('rewardBand', 0.16);
    if (cvRewardNeedsRescue && cvRewardRegion) {
        cvRewardAttempt = await runSourceCrop({ ...cvRewardRegion.rect }, 2700, 7, {
            grayscale: true, contrastStretch: '0.5%x0.5%', sharpen: '0x1+1+0.03',
        });
        cvRewardAttempt.cvAssisted = true;
        cvRewardAttempt.cvRegion = cvRewardRegion;
    }

    // When OCR's bounding box for the second Credits chunk includes the nearby
    // coin icon, re-read only the numeric-width portion of that word. This repairs
    // common outputs such as “899 8369” where the icon is falsely seen as a 9.
    let repairedCreditChunk = '';
    const rewardNumericWords = (rewardFieldOcr.words || [])
        .filter((word) => /\d/.test(word.text) && word.bbox && word.bbox.x1 > word.bbox.x0 && word.bbox.y1 > word.bbox.y0)
        .sort((a, b) => a.bbox.x0 - b.bbox.x0);
    if (rewardNumericWords.length >= 2) {
        const firstWord = rewardNumericWords[0];
        const secondWord = rewardNumericWords[1];
        const firstDigits = normaliseOcrNumber(firstWord.text);
        const secondDigits = normaliseOcrNumber(secondWord.text);
        const firstWidth = firstWord.bbox.x1 - firstWord.bbox.x0;
        const secondWidth = secondWord.bbox.x1 - secondWord.bbox.x0;
        const gap = secondWord.bbox.x0 - firstWord.bbox.x1;
        const sameRow = Math.abs(((firstWord.bbox.y0 + firstWord.bbox.y1) / 2) - ((secondWord.bbox.y0 + secondWord.bbox.y1) / 2)) < Math.max(firstWord.bbox.y1 - firstWord.bbox.y0, secondWord.bbox.y1 - secondWord.bbox.y0) * 0.5;
        const looksLikeCoinContamination = firstDigits.length === 3 && secondDigits.length >= 3 &&
            firstWidth > 0 && secondWidth > firstWidth * 1.20 && gap <= firstWidth * 0.30 && sameRow;
        if (looksLikeCoinContamination) {
            const wordHeight = secondWord.bbox.y1 - secondWord.bbox.y0;
            const tightRect = {
                left: Math.max(0, Math.floor(secondWord.bbox.x0 - firstWidth * 0.015)),
                top: Math.max(0, Math.floor(secondWord.bbox.y0 - wordHeight * 0.16)),
                width: Math.max(5, Math.ceil(firstWidth * 1.08)),
                height: Math.max(5, Math.ceil(wordHeight * 1.32)),
            };
            const tightRead = await runCrop('credit-chunk-tight', tightRect, 1000, 8);
            const tightDigits = (String(tightRead.text || '').match(/\d{3}/) || [])[0] || '';
            if (tightDigits) repairedCreditChunk = tightDigits;
        }
    }

    // Independently read each numeric reward column. The wide reward band can
    // include the coin/star icons; the OCR then appends a nearby digit (for example
    // 14390 -> 143905 or 2653 -> 26534). These column crops end before the adjacent
    // icon/field and are read with two distinct segmentation modes and a digit
    // whitelist. Values are accepted only when both localized reads agree.
    const localizedRewardEvidence = {
        attempted: Boolean(receivedAnchor?.bbox && performanceAnchor?.bbox),
        anchors: {
            received: receivedAnchor?.bbox || null,
            performance: performanceAnchor?.bbox || null,
            receivedLeftX: receivedLeftX ?? null,
        },
        bounds: null,
        rects: {},
        reads: { credits: [], xp: [], freeXp: [] },
        values: { credits: '', xp: '', freeXp: '' },
    };
    if (localizedRewardEvidence.attempted) {
        const localizedHeadingHeight = Math.max(1, receivedAnchor.bbox.y1 - receivedAnchor.bbox.y0);
        const baseX = Math.max(0, Math.min(receivedAnchor.bbox.x0, receivedLeftX ?? receivedAnchor.bbox.x0) - imageWidth * 0.002);
        const rewardTop = Math.max(0, Math.floor(
            receivedAnchor.bbox.y0 + Math.min(localizedHeadingHeight, imageHeight * 0.035) + Math.max(2, imageHeight * 0.002),
        ));
        const rewardBottom = Math.min(imageHeight, Math.ceil(performanceAnchor.bbox.y0 - imageHeight * 0.002));
        localizedRewardEvidence.bounds = { baseX, top: rewardTop, bottom: rewardBottom, imageWidth, imageHeight };
        // Two common display layouts have different horizontal spacings. Use
        // the detected reward-heading x position rather than assuming the same
        // gaps from the screen edge. Values still have to agree across PSM 7/8.
        // The reward-heading text can start well inside a centered result panel
        // even when the numeric columns use the compact/left-panel spacing. Use
        // the independently detected Battle Performance panel edge to classify
        // the layout, not the Received-for-the-Battle heading's x coordinate.
        // The Windows RC2 evidence shows the latter at x≈320 while the panel
        // begins at x≈201 on a 1920px image; the old test chose the wider-layout
        // offsets and cropped the XP/Free-XP columns too far left.
        const panelLeftForLayout = Number(performanceLeftX ?? performanceAnchor.bbox.x0);
        const compactLeftLayout = panelLeftForLayout / imageWidth < 0.12;
        const columnSpecs = compactLeftLayout ? {
            credits: { offset: -0.001, width: 0.10 },
            xp: { offset: 0.125, width: 0.078 },
            freeXp: { offset: 0.229, width: 0.080 },
        } : {
            credits: { offset: -0.001, width: 0.068 },
            xp: { offset: 0.091, width: 0.060 },
            freeXp: { offset: 0.180, width: 0.040 },
        };
        if (rewardBottom - rewardTop >= imageHeight * 0.018) {
            for (const psm of [7, 8]) {
                await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
                try {
                    for (const field of ['credits', 'xp', 'freeXp']) {
                        const column = columnSpecs[field];
                        const rect = {
                            left: Math.max(0, Math.round(baseX + imageWidth * column.offset)),
                            top: rewardTop,
                            width: Math.max(5, Math.round(imageWidth * column.width)),
                            height: Math.max(5, rewardBottom - rewardTop),
                        };
                        localizedRewardEvidence.rects[`${field}-psm${psm}`] = rect;
                        const attempt = await runCrop(`reward-${field}-digits-psm${psm}`, rect, 1400, psm);
                        const value = parseLocalizedNumericField(attempt.text, field);
                        localizedRewardEvidence.reads[field].push({
                            value,
                            confidence: Number(attempt.confidence) || 0,
                            psm,
                            text: String(attempt.text || ''),
                        });
                    }
                } finally {
                    await worker.setParameters({ tessedit_char_whitelist: '' });
                }
            }
        }
        for (const field of ['credits', 'xp', 'freeXp']) {
            const values = new Map();
            for (const read of localizedRewardEvidence.reads[field]) {
                if (!read.value) continue;
                values.set(read.value, (values.get(read.value) || 0) + 1);
            }
            const agreed = [...values.entries()].filter(([, count]) => count >= 2);
            if (agreed.length === 1) localizedRewardEvidence.values[field] = agreed[0][0];
        }


    }

    // Fallback reward scan: try the narrow horizontal band at the usual reward-row
    // position on the ORIGINAL screenshot. This remains diagnostic/back-up evidence;
    // broad reads below are not allowed to override failed localized field consensus.
    let usedFixedRewardFallback = false;
    const existingRewardGroups = new Map();
    for (const attempt of rewardFieldOcrCandidates) {
        const parsed = extractFocusedRewards(attempt.text);
        if (!parsed) continue;
        const key = `${parsed.credits}|${parsed.xp}|${parsed.freeXp}`;
        const group = existingRewardGroups.get(key) || { count: 0 };
        group.count += 1;
        existingRewardGroups.set(key, group);
    }
    // A complete tuple is trusted only when the dedicated OCR passes agree
    // and broad full-screen reads do not contradict it. A conflicting broad
    // read triggers the fixed raw-image band fallback instead of making XP
    // ambiguous after the crop has already isolated the rewards row.
    const focusedTupleKey = existingRewardGroups.size === 1 ? [...existingRewardGroups.keys()][0] : null;
    const broadRewardReads = [standard, sparse].map((attempt) => extractRewards(attempt.text))
        .filter((parsed) => /^\d{5,9}$/.test(String(parsed.credits || '')) &&
            /^\d{1,7}$/.test(String(parsed.xp || '')) && /^\d{1,7}$/.test(String(parsed.freeXp || '')));
    const broadRewardConflict = Boolean(focusedTupleKey) && broadRewardReads.some((parsed) =>
        `${parsed.credits}|${parsed.xp}|${parsed.freeXp}` !== focusedTupleKey,
    );
    const hasCompleteRewardRead = existingRewardGroups.size === 1 &&
        [...existingRewardGroups.values()][0]?.count >= 2 && !broadRewardConflict;
    if (!hasCompleteRewardRead) {
        const rewardReads = [];
        for (const yFraction of [0.36, 0.37, 0.39]) {
            const rect = {
                left: Math.round(sourceWidth * 0.12),
                top: Math.round(Number(metadata.height) * yFraction),
                width: Math.round(sourceWidth * 0.50),
                height: Math.round(Number(metadata.height) * 0.055),
            };
            for (const psm of [6, 7]) {
                const attempt = await runSourceCrop({ ...rect }, 2500, psm, {
                    grayscale: true, contrastStretch: '1%x1%', sharpen: '0x1+1+0.02',
                });
                const parsed = extractFocusedRewards(attempt.text);
                if (parsed) rewardReads.push({ attempt, parsed, yFraction });
            }
        }
        const groups = new Map();
        for (const read of rewardReads) {
            const key = `${read.parsed.credits}|${read.parsed.xp}|${read.parsed.freeXp}`;
            const group = groups.get(key) || { parsed: read.parsed, reads: [], confidence: 0 };
            group.reads.push(read);
            group.confidence += Number(read.attempt.confidence) || 0;
            groups.set(key, group);
        }
        const selected = [...groups.values()]
            .filter((group) => group.reads.length >= 2)
            .sort((a, b) => b.reads.length - a.reads.length || b.confidence / b.reads.length - a.confidence / a.reads.length)[0];
        if (selected) {
            usedFixedRewardFallback = true;
            rewardFieldOcrCandidates = selected.reads.map((read) => read.attempt);
            rewardFieldOcr = selected.reads.slice().sort((a, b) => (Number(b.attempt.confidence) || 0) - (Number(a.attempt.confidence) || 0))[0].attempt;
        }
    }

    // Derive numeric crops from the selected broad reward-row OCR word boxes, after
    // the fixed-band recovery has had a chance to replace a weak anchor-crop result.
    // Because reward values are laid out sequentially, this follows the actual text
    // positions instead of fixed percentage columns that clip long values.
    if (localizedRewardEvidence.attempted) {
        const bounds = localizedRewardEvidence.bounds || {};
        const rewardTop = Number(bounds.top) || 0;
        const rewardBottom = Number(bounds.bottom) || 0;
        const allRewardWords = (rewardFieldOcr.words || [])
            .filter((word) => word.bbox && /\d/.test(String(word.text || '')) &&
                word.bbox.x1 > word.bbox.x0 && word.bbox.y1 > word.bbox.y0 &&
                (word.bbox.y0 + word.bbox.y1) / 2 >= rewardTop - imageHeight * 0.015 &&
                (word.bbox.y0 + word.bbox.y1) / 2 <= rewardBottom + imageHeight * 0.015)
            .sort((a, b) => a.bbox.x0 - b.bbox.x0);
        // The first three numeric OCR tokens are not necessarily Credits, XP,
        // and Free XP: Credits may be split into `1650` + `259®`, shifting every
        // later token one slot to the right. Assign word boxes by their horizontal
        // column windows so each crop is anchored to its own field, not token order.
        const wordBaseX = allRewardWords.length ? Math.min(...allRewardWords.map(word => word.bbox.x0)) : null;
        const wordFieldSpecs = {
            credits: { minDigits: 5, targetOffset: 0, minOffset: -0.025, maxOffset: 0.11 },
            xp: { targetOffset: 0.14, minOffset: 0.075, maxOffset: 0.22 },
            freeXp: { targetOffset: 0.255, minOffset: 0.165, maxOffset: 0.39 },
        };
        const wordForField = {};
        for (const [field, spec] of Object.entries(wordFieldSpecs)) {
            if (wordBaseX === null) { wordForField[field] = null; continue; }
            const minX = wordBaseX + imageWidth * spec.minOffset;
            const maxX = wordBaseX + imageWidth * spec.maxOffset;
            const targetX = wordBaseX + imageWidth * spec.targetOffset;
            const candidates = allRewardWords
                .filter(word => word.bbox.x0 >= minX && word.bbox.x0 <= maxX)
                .sort((a, b) => Math.abs(a.bbox.x0 - targetX) - Math.abs(b.bbox.x0 - targetX) ||
                    (Number(b.confidence) || 0) - (Number(a.confidence) || 0));
            let selectedWord = candidates[0] || null;
            // On some scales OCR splits a reward value into a one/two digit
            // prefix followed immediately by the remaining digits. If the field
            // anchor landed on that prefix, move to the adjacent longer token;
            // the later crop stage will re-read the combined image region rather
            // than concatenating OCR strings.
            if ((field === 'xp' || field === 'freeXp') && selectedWord &&
                /^\d{1,2}$/.test(String(selectedWord.text || '').trim())) {
                const next = allRewardWords.filter((word) => word !== selectedWord && word.bbox.x0 > selectedWord.bbox.x1 &&
                    /^\d{2,7}\D*$/.test(String(word.text || '').trim()) &&
                    word.bbox.x0 >= minX && word.bbox.x0 <= maxX &&
                    word.bbox.x0 - selectedWord.bbox.x1 <= Math.max(imageWidth * 0.018, imageHeight * 0.032) &&
                    Math.abs(((word.bbox.y0 + word.bbox.y1) / 2) - ((selectedWord.bbox.y0 + selectedWord.bbox.y1) / 2)) <=
                        Math.max(imageHeight * 0.015, (word.bbox.y1 - word.bbox.y0) * 0.65))
                    .sort((a, b) => a.bbox.x0 - b.bbox.x0)[0];
                if (next) selectedWord = next;
            }
            wordForField[field] = selectedWord;
        }
        localizedRewardEvidence.wordGeometry = {
            sourceCrop: rewardFieldOcr.sourceCrop || null,
            words: allRewardWords.map((word) => ({ text: word.text, confidence: word.confidence, bbox: word.bbox })),
            selectedWords: Object.fromEntries(Object.entries(wordForField).map(([field, word]) => [field, word ? { text: word.text, bbox: word.bbox } : null])),
            reads: { credits: [], xp: [], freeXp: [] },
            acceptedValues: { credits: '', xp: '', freeXp: '' },
        };
        const tokenFields = ['credits', 'xp', 'freeXp'];
        for (const field of tokenFields) {
            const word = wordForField[field];
            if (!word) continue;
            const box = word.bbox;
            const tokenText = String(word.text || '');
            const digitText = tokenText.replace(/\D/g, '');
            if (!digitText) continue;
            let targetFraction = 1;
            let splitLeadingDigitPrefix = null;
            let splitAdjacentCreditToken = null;
            // Some reward fields are split by OCR into adjacent tokens. We use
            // their joint bounding box for a new digits-only OCR pass, never to
            // concatenate the tokens themselves as an accepted field value.
            if (field === 'credits' && digitText.length < wordFieldSpecs.credits.minDigits) {
                // Only join a neighboring token when the leading Credits token is
                // too short to be valid by itself (e.g. `828` + `719@`). A complete
                // token like `317943@` must not absorb the adjacent XP column.
                splitAdjacentCreditToken = allRewardWords.filter((candidate) => {
                    if (candidate === word || !candidate.bbox || candidate.bbox.x0 < box.x1) return false;
                    const candidateText = String(candidate.text || '').trim();
                    const candidateDigits = candidateText.replace(/\D/g, '');
                    const gap = candidate.bbox.x0 - box.x1;
                    const aY = (box.y0 + box.y1) / 2;
                    const bY = (candidate.bbox.y0 + candidate.bbox.y1) / 2;
                    return candidateDigits.length >= 3 && candidateDigits.length <= 6 &&
                        gap <= Math.max(imageWidth * 0.018, imageHeight * 0.032) &&
                        Math.abs(aY - bY) <= Math.max(imageHeight * 0.015, (box.y1 - box.y0) * 0.65) &&
                        candidate.bbox.x0 <= wordBaseX + imageWidth * 0.15;
                }).sort((a, b) => a.bbox.x0 - b.bbox.x0)[0] || null;
            }
            if ((field === 'xp' || field === 'freeXp') && digitText.length >= 2 && digitText.length <= 7) {
                const spec = wordFieldSpecs[field];
                const targetX = wordBaseX + imageWidth * spec.targetOffset;
                const minX = wordBaseX + imageWidth * spec.minOffset;
                const candidateAligned = Math.abs(box.x0 - targetX) <= imageWidth * 0.09;
                if (candidateAligned) {
                    splitLeadingDigitPrefix = allRewardWords.filter((candidate) => {
                        if (candidate === word || !/^\d{1,2}$/.test(String(candidate.text || '').trim()) ||
                            !candidate.bbox || candidate.bbox.x1 > box.x0) return false;
                        const gap = box.x0 - candidate.bbox.x1;
                        const candidateCenterY = (candidate.bbox.y0 + candidate.bbox.y1) / 2;
                        const currentCenterY = (box.y0 + box.y1) / 2;
                        return gap <= Math.max(imageWidth * 0.018, imageHeight * 0.032) &&
                            candidate.bbox.x0 >= minX && candidate.bbox.x0 >= targetX - imageWidth * 0.09 &&
                            Math.abs(candidateCenterY - currentCenterY) <= Math.max(imageHeight * 0.015, (box.y1 - box.y0) * 0.65);
                    }).sort((a, b) => b.bbox.x1 - a.bbox.x1)[0] || null;
                }
            }
            // A trailing non-numeric glyph after Credits is commonly the coin icon
            // misread as punctuation. The glyph occupies only part of the token
            // extent, so leave room for all printed digits instead of clipping at 70%.
            if (field === 'credits' && /[^0-9,.\s]$/u.test(tokenText)) {
                targetFraction = Math.max(0.70, Math.min(0.95, digitText.length / Math.max(1, tokenText.length)));
            } else if (/\D/.test(tokenText)) targetFraction = Math.max(0.70, Math.min(1, digitText.length / Math.max(1, tokenText.length)));
            else if (field === 'xp' && digitText.length > 5) targetFraction = 5 / digitText.length;
            else if (field === 'freeXp' && digitText.length > 7) targetFraction = 7 / digitText.length;
            const singleCreditAdornment = field === 'credits' && digitText.length >= wordFieldSpecs.credits.minDigits &&
                /[^0-9,.\s]$/u.test(tokenText) && digitText.length < tokenText.replace(/\s/g, '').length;
            const fractions = (splitLeadingDigitPrefix || splitAdjacentCreditToken)
                ? [0.94, 0.97, 1.00]
                : singleCreditAdornment ? [0.82, 0.84, 0.86]
                : [...new Set([targetFraction - 0.05, targetFraction, targetFraction + 0.035]
                    .map((fraction) => Math.max(0.55, Math.min(1, Number(fraction.toFixed(3))))) )];
            const boxHeight = Math.max(5, box.y1 - box.y0);
            for (const fraction of fractions) {
                let rect;
                if (splitLeadingDigitPrefix || splitAdjacentCreditToken) {
                    const leftWord = splitLeadingDigitPrefix || word;
                    const rightWord = splitAdjacentCreditToken || word;
                    const cropLeft = Math.max(0, Math.floor(leftWord.bbox.x0 - boxHeight * 0.04));
                    const rightLimit = Math.min(imageWidth, Math.ceil(rightWord.bbox.x1 + imageWidth * 0.006));
                    const availableWidth = Math.max(5, rightLimit - cropLeft);
                    rect = {
                        left: cropLeft,
                        top: Math.max(0, Math.floor(Math.min(leftWord.bbox.y0, box.y0) - boxHeight * 0.14)),
                        width: Math.max(5, Math.min(Math.ceil(availableWidth * fraction), rightLimit - cropLeft)),
                        height: Math.max(5, Math.ceil(Math.max(leftWord.bbox.y1, box.y1) - Math.min(leftWord.bbox.y0, box.y0) + boxHeight * 0.28)),
                    };
                } else {
                    rect = {
                        left: Math.max(0, Math.floor(box.x0 - boxHeight * 0.04)),
                        top: Math.max(0, Math.floor(box.y0 - boxHeight * 0.14)),
                        width: Math.max(5, Math.ceil((box.x1 - box.x0) * fraction + boxHeight * 0.04)),
                        height: Math.max(5, Math.ceil(boxHeight * 1.30)),
                    };
                }
                for (const psm of [7, 8]) {
                    await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
                    let attempt;
                    try {
                        attempt = await runCrop(`reward-${field}-wordbox-${fraction}-psm${psm}`, rect, 1200, psm);
                    } finally {
                        await worker.setParameters({ tessedit_char_whitelist: '' });
                    }
                    localizedRewardEvidence.wordGeometry.reads[field].push({
                        value: parseLocalizedNumericField(attempt.text, field),
                        text: String(attempt.text || ''), confidence: Number(attempt.confidence) || 0,
                        psm, fraction, rect,
                    });
                }
            }
            const groups = new Map();
            for (const read of localizedRewardEvidence.wordGeometry.reads[field]) {
                if (!read.value) continue;
                const group = groups.get(read.value) || { value: read.value, widths: new Set(), reads: [] };
                group.widths.add(read.fraction);
                group.reads.push(read);
                groups.set(read.value, group);
            }
            // Require a unique quorum from multiple crop widths and PSMs. The raw
            // broad-band number by itself never becomes accepted field data.
            const accepted = [...groups.values()].filter((group) => group.widths.size >= 2 &&
                new Set(group.reads.map((read) => read.psm)).size >= 2 && group.reads.length >= 3);
            if (accepted.length === 1) {
                localizedRewardEvidence.wordGeometry.acceptedValues[field] = accepted[0].value;
                localizedRewardEvidence.values[field] = accepted[0].value;
            }
        }
    }

    // Damage is the large number in the leftmost column under Battle performance.
    // A narrow crop anchored to the heading prevents ribbon counts from becoming
    // the damage value. All crop sizes are proportional to the detected image size.
    let damageFieldOcr = { text: '', lines: [], words: [], confidence: 0 };
    let damageFieldOcrCandidates = [];
    let damageProviderRect = null;
    if (performanceAnchor?.bbox && missionsAnchor?.bbox) {
        const performanceHeadingHeight = Math.max(1, performanceAnchor.bbox.y1 - performanceAnchor.bbox.y0);
        const effectivePerformanceHeadingHeight = Math.min(performanceHeadingHeight, imageHeight * 0.035);
        const top = Math.max(0, Math.floor(
            performanceAnchor.bbox.y0 + effectivePerformanceHeadingHeight + imageHeight * 0.002,
        ));
        const bottom = Math.min(missionsAnchor.bbox.y0, Math.ceil(top + imageHeight * 0.13));
        const performanceLeft = Math.min(performanceAnchor.bbox.x0, performanceLeftX ?? performanceAnchor.bbox.x0);
        const compactLeftLayout = performanceLeft / imageWidth < 0.12;
        const left = Math.max(0, Math.floor(performanceLeft - imageWidth * (compactLeftLayout ? 0.002 : 0.004)));
        // Damage occupies only the first numeric column. Use a slightly wider
        // window at the common result-screen scales, then prefer full-screen
        // consensus when a ribbon edge still contaminates the cropped read.
        const narrowWidth = Math.min(imageWidth - left, Math.ceil(imageWidth * (compactLeftLayout ? 0.09 : 0.075)));
        const narrowRect = { left, top, width: narrowWidth, height: bottom - top };
        damageProviderRect = { ...narrowRect };
        if (bottom - top >= imageHeight * 0.018 && narrowWidth > 15) {
            const psm7 = await runCrop('damage-value-psm7', { ...narrowRect }, 1400, 7);
            const psm6 = await runCrop('damage-value-psm6', { ...narrowRect }, 1400, 6);
            damageFieldOcrCandidates = [psm7, psm6];
            damageFieldOcr = extractFocusedDamage(psm7.text) ? psm7 : extractFocusedDamage(psm6.text) ? psm6 : psm7;
        }
        const hasOnlyFiveDigitDamage = damageFieldOcrCandidates.some((attempt) => /^\d{5}$/.test(extractFocusedDamage(attempt.text))) &&
            !damageFieldOcrCandidates.some((attempt) => /^\d{6,9}$/.test(extractFocusedDamage(attempt.text)));
        if (hasOnlyFiveDigitDamage) {
            const recoveryWidth = Math.min(imageWidth - left, Math.ceil(imageWidth * 0.085));
            const recoveryTop = Math.max(0, Math.floor(performanceAnchor.bbox.y0 + Math.min(performanceHeadingHeight, imageHeight * 0.035) + Math.max(3, imageHeight * 0.006)));
            const recoveryHeight = Math.max(12, Math.min(missionsAnchor.bbox.y0 - recoveryTop, Math.ceil(imageHeight * 0.13)));
            const recoveryRect = { left, top: recoveryTop, width: recoveryWidth, height: recoveryHeight };
            await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
            try {
                const recovery6 = await runCrop('damage-value-recovery-psm6', { ...recoveryRect }, 1500, 6);
                const recovery8 = await runCrop('damage-value-recovery-psm8', { ...recoveryRect }, 1500, 8);
                damageFieldOcrCandidates.push(recovery6, recovery8);
                if (/^\d{6,9}$/.test(extractFocusedDamage(recovery6.text))) damageFieldOcr = recovery6;
                else if (/^\d{6,9}$/.test(extractFocusedDamage(recovery8.text))) damageFieldOcr = recovery8;
            } finally {
                await worker.setParameters({ tessedit_char_whitelist: '' });
            }
        }
        if (!damageFieldOcrCandidates.some((attempt) => /^\d{6,9}$/.test(extractFocusedDamage(attempt.text)))) {
            const wideTop = Math.max(0, Math.floor(performanceAnchor.bbox.y0 + Math.min(performanceHeadingHeight, imageHeight * 0.035) + Math.max(3, imageHeight * 0.006)));
            const wideHeight = Math.max(12, Math.min(missionsAnchor.bbox.y0 - wideTop, Math.ceil(imageHeight * 0.13)));
            const wideWidth = Math.min(imageWidth - left, Math.ceil(imageWidth * 0.18));
            if (wideHeight >= imageHeight * 0.025 && wideWidth > narrowWidth) {
                const wideRect = { left, top: wideTop, width: wideWidth, height: wideHeight };
                const wide6 = await runCrop('damage-value-wide-psm6', { ...wideRect }, 1500, 6);
                const wide8 = await runCrop('damage-value-wide-psm8', { ...wideRect }, 1500, 8);
                damageFieldOcrCandidates.push(wide6, wide8);
                if (extractFocusedDamage(wide6.text)) damageFieldOcr = wide6;
                else if (extractFocusedDamage(wide8.text)) damageFieldOcr = wide8;
            }
        }
        // The value is directly above the visible “Damage” caption. Find the
        // caption via OCR word geometry, then crop relative to it rather than using
        // a global y fraction. This handles screenshots where the panel shifts.
        const damageLabels = (performance.words || []).filter((word) =>
            /^damage$/i.test(String(word.text || '').trim()) && word.bbox &&
            word.bbox.x0 < imageWidth * 0.36 &&
            word.bbox.y0 > performanceAnchor.bbox.y0 &&
            word.bbox.y1 < missionsAnchor.bbox.y0,
        ).sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));
        const damageLabel = damageLabels[0];
        if (damageLabel) {
            const labelBox = damageLabel.bbox;
            const labelWidth = Math.max(8, labelBox.x1 - labelBox.x0);
            const labelHeight = Math.max(8, labelBox.y1 - labelBox.y0);
            const compactCaptionLayout = labelBox.x0 / imageWidth < 0.12;
            const leftMultiplier = compactCaptionLayout ? 2.10 : 1.60;
            // In the common non-compact layout the damage value's final glyph
            // extends slightly beyond 2.00 label-widths; stop before the ribbon
            // itself, but leave enough margin for the last digit (e.g. 303622).
            // The six-digit value above the Damage caption can extend about 3.3
            // caption-widths past the label's left edge. The old 2.00 bound clipped
            // the last glyph; 3.30 still ends at the ribbon seam on this layout.
            const rightMultiplier = compactCaptionLayout ? 2.55 : 3.30;
            const labelLeft = Math.max(0, Math.floor(labelBox.x0 - labelWidth * leftMultiplier));
            const rightLimit = Math.min(imageWidth, Math.ceil(labelBox.x0 + labelWidth * rightMultiplier));
            const availableWidth = Math.max(30, rightLimit - labelLeft);
            const labelRectVariants = (compactCaptionLayout ? [0.94, 0.97, 1.00] : [0.94, 0.97, 1.00]).map((fraction, geometryIndex) => ({
                geometryIndex,
                left: labelLeft,
                top: Math.max(0, Math.floor(labelBox.y0 - labelHeight * 3.10)),
                width: Math.max(30, Math.min(Math.ceil(availableWidth * fraction), rightLimit - labelLeft)),
                height: Math.max(20, Math.ceil(labelHeight * 2.85)),
            }));
            await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
            try {
                for (const variant of labelRectVariants) {
                    for (const psm of [7, 8]) {
                        const attempt = await runCrop(`damage-caption-derived-w${variant.geometryIndex}-psm${psm}`, { ...variant }, 1200, psm);
                        attempt.damageCropExcludesAdjacentUi = true;
                        attempt.damageCropSource = 'damage-caption-derived';
                        attempt.damageCropWidthFraction = variant.width / imageWidth;
                        damageFieldOcrCandidates.push(attempt);
                        if (/^\d{5,9}$/.test(extractFocusedDamage(attempt.text))) damageFieldOcr = attempt;
                    }
                }
                const existingDamageValues = damageFieldOcrCandidates.map((attempt) => extractFocusedDamage(attempt.text));
                const existingDamageHasConsensus = hasUniqueDamageConsensus(existingDamageValues);
                const broadDamageValues = extractFullScreenDamageCandidates([standard, sparse]);
                const focusedDamageSet = new Set(existingDamageValues.filter((value) => /^\d{5,9}$/.test(String(value || ''))));
                const broadDamageConflict = broadDamageValues.some((candidate) => /^\d{5,9}$/.test(String(candidate.value || '')) &&
                    !focusedDamageSet.has(String(candidate.value)));
                if (!existingDamageHasConsensus || broadDamageConflict) {
                    // Repeat the caption-anchored crops against unnormalized source
                    // pixels. This helps when normalization changes the first digit
                    // or smooths off a trailing zero. These are new OCR reads, not
                    // inferred values; damage arbitration remains fail-closed.
                    const sourceScaleX = sourceWidth / imageWidth;
                    const sourceScaleY = sourceHeight / imageHeight;
                    for (const variant of labelRectVariants) {
                        const sourceRect = {
                            left: Math.round(variant.left * sourceScaleX),
                            top: Math.round(variant.top * sourceScaleY),
                            width: Math.max(1, Math.round(variant.width * sourceScaleX)),
                            height: Math.max(1, Math.round(variant.height * sourceScaleY)),
                        };
                        for (const psm of [7, 8]) {
                            const attempt = await runSourceCrop({ ...sourceRect }, 1600, psm, {
                                grayscale: true, contrastStretch: '0.5%x0.5%', brightnessContrast: '4x14', sharpen: '0x1+1+0.04',
                            });
                            attempt.damageCropExcludesAdjacentUi = true;
                            attempt.damageCropSource = 'damage-caption-derived-source';
                            attempt.damageCropWidthFraction = sourceRect.width / sourceWidth;
                            damageFieldOcrCandidates.push(attempt);
                            if (/^\d{5,9}$/.test(extractFocusedDamage(attempt.text))) damageFieldOcr = attempt;
                        }
                    }
                }
            } finally {
                await worker.setParameters({ tessedit_char_whitelist: '' });
            }
        }
    }

    // If layout-anchor crops missed Damage, scan the digits-only region with a
    // numeric whitelist. This avoids medal counters/icons being interpreted as
    // digits and handles screenshots whose result panel sits a little lower.
    // A lone damage read is not enough to be considered a consensus, even if
    // the anchor crop returned some digits. Re-read the value on the raw image
    // until at least two OCR modes agree. The prior fallback started at 14.2% of
    // image width, which clipped leading digits on common results layouts.
    const damageCropSweepDiagnostics = [];
    const initialDamageValues = damageFieldOcrCandidates.map((attempt) => extractFocusedDamage(attempt.text));
    // A matching pair is not a consensus when another focused crop supplies a
    // different, otherwise-valid damage value. Trigger the bounded sweep on any
    // such conflict instead of letting a 2-to-1 plurality suppress recovery.
    const initialDamageConsensus = hasUniqueDamageConsensus(initialDamageValues);
    const fullScreenDamageCandidatesForSweep = extractFullScreenDamageCandidates([standard, sparse]);
    const initialValidDamageValues = new Set(initialDamageValues
        .map((value) => String(value || '').trim())
        .filter((value) => /^\d{5,9}$/.test(value)));
    const fullScreenConflictsWithInitialDamage = fullScreenDamageCandidatesForSweep.some((candidate) =>
        /^\d{5,9}$/.test(String(candidate.value || '')) &&
        !initialValidDamageValues.has(String(candidate.value)),
    );
    if (!initialDamageConsensus || fullScreenConflictsWithInitialDamage) {
        const damageReads = [];
        await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
        try {
            // Values live immediately left of the first ribbon. Keep this crop
            // narrow, aligned to the left edge of the performance panel, and use
            // two close vertical offsets so the full digits remain in frame.
            const performanceAnchorLeftX = performanceAnchor?.bbox
                ? Math.min(performanceAnchor.bbox.x0, performanceLeftX ?? performanceAnchor.bbox.x0)
                : null;
            // On newer/left-aligned layouts the damage value begins around 7% of
            // the source width; on a wide legacy layout it begins around 14%.
            // The heading's x-position distinguishes these cases and avoids a
            // generic crop that clips one layout or absorbs the first ribbon.
            const measuredDamageLeftFraction = performanceAnchorLeftX === null
                ? 0.142
                : Math.max(0.03, performanceAnchorLeftX / imageWidth - 0.022);
            const rewardBaseFraction = Number.isFinite(Number(localizedRewardEvidence.bounds?.baseX))
                ? Number(localizedRewardEvidence.bounds.baseX) / imageWidth
                : null;
            const anchorDisagreement = rewardBaseFraction !== null &&
                Math.abs(measuredDamageLeftFraction - rewardBaseFraction) > 0.04;
            // On some oversized sources the performance-heading bbox is normalized
            // from a different crop. Prefer the reward-row base when it materially
            // disagrees, except on 3840px wide layouts where that anchor can also be
            // left-shifted; those have a consistent damage column near 14%.
            const correctedDamageLeftFraction = sourceWidth >= 3000 && measuredDamageLeftFraction < 0.10
                ? 0.14
                : anchorDisagreement
                    ? Math.max(0.03, rewardBaseFraction - 0.02)
                    : sourceWidth >= 2500 && measuredDamageLeftFraction < 0.12
                        ? 0.16
                        : measuredDamageLeftFraction;
            const damageLeftFractions = [correctedDamageLeftFraction];
            const needsExpandedDamageSweep = fullScreenDamageCandidatesForSweep.some((full) =>
                String(full.value || '').length >= 7);
            // A compact left-aligned damage column can begin near 5% of the
            // source width. In the 134,953 fixture, 10.6% ends before the final
            // digit while the first ribbon begins just beyond 12%. Extend only
            // this left-column sweep to the measured safe interval; the existing
            // multi-width/multi-PSM quorum still decides whether any value is usable.
            const lowLeftCompactDamagePanel =
                correctedDamageLeftFraction < 0.08 ||
                (anchorDisagreement && rewardBaseFraction !== null &&
                    rewardBaseFraction < 0.10 && correctedDamageLeftFraction < 0.10);
            const damageSweepWidthFractions = lowLeftCompactDamagePanel
                ? [0.108, 0.110, 0.112, 0.114, 0.116]
                : needsExpandedDamageSweep
                    ? [0.096, 0.098, 0.100, 0.102, 0.104, 0.106]
                    : [0.096, 0.098, 0.100];
            // The damage row moves vertically with the UI scale. Anchor its top
            // just below the detected heading, then map prepared-image coordinates
            // back onto the unmodified source image. Use a stable estimate only if
            // the heading itself was not detected.
            const fallbackDamageTop = performanceAnchor?.bbox
                ? Math.round((performanceAnchor.bbox.y1 + Math.max(3, imageHeight * 0.004)) * Number(metadata.height) / imageHeight)
                : Math.round(Number(metadata.height) * 0.455);
            // Sweep three right-edge boundaries around the damage/ribbon seam. The
            // value column sits immediately before ribbon icons; a single fixed crop
            // can either clip the final digit or absorb an icon digit. Accept a value
            // only when separate widths and segmentation modes agree.
            for (const leftFraction of damageLeftFractions) {
                for (const widthFraction of damageSweepWidthFractions) {
                    const rect = {
                        left: Math.round(sourceWidth * leftFraction),
                        top: Math.max(0, fallbackDamageTop - Math.max(1, Math.round(sourceHeight * 0.006))),
                        width: Math.round(sourceWidth * widthFraction),
                        height: Math.round(Number(metadata.height) * 0.074),
                    };
                    for (const psm of [8, 13]) {
                        const attempt = await runSourceCrop({ ...rect }, 1200, psm, {
                            grayscale: true, sharpen: '0x1+1+0.02',
                        });
                        const value = extractFocusedDamage(String(attempt.text || '').replace(/\r?\n/g, ' '));
                        damageCropSweepDiagnostics.push({ value, text: String(attempt.text || ''), confidence: Number(attempt.confidence) || 0, leftFraction, widthFraction, psm, rect });
                        if (/^\d{5,9}$/.test(value)) {
                            damageReads.push({ attempt: { ...attempt, text: String(attempt.text || '').replace(/\r?\n/g, ' ') }, value, leftFraction, widthFraction, psm, rect });
                        }
                    }
                }
            }
        } finally {
            await worker.setParameters({ tessedit_char_whitelist: '' });
        }
        const groups = new Map();
        for (const read of damageReads) {
            const group = groups.get(read.value) || { value: read.value, reads: [], confidence: 0 };
            group.reads.push(read);
            group.confidence += Number(read.attempt.confidence) || 0;
            groups.set(read.value, group);
        }
        const selectedGroups = [...groups.values()].filter((group) =>
            new Set(group.reads.map((read) => read.widthFraction)).size >= 2 &&
            new Set(group.reads.map((read) => read.psm)).size >= 2 &&
            group.reads.length >= 3,
        );
        // When a full-screen token has one trailing icon digit, prefer the unique
        // six-plus-digit crop quorum that is its exact prefix over a shorter
        // five-digit fragment that happens to agree across narrow widths.
        const trailingDigitPrefixQuorums = selectedGroups.filter((group) =>
            String(group.value).length >= 6 && fullScreenDamageCandidatesForSweep.some((full) => {
                const fullValue = String(full.value || '');
                return fullValue.length === String(group.value).length + 1 && fullValue.startsWith(String(group.value)) &&
                    new Set(group.reads.map((read) => read.widthFraction)).size >= 2 &&
                    new Set(group.reads.map((read) => read.psm)).size >= 2;
            }));
        const selected = trailingDigitPrefixQuorums.length === 1
            ? trailingDigitPrefixQuorums[0]
            : selectedGroups.length === 1 ? selectedGroups[0] : null;
        if (selected) {
            const selectedValue = String(selected.value);
            // Once the bounded three-width sweep has a unique quorum, retain only
            // earlier caption crops that agree with it or differ by one appended
            // trailing digit. Unrelated clipped/noisy crop values must not veto the
            // higher-resolution quorum; full-screen readings remain separately
            // available to selectDamageCandidates for strict arbitration.
            const captionGeometryCandidates = damageFieldOcrCandidates.filter((attempt) => {
                if (!['damage-caption-derived', 'damage-caption-derived-source'].includes(attempt.damageCropSource)) return false;
                const value = extractFocusedDamage(attempt.text);
                return value === selectedValue || (value.length === selectedValue.length + 1 && value.startsWith(selectedValue));
            });
            damageFieldOcrCandidates = [...captionGeometryCandidates, ...selected.reads.map((read) => ({
                ...read.attempt,
                // This provenance flag is used only for arbitration against a
                // broad full-screen token; the right edge was explicitly sampled
                // before the neighboring ribbon/icons at multiple widths.
                damageCropExcludesAdjacentUi: true,
                damageCropWidthFraction: read.widthFraction,
            }))];
            damageFieldOcr = selected.reads.slice().sort((a, b) => (Number(b.attempt.confidence) || 0) - (Number(a.attempt.confidence) || 0))[0].attempt;
        }
    }

    let focusedRewards = extractFocusedRewards(rewardFieldOcr.text, repairedCreditChunk);
    let focusedDamage = extractFocusedDamage(damageFieldOcr.text);

    // Collect all independently parsed candidate values. A conflict becomes an
    // explicit ambiguity for correction instead of silently preferring one OCR read.
    const rewardCandidates = [];
    for (const attempt of rewardFieldOcrCandidates) {
        const parsed = extractFocusedRewards(attempt.text, repairedCreditChunk);
        if (parsed) rewardCandidates.push({ ...parsed, confidence: Number(attempt.confidence) || 0, source: attempt.pageSegmentationMode });
    }
    // Anchor-based crops retain the regular full-screen corroboration logic.
    // The fixed-band fallback is already multiple-read consensus and takes
    // precedence because broad OCR can accidentally append ribbon/medal counts.
    if (!usedFixedRewardFallback) {
        for (const attempt of [standard, sparse]) {
            const parsed = extractRewards(attempt.text);
            if (/^\d{5,9}$/.test(String(parsed.credits || '')) && /^\d{1,7}$/.test(String(parsed.xp || '')) && /^\d{1,7}$/.test(String(parsed.freeXp || ''))) {
                rewardCandidates.push({ ...parsed, confidence: Number(attempt.confidence) || 0, source: attempt.pageSegmentationMode });
            }
        }
    }
    if (!rewardCandidates.length && focusedRewards) rewardCandidates.push({ ...focusedRewards, confidence: Number(rewardFieldOcr.confidence) || 0, source: 'focused-primary' });
    const legacyRewardCandidates = rewardCandidates.map((candidate) => ({ ...candidate }));
    for (const field of ['credits', 'xp', 'freeXp']) {
        const geometryValue = localizedRewardEvidence.wordGeometry?.acceptedValues?.[field] || '';
        localizedRewardEvidence.values[field] = geometryValue || selectLocalizedRewardValue(
            field,
            localizedRewardEvidence.reads[field].map((read) => read.value),
            legacyRewardCandidates.map((candidate) => candidate[field]),
        );
    }

    const creditPrefixRecovery = reconcileCreditPrefix(
        localizedRewardEvidence.values.credits,
        localizedRewardEvidence.wordGeometry?.reads?.credits || localizedRewardEvidence.reads.credits,
        legacyRewardCandidates,
        localizedRewardEvidence.wordGeometry?.words || [],
    );
    localizedRewardEvidence.creditPrefixRecovery = creditPrefixRecovery;
    if (creditPrefixRecovery.recovered) localizedRewardEvidence.values.credits = creditPrefixRecovery.value;

    // When a localized reward value disagrees with the independently segmented
    // reward-row words (or is visibly clipped), re-read the likely column using
    // cross-pass word geometry. The broad word is only an anchor: final values
    // require a unique quorum across multiple widths and PSMs. This generalizes
    // the earlier XP-only sweep to Credits and Free XP without hardcoding any
    // screenshot's expected values.
    // The localized reward-row reader already has compact word boxes for split
    // tokens. Make those boxes an explicit geometry-only source so short fragments
    // can be joined with their adjacent number fragment, even if no full-screen
    // PSM emitted both fragments in one word list. This source is never treated as
    // an accepted reward value; values still need the independent crop/evidence
    // arbitration below.
    const localizedWordGeometryWords = localizedRewardEvidence.wordGeometry?.words || [];
    const localizedWordGeometrySource = localizedWordGeometryWords.length
        ? { name: 'localized-word-geometry', attempt: { pageSegmentationMode: 'localized-row', words: localizedWordGeometryWords } }
        : null;
    const rewardGeometryAnchorSources = [
        ...(localizedWordGeometrySource ? [localizedWordGeometrySource] : []),
        ...(cvRewardAttempt ? [{ name: 'opencv-reward-band-anchor-only', attempt: cvRewardAttempt }] : []),
        ...rewardFieldOcrCandidates.map((attempt, index) => ({ name: `reward-row-${index}`, attempt })),
        { name: 'reward-row-selected', attempt: rewardFieldOcr },
    ];
    const rewardGeometrySources = [
        ...rewardGeometryAnchorSources,
        { name: 'full-screen-psm3', attempt: standard },
        { name: 'full-screen-psm11', attempt: sparse },
        { name: 'identity-psm6', attempt: identity },
        { name: 'identity-psm11', attempt: identitySparse },
        { name: 'source-identity-psm6', attempt: sourceIdentity },
        { name: 'source-identity-psm11', attempt: sourceIdentitySparse },
        { name: 'performance-region', attempt: performance },
        { name: 'panel-psm6', attempt: panelOcr },
        { name: 'panel-psm11', attempt: panelSparseOcr },
        { name: 'panel-source', attempt: panelSourceOcr },
    ];
    const rewardBounds = localizedRewardEvidence.bounds || {};
    const anchorContext = {
        rowTop: Number(rewardBounds.top),
        rowBottom: Number(rewardBounds.bottom),
        imageWidth,
        imageHeight,
    };
    const rowBaseX = findRewardBaseX(rewardGeometryAnchorSources, anchorContext);
    anchorContext.baseX = rowBaseX;

    function findSupportedFieldRewardGeometryAnchor(field) {
        // Broad OCR candidates may agree on a valid reward value while the
        // selected row token is an adjacent icon or a neighboring column. Use
        // independently supported broad values only to locate a better crop;
        // the final value must still pass the isolated crop quorum below.
        const fieldSpec = FIELD_SPECS[field];
        const baseX = Number(anchorContext.baseX);
        if (!fieldSpec || !Number.isFinite(baseX)) return null;
        const limits = field === 'credits' ? /^\d{5,9}$/ : field === 'xp' ? /^\d{1,5}$/ : /^\d{1,7}$/;
        const supportedValues = [...new Set((legacyRewardCandidates || [])
            .map(candidate => normaliseOcrNumber(candidate?.[field]))
            .filter(value => limits.test(value) && hasIndependentRewardFieldValueSupport(field, value, legacyRewardCandidates)))];
        if (!supportedValues.length) return null;
        const minX = baseX + imageWidth * fieldSpec.minOffset;
        const maxX = baseX + imageWidth * fieldSpec.maxOffset;
        const targetX = baseX + imageWidth * fieldSpec.targetOffset;
        const rowTop = Number(anchorContext.rowTop);
        const rowBottom = Number(anchorContext.rowBottom);
        const yMargin = imageHeight * 0.02;
        const maxGap = Math.max(imageWidth * 0.0095, imageHeight * 0.018);
        const anchors = [];
        for (const source of rewardGeometrySources) {
            const words = (source?.attempt?.words || []).filter(word => {
                const box = word?.bbox;
                if (!box || ![box.x0, box.x1, box.y0, box.y1].every(value => Number.isFinite(Number(value))) ||
                    Number(box.x1) <= Number(box.x0) || Number(box.y1) <= Number(box.y0) || !/\d/.test(String(word.text || ''))) return false;
                const centerY = (Number(box.y0) + Number(box.y1)) / 2;
                return centerY >= rowTop - yMargin && centerY <= rowBottom + yMargin;
            }).slice().sort((a, b) => Number(a.bbox.x0) - Number(b.bbox.x0));
            for (let start = 0; start < words.length; start += 1) {
                const first = words[start];
                const x0 = Number(first.bbox.x0);
                if (x0 < minX || x0 > maxX) continue;
                let group = [first];
                let digits = normaliseOcrNumber(first.text);
                const firstCenterY = (Number(first.bbox.y0) + Number(first.bbox.y1)) / 2;
                const evaluate = () => {
                    const matching = supportedValues.filter(value => digits === value ||
                        (digits.length === value.length + 1 && digits.startsWith(value)) ||
                        (field === 'xp' && group.length > 1 &&
                            digits.length <= FIELD_SPECS.xp.maxDigits + 1 &&
                            digits.length > value.length && digits.startsWith(value)) ||
                        (field === 'freeXp' && group.length > 1 &&
                            digits.length <= FIELD_SPECS.freeXp.maxDigits &&
                            value.length > digits.length && value.startsWith(digits)));
                    for (const value of matching) {
                        const boxes = group.map(word => word.bbox);
                        const groupBBox = {
                            x0: Math.min(...boxes.map(box => Number(box.x0))),
                            y0: Math.min(...boxes.map(box => Number(box.y0))),
                            x1: Math.max(...boxes.map(box => Number(box.x1))),
                            y1: Math.max(...boxes.map(box => Number(box.y1))),
                        };
                        const confidence = group.reduce((sum, word) => sum + (Number(word.confidence) || 0), 0) / group.length;
                        anchors.push({
                            field, source: source.name || 'supported-reward-source',
                            psm: source.attempt?.pageSegmentationMode ?? null,
                            text: group.map(word => String(word.text || '').trim()).join(' '),
                            digits, groupedText: group.map(word => String(word.text || '').trim()).join(' '),
                            groupedDigits: digits, groupedWords: group.map(word => String(word.text || '').trim()),
                            bbox: { ...first.bbox }, groupBBox, confidence, targetX,
                            score: Math.abs(x0 - targetX) + (digits.length > value.length ? 8 : 0) - confidence * 0.05,
                        });
                    }
                };
                evaluate();
                for (let nextIndex = start + 1; nextIndex < words.length && group.length < 3; nextIndex += 1) {
                    const next = words[nextIndex];
                    if (next.bbox.x0 < group[group.length - 1].bbox.x1) continue;
                    const gap = Number(next.bbox.x0) - Number(group[group.length - 1].bbox.x1);
                    const centerY = (Number(next.bbox.y0) + Number(next.bbox.y1)) / 2;
                    if (gap > maxGap || Math.abs(centerY - firstCenterY) > Math.max(imageHeight * 0.012, (Number(first.bbox.y1) - Number(first.bbox.y0)) * 0.65)) break;
                    const nextDigits = normaliseOcrNumber(next.text);
                    if (!nextDigits) continue;
                    const combined = digits + nextDigits;
                    if (!supportedValues.some(value =>
                        value.startsWith(combined) || combined.startsWith(value) ||
                        (field === 'freeXp' && combined.length <= FIELD_SPECS.freeXp.maxDigits &&
                            value.startsWith(combined)))) break;
                    group.push(next);
                    digits = combined;
                    evaluate();
                }
            }
        }
        anchors.sort((a, b) => a.score - b.score || b.confidence - a.confidence);
        return anchors[0] || null;
    }

    function findLocalizedPrefixGroupAnchor(field) {
        if (field !== 'xp') return null;
        const selected = localizedRewardEvidence.wordGeometry?.selectedWords?.[field];
        const selectedBox = selected?.bbox;
        const selectedDigits = normaliseOcrNumber(selected?.text);
        if (!selectedBox || selectedDigits.length < 1 || selectedDigits.length >= FIELD_SPECS[field].minDigits) return null;
        const words = (localizedRewardEvidence.wordGeometry?.words || []).filter(word => {
            const box = word?.bbox;
            return box && [box.x0, box.x1, box.y0, box.y1].every(value => Number.isFinite(Number(value))) &&
                Number(box.x1) > Number(box.x0) && Number(box.y1) > Number(box.y0) && /\d/.test(String(word.text || ''));
        });
        const selectedCenterY = (Number(selectedBox.y0) + Number(selectedBox.y1)) / 2;
        const maxGap = Math.max(imageWidth * 0.018, imageHeight * 0.032);
        const rowTolerance = Math.max(imageHeight * 0.012, (Number(selectedBox.y1) - Number(selectedBox.y0)) * 0.65);
        const prefix = words.filter(word => {
            const box = word.bbox;
            const digits = normaliseOcrNumber(word.text);
            if (!/^\d{1,2}$/.test(digits) || Number(box.x1) > Number(selectedBox.x0)) return false;
            const gap = Number(selectedBox.x0) - Number(box.x1);
            const centerY = (Number(box.y0) + Number(box.y1)) / 2;
            return gap <= maxGap && Math.abs(centerY - selectedCenterY) <= rowTolerance;
        }).sort((a, b) => Number(b.bbox.x1) - Number(a.bbox.x1))[0];
        if (!prefix) return null;
        const prefixDigits = normaliseOcrNumber(prefix.text);
        const groupedDigits = `${prefixDigits}${selectedDigits}`;
        if (!rewardGeometryAnchorDigitsAreUsable(field, groupedDigits)) return null;
        const prefixBox = prefix.bbox;
        const targetX = Number(anchorContext.baseX) + imageWidth * FIELD_SPECS[field].targetOffset;
        return {
            field, source: 'localized-word-geometry-prefix-group', psm: 'localized-row',
            text: `${String(prefix.text || '').trim()} ${String(selected.text || '').trim()}`,
            digits: groupedDigits, groupedText: `${String(prefix.text || '').trim()} ${String(selected.text || '').trim()}`,
            groupedDigits, groupedWords: [String(prefix.text || '').trim(), String(selected.text || '').trim()],
            prefixedLeadingDigit: false,
            bbox: { ...selectedBox },
            groupBBox: {
                x0: Number(prefixBox.x0), y0: Math.min(Number(prefixBox.y0), Number(selectedBox.y0)),
                x1: Number(selectedBox.x1), y1: Math.max(Number(prefixBox.y1), Number(selectedBox.y1)),
            },
            confidence: (Number(prefix.confidence) + Number(selected.confidence)) / 2 || 0,
            score: Math.abs(Number(prefixBox.x0) - targetX), targetX,
        };
    }

    function findLocalRewardColumnAnchor(field) {
        if (field !== 'xp') return null;
        const spec = FIELD_SPECS[field];
        const baseX = Number(anchorContext.baseX);
        const selected = localizedRewardEvidence.wordGeometry?.selectedWords?.[field];
        const selectedX = Number(selected?.bbox?.x0);
        const minX = baseX + imageWidth * 0.04;
        const maxX = baseX + imageWidth * 0.18;
        const selectedInside = Number.isFinite(selectedX) && selectedX >= baseX + imageWidth * spec.minOffset &&
            selectedX <= baseX + imageWidth * spec.maxOffset;
        if (selectedInside) return null;
        const rowTop = Number(anchorContext.rowTop);
        const rowBottom = Number(anchorContext.rowBottom);
        const margin = imageHeight * 0.02;
        const targetX = baseX + imageWidth * spec.targetOffset;
        const candidates = (localizedRewardEvidence.wordGeometry?.words || []).filter(word => {
            const box = word?.bbox;
            if (!box || ![box.x0, box.x1, box.y0, box.y1].every(value => Number.isFinite(Number(value)))) return false;
            const digits = normaliseOcrNumber(word.text);
            const centerY = (Number(box.y0) + Number(box.y1)) / 2;
            return /^\d{4,5}$/.test(digits) && Number(box.x0) >= minX && Number(box.x0) <= maxX &&
                centerY >= rowTop - margin && centerY <= rowBottom + margin;
        }).sort((a, b) => Math.abs(Number(a.bbox.x0) - targetX) - Math.abs(Number(b.bbox.x0) - targetX) ||
            (Number(b.confidence) || 0) - (Number(a.confidence) || 0));
        const word = candidates[0];
        if (!word) return null;
        const digits = normaliseOcrNumber(word.text);
        return {
            field, source: 'localized-word-geometry-column-alternative', psm: 'localized-row',
            text: String(word.text || '').trim(), digits, groupedText: String(word.text || '').trim(),
            groupedDigits: digits, groupedWords: [String(word.text || '').trim()],
            bbox: { ...word.bbox }, groupBBox: { ...word.bbox },
            confidence: Number(word.confidence) || 0, score: Math.abs(Number(word.bbox.x0) - targetX), targetX,
        };
    }

    function findFieldRewardGeometryAnchor(field) {
        const localizedPrefixGroup = findLocalizedPrefixGroupAnchor(field);
        if (localizedPrefixGroup) return localizedPrefixGroup;
        const supportedAnchor = findSupportedFieldRewardGeometryAnchor(field);
        if (supportedAnchor) return supportedAnchor;
        const localColumnAnchor = findLocalRewardColumnAnchor(field);
        if (localColumnAnchor) return localColumnAnchor;
        // The localized reward-row recognizer already assigns tokens to columns
        // by their horizontal position. Prefer that field-specific token for crop
        // positioning over an unrelated identity/panel token that happens to be
        // closer to the nominal x target (e.g. Libertad XP `4509+` vs a false
        // `9095%` read). This token is geometry only; final values still require
        // the independent crop quorum below.
        const selected = localizedRewardEvidence.wordGeometry?.selectedWords?.[field];
        const box = selected?.bbox;
        const digits = String(selected?.text || '').replace(/\D/g, '');
        const rowTop = Number(anchorContext.rowTop);
        const rowBottom = Number(anchorContext.rowBottom);
        const boxValues = box ? [box.x0, box.y0, box.x1, box.y1].map(Number) : [];
        const boxValid = boxValues.length === 4 && boxValues.every(Number.isFinite) &&
            boxValues[2] > boxValues[0] && boxValues[3] > boxValues[1];
        const centerY = boxValid ? (boxValues[1] + boxValues[3]) / 2 : NaN;
        const margin = imageHeight * 0.02;
        if (selected?.text && digits && boxValid &&
            centerY >= rowTop - margin && centerY <= rowBottom + margin) {
            // If the preferred localized token is shorter than a complete field,
            // do not let that partial box suppress the cross-pass neighbor grouper.
            // For example, the rewards row can split XP as `13` + `036%`, or
            // Credits as `828` + `719@`. The grouped value remains geometry-only;
            // the independent crop quorum below still decides what can be saved.
            const fieldSpec = FIELD_SPECS[field];
            if (fieldSpec && digits.length < fieldSpec.minDigits) {
                // Search for a joined adjacent-token candidate specifically. A
                // full-screen pass can provide a high-scoring but overlong single
                // XP token (e.g. `26537`, where 7 is the medal/star); when the
                // localized token is only `2`, prefer the row geometry that joins
                // `2` + `653>x`. For XP, one extra digit is allowed only to position
                // the crops; the crop value validator still rejects six digits.
                const groupedFallback = findRewardGeometryAnchor(
                    field, rewardGeometrySources, anchorContext, { requireGrouped: true },
                );
                const groupedDigits = String(groupedFallback?.groupedDigits || groupedFallback?.digits || '');
                if (groupedFallback && (groupedFallback.groupedWords || []).length > 1 &&
                    rewardGeometryAnchorDigitsAreUsable(field, groupedDigits) &&
                    groupedDigits.length > digits.length) {
                    return groupedFallback;
                }
            }
            // Some OCR modes split the leading XP digit into a separate word
            // (e.g. `2` + `653>x`) while a different pass reports a 5-digit token
            // whose box starts after that leading digit. If the four-digit prefix
            // is independently supported, ask the existing geometry grouper to
            // locate the split token rather than crop from a clipped bbox.
            if (field === 'xp' && digits.length === 5 &&
                hasIndependentRewardFieldValueSupport(field, digits.slice(0, -1), legacyRewardCandidates)) {
                const groupedAnchor = findRewardGeometryAnchor(field, rewardGeometrySources, anchorContext);
                if (groupedAnchor && groupedAnchor.groupedDigits === digits.slice(0, -1) &&
                    groupedAnchor.groupBBox?.x0 < boxValues[0]) return groupedAnchor;
            }
            if (field === 'freeXp' && digits.length >= 3 && digits.length <= 7) {
                const targetX = Number(anchorContext.baseX) + imageWidth * 0.21;
                const minX = Number(anchorContext.baseX) + imageWidth * 0.165;
                const candidateAligned = Number.isFinite(targetX) && Math.abs(boxValues[0] - targetX) <= imageWidth * 0.022;
                const prefix = (localizedRewardEvidence.wordGeometry?.words || []).filter((candidate) => {
                    const candidateBox = candidate?.bbox;
                    const candidateDigits = String(candidate?.text || '').replace(/\D/g, '');
                    if (!/^\d$/.test(candidateDigits) || !candidateBox ||
                        ![candidateBox.x0, candidateBox.x1, candidateBox.y0, candidateBox.y1].every(Number.isFinite) ||
                        candidateBox.x1 > boxValues[0]) return false;
                    const gap = boxValues[0] - candidateBox.x1;
                    const candidateCenterY = (candidateBox.y0 + candidateBox.y1) / 2;
                    return gap <= Math.max(imageWidth * 0.0095, imageHeight * 0.018) &&
                        candidateBox.x0 >= minX && candidateBox.x0 >= targetX - imageWidth * 0.035 &&
                        Math.abs(candidateCenterY - centerY) <= Math.max(imageHeight * 0.012, (boxValues[3] - boxValues[1]) * 0.65);
                }).sort((a, b) => b.bbox.x1 - a.bbox.x1)[0];
                const prefixAligned = prefix && Math.abs(Number(prefix.bbox.x0) - targetX) <= imageWidth * 0.035;
                if (prefix && (candidateAligned || prefixAligned)) {
                    const prefixDigits = String(prefix.text || '').replace(/\D/g, '');
                    const prefixBox = prefix.bbox;
                    return {
                        field,
                        source: 'localized-selected-word-geometry-with-leading-free-xp-digit',
                        psm: 'localized-row',
                        text: `${String(prefix.text).trim()} ${String(selected.text).trim()}`,
                        digits: `${prefixDigits}${digits}`,
                        groupedText: `${String(prefix.text).trim()} ${String(selected.text).trim()}`,
                        groupedDigits: `${prefixDigits}${digits}`,
                        groupedWords: [String(prefix.text).trim(), String(selected.text).trim()],
                        prefixedLeadingDigit: true,
                        bbox: { x0: boxValues[0], y0: boxValues[1], x1: boxValues[2], y1: boxValues[3] },
                        groupBBox: {
                            x0: Number(prefixBox.x0),
                            y0: Math.min(Number(prefixBox.y0), boxValues[1]),
                            x1: boxValues[2],
                            y1: Math.max(Number(prefixBox.y1), boxValues[3]),
                        },
                        confidence: Math.max(0, Number(prefix.confidence) || 0),
                        score: 0,
                        targetX,
                    };
                }
            }
            const supportingWord = (localizedRewardEvidence.wordGeometry?.words || []).find((word) => {
                if (String(word.text || '').trim() !== String(selected.text).trim() || !word.bbox) return false;
                return Math.abs(Number(word.bbox.x0) - boxValues[0]) < 1.5 &&
                    Math.abs(Number(word.bbox.y0) - boxValues[1]) < 1.5;
            });
            return {
                field,
                source: 'localized-selected-word-geometry',
                psm: 'localized-row',
                text: String(selected.text).trim(),
                digits,
                groupedText: String(selected.text).trim(),
                groupedDigits: digits,
                bbox: { x0: boxValues[0], y0: boxValues[1], x1: boxValues[2], y1: boxValues[3] },
                groupBBox: { x0: boxValues[0], y0: boxValues[1], x1: boxValues[2], y1: boxValues[3] },
                confidence: Math.max(0, Number(supportingWord?.confidence) || 0),
                score: 0,
                targetX: Number(anchorContext.baseX) + imageWidth * ({ credits: 0, xp: 0.115, freeXp: 0.21 }[field] || 0),
            };
        }
        return findRewardGeometryAnchor(field, rewardGeometrySources, anchorContext);
    }
    localizedRewardEvidence.rowGeometrySweeps = {
        baseX: rowBaseX,
        anchors: {},
        fields: {
            credits: { attempted: false, triggerReasons: [], reads: [], selectedValue: '', unresolved: false },
            xp: { attempted: false, triggerReasons: [], reads: [], selectedValue: '', unresolved: false },
            freeXp: { attempted: false, triggerReasons: [], reads: [], selectedValue: '', unresolved: false },
        },
        fallbackSuppressedForUnresolvedSweep: false,
    };

    const shouldRunGeometrySweep = {};
    for (const field of ['credits', 'xp', 'freeXp']) {
        const fieldEvidence = localizedRewardEvidence.rowGeometrySweeps.fields[field];
        const current = String(localizedRewardEvidence.values[field] || '');
        const anchor = rowBaseX === null ? null : findFieldRewardGeometryAnchor(field);
        localizedRewardEvidence.rowGeometrySweeps.anchors[field] = anchor ? {
            source: anchor.source, psm: anchor.psm, text: anchor.text,
            groupedText: anchor.groupedText, groupedDigits: anchor.groupedDigits,
            confidence: anchor.confidence, score: anchor.score,
            bbox: anchor.bbox, groupBBox: anchor.groupBBox, targetX: anchor.targetX,
        } : null;
        if (!anchor) {
            if (!current) fieldEvidence.triggerReasons.push('no-accepted-value-and-no-geometry-anchor');
            shouldRunGeometrySweep[field] = false;
            continue;
        }
        const currentDigits = String(current).replace(/\D/g, '');
        const anchorDigits = String(anchor.groupedDigits || anchor.digits || '');
        const independentConflict = Boolean(current) && hasIndependentRewardFieldConflict(field, currentDigits, legacyRewardCandidates);
        const anchorShowsTrailingDigit = Boolean(currentDigits && anchorDigits &&
            currentDigits.length === anchorDigits.length + 1 && currentDigits.startsWith(anchorDigits));
        if (!current) fieldEvidence.triggerReasons.push('no-accepted-localized-value');
        if (field === 'xp' && currentDigits.length < 3) fieldEvidence.triggerReasons.push('short-xp-candidate');
        if (independentConflict) fieldEvidence.triggerReasons.push('localized-value-conflicts-with-independent-reward-source-consensus');
        if (anchorShowsTrailingDigit) fieldEvidence.triggerReasons.push('localized-value-has-one-digit-beyond-row-anchor');
        if (field === 'credits' && currentDigits.length > anchorDigits.length && currentDigits.startsWith(anchorDigits)) {
            fieldEvidence.triggerReasons.push('localized-credits-has-extra-trailing-digit');
        } else if (current && !rewardValueMatchesAnchor(field, currentDigits, anchor)) {
            fieldEvidence.triggerReasons.push('localized-value-disagrees-with-cross-pass-row-geometry');
        }
        shouldRunGeometrySweep[field] = fieldEvidence.triggerReasons.length > 0;
    }

    if (localizedRewardEvidence.attempted && rowBaseX !== null && Object.values(shouldRunGeometrySweep).some(Boolean)) {
        await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
        try {
            for (const field of ['credits', 'xp', 'freeXp']) {
                if (!shouldRunGeometrySweep[field]) continue;
                const fieldEvidence = localizedRewardEvidence.rowGeometrySweeps.fields[field];
                const anchor = findFieldRewardGeometryAnchor(field);
                if (!anchor) continue;
                const rectangles = buildRewardGeometryRects(field, anchor, anchorContext);
                if (!rectangles.length) continue;
                fieldEvidence.attempted = true;
                fieldEvidence.anchor = localizedRewardEvidence.rowGeometrySweeps.anchors[field];
                for (const { geometryIndex, rect } of rectangles) {
                    for (const psm of [8, 13]) {
                        const attempt = await runCrop(`reward-${field}-crosspass-geometry-${geometryIndex}-psm${psm}`, { ...rect }, 1400, psm);
                        const value = parseLocalizedNumericField(attempt.text, field);
                        const specDigits = String(anchor.groupedDigits || anchor.digits || '').length;
                        const minimumUsefulDigits = specDigits >= 4
                            ? (field === 'credits' ? 5 : field === 'xp' ? 4 : 3)
                            : 1;
                        const validValue = rewardGeometryValueIsValid(field, value) && String(value).length >= minimumUsefulDigits;
                        fieldEvidence.reads.push({
                            value: validValue ? String(value) : '',
                            text: String(attempt.text || ''), confidence: Number(attempt.confidence) || 0,
                            psm, geometryIndex, rect, anchorSource: anchor.source,
                            acceptedCandidateLength: validValue,
                        });
                    }
                }
                const groups = new Map();
                for (const read of fieldEvidence.reads) {
                    if (!read.value) continue;
                    const group = groups.get(read.value) || { value: read.value, reads: [], geometries: new Set(), psms: new Set() };
                    group.reads.push(read);
                    group.geometries.add(read.geometryIndex);
                    group.psms.add(read.psm);
                    groups.set(read.value, group);
                }
                const stable = [...groups.values()].filter(group => group.reads.length >= 4 &&
                    group.geometries.size >= 2 && group.psms.size >= 2);
                fieldEvidence.groups = [...groups.values()].map(group => ({
                    value: group.value, reads: group.reads.length,
                    geometries: group.geometries.size, psms: group.psms.size,
                }));
                const currentValue = String(localizedRewardEvidence.values[field] || '').replace(/\D/g, '');
                const anchorValue = String(anchor.groupedDigits || anchor.digits || '');
                const fieldSpec = FIELD_SPECS[field];
                const completeAnchor = fieldSpec && anchorValue.length >= fieldSpec.minDigits &&
                    anchorValue.length <= fieldSpec.maxDigits;
                const anchorHasIndependentSupport = Boolean(completeAnchor) &&
                    hasIndependentRewardFieldValueSupport(field, anchorValue, legacyRewardCandidates);
                const anchorHasSupportedPrefixConflict = hasIndependentRewardFieldPrefixConflict(
                    field, anchorValue, legacyRewardCandidates,
                );
                // A field can enter the sweep with no accepted localized value.
                // In that case `currentValue` is empty, so checking only conflicts
                // against the old value misses a dangerous case: a stable crop
                // quorum can disagree with a complete, independently corroborated
                // row token. Treat that as a conflict too; otherwise wide crops may
                // repeatedly select an inserted icon digit (e.g. 8287119 over 828719).
                const stableConflictsWithSupportedAnchor = Boolean(anchorHasIndependentSupport) &&
                    stable.some(group => String(group.value) !== anchorValue);
                const conflictRequiresIndependentSupport = (Boolean(currentValue) && (
                    fieldEvidence.triggerReasons.includes('localized-value-conflicts-with-independent-reward-source-consensus') ||
                    fieldEvidence.triggerReasons.includes('localized-value-has-one-digit-beyond-row-anchor')
                )) || anchorHasSupportedPrefixConflict || stableConflictsWithSupportedAnchor;
                const hasStrongGeometryQuorum = (group) => group.reads.length >= 6 &&
                    group.geometries.size >= 3 && group.psms.size >= 2;
                // A stable Credits crop may correct the leading glyph only when the
                // remaining four digits match an independently supported row anchor
                // and all three crop widths/two PSMs agree. This resolves the known
                // 9xxxx -> 5xxxx leading-glyph error without accepting broad OCR alone.
                const strongCreditSuffixQuorums = field === 'credits' && anchorHasIndependentSupport
                    ? stable.filter(group => hasStrongGeometryQuorum(group) &&
                        String(group.value).length === anchorValue.length &&
                        String(group.value).slice(-4) === anchorValue.slice(-4))
                    : [];
                // A split Credits anchor can itself contain icon OCR in its second
                // word (e.g. `261` + `202©&`). In that case the independently swept
                // three-width/two-PSM quorum is the field-local evidence; do not let
                // the malformed joined anchor veto it.
                const strongSplitCreditQuorums = field === 'credits' &&
                    String(anchor?.source || '').includes('localized-word-geometry') &&
                    Array.isArray(anchor?.groupedWords) && anchor.groupedWords.length > 1 &&
                    /[^\d\s,.'’`]+$/u.test(String(anchor.groupedText || anchor.text || ''))
                    ? stable.filter(group => hasStrongGeometryQuorum(group) && String(group.value).length >= 5)
                    : [];
                // Free-XP tokens can be clipped by one leading or trailing digit in
                // every isolated crop. If the full anchor is independently supported
                // and the only stable crop value is exactly its one-digit prefix or
                // suffix, retain the full anchored value rather than saving a fragment.
                const clippedFreeXpQuorums = field === 'freeXp' && anchorHasIndependentSupport &&
                    !anchorHasSupportedPrefixConflict
                    ? stable.filter(group => {
                        const cropValue = String(group.value);
                        const oneDigitClipped = anchorValue.length === cropValue.length + 1 &&
                            (anchorValue.startsWith(cropValue) || anchorValue.endsWith(cropValue));
                        // A leading digit can be clipped while the crop mistakes the
                        // following medal for a trailing digit: `2350` -> `3507`.
                        const leadingClipPlusTrailingIcon = anchorValue.length === cropValue.length &&
                            cropValue.startsWith(anchorValue.slice(1));
                        return group.reads.length >= 4 && group.geometries.size >= 2 && group.psms.size >= 2 &&
                            (oneDigitClipped || leadingClipPlusTrailingIcon);
                    })
                    : [];
                if (clippedFreeXpQuorums.length === 1) {
                    fieldEvidence.selectedValue = anchorValue;
                    fieldEvidence.selectionStrategy = 'independently-supported-free-xp-anchor-one-digit-crop-clipping';
                    fieldEvidence.unresolved = false;
                    localizedRewardEvidence.values[field] = anchorValue;
                } else {
                    // When replacing a plausible-looking value that already has a
                    // conflicting independent read, a geometry quorum alone must not
                    // reinforce the original error. Require the replacement to match
                    // independent field evidence, the bounded anchor, or the strict
                    // three-width Credits suffix quorum above.
                    const supportedStable = stable.filter(group => !conflictRequiresIndependentSupport ||
                        hasIndependentRewardFieldValueSupport(field, group.value, legacyRewardCandidates) ||
                        strongCreditSuffixQuorums.includes(group) || strongSplitCreditQuorums.includes(group) ||
                        (anchorValue && String(group.value) === anchorValue && !anchorHasSupportedPrefixConflict) ||
                        rewardGeometryQuorumCanResolveXpTrailingAdornment(field, anchorValue, group.value, {
                            reads: group.reads.length,
                            geometries: group.geometries.size,
                            psms: group.psms.size,
                        }));
                    if (supportedStable.length === 1) {
                        fieldEvidence.selectedValue = String(supportedStable[0].value);
                        if (strongCreditSuffixQuorums.includes(supportedStable[0])) {
                            fieldEvidence.selectionStrategy = 'three-width-credit-suffix-quorum';
                        } else if (strongSplitCreditQuorums.includes(supportedStable[0])) {
                            fieldEvidence.selectionStrategy = 'three-width-split-credit-quorum';
                        }
                        localizedRewardEvidence.values[field] = fieldEvidence.selectedValue;
                    } else {
                        // The old value conflicts with its independent row anchor; if
                        // the repair does not establish a unique crop quorum, leave the
                        // field missing for correction rather than retaining a questionable guess.
                        fieldEvidence.unresolved = true;
                        localizedRewardEvidence.values[field] = '';
                    }
                }
            }
        } finally {
            await worker.setParameters({ tessedit_char_whitelist: '' });
        }
    }
    localizedRewardEvidence.rowGeometrySweeps.fallbackSuppressedForUnresolvedSweep =
        Object.values(localizedRewardEvidence.rowGeometrySweeps.fields).some(field => field.unresolved);
    // Keep the historical diagnostic name so older report parsers can still see
    // the XP-specific result while the generalized sweeps cover all three fields.
    localizedRewardEvidence.xpGeometrySweep = localizedRewardEvidence.rowGeometrySweeps.fields.xp;

    // If localized columns are incomplete, allow a complete reward tuple only
    // when two distinct OCR segmentation passes agree on all three numbers.
    // This catches icon-split numbers such as “1650 259® 4059+ 2110%” without
    // allowing a broad read to override three complete, independently isolated
    // field reads (the reported screen and Hoffmann regressions stay localized).
    const localizedTupleComplete = ['credits', 'xp', 'freeXp'].every((field) => {
        const value = String(localizedRewardEvidence.values[field] || '');
        const limits = field === 'credits' ? /^\d{5,9}$/ : field === 'xp' ? /^\d{1,5}$/ : /^\d{1,7}$/;
        return limits.test(value);
    });
    if (!localizedTupleComplete && !localizedRewardEvidence.rowGeometrySweeps.fallbackSuppressedForUnresolvedSweep) {
        const tupleFallback = selectConsistentRewardTuple(legacyRewardCandidates);
        if (tupleFallback) {
            localizedRewardEvidence.values = {
                credits: tupleFallback.credits,
                xp: tupleFallback.xp,
                freeXp: tupleFallback.freeXp,
            };
            localizedRewardEvidence.tupleFallback = tupleFallback;
        } else {
            localizedRewardEvidence.tupleFallback = null;
        }
    } else {
        localizedRewardEvidence.tupleFallback = null;
    }

    // Localized column consensus is the acceptance source of truth for OCR rewards.
    // A field without two agreeing cropped reads stays missing and goes through the
    // correction workflow; broad OCR candidates are retained separately in logs.
    if (localizedRewardEvidence.attempted) {
        rewardCandidates.splice(0, rewardCandidates.length, {
            credits: localizedRewardEvidence.values.credits || 'Not detected',
            xp: localizedRewardEvidence.values.xp || 'Not detected',
            freeXp: localizedRewardEvidence.values.freeXp || 'Not detected',
            confidence: 95,
            source: 'localized-column-consensus',
        });
    }

    // When damage is missing or conflicts across existing sources, use the CV
    // component boundary as a left/right geometry proposal and repeat a small,
    // right-edge-fixed crop-width sweep. Every accepted value still needs the
    // existing multi-width/two-PSM quorum; this single geometry cannot force a value.
    const preCvDamageValues = damageFieldOcrCandidates.map(attempt => extractFocusedDamage(attempt.text))
        .filter(value => /^\d{5,9}$/.test(String(value || '')));
    const preCvFullDamageValues = fullScreenDamageCandidatesForSweep.map(candidate => String(candidate.value || ''));
    const preCvFullDamageSet = new Set(preCvFullDamageValues);
    const cvDamageNeedsRescue = !preCvDamageValues.length || preCvFullDamageSet.size !== 1 ||
        preCvDamageValues.some(value => !preCvFullDamageSet.has(value));
    const cvDamageRegion = cvRegion('damage', 0.25);
    let cvDamageReads = [];
    if (cvDamageNeedsRescue && cvDamageRegion?.isolatedFromAdjacentUi === true) {
        const base = cvDamageRegion.rect;
        const safeRight = base.left + base.width;
        const widthSet = [...new Set([base.width, base.width + Math.round(sourceWidth * 0.008),
            base.width + Math.round(sourceWidth * 0.016)].map(v => Math.max(12, Math.min(v, safeRight))))];
        await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
        try {
            for (const width of widthSet) {
                const rect = { left: Math.max(0, safeRight - width), top: base.top, width, height: base.height };
                for (const psm of [7, 8]) {
                    const attempt = await runSourceCrop(rect, 1500, psm, {
                        grayscale: true, contrastStretch: '0.5%x0.5%', sharpen: '0x1+1+0.03',
                    });
                    attempt.cvAssisted = true;
                    attempt.cvRegion = cvDamageRegion;
                    attempt.damageCropExcludesAdjacentUi = true;
                    attempt.damageCropWidthFraction = width / sourceWidth;
                    cvDamageReads.push({ text: String(attempt.text || ''), value: extractFocusedDamage(attempt.text),
                        confidence: Number(attempt.confidence) || 0, psm, crop: attempt.sourceCrop, proposal: cvDamageRegion });
                    damageFieldOcrCandidates.push(attempt);
                }
            }
        } finally {
            await worker.setParameters({ tessedit_char_whitelist: '' });
        }
    }

    const focusedDamageCandidates = [];
    for (const attempt of damageFieldOcrCandidates) {
        const value = extractFocusedDamage(attempt.text);
        if (/^\d{5,9}$/.test(value)) focusedDamageCandidates.push({
            value, confidence: Number(attempt.confidence) || 0,
            source: `focused-${attempt.pageSegmentationMode ?? 'unknown'}`,
            // The source-image fallback crop ends immediately before the adjacent
            // ribbon band on the known result-panel geometry. It can resolve an
            // icon digit appended to the broader full-screen damage token.
            excludeAdjacentUi: Boolean(attempt.damageCropExcludesAdjacentUi || (attempt.sourceCrop &&
                Number(attempt.sourceCrop.width) <= sourceWidth * 0.106)),
            cropWidth: attempt.damageCropWidthFraction ?? attempt.sourceCrop?.width ?? null,
            cropPsm: attempt.pageSegmentationMode ?? null,
        });
    }
    if (!focusedDamageCandidates.length && focusedDamage) focusedDamageCandidates.push({
        value: focusedDamage, confidence: Number(damageFieldOcr.confidence) || 0, source: 'focused-primary',
    });

    // Always retain both independent full-screen readings as candidate evidence,
    // even when a crop already returned digits. The baseline defect occurred
    // because a plausible but truncated crop suppressed the agreeing PSM 3/11
    // full-screen value instead of being checked against it.
    const fullScreenDamageCandidates = fullScreenDamageCandidatesForSweep;
    const damageSelection = selectDamageCandidates(focusedDamageCandidates, fullScreenDamageCandidates);
    const damageCandidates = damageSelection.candidates;

    // Spatially associate xN count tokens with the nearest ribbon-name center.
    // Missing counts stay blank and never block posting the battle record.
    const dedicatedRibbons = extractSpatialRibbons(performance, imageWidth, imageHeight);
    const performanceText = String(performance.text || '');

    const identityCandidates = [
        { attempt: identity, source: 'prepared-identity-psm6', weight: 1.5 },
        { attempt: identitySparse, source: 'prepared-identity-psm11', weight: 1.5 },
        { attempt: sourceIdentity, source: 'source-identity-psm6', weight: 1.1 },
        { attempt: sourceIdentitySparse, source: 'source-identity-psm11', weight: 1.1 },
        { attempt: sourceIdentityTightPsm7, source: 'tight-identity-psm7', weight: 0.8 },
        { attempt: sourceIdentityTightPsm8, source: 'tight-identity-psm8', weight: 0.8 },
        ...sourceIdentityRescueReads.map((attempt) => ({ attempt, source: `identity-rescue-psm${attempt.pageSegmentationMode}`, weight: 1.1 })),
        ...sourceIdentityColorRescueReads.map((attempt, index) => ({ attempt, source: `identity-red-channel-rescue-${index + 1}`, weight: 1.1 })),
        ...(tightIdentityAgreement ? sourceIdentityTightRescueReads.map((attempt) => ({ attempt, source: `identity-tight-rescue-psm${attempt.pageSegmentationMode}`, weight: 2.0 })) : []),
        ...(cvIdentityAttempt ? [{ attempt: cvIdentityAttempt, source: 'opencv-identity-geometry-rescue', weight: 0.55 }] : []),
        { attempt: standard, source: 'full-screen-psm3', weight: 0.7 },
        { attempt: sparse, source: 'full-screen-psm11', weight: 0.7 },
    ].map(({ attempt, source, weight }) => ({
        text: String(attempt.text || ''), confidence: Number(attempt.confidence) || 0, source, weight,
    }));
    const metadataCandidates = [
        { attempt: standard, source: 'full-screen-psm3', weight: 1.4 },
        { attempt: sparse, source: 'full-screen-psm11', weight: 1.4 },
        { attempt: metadataOcr, source: 'metadata-crop', weight: 0.65 },
        ...(cvMetadataAttempt ? [{ attempt: cvMetadataAttempt, source: 'opencv-metadata-geometry-rescue', weight: 0.55 }] : []),
        { attempt: panelOcr, source: 'prepared-panel-psm6', weight: 0.8 },
        { attempt: panelSourceOcr, source: 'source-panel-psm6', weight: 0.8 },
        ...sourceTimeCandidates.map((attempt) => ({ attempt, source: 'source-time-consensus', weight: 0.7 })),
        ...[...sourceMetadataTightReads, ...sourceMapModeReads, ...sourceMapModeUpperReads, ...sourceMapModeLowerReads, ...sourceMapModeRescueReads]
            .filter((attempt) => {
                const parsed = parseModeMap(String(attempt.text || ''));
                const hasMapOrMode = parsed.map !== 'Not detected' || parsed.mode !== 'Not detected';
                const hasTimestamp = parseBattleStartTime(String(attempt.text || '')) !== 'Not detected';
                return (hasMapOrMode || hasTimestamp) && (Number(attempt.confidence) || 0) >= 35;
            })
            .map((attempt) => ({ attempt, source: `source-map-mode-psm${attempt.pageSegmentationMode}`, weight: 1.0 })),
    ].map(({ attempt, source, weight }) => ({
        text: String(attempt.text || ''), confidence: Number(attempt.confidence) || 0, source, weight,
    }));
    // Operation screenshots may render the result label as Victory/Defeat but
    // the result-description line is often clearer across independent panel OCR
    // passes (e.g. “Our team completed the primary task.”). Add those description
    // reads only when they contain an explicit outcome statement; unrelated panel
    // text cannot influence result consensus.
    const explicitOutcomePanelReads = [panelOcr, panelSparseOcr, panelSourceOcr, ...sourceIdentityRescueReads]
        .filter((attempt) => /(?:our[\s'’]+team|the enemy team) completed (?:the )?(?:primary )?(?:mission|task|objective)|our[\s'’]+team\s+(?:won\s+by|wor['’]?by) points|all (?:allied|enemy) warships destroyed|battle time expired.{0,80}enemy team won/i.test(String(attempt.text || '')));
    const resultCandidates = [standard, sparse, resultTitle, resultTitleSparse, resultTitleEnhanced,
        ...(cvResultAttempt ? [cvResultAttempt] : []), ...explicitOutcomePanelReads].map((attempt) => ({
        text: String(attempt.text || ''), confidence: Number(attempt.confidence) || 0,
    }));
    const extractedFields = {
        ocrSpaceEvidence: ocrSpacePrepassEvidence,
        rewards: focusedRewards,
        rewardCandidates,
        legacyRewardCandidates,
        localizedRewardEvidence,
        cvFieldIsolation: {
            ...cvAnalysis,
            regions: cvAnalysis?.regions || {},
            reads: {
                result: cvResultAttempt ? { text: cvResultAttempt.text, confidence: cvResultAttempt.confidence, psm: cvResultAttempt.pageSegmentationMode, crop: cvResultAttempt.sourceCrop, proposal: cvResultAttempt.cvRegion } : null,
                identity: cvIdentityAttempt ? { text: cvIdentityAttempt.text, confidence: cvIdentityAttempt.confidence, psm: cvIdentityAttempt.pageSegmentationMode, crop: cvIdentityAttempt.sourceCrop, proposal: cvIdentityAttempt.cvRegion } : null,
                metadata: cvMetadataAttempt ? { text: cvMetadataAttempt.text, confidence: cvMetadataAttempt.confidence, psm: cvMetadataAttempt.pageSegmentationMode, crop: cvMetadataAttempt.sourceCrop, proposal: cvMetadataAttempt.cvRegion } : null,
                rewardBandAnchorOnly: cvRewardAttempt ? { text: cvRewardAttempt.text, confidence: cvRewardAttempt.confidence, psm: cvRewardAttempt.pageSegmentationMode, crop: cvRewardAttempt.sourceCrop, proposal: cvRewardAttempt.cvRegion } : null,
            },
        },
        damage: focusedDamage,
        damageCandidates,
        fullScreenDamageCandidates,
        damageSelection,
        damageCropSweepDiagnostics,
        ribbons: dedicatedRibbons,
        rewardOcrText: rewardFieldOcr.text,
        rewardWordGeometry: {
            rowBounds: receivedAnchor?.bbox && performanceAnchor?.bbox
                ? { top: receivedAnchor.bbox.y1, bottom: performanceAnchor.bbox.y0 }
                : null,
            passes: [standard, sparse, ...rewardFieldOcrCandidates].map((attempt) => ({
                psm: attempt.pageSegmentationMode,
                text: String(attempt.text || ''),
                words: (attempt.words || []).filter((word) => word.bbox && /\d/.test(String(word.text || ''))).map((word) => ({
                    text: String(word.text || ''), confidence: Number(word.confidence) || 0,
                    bbox: word.bbox,
                })),
            })),
            rewardBandWords: (rewardFieldOcr.words || []).map((word) => ({
                text: String(word.text || ''), confidence: Number(word.confidence) || 0, bbox: word.bbox,
            })),
            rewardSourceCrop: rewardFieldOcr.sourceCrop || null,
            localizedWordGeometry: localizedRewardEvidence.wordGeometry || null,
        },
        damageOcrText: damageFieldOcr.text,
        damageFieldPasses: damageFieldOcrCandidates.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, words: attempt.words, sourceCrop: attempt.sourceCrop || null, cvAssisted: Boolean(attempt.cvAssisted) })),
        cvDamageReads,
        performanceOcrText: performance.text,
        performanceOcrWords: (performance.words || []).filter((word) => word.bbox && (String(word.text || '').match(/damage|\d/i) || word.bbox.y0 < imageHeight * 0.35)).map((word) => ({ text: word.text, confidence: word.confidence, bbox: word.bbox })),
        fullScreenDamageOcrText: [standard, sparse].map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text })),
        ribbonOcrText: performanceText,
        identityCandidates,
        metadataCandidates,
        sourceMetadataTightReads: sourceMetadataTightReads.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence, sourceCrop: attempt.sourceCrop })),
        sourceMapModeReads: sourceMapModeReads.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence, sourceCrop: attempt.sourceCrop })),
        sourceMapModeUpperReads: sourceMapModeUpperReads.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence, sourceCrop: attempt.sourceCrop })),
        sourceMapModeLowerReads: sourceMapModeLowerReads.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence, sourceCrop: attempt.sourceCrop })),
        sourceIdentityRescueReads: sourceIdentityRescueReads.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence, sourceCrop: attempt.sourceCrop })),
        sourceIdentityColorRescueReads: sourceIdentityColorRescueReads.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence, sourceCrop: attempt.sourceCrop, channel: 'R' })),
        sourceIdentityTightRescueReads: sourceIdentityTightRescueReads.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence, sourceCrop: attempt.sourceCrop })),
        sourceMapModeRescueReads: sourceMapModeRescueReads.map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence, sourceCrop: attempt.sourceCrop })),
        sourceTimeDiagnostics,
        panelMetadataCandidates: [panelOcr, panelSparseOcr, panelSourceOcr].map((attempt) => ({ psm: attempt.pageSegmentationMode, text: attempt.text, confidence: attempt.confidence })),
        resultCandidates,
        repairedCreditChunk,
    };

    // Merge general-purpose OCR lines. Numeric crop text is deliberately kept
    // separate because it can contain fragments of nearby ribbon icons.
    const allLines = anchorSourceLines
        .filter((line) => String(line.text || '').trim() && line.bbox)
        .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
    const mergedLines = [];
    const seenExact = new Set();
    for (const line of allLines) {
        const text = String(line.text).trim();
        const key = text.toLowerCase().replace(/\s+/g, ' ');
        if (seenExact.has(key)) continue;
        seenExact.add(key);
        mergedLines.push(line);
    }
    const combined = {
        text: mergedLines.map((line) => String(line.text).trim()).join('\n'),
        lines: mergedLines,
        confidence: (standard.confidence + sparse.confidence + identity.confidence + identitySparse.confidence + performance.confidence + missions.confidence + metadataOcr.confidence + metadataSparse.confidence + panelOcr.confidence + panelSparseOcr.confidence) / 10,
        imageWidth,
        imageHeight,
        pageSegmentationMode: 'combined',
    };

    await worker.setParameters({ tessedit_pageseg_mode: '3' });
    // Optional second-engine field-crop fallback. Disabled by default and strictly
    // local-only. It runs only for unresolved, ambiguous, or contradictory fields;
    // the output is capped below the single-read threshold and joins the established
    // parser/consensus candidate lists as evidence only. The fallback is bounded by
    // the remaining per-image budget and fails open to the Tesseract result.
    const prePaddleRecord = buildBattleRecord(combined.text, extractedFields);
    const hasUnresolvedBeforePaddle = getMissingRequiredFields(prePaddleRecord).length > 0;
    const ocrSpaceReserveMs = ocrSpaceConfigured && hasUnresolvedBeforePaddle && ocrSpacePrepassEvidence.status !== 'complete'
        ? Math.max(1000, Math.min(20000, Number(process.env.OCRSPACE_STAGE_BUDGET_MS) || 20000)) : 0;
    const fallbackRemainingMs = Math.max(0, OCR_IMAGE_TIMEOUT_MS - (Date.now() - imageStartedAt) - 1500 - ocrSpaceReserveMs);
    await paddleOcrFieldFallback.applyFieldFallback({
        imageBuffer,
        rawText: combined.text,
        fields: extractedFields,
        sourceWidth,
        sourceHeight,
        preparedWidth: imageWidth,
        preparedHeight: imageHeight,
        timeoutMs: fallbackRemainingMs,
    });
    // After the geometry-first OCR.Space pass, use the more precise local crop
    // geometry for one bounded refinement only if that first pass produced no
    // remote evidence. This preserves OCR.Space-first ordering without duplicate
    // provider calls when the prepass already succeeded.
    const ocrSpaceApiKeyPresent = Boolean(String(process.env.OCRSPACE_API_KEY || '').trim());
    if (ocrSpaceConfigured && ocrSpaceApiKeyPresent && ocrSpacePrepassEvidence.status !== 'complete') {
        try {
            const previewRecord = buildBattleRecord(combined.text, extractedFields);
            const missingLabels = new Set(getMissingRequiredFields(previewRecord).map((item) => String(item.label)));
            const cropPlan = [];
            const addCrop = (field, engine, rect, source, imageSource, outputWidth) => {
                if (rect && Number(rect.width) >= 8 && Number(rect.height) >= 6) {
                    cropPlan.push({ field, engine: 3, rect: { ...rect }, source, imageSource, outputWidth,
                        isTable: source === 'localized-reward-column' });
                }
            };
            for (const field of ['xp', 'freeXp', 'credits']) {
                const label = field === 'freeXp' ? 'Free XP' : field === 'xp' ? 'XP' : 'Credits';
                if (!missingLabels.has(label)) continue;
                const rect = localizedRewardEvidence.rects[field + '-psm7'] || localizedRewardEvidence.rects[field + '-psm8'];
                if (rect) addCrop(field, 3, rect, 'localized-reward-column', 'prepared', Math.max(420, Math.min(1400, Math.round(rect.width * 3.5))));
            }
            if (missingLabels.has('Damage')) addCrop('damage', 3, damageProviderRect, 'localized-damage-column', 'prepared', 1400);
            if (missingLabels.has('Battle Result')) addCrop('result', 3, resultTitleRect, 'localized-result-title', 'original', 1700);
            if (missingLabels.has('Map') || missingLabels.has('Battle Mode') || missingLabels.has('Battle Start Time')) {
                addCrop('battleMetadata', 3, sourceMetadataTightRect, 'localized-battle-metadata', 'original', 1700);
            }
            const remainingBudget = OCR_IMAGE_TIMEOUT_MS - (Date.now() - imageStartedAt) - 1500;
            if (remainingBudget >= 1500) {
                extractedFields.ocrSpaceRefinementEvidence = await collectOcrSpaceFieldEvidence({
                    env: { ...process.env, OCRSPACE_STAGE_BUDGET_MS: String(Math.min(20000, remainingBudget)) },
                    cropPlan,
                    buildCrop: async (spec) => imageProcessor.cropResize(
                        spec.imageSource === 'prepared' ? preparedBuffer : imageBuffer,
                        spec.rect,
                        spec.outputWidth,
                        { grayscale: true, contrastStretch: '0.5%x0.5%', sharpen: '0x1+1+0.02' },
                    ),
                });
            } else {
                extractedFields.ocrSpaceRefinementEvidence = { status: 'skipped', reason: 'insufficient remaining per-image time budget', requests: 0, evidence: [] };
            }
        } catch (error) {
            console.warn('[OCR.space] Optional evidence stage failed; local OCR remains authoritative:', String(error && error.message || error).slice(0, 240));
            extractedFields.ocrSpaceRefinementEvidence = { status: 'failed', reason: String(error && error.code || 'OCRSPACE_STAGE_ERROR'), requests: 0, evidence: [] };
        }
    } else if (ocrSpaceConfigured && ocrSpacePrepassEvidence.status === 'complete') {
        extractedFields.ocrSpaceRefinementEvidence = { status: 'skipped', reason: 'geometry-first prepass already produced remote evidence; duplicate requests suppressed', requests: 0, evidence: [] };
    } else {
        extractedFields.ocrSpaceRefinementEvidence = { status: 'skipped', reason: process.env.OCRSPACE_ENABLED !== '1'
            ? 'OCRSPACE_ENABLED is not explicitly enabled' : 'OCRSPACE_API_KEY is not configured', requests: 0, evidence: [] };
    }

    // Only full-screen OCR attempts and the combined full-screen-derived text
    // can be selected as the page record. Field-crop results enter through the
    // explicitly typed field candidate arrays and existing validators only.
    return { attempts: [standard, sparse, combined], fields: extractedFields };
}

function validateWorldOfWarshipsScreenshot(ocrResult, extractedFields = {}) {
    const record = buildBattleRecord(ocrResult.text || '', extractedFields);
    const missing = getMissingRequiredFields(record);
    const requiredLabels = new Set(missing.map((field) => field.label));
    const checks = [
        'Battle Result', 'Player', 'Map', 'Battle Mode', 'Battle Start Time',
        'Credits', 'Free XP', 'Damage', 'XP',
    ].map((label) => ({
        label,
        passed: !requiredLabels.has(label),
        reason: missing.find((field) => field.label === label)?.reason || `${label} is readable`,
    }));
    // XP is mandatory for acceptance. Ship, result description, and ribbons remain
    // optional metadata; missing ribbon labels/counts must never hold up a record.
    return {
        accepted: missing.length === 0, checks, failed: missing, missing, record,
        text: cleanOcrText(ocrResult.text || ''),
        confidence: Number(ocrResult.confidence) || 0,
        pageSegmentationMode: ocrResult.pageSegmentationMode || 'unknown',
    };
}

// ============================================================
// SECTION 5: OCR TEXT CLEANUP AND DISCORD FORMATTING
// ============================================================

function cleanOcrText(text) {
    return text
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function extractRewards(text, focusedRewards = null) {
    if (focusedRewards?.credits && focusedRewards?.xp && focusedRewards?.freeXp) {
        return {
            credits: focusedRewards.credits,
            xp: focusedRewards.xp,
            freeXp: focusedRewards.freeXp,
        };
    }

    // Fallback for layouts where a focused crop could not be created. This reads
    // one OCR text pass, not the merged text from every pass (which duplicates
    // values and introduces medal/ribbon counts into the reward list).
    const start = text.search(/received for the battle/i);
    if (start < 0) return { credits: 'Not detected', xp: 'Not detected', freeXp: 'Not detected' };
    const afterHeading = text.slice(start + 'received for the battle'.length);
    const end = afterHeading.search(/battle performance/i);
    if (end < 0) return { credits: 'Not detected', xp: 'Not detected', freeXp: 'Not detected' };
    const values = extractRewardGroups(afterHeading.slice(0, end));
    return {
        credits: values[0] || 'Not detected',
        xp: values[1] || 'Not detected',
        freeXp: values[2] || 'Not detected',
    };
}

// Split on line/word boundaries where possible, without exceeding Discord limits.
function splitForDiscord(text, maxLength = DISCORD_MESSAGE_LIMIT) {
    const chunks = [];
    let remaining = text;

    while (remaining.length > maxLength) {
        let splitAt = remaining.lastIndexOf('\n', maxLength);

        if (splitAt < Math.floor(maxLength * 0.5)) {
            splitAt = remaining.lastIndexOf(' ', maxLength);
        }
        if (splitAt < Math.floor(maxLength * 0.5)) {
            splitAt = maxLength;
        }

        chunks.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
    }

    if (remaining) chunks.push(remaining);
    return chunks;
}

function isTournamentAdmin(message) {
    if (TOURNAMENT_ADMIN_IDS.has(message.author.id)) return true;
    return Boolean(message.member?.permissions?.has?.('ManageGuild'));
}

function tournamentHelp() {
    return [
        '**YOLO Tourney commands**',
        '`!yolo help` — show this help',
        '`!yolo players` — list roster players and IDs',
        '`!yolo panel` — public interactive totals, standings, roster and event leaderboard panel',
        '`!yolo download-workbook` / `!yolo workbook` — download the Excel source workbook',
        '`!yolo export-workbook` — export workbook-compatible JSON (admin)',
        '`!yolo player <name or ID>` — show a player’s scores and 28 game slots',
        '`!yolo add-player <name>` — add a player (admin)',
        '`!yolo rename-player <name or ID> | <new name>` — rename without losing scores (admin)',
        '`!yolo remove-player <name or ID>` — remove a player (admin)',
        '`!yolo result <player> | <event> | <game 1-7> | <DD|CA|BB> | <tier> | <metric>` — enter a result (admin)',
        '`!yolo setting <event> <field> <number>` / `!yolo settings` — edit/show scoring (admin to edit)',
        '`!yolo standings [damage|kills|race|grand]` — leaderboard with all-player aggregate and estimated dollar value',
        '`!yolo totals` — precise all-player doubloon and dollar totals (Excel H12 formula: 0.54 × doubloons / 100)',
        '`!yolo snapshot` — immediately attach a full-state recovery snapshot to the same channel (admin; automatic snapshots are coalesced)',
        '`!yolo status` — filled game slots per player and event',
        '`!yolo missing [event] [| player or ID]` — list unfilled slots',
        '`!yolo clear-slot <player> | <event> | <game 1-7>` — clear a slot (admin)',
        '`!yolo clear-event <event> | <player or ID>` — clear one player’s event; use `ALL` to clear for everyone (admin)',
        '`!yolo clear-results CONFIRM` — clear all scores but keep roster/settings/records (admin)',
        '`!yolo records` — list OCR records waiting for tournament mapping',
        '`!yolo map <record ID>` — restart mapping for an archived OCR record (admin)',
        '`!yolo export` — export full archive, records, and resumable workflows (admin)',
        '`!yolo finalize` — generate one final JSON snapshot with completion counts (admin; does not lock the tournament)',
        '`!yolo import` with a JSON attachment — restore a backup (admin; replaces current state)',
        '',
        `Roster capacity: ${Tournament.MAX_PLAYERS} participants, matching the expanded Excel workbook. Events: ` + '`damage`, `kills`, `race`, `grand`' + `. Screenshot submissions pass OCR verification, then the bot asks only for missing tournament values one at a time. State is saved locally on every change; recovery snapshots are coalesced and attached to the same configured channel as commands and screenshots. All bot replies and snapshots remain public in that channel.`
    ].join('\n');
}

function tournamentSettingsText() {
    const lines = ['**Current scoring settings**'];
    for (const event of Tournament.EVENTS) {
        lines.push(`**${Tournament.EVENT_LABELS[event]}** — ${Object.entries(tournamentState.settings.events[event]).map(([key, value]) => `${key}: ${value}`).join(' · ')}`);
    }
    return lines.join('\n');
}

function tournamentStatusText() {
    const lines = ['**Tournament submission status**'];
    if (!tournamentState.players.length) return `${lines[0]}\nNo players yet. An admin can add players with \`!yolo add-player <name>\`.`;
    for (const player of tournamentState.players) {
        const summary = Tournament.EVENTS.map(event => {
            const filled = player.events[event].filter(game => game.class !== '-' || (event === 'grand' ? Number(game.damage) || Number(game.kills) || Number(game.time) : Number(game.metric))).length;
            return `${Tournament.EVENT_LABELS[event]} ${filled}/7`;
        }).join(' · ');
        lines.push(`**${player.name}** (#${player.id}): ${summary}`);
    }
    return lines.join('\n');
}

function tournamentStandingsText() {
    const rows = Tournament.standings(tournamentState);
    if (!rows.length) return 'No players in the tournament yet. Use `!yolo add-player <name>` to start the roster. Current aggregate: **0.00 doubloons · $0.00**.';
    const lines = ['**YOLO Tourney standings**', '`Rank | Player | Damage | Kills | Race | Grand Yolo | Total doubloons | Est. value`'];
    rows.forEach((row, index) => lines.push(`**${index + 1}. ${row.name}** | ${row.events.damage.toFixed(2)} | ${row.events.kills.toFixed(2)} | ${row.events.race.toFixed(2)} | ${row.events.grand.toFixed(2)} | **${row.total.toFixed(2)}** | $${row.estimatedValue.toFixed(2)}`));
    const totalDoubloons = rows.reduce((sum, row) => sum + row.total, 0);
    // Match Excel Totals!H12 exactly: round once after summing all player rows.
    const totalDollars = 0.54 * totalDoubloons / 100;
    lines.push('', `**All-player aggregate (${rows.length}/${Tournament.MAX_PLAYERS} players): ${totalDoubloons.toFixed(2)} doubloons · $${totalDollars.toFixed(2)}**`);
    lines.push('Dollar total uses the workbook formula `=0.54*G12/100` and sums unrounded player scores before currency formatting.');
    return lines.join('\n');
}

function tournamentTotalsText() {
    const rows = Tournament.standings(tournamentState);
    const totalDoubloons = rows.reduce((sum, row) => sum + row.total, 0);
    const totalDollars = 0.54 * totalDoubloons / 100;
    const eventLines = Tournament.EVENTS.map(event => {
        const total = rows.reduce((sum, row) => sum + row.events[event], 0);
        return `**${Tournament.EVENT_LABELS[event]}:** ${total.toFixed(2)} doubloons`;
    });
    return [
        '**Tournament totals — all active players**',
        `Players: **${rows.length}/${Tournament.MAX_PLAYERS}**`,
        ...eventLines,
        `**Total doubloons (G12-equivalent): ${totalDoubloons.toFixed(2)}**`,
        `**Estimated total value (H12-equivalent): $${totalDollars.toFixed(2)}**`,
        'Formula: `=0.54*G12/100`. The bot sums every active player, then converts once to dollars; cents are rounded only for display.',
    ].join('\n');
}

function slotIsFilled(event, game) {
    if (!game || game.class === '-') return false;
    return event === 'grand'
        ? Number(game.damage) > 0 || Number(game.kills) > 0 || Number(game.time) > 0 || game.class !== '-'
        : Number(game.metric) !== 0 || game.class !== '-';
}

function playerDetailText(nameOrId) {
    const player = Tournament.findPlayer(tournamentState, nameOrId);
    if (!player) throw new Error(`Player "${nameOrId}" was not found.`);
    const score = Tournament.standings(tournamentState).find(row => row.id === player.id);
    const lines = [`**${player.name}** (#${player.id})`, `Total: **${score.total.toFixed(2)} doubloons**`];
    for (const event of Tournament.EVENTS) {
        const slots = player.events[event].map((game, index) => {
            if (!slotIsFilled(event, game)) return `G${index + 1}: —`;
            const metric = event === 'damage' ? `${game.metric} dmg` : event === 'kills' ? `${game.metric} kills` : event === 'race' ? `${game.metric}s` : `${game.damage} dmg/${game.kills} kills/${game.time}s`;
            return `G${index + 1}: ${game.class} T${game.tier} · ${metric}`;
        });
        lines.push(`**${Tournament.EVENT_LABELS[event]}** — ${score.events[event].toFixed(2)} doubloons\n${slots.join(' | ')}`);
    }
    return lines.join('\n');
}

function eventStandingsText(event) {
    if (!Tournament.EVENTS.includes(event)) throw new Error(`Event must be one of: ${Tournament.EVENTS.join(', ')}.`);
    const rows = Tournament.standings(tournamentState).sort((a, b) => b.events[event] - a.events[event] || a.name.localeCompare(b.name));
    if (!rows.length) return 'No players in the tournament yet.';
    return [`**${Tournament.EVENT_LABELS[event]} leaderboard**`, ...rows.map((row, index) => `**${index + 1}. ${row.name}** — ${row.events[event].toFixed(2)} doubloons`)].join('\n');
}

function missingSlotsText(args) {
    const parts = String(args || '').split('|').map(v => v.trim());
    const eventArg = (parts[0] || 'all').toLowerCase();
    const playerArg = parts[1] || '';
    const events = eventArg === 'all' ? Tournament.EVENTS : [eventArg];
    for (const event of events) if (!Tournament.EVENTS.includes(event)) throw new Error(`Event must be one of: all, ${Tournament.EVENTS.join(', ')}.`);
    const players = playerArg ? [Tournament.findPlayer(tournamentState, playerArg)].filter(Boolean) : tournamentState.players;
    if (playerArg && !players.length) throw new Error(`Player "${playerArg}" was not found.`);
    const lines = ['**Missing tournament slots**'];
    for (const player of players) for (const event of events) {
        const missing = player.events[event].map((game, i) => slotIsFilled(event, game) ? null : i + 1).filter(v => v !== null);
        if (missing.length) lines.push(`**${player.name} · ${Tournament.EVENT_LABELS[event]}:** ${missing.map(n => `G${n}`).join(', ')}`);
    }
    return lines.length > 1 ? lines.join('\n') : 'All requested slots are filled.';
}

function releaseMappedRecords(predicate) {
    const released = [];
    for (const row of tournamentState.battleRecords) {
        const map = row.tournament_mapping;
        if (!map || !predicate(map, row)) continue;
        row.status = 'unmapped';
        delete row.mapped_at;
        delete row.tournament_mapping;
        released.push(row.record_id);
    }
    if (released.length) {
        tournamentState.importedBattleRecordIds = tournamentState.importedBattleRecordIds.filter(id => !released.includes(id));
        tournamentState.pendingSubmissions = tournamentState.pendingSubmissions.filter(item => !released.includes(item.record_id));
    }
    return released.length;
}

function restorePendingOcrCorrectionsFromState() {
    pendingRecords.clear();
    const now = Date.now();
    for (const saved of tournamentState?.pendingOcrCorrections || []) {
        const { key, ...pending } = saved || {};
        const age = now - Number(pending.createdAt || 0);
        if (key && pending && Number.isFinite(age) && age >= 0 && age <= PENDING_CORRECTION_TTL_MS) {
            pendingRecords.set(key, pending);
        }
    }
    cleanupPendingRecords();
    if (tournamentState) {
        tournamentState.pendingOcrCorrections = [...pendingRecords.entries()].map(([key, value]) => ({ key, ...value }));
    }
    return pendingRecords.size;
}

async function syncPendingOcrCorrections({ archive = true } = {}) {
    if (!tournamentState) return;
    tournamentState.pendingOcrCorrections = [...pendingRecords.entries()].map(([key, value]) => ({ key, ...value }));
    await saveTournamentState({ archive });
}

async function flushArchiveSnapshot() {
    if (archiveSnapshotTimer) clearTimeout(archiveSnapshotTimer);
    archiveSnapshotTimer = null;
    if (!TARGET_CHANNEL_ID) return false;
    if (archiveSnapshotInFlight) return archiveSnapshotInFlight;
    archiveSnapshotInFlight = (async () => {
        try {
            // Keep every recovery snapshot in the same public channel as commands
            // and screenshots. No second/private archive channel is supported.
            const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
            if (!channel?.isTextBased()) throw new Error('Configured target channel is not text-based.');
            const snapshot = JSON.stringify(Tournament.makePublicArchiveSnapshot(tournamentState), null, 2);
            const name = `yolo-tourney-snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            await channel.send({ content: `Tournament recovery snapshot · ${tournamentState.players.length} players · ${new Date().toISOString()}`, files: [new AttachmentBuilder(Buffer.from(snapshot, 'utf8'), { name })], allowedMentions: { parse: [] } });
            return true;
        } catch (error) { console.error('Could not archive tournament snapshot:', error.message); return false; }
        finally { archiveSnapshotInFlight = null; }
    })();
    return archiveSnapshotInFlight;
}

function scheduleArchiveSnapshot() {
    if (!TARGET_CHANNEL_ID) return;
    if (archiveSnapshotTimer) clearTimeout(archiveSnapshotTimer);
    if (SNAPSHOT_DEBOUNCE_MS === 0) {
        // Awaiting this promise keeps unit/integration tests deterministic, and
        // permits an explicit zero-second production override when required.
        return flushArchiveSnapshot();
    }
    archiveSnapshotTimer = setTimeout(() => {
        archiveSnapshotTimer = null;
        void flushArchiveSnapshot();
    }, SNAPSHOT_DEBOUNCE_MS);
    archiveSnapshotTimer.unref?.();
}

async function saveTournamentState({ archive = true } = {}) {
    await tournamentStore.save(tournamentState);
    if (archive) await scheduleArchiveSnapshot();
}

async function handleTournamentCommand(message) {
    const content = String(message.content || '').trim();
    if (!/^!yolo(?:\s|$)/i.test(content)) return false;
    if (!tournamentState) {
        await message.reply({ content: 'Tournament data is still loading. Please retry in a moment.', allowedMentions: { repliedUser: false, parse: [] } });
        return true;
    }
    const rest = content.replace(/^!yolo\s*/i, '');
    const firstSpace = rest.search(/\s/);
    const command = (firstSpace < 0 ? rest : rest.slice(0, firstSpace)).toLowerCase();
    const args = firstSpace < 0 ? '' : rest.slice(firstSpace).trim();
    if (isAdminOnlyCommand(command) && !isTournamentAdmin(message)) {
        await message.reply({ content: 'That command is restricted to tournament admins (Manage Server permission or an ID in `TOURNAMENT_ADMIN_IDS`).', allowedMentions: { repliedUser: false, parse: [] } });
        return true;
    }
    try {
        let response;
        if (!command || command === 'help') response = tournamentHelp();
        else if (command === 'panel') {
            await message.reply({ content: tournamentPanelText(), components: buildTournamentPanelComponents(), allowedMentions: { repliedUser: false, parse: [] } });
            return true;
        }
        else if (command === 'download-workbook' || command === 'workbook') {
            const workbookBytes = await fs.readFile(WORKBOOK_PATH);
            await message.reply({
                content: 'Source Excel tournament workbook attached. Its default Totals!H12 formula is `=0.54*G12/100` and displays **$12.49** for the workbook’s default data.',
                files: [new AttachmentBuilder(workbookBytes, { name: 'YOLO-Tournament-Workbook.xlsm' })],
                allowedMentions: { repliedUser: false, parse: [] },
            });
            return true;
        } else if (command === 'snapshot') {
            const sent = await flushArchiveSnapshot();
            response = sent ? 'Full-state recovery snapshot attached to the configured public channel.' : 'Snapshot could not be attached. Check that TARGET_CHANNEL_ID is set and the bot has View Channel, Send Messages, and Attach Files permissions.';
        } else if (command === 'players') {
            response = tournamentState.players.length ? `**Tournament roster**\n${tournamentState.players.map(p => `#${p.id} — ${p.name}`).join('\n')}` : 'No players yet. An admin can use `!yolo add-player <name>`.';
        } else if (command === 'player') {
            if (!args) throw new Error('Usage: `!yolo player <name or ID>`.');
            response = playerDetailText(args);
        } else if (command === 'add-player') {
            const player = Tournament.addPlayer(tournamentState, args);
            await saveTournamentState();
            response = `Added **${player.name}** as player #${player.id}.`;
        } else if (command === 'rename-player') {
            const parts = args.split('|').map(v => v.trim());
            if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Usage: `!yolo rename-player <name or ID> | <new name>`.');
            const renamed = Tournament.renamePlayer(tournamentState, parts[0], parts[1]);
            for (const row of tournamentState.battleRecords) if (row.tournament_mapping?.player_id === renamed.player.id) row.tournament_mapping.player_name = renamed.player.name;
            await saveTournamentState();
            response = `Renamed **${renamed.previousName}** to **${renamed.player.name}** without changing scores.`;
        } else if (command === 'remove-player') {
            if (!args) throw new Error('Usage: `!yolo remove-player <name or ID>`.');
            const player = Tournament.removePlayer(tournamentState, args);
            await saveTournamentState();
            response = `Removed **${player.name}** from the active roster. Historical OCR records are retained in the archive.`;
        } else if (command === 'settings') response = tournamentSettingsText();
        else if (command === 'setting') {
            const [event, field, value, ...extra] = args.split(/\s+/);
            if (!event || !field || value === undefined || extra.length) throw new Error('Usage: `!yolo setting <event> <field> <number>`.');
            const result = Tournament.setSetting(tournamentState, event.toLowerCase(), field, value);
            await saveTournamentState();
            response = `Updated ${Tournament.EVENT_LABELS[event.toLowerCase()] || event} setting **${field}** to **${result}**.`;
        } else if (command === 'result') {
            const replace = /(?:^|\s)--replace\s*$/i.test(args);
            const cleanArgs = args.replace(/(?:^|\s)--replace\s*$/i, '').trim();
            const parts = cleanArgs.split('|').map(v => v.trim());
            if (parts.length < 6) throw new Error('Usage: `!yolo result <player or ID> | <damage|kills|race|grand> | <game 1-7> | <DD|CA|BB> | <tier> | <metric>`; Grand Yolo requires `damage | kills | time` as the final three values.');
            const [player, event, gameNumber, shipClass, tier, ...metrics] = parts;
            const input = { player, event: event.toLowerCase(), gameNumber, shipClass, tier };
            if (input.event === 'grand') {
                if (metrics.length !== 3) throw new Error('Grand Yolo requires `damage | kills | time` after tier.');
                [input.damage, input.kills, input.time] = metrics;
            } else {
                if (metrics.length !== 1) throw new Error('Use exactly one metric after tier for this event.');
                if (input.event === 'damage') input.damage = metrics[0];
                else if (input.event === 'kills') input.kills = metrics[0];
                else if (input.event === 'race') input.time = metrics[0];
                else throw new Error('Unknown event. Use damage, kills, race, or grand.');
            }
            const saved = Tournament.recordResult(tournamentState, input, { replace });
            await saveTournamentState();
            response = `Saved **${saved.player.name}**, ${Tournament.EVENT_LABELS[saved.event]} game ${saved.gameNumber}.\nSlot: ${JSON.stringify(saved.game)}\nUpdated total: ${saved.scores.find(r => r.id === saved.player.id).total.toFixed(2)} doubloons.`;
        } else if (command === 'standings') response = args ? eventStandingsText(args.toLowerCase()) : tournamentStandingsText();
        else if (command === 'totals') response = tournamentTotalsText();
        else if (command === 'status') response = tournamentStatusText();
        else if (command === 'missing') response = missingSlotsText(args);
        else if (command === 'clear-slot') {
            const parts = args.split('|').map(v => v.trim());
            if (parts.length !== 3 || parts.some(v => !v)) throw new Error('Usage: `!yolo clear-slot <player or ID> | <event> | <game 1-7>`.');
            const [playerArg, eventArg, game] = parts;
            const player = Tournament.findPlayer(tournamentState, playerArg);
            if (!player) throw new Error(`Player "${playerArg}" was not found.`);
            const event = eventArg.toLowerCase();
            Tournament.clearSlot(tournamentState, player.id, event, game);
            const released = releaseMappedRecords(map => map.player_id === player.id && map.event === event && Number(map.game_number) === Number(game));
            await saveTournamentState();
            response = `Cleared ${player.name} · ${Tournament.EVENT_LABELS[event] || event} game ${game}.${released ? ` Released ${released} archived record(s) for remapping.` : ''}`;
        } else if (command === 'clear-event') {
            const parts = args.split('|').map(v => v.trim());
            if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Usage: `!yolo clear-event <event> | <player name or ID, or ALL>`.');
            const event = parts[0].toLowerCase();
            const all = parts[1].toUpperCase() === 'ALL';
            const selected = all ? null : Tournament.findPlayer(tournamentState, parts[1]);
            if (!all && !selected) throw new Error(`Player "${parts[1]}" was not found.`);
            const cleared = Tournament.clearEvent(tournamentState, event, selected ? selected.id : null);
            const released = releaseMappedRecords(map => map.event === event && (all || map.player_id === selected.id));
            await saveTournamentState();
            response = `Cleared ${Tournament.EVENT_LABELS[event] || event} for ${all ? `${cleared.length} player(s)` : selected.name}.${released ? ` Released ${released} archived record(s) for remapping.` : ''}`;
        } else if (command === 'clear-results') {
            if (args !== 'CONFIRM') throw new Error('This clears every player’s score in all four events. Type `!yolo clear-results CONFIRM` to proceed.');
            Tournament.clearAllResults(tournamentState);
            await saveTournamentState();
            response = 'All event slots cleared. The roster and scoring settings remain. Archived OCR records are available for remapping.';
        } else if (command === 'records') {
            const rows = tournamentState.battleRecords.filter(item => item.status !== 'mapped');
            response = rows.length ? `**OCR records awaiting mapping**\n${rows.map(item => `\`${item.record_id}\` — ${item.record?.battle?.player_name || 'Unknown player'} — ${item.status || 'unmapped'}`).join('\n')}` : 'No OCR records are awaiting tournament mapping.';
        } else if (command === 'map') {
            if (pendingRecords.has(`${message.channelId}:${message.author.id}`)) throw new Error('Finish or `cancel correction` for the active screenshot before starting a different mapping.');
            const recordId = args.trim();
            const archived = tournamentState.battleRecords.find(item => item.record_id === recordId);
            if (!archived) throw new Error(`No archived OCR record found with ID \`${recordId}\`.`);
            if (archived.status === 'mapped') throw new Error('That OCR record is already mapped to a tournament slot.');
            await beginTournamentMapping(message, archived.record);
            response = `Started or queued mapping for OCR record \`${recordId}\`.`;
        } else if (command === 'finalize') {
            const totalSlots = tournamentState.players.length * Tournament.EVENTS.length * 7;
            let filledSlots = 0;
            for (const player of tournamentState.players) for (const event of Tournament.EVENTS) for (const game of player.events[event]) if (slotIsFilled(event, game)) filledSlots += 1;
            const finalExport = Tournament.makePublicArchiveSnapshot(tournamentState);
            finalExport.export_purpose = 'final-tournament-export';
            finalExport.final_summary = {
                player_count: tournamentState.players.length,
                total_game_slots: totalSlots,
                filled_game_slots: filledSlots,
                missing_game_slots: totalSlots - filledSlots,
                pending_tournament_mappings: tournamentState.pendingSubmissions.length,
                pending_ocr_corrections: tournamentState.pendingOcrCorrections.length,
                generated_at: new Date().toISOString(),
            };
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const summary = `Final JSON snapshot attached. Game slots filled: ${filledSlots}/${totalSlots}; missing: ${totalSlots - filledSlots}; pending mappings: ${tournamentState.pendingSubmissions.length}; pending OCR corrections: ${tournamentState.pendingOcrCorrections.length}. This does not lock the tournament.`;
            await message.reply({ content: summary, files: [new AttachmentBuilder(Buffer.from(JSON.stringify(finalExport, null, 2), 'utf8'), { name: `yolo-tourney-final-${timestamp}.json` })], allowedMentions: { repliedUser: false, parse: [] } });
            return true;
        } else if (command === 'export' || command === 'export-workbook') {
            const data = command === 'export' ? JSON.stringify(Tournament.makePublicArchiveSnapshot(tournamentState), null, 2) : JSON.stringify(Tournament.makeWorkbookBackup(tournamentState), null, 2);
            const filename = command === 'export' ? 'yolo-tourney-full-archive.json' : 'yolo-tourney-workbook-backup.json';
            await message.reply({ content: command === 'export' ? 'Public-safe tournament archive attached. Private account links and per-user pending correction associations are omitted; use the authenticated local Admin backup for complete private recovery.' : 'Workbook-compatible JSON backup attached.', files: [new AttachmentBuilder(Buffer.from(data, 'utf8'), { name: filename })], allowedMentions: { repliedUser: false, parse: [] } });
            return true;
        } else if (command === 'import') {
            const attachment = [...message.attachments.values()].find(a => /\.json$/i.test(a.name || '') || /json/i.test(a.contentType || ''));
            if (!attachment) throw new Error('Attach a `.json` backup to the same `!yolo import` message. This replaces the current tournament state.');
            if (attachment.size > 10 * 1024 * 1024) throw new Error('Backup must be 10 MB or smaller.');
            const responseFetch = await fetch(attachment.url, { signal: AbortSignal.timeout(30000) });
            if (!responseFetch.ok) throw new Error(`Could not download the backup (HTTP ${responseFetch.status}).`);
            const imported = Tournament.importBackup(JSON.parse(await responseFetch.text()));
            tournamentState = imported;
            // A full archive carries resumable screenshot corrections. Rebuild the
            // in-memory queue as well as the persisted state when importing it.
            restorePendingOcrCorrectionsFromState();
            await saveTournamentState();
            response = `Restored tournament backup: ${tournamentState.players.length} players. The current local state was replaced.`;
        } else throw new Error(`Unknown command \`${command}\`. Use \`!yolo help\`.`);
        const replyChunks = splitForDiscord(String(response));
        if (replyChunks.length) {
            await message.reply({ content: replyChunks[0], allowedMentions: { repliedUser: false, parse: [] } });
            for (const chunk of replyChunks.slice(1)) await message.channel.send({ content: chunk, allowedMentions: { parse: [] } });
        }
    } catch (error) {
        await message.reply({ content: `⚠️ ${error.message}`, allowedMentions: { repliedUser: false, parse: [] } });
    }
    return true;
}

function findPendingTournamentMapping(message) {
    if (!tournamentState || !Array.isArray(tournamentState.pendingSubmissions)) return null;
    return tournamentState.pendingSubmissions.find(item => item && item.channelId === message.channelId && item.userId === message.author.id);
}

function mappingQuestion(pending, error = '') {
    const record = pending.record || {};
    const battle = record.battle || {};
    const metrics = battle.metrics || {};
    const step = pending.step;
    const prefix = error ? `⚠️ ${error}\n\n` : '';
    const prompts = {
        player: `Which roster player is this? Enter the exact player name or roster ID. OCR name: **${battle.player_name || 'unknown'}**.`,
        event: 'Which tournament event is this screenshot for? Reply `damage`, `kills`, `race`, or `grand`.',
        game: 'Which game slot is this? Reply with a number from `1` to `7`.',
        shipClass: 'What is the ship class? Reply `DD`, `CA`, or `BB`.',
        tier: `What is the ship tier? Reply with a whole number from \`1\` to \`11\`. Ship: **${battle.ship || 'not detected'}**${record.tournament?.suggestions?.tier_from_ship_name ? ` (OCR suggests tier ${record.tournament.suggestions.tier_from_ship_name}; please confirm by entering the tier)` : ''}.`,
        damage: `What was the damage value? OCR ${metrics.damage == null ? 'did not capture this value' : `captured ${metrics.damage}`}; enter the verified damage.`,
        kills: `How many kills? The Destroyed ribbon ${metrics.kills == null ? 'was not captured reliably' : `suggests ${metrics.kills}`}; enter the verified kill count.`,
        time: 'What was the race time? Enter a positive number of seconds. The screenshot timestamp is not used as race time.',
    };
    return `${prefix}**YOLO Tourney — one value needed**\n${prompts[step] || 'Reply with the missing tournament value.'}\n\nReply ` + '`cancel mapping`' + ' to stop tournament mapping without deleting the OCR battle record.';
}

function nextMappingStep(pending) {
    if (!pending.values.playerId) return 'player';
    if (!pending.values.event) return 'event';
    if (!pending.values.gameNumber) return 'game';
    if (!pending.values.shipClass) return 'shipClass';
    if (!pending.values.tier) return 'tier';
    const event = pending.values.event;
    const metrics = pending.record?.battle?.metrics || {};
    if (event === 'damage' && metrics.damage == null && pending.values.damage == null) return 'damage';
    if (event === 'kills' && metrics.kills == null && pending.values.kills == null) return 'kills';
    if (event === 'race' && pending.values.time == null) return 'time';
    if (event === 'grand') {
        if (metrics.damage == null && pending.values.damage == null) return 'damage';
        if (metrics.kills == null && pending.values.kills == null) return 'kills';
        if (pending.values.time == null) return 'time';
    }
    return null;
}

async function beginTournamentMapping(message, exportData) {
    if (!tournamentState || !exportData?.record_id) return;
    const archived = tournamentState.battleRecords.find(item => item.record_id === exportData.record_id);
    if (archived?.status === 'mapped' || tournamentState.importedBattleRecordIds.includes(exportData.record_id)) return;
    // Do not create a duplicate pending mapping for the same record. Multiple
    // screenshots from one user are queued in order rather than overwriting work.
    if (tournamentState.pendingSubmissions.some(item => item.record_id === exportData.record_id)) return;
    const existingPending = tournamentState.pendingSubmissions.some(item => item.userId === message.author.id && item.channelId === message.channelId);
    const battle = exportData.battle || {};
    const matched = tournamentState.players.find(p => p.name.trim().toLowerCase() === String(battle.player_name || '').trim().toLowerCase());
    const pending = {
        userId: message.author.id,
        channelId: message.channelId,
        record_id: exportData.record_id,
        record: exportData,
        values: { playerId: matched ? matched.id : null, event: null, gameNumber: null, shipClass: null, tier: null, damage: null, kills: null, time: null },
        createdAt: new Date().toISOString(),
    };
    pending.step = nextMappingStep(pending);
    tournamentState.pendingSubmissions.push(pending);
    await saveTournamentState();
    if (existingPending) {
        await message.channel.send({ content: `Saved this OCR record to the mapping queue. Finish the current mapping first; this one will be prompted next. Record ID: \`${exportData.record_id}\``, allowedMentions: { parse: [] } });
        return;
    }
    if (!pending.step) return finalizeTournamentMapping(message, pending);
    await message.channel.send({ content: mappingQuestion(pending), allowedMentions: { parse: [] } });
}

function parseMappingAnswer(pending, rawValue) {
    const value = String(rawValue || '').trim();
    const step = pending.step;
    if (!value) throw new Error('Please enter one non-blank value.');
    if (step === 'player') {
        const player = Tournament.findPlayer(tournamentState, value);
        if (!player) throw new Error(`No roster player matched "${value}". Ask a tournament admin to add the player, then retry with the roster name or ID.`);
        pending.values.playerId = player.id;
    } else if (step === 'event') {
        const aliases = { '1': 'damage', 'round 1': 'damage', '2': 'kills', 'round 2': 'kills', '3': 'race', 'round 3': 'race', '4': 'grand', 'round 4': 'grand', 'grand yolo': 'grand' };
        const event = aliases[value.toLowerCase()] || value.toLowerCase();
        if (!Tournament.EVENTS.includes(event)) throw new Error('Use `damage`, `kills`, `race`, or `grand`.');
        pending.values.event = event;
    } else if (step === 'game') {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1 || n > 7) throw new Error('Game slot must be a whole number from 1 to 7.');
        pending.values.gameNumber = n;
    } else if (step === 'shipClass') {
        const shipClass = value.toUpperCase();
        if (!['DD', 'CA', 'BB'].includes(shipClass)) throw new Error('Ship class must be `DD`, `CA`, or `BB`.');
        pending.values.shipClass = shipClass;
    } else if (step === 'tier') {
        const tier = Number(value);
        if (!Number.isInteger(tier) || tier < 1 || tier > 11) throw new Error('Tier must be a whole number from 1 to 11.');
        pending.values.tier = tier;
    } else if (step === 'damage' || step === 'kills') {
        const n = Number(value);
        if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${step === 'damage' ? 'Damage' : 'Kills'} must be a non-negative whole number.`);
        pending.values[step] = n;
    } else if (step === 'time') {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) throw new Error('Race time must be a positive number of seconds.');
        pending.values.time = n;
    }
}

async function finalizeTournamentMapping(message, pending) {
    const record = pending.record;
    const metrics = record.battle?.metrics || {};
    const values = pending.values;
    const event = values.event;
    const input = {
        player: values.playerId,
        event,
        gameNumber: values.gameNumber,
        shipClass: values.shipClass,
        tier: values.tier,
        recordId: pending.record_id,
        damage: values.damage ?? metrics.damage,
        kills: values.kills ?? metrics.kills,
        time: values.time,
    };
    if (event === 'damage' && input.damage == null) throw new Error('Damage is missing; the mapping flow should ask for it before saving.');
    if (event === 'kills' && input.kills == null) throw new Error('Kills are missing; the mapping flow should ask for them before saving.');
    if (event === 'race') input.time = values.time;
    const result = Tournament.recordResult(tournamentState, input);
    const archived = tournamentState.battleRecords.find(item => item.record_id === pending.record_id);
    if (archived) {
        archived.status = 'mapped';
        archived.mapped_at = new Date().toISOString();
        archived.tournament_mapping = { player_id: result.player.id, player_name: result.player.name, event, game_number: result.gameNumber, ship_class: values.shipClass, tier: values.tier };
    }
    tournamentState.pendingSubmissions = tournamentState.pendingSubmissions.filter(item => item !== pending && item.record_id !== pending.record_id);
    await saveTournamentState();
    const standing = result.scores.find(row => row.id === result.player.id);
    await message.reply({ content: `✅ Saved screenshot to **${result.player.name}**, **${Tournament.EVENT_LABELS[event]} game ${result.gameNumber}**.\nCurrent total: **${standing.total.toFixed(2)} doubloons**.\n${tournamentStandingsText()}`, allowedMentions: { repliedUser: false, parse: [] } });
    const next = findPendingTournamentMapping(message);
    if (next) await message.channel.send({ content: mappingQuestion(next), allowedMentions: { parse: [] } });
}

async function handleTournamentMappingReply(message) {
    const pending = findPendingTournamentMapping(message);
    if (!pending) return false;
    const content = String(message.content || '').trim();
    if (/^(cancel mapping|cancel tournament mapping)$/i.test(content)) {
        tournamentState.pendingSubmissions = tournamentState.pendingSubmissions.filter(item => item !== pending);
        await saveTournamentState({ archive: false });
        await message.reply({ content: 'Tournament mapping cancelled. The OCR battle record remains in the archive and can be mapped later by an admin.', allowedMentions: { repliedUser: false, parse: [] } });
        const next = findPendingTournamentMapping(message);
        if (next) await message.channel.send({ content: mappingQuestion(next), allowedMentions: { parse: [] } });
        return true;
    }
    try {
        parseMappingAnswer(pending, content);
        pending.step = nextMappingStep(pending);
        if (pending.step) {
            await saveTournamentState({ archive: false });
            await message.reply({ content: mappingQuestion(pending), allowedMentions: { repliedUser: false, parse: [] } });
        } else {
            await finalizeTournamentMapping(message, pending);
        }
    } catch (error) {
        if (!pending.step && /already filled/i.test(error.message)) {
            pending.step = 'game';
            await saveTournamentState({ archive: false });
            await message.reply({ content: mappingQuestion(pending, `${error.message} Choose a different game slot.`), allowedMentions: { repliedUser: false, parse: [] } });
        } else if (!pending.step) {
            tournamentState.pendingSubmissions = tournamentState.pendingSubmissions.filter(item => item !== pending);
            await saveTournamentState({ archive: false });
            await message.reply({ content: `Could not finish mapping this OCR record: ${error.message}. The OCR record remains in the archive.`, allowedMentions: { repliedUser: false, parse: [] } });
            const next = findPendingTournamentMapping(message);
            if (next) await message.channel.send({ content: mappingQuestion(next), allowedMentions: { parse: [] } });
        } else {
            await message.reply({ content: mappingQuestion(pending, error.message), allowedMentions: { repliedUser: false, parse: [] } });
        }
    }
    return true;
}

async function postBattleRecord(message, record, fileName, note = '', sourceEvidence = null) {
    const chunks = splitForDiscord(formatBattleRecord(record));
    const safeFileName = String(fileName || 'uploaded image').replace(/[ `\\]/g, '');
    const heading = `📄 **World of Warships Battle Record**\n> Source: \`${safeFileName}\`${note ? `\n> ${note.replace(/[\r\n]/g, ' ')}` : ''}\n> Machine-readable JSON is attached for YOLO Tourney import.\n\n`;
    const exportData = makeTournamentExport(record, { sourceFileName: fileName, sourceEvidence });
    if (tournamentState) {
        const exists = tournamentState.battleRecords.some(item => item.record_id === exportData.record_id);
        if (!exists) {
            const discordUserId = String(message.author?.id || '');
            const linkedPlayer = Tournament.findPlayerByDiscordUserId(tournamentState, discordUserId);
            const identityMatches = Boolean(linkedPlayer && String(record?.player || '').trim().toLowerCase() === String(linkedPlayer.name).trim().toLowerCase());
            const archived = {
                record_id: exportData.record_id,
                status: identityMatches ? 'awaiting-mapping' : 'admin-review',
                captured_at: new Date().toISOString(),
                source_file: String(fileName || ''),
                record: exportData,
                ocr_record: record,
                missing_fields: [],
            };
            // Preserve ownership for roster-linked Discord submitters. The same
            // record then appears in that player's desktop review queue. Identity
            // mismatch is still admin-review and cannot be remapped by the player.
            if (linkedPlayer) {
                archived.desktop_owner_id = discordUserId;
                archived.desktop_owner_role = 'player';
            }
            tournamentState.battleRecords.push(archived);
        }
        await saveTournamentState();
    }
    const exportAttachment = new AttachmentBuilder(
        Buffer.from(JSON.stringify(exportData, null, 2), 'utf8'),
        { name: `wows-battle-record-${exportData.record_id}.json` },
    );
    await message.reply({
        content: `${heading}${chunks[0]}`,
        files: [exportAttachment],
        allowedMentions: { repliedUser: false, parse: [] },
    });
    for (const chunk of chunks.slice(1)) await message.channel.send({ content: chunk, allowedMentions: { parse: [] } });
    await beginTournamentMapping(message, exportData);
}


function pendingKey(message) { return `${message.channelId}:${message.author.id}`; }
function cleanupPendingRecords() {
    const now = Date.now();
    let changed = false;
    for (const [key, pending] of pendingRecords) {
        if (!pending || now - Number(pending.createdAt || 0) > PENDING_CORRECTION_TTL_MS) {
            pendingRecords.delete(key);
            changed = true;
        }
    }
    return changed;
}
async function promptForMissingValues(message, fileName, record, missing, sourceEvidence = null) {
    cleanupPendingRecords();
    pendingRecords.set(pendingKey(message), {
        record, fileName: String(fileName || 'uploaded image'), createdAt: Date.now(),
        uploadMessageId: message.id, sourceEvidence,
    });
    await syncPendingOcrCorrections();
    await message.reply({ content: makeCorrectionPrompt(fileName, record, missing), allowedMentions: { repliedUser: false, parse: [] } });
}

async function handleCorrectionMessage(message) {
    const expired = cleanupPendingRecords();
    if (expired) await syncPendingOcrCorrections();
    const key = pendingKey(message);
    const pending = pendingRecords.get(key);
    if (!pending) return false;
    const content = String(message.content || '').trim();
    if (/^(cancel|cancel correction|discard correction)$/i.test(content)) {
        pendingRecords.delete(key);
        await syncPendingOcrCorrections();
        await message.reply({ content: 'Correction cancelled.', allowedMentions: { repliedUser: false, parse: [] } });
        return true;
    }

    const beforeMissing = getMissingRequiredFields(pending.record);
    if (!beforeMissing.length) {
        pendingRecords.delete(key);
        await syncPendingOcrCorrections({ archive: false });
        await postBattleRecord(message, pending.record, pending.fileName, 'Required values confirmed.', pending.sourceEvidence || null);
        return true;
    }

    // Ask for one value at a time. Accept a plain value only; reject multi-field
    // corrections so the current question is always explicit and unambiguous.
    const activeField = beforeMissing[0];
    if (!content || /[\r\n]/.test(content) || /^(?:battle\s*result|result|victory\/defeat|defeat\/victory|player(?:\s*name)?|map(?:\s*name)?|operation(?:\s*name)?|battle\s*mode|mode|battle\s*start\s*time|timestamp|battle\s*timestamp|start\s*time|credits|free\s*xp|freexp|free\s*experience|damage)\s*[:=]/i.test(content)) {
        await message.reply({
            content: makeCorrectionPrompt(pending.fileName, pending.record, beforeMissing,
                'Please send one value only, without a field label or a list.'),
            allowedMentions: { repliedUser: false, parse: [] },
        });
        return true;
    }

    const applied = applyCorrections(pending.record, `${activeField.label}: ${content}`);
    pending.record = applied.record;
    const missing = getMissingRequiredFields(pending.record);
    if (missing.length) {
        pendingRecords.set(key, pending);
        await syncPendingOcrCorrections();
        const currentStillMissing = missing[0].key === activeField.key;
        const retryReason = currentStillMissing
            ? `That value wasn't accepted. ${applied.invalid[0]?.reason || 'Please check it and try again.'}`
            : '';
        await message.reply({
            content: makeCorrectionPrompt(pending.fileName, pending.record, missing, retryReason),
            allowedMentions: { repliedUser: false, parse: [] },
        });
        return true;
    }

    pendingRecords.delete(key);
    await syncPendingOcrCorrections({ archive: false });
    await postBattleRecord(message, pending.record, pending.fileName, 'Required values confirmed.', pending.sourceEvidence || null);
    return true;
}

// ============================================================
// SECTION 6: DISCORD MESSAGE EVENT HANDLER
// ============================================================
async function handleIncomingMessage(message) {
    if (message.author.bot || message.channelId !== TARGET_CHANNEL_ID) return false;
    if (/^!yolo(?:\s|$)/i.test(String(message.content || '').trim())) {
        await handleTournamentCommand(message);
        return;
    }
    const attachments = [...message.attachments.values()];
    if (attachments.length > 0 && findPendingTournamentMapping(message)) {
        await message.reply({ content: 'Finish or `cancel mapping` for the current tournament submission first. This new attachment was not processed; upload it again afterward.', allowedMentions: { repliedUser: false, parse: [] } });
        return;
    }
    if (attachments.length > 1) {
        await message.reply({ content: 'Please upload one screenshot per message so each image can have its own correction and tournament-mapping conversation.', allowedMentions: { repliedUser: false, parse: [] } });
        return;
    }
    if (attachments.length === 0 && await handleTournamentMappingReply(message)) return;
    if (attachments.length === 0) {
        await handleCorrectionMessage(message).catch((error) => console.error('Could not process user correction:', error));
        return;
    }
    // A newer valid screenshot replaces this user's pending correction only after
    // it has acquired a slot in the bounded queue. Full queues/unsupported files
    // must leave the previous correction state intact.
    for (const attachment of attachments) {
        const fileName = attachment.name || 'uploaded attachment';
        const contentType = String(attachment.contentType || '').toLowerCase();
        const extension = path.extname(fileName).toLowerCase();
        const supportedImage = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'].includes(extension) || /^image\/(png|jpeg|webp|bmp|tiff?)$/.test(contentType);
        if (!supportedImage) {
            await message.reply({ content: 'Please upload a screenshot as PNG, JPG, WEBP, BMP, or TIFF. Other attachment types are not processed as images.', allowedMentions: { repliedUser: false, parse: [] } });
            continue;
        }
        try {
            // Typing indicators are best-effort. A Discord typing endpoint error or
            // rate limit must not prevent an otherwise valid screenshot from being
            // admitted to the OCR queue.
            await Promise.resolve().then(() => message.channel.sendTyping()).catch((error) => {
                console.error('Could not display OCR typing indicator:', error?.message || error);
            });
            console.log(`Attempting OCR extraction from ${fileName} by ${message.author.tag}.`);
            const queueBefore = ocrTaskQueue.stats();
            const ocrPromise = extractTextFromAttachment(attachment, async () => {
                pendingRecords.delete(pendingKey(message));
                await syncPendingOcrCorrections({ archive: false });
            }, {
                messageId: message.id,
                channelId: message.channelId,
                messageUrl: message.url,
            });
            const queueAfter = ocrTaskQueue.stats();
            const accepted = queueAfter.outstanding === queueBefore.outstanding + 1;
            if (accepted && queueBefore.outstanding > 0) {
                const ahead = Math.max(0, queueAfter.outstanding - 1);
                await message.reply({
                    content: `Your screenshot was accepted into the OCR queue. There ${ahead === 1 ? 'is' : 'are'} ${ahead} job${ahead === 1 ? '' : 's'} ahead of it. This screenshot has not been processed or scored yet; the bot will post the result in this channel when processing finishes.`,
                    allowedMentions: { repliedUser: false, parse: [] },
                }).catch((replyError) => console.error('Could not send OCR queue acknowledgement:', replyError.message));
            }
            const ocrOutput = await ocrPromise;
            const validations = ocrOutput.attempts.map((attempt) => validateWorldOfWarshipsScreenshot(attempt, ocrOutput.fields));
            validations.sort((a, b) => a.missing.length - b.missing.length || b.confidence - a.confidence);
            const validation = validations[0];
            const record = validation.record;
            const missing = getMissingRequiredFields(record);
            console.log(`OCR result for ${fileName}: ${missing.length ? `pending ${missing.map((f) => f.label).join(', ')}` : 'complete'}; resolved ${9 - missing.length}/9 required fields; mean OCR confidence ${validation.confidence.toFixed(1)}; PSM ${validation.pageSegmentationMode}.`);
            if (missing.length) {
                await promptForMissingValues(message, fileName, record, missing, ocrOutput.sourceEvidence || null);
                continue;
            }
            await postBattleRecord(message, record, fileName, '', ocrOutput.sourceEvidence || null);
            console.log(`Finished posting battle record for ${fileName}.`);
        } catch (error) {
            console.error(`OCR extraction failed for ${fileName}:`, error);
            if (error?.code === 'SERIAL_QUEUE_FULL') {
                await message.reply({
                    content: 'The screenshot OCR queue is full. This image was not processed; please retry it shortly. No tournament result was recorded.',
                    allowedMentions: { repliedUser: false, parse: [] },
                }).catch((replyError) => console.error('Could not send OCR queue-full notice:', replyError.message));
                continue;
            }
            if (error?.code === 'SERIAL_TASK_TIMEOUT') {
                await message.reply({
                    content: `Screenshot OCR timed out after ${Math.ceil(error.timeoutMs / 1000)} seconds. No result was recorded. Please retry the image or enter its required values manually.`,
                    allowedMentions: { repliedUser: false, parse: [] },
                }).catch((replyError) => console.error('Could not send OCR timeout notice:', replyError.message));
                continue;
            }
            if (error?.code === 'SERIAL_TASK_UNSETTLED' || error?.code === 'SERIAL_QUEUE_CLOSED') {
                await message.reply({
                    content: 'OCR processing has been paused because a previous timed-out job did not stop safely. No result was recorded. Please notify the tournament admin; the bot must be restarted after the OCR worker issue is investigated.',
                    allowedMentions: { repliedUser: false, parse: [] },
                }).catch((replyError) => console.error('Could not send OCR paused notice:', replyError.message));
                continue;
            }
            // Infrastructure/download/processing failures are not missing OCR
            // fields. Do not create an empty correction workflow that looks like a
            // real record. Tell the user to inspect records before retrying, since
            // a failure could occur after an earlier delivery step.
            await message.reply({
                content: 'The screenshot workflow could not finish reliably, so no values were guessed. Check `!yolo records` before retrying to avoid duplicates. If no record exists, upload the screenshot again or enter the result manually with `!yolo result`.',
                allowedMentions: { repliedUser: false, parse: [] },
            }).catch((replyError) => console.error('Could not send OCR failure notice:', replyError.message));
        }
    }
    return true;
}
client.on(Events.MessageCreate, handleIncomingMessage);

// ============================================================
// SECTION 7: STARTUP, CLEAN SHUTDOWN, AND TEST EXPORTS
// ============================================================
function buildTournamentPanelComponents() {
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('yolo:home').setLabel('Overview').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('yolo:totals').setLabel('Totals').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('yolo:standings').setLabel('Standings').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('yolo:players').setLabel('Players').setStyle(ButtonStyle.Secondary),
    );
    const menu = new StringSelectMenuBuilder()
        .setCustomId('yolo:event')
        .setPlaceholder('Choose an event leaderboard')
        .addOptions(Tournament.EVENTS.map(event => ({ label: Tournament.EVENT_LABELS[event], value: event, description: `Rank players by ${Tournament.EVENT_LABELS[event]} score` })));
    return [buttons, new ActionRowBuilder().addComponents(menu)];
}

function tournamentPanelText(view = 'home', event = null) {
    if (view === 'totals') return tournamentTotalsText();
    if (view === 'standings') return compactStandingsText();
    if (view === 'players') {
        const players = tournamentState.players;
        if (!players.length) return '**Tournament roster**\nNo players have been added yet.';
        const shown = players.slice(0, 35).map(player => `**#${player.id}** ${player.name}`);
        if (players.length > shown.length) shown.push(`… and ${players.length - shown.length} more. Use \`!yolo players\` for the full roster.`);
        return `**Tournament roster (${players.length}/${Tournament.MAX_PLAYERS})**\n${shown.join('\n')}`;
    }
    if (view === 'event' && Tournament.EVENTS.includes(event)) {
        const text = eventStandingsText(event);
        return text.length > 1850 ? `${text.slice(0, 1750)}\n… Use \`!yolo standings ${event}\` for the full ranking.` : text;
    }
    const rows = Tournament.standings(tournamentState);
    const totalDoubloons = rows.reduce((sum, row) => sum + row.total, 0);
    const dollars = 0.54 * totalDoubloons / 100;
    return [
        '**YOLO Tournament Control Panel**',
        `Roster: **${tournamentState.players.length}/${Tournament.MAX_PLAYERS}** players`,
        `All-player aggregate: **${totalDoubloons.toFixed(2)} doubloons · $${dollars.toFixed(2)}**`,
        `Storage: **${tournamentStore.engine || 'JSON'}** · Recovery snapshots: same public channel`,
        '',
        'Use the buttons below to view totals, standings, and roster. Choose an event from the menu to view its leaderboard.',
        'Admin scoring changes remain available through the existing `!yolo` commands.',
    ].join('\n');
}

function compactStandingsText() {
    const rows = Tournament.standings(tournamentState);
    if (!rows.length) return 'No players in the tournament yet.';
    const lines = ['**YOLO Tourney standings — top 20**', '`Rank · Player · Total doubloons · Value`'];
    rows.slice(0, 20).forEach((row, index) => lines.push(`**${index + 1}. ${row.name}** · ${row.total.toFixed(2)} · $${row.estimatedValue.toFixed(2)}`));
    const totalDoubloons = rows.reduce((sum, row) => sum + row.total, 0);
    lines.push('', `**All-player aggregate (${rows.length}/${Tournament.MAX_PLAYERS}): ${totalDoubloons.toFixed(2)} doubloons · $${(0.54 * totalDoubloons / 100).toFixed(2)}**`);
    if (rows.length > 20) lines.push(`Showing top 20 of ${rows.length}; run \`!yolo standings\` for the complete ranking.`);
    lines.push('Dollar total matches the workbook rule: aggregate unrounded scores first, then apply `=0.54*G12/100`.');
    return lines.join('\n');
}

const YOLO_SLASH_COMMAND = {
    name: 'yolo',
    description: 'Public YOLO tournament information and interactive panel',
    options: [
        { type: 1, name: 'help', description: 'Show tournament command guidance' },
        { type: 1, name: 'panel', description: 'Open the interactive tournament panel' },
        { type: 1, name: 'totals', description: 'Show accurate all-player doubloon and dollar totals' },
        { type: 1, name: 'standings', description: 'Show leaderboard and total value', options: [{ type: 3, name: 'event', description: 'Optional event leaderboard', required: false, choices: Tournament.EVENTS.map(event => ({ name: Tournament.EVENT_LABELS[event], value: event })) }] },
        { type: 1, name: 'players', description: 'Show the active participant roster' },
        { type: 1, name: 'status', description: 'Show progress across all participants' },
    ],
};

async function registerSlashCommands(readyClient = client) {
    if (!ENABLE_SLASH_COMMANDS) return false;
    const channel = await readyClient.channels.fetch(TARGET_CHANNEL_ID);
    const guildId = channel?.guildId || channel?.guild?.id;
    if (!guildId) throw new Error('Could not identify the target channel guild; slash command registration was skipped.');
    const guild = readyClient.guilds.cache.get(guildId) || await readyClient.guilds.fetch(guildId);
    const registered = await guild.commands.fetch();
    const existing = registered.find(command => command.name === YOLO_SLASH_COMMAND.name);
    if (existing) await guild.commands.edit(existing.id, YOLO_SLASH_COMMAND);
    else await guild.commands.create(YOLO_SLASH_COMMAND);
    console.log('Registered /yolo. Restrict its Discord command permissions to the configured public channel before enabling slash commands.');
    return true;
}

async function handleInteraction(interaction) {
    // Enforce the one-channel rule. We never publish tournament data outside the
    // configured public channel and never use private/ephemeral responses.
    if (!interaction || interaction.channelId !== TARGET_CHANNEL_ID) return false;
    const isSlash = interaction.isChatInputCommand?.() && interaction.commandName === 'yolo';
    const isButton = interaction.isButton?.() && String(interaction.customId || '').startsWith('yolo:');
    const isSelect = interaction.isStringSelectMenu?.() && interaction.customId === 'yolo:event';
    if (!isSlash && !isButton && !isSelect) return false;
    if (!tournamentState) {
        await interaction.reply({ content: 'Tournament data is still loading. Please retry shortly.', ephemeral: false, allowedMentions: { parse: [] } });
        return true;
    }
    try {
        if (isSlash) {
            const subcommand = interaction.options.getSubcommand();
            let content;
            let components;
            if (subcommand === 'help') content = `**Public tournament commands**\n${tournamentHelp()}`.slice(0, 1850);
            else if (subcommand === 'panel') { content = tournamentPanelText(); components = buildTournamentPanelComponents(); }
            else if (subcommand === 'totals') { content = tournamentTotalsText(); components = buildTournamentPanelComponents(); }
            else if (subcommand === 'standings') {
                const event = interaction.options.getString('event');
                content = event ? tournamentPanelText('event', event) : compactStandingsText();
                components = buildTournamentPanelComponents();
            } else if (subcommand === 'players') { content = tournamentPanelText('players'); components = buildTournamentPanelComponents(); }
            else if (subcommand === 'status') { content = tournamentStatusText().slice(0, 1850); components = buildTournamentPanelComponents(); }
            await interaction.reply({ content, ...(components ? { components } : {}), ephemeral: false, allowedMentions: { parse: [] } });
            return true;
        }
        if (isSelect) {
            const event = interaction.values?.[0];
            if (!Tournament.EVENTS.includes(event)) throw new Error('That event selection is invalid.');
            await interaction.update({ content: tournamentPanelText('event', event), components: buildTournamentPanelComponents(), allowedMentions: { parse: [] } });
            return true;
        }
        const action = interaction.customId.slice('yolo:'.length);
        const view = ['home', 'totals', 'standings', 'players'].includes(action) ? action : 'home';
        await interaction.update({ content: tournamentPanelText(view), components: buildTournamentPanelComponents(), allowedMentions: { parse: [] } });
        return true;
    } catch (error) {
        const content = `⚠️ ${error.message}`.slice(0, 1850);
        if (interaction.replied || interaction.deferred) await interaction.followUp({ content, ephemeral: false, allowedMentions: { parse: [] } });
        else await interaction.reply({ content, ephemeral: false, allowedMentions: { parse: [] } });
        return true;
    }
}

client.on(Events.InteractionCreate || 'interactionCreate', handleInteraction);
// discord.js owns Gateway heartbeats, reconnects and session resumption. These
// listeners record lifecycle evidence without creating a competing Gateway loop.
client.on('shardReady', (shardId) => {
    console.log(`[Discord Gateway] shard ${shardId} READY.`);
});
client.on('shardDisconnect', (closeEvent, shardId) => {
    const code = Number(closeEvent?.code);
    const reason = String(closeEvent?.reason || '').slice(0, 160);
    console.warn(`[Discord Gateway] shard ${shardId} disconnected (code ${Number.isFinite(code) ? code : 'unknown'}): ${reason || 'no reason supplied'}`);
});
client.on('shardReconnecting', (shardId) => {
    console.warn(`[Discord Gateway] shard ${shardId} reconnecting; discord.js is managing recovery.`);
});
client.on('shardResume', (shardId, replayedEvents) => {
    console.log(`[Discord Gateway] shard ${shardId} resumed; replayed ${Number(replayedEvents) || 0} event(s).`);
});
client.on('shardError', (error, shardId) => {
    console.error(`[Discord Gateway] shard ${shardId} error:`, error?.message || error);
});
client.on(Events.Error, (error) => console.error('[Discord client] error:', error?.message || error));
client.on(Events.Warn, (warning) => console.warn('[Discord client] warning:', warning));

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`[Discord Gateway] READY as ${readyClient.user.tag} (bot user ID ${readyClient.user.id}).`);
    console.log(`[Discord Gateway] Connected shard count: ${readyClient.ws.shards.size}.`);
    console.log(`[Discord] Checking configured target channel ${TARGET_CHANNEL_ID}...`);
    let targetChannel = null;
    try {
        targetChannel = await readyClient.channels.fetch(TARGET_CHANNEL_ID);
    } catch (error) {
        console.error('[Discord preflight] FAILED: target channel fetch failed:', error?.message || error);
    }
    const botMember = targetChannel?.guild?.members?.me || null;
    const channelCheck = inspectTargetChannelPermissions(targetChannel, botMember, [
        { name: 'ViewChannel', flag: PermissionFlagsBits.ViewChannel },
        { name: targetChannel?.isThread?.() ? 'SendMessagesInThreads' : 'SendMessages', flag: targetChannel?.isThread?.() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages },
        { name: 'AttachFiles', flag: PermissionFlagsBits.AttachFiles },
    ]);
    if (!channelCheck.ok) {
        console.error(`[Discord preflight] FAILED: ${channelCheck.reason}. Missing permissions: ${channelCheck.missingPermissions.join(', ') || 'none reported'}.`);
        console.error('[Discord preflight] Startup is aborting. Correct the test channel and bot permissions before retrying.');
        // Fail closed: do not leave a connected bot running with a broken target
        // channel, where subsequent commands or archive writes could generate 403s.
        isShuttingDown = true;
        try {
            await tournamentStore.close?.();
        } catch (error) {
            console.error('[Discord preflight] Could not close tournament storage cleanly:', error?.message || error);
        }
        readyClient.destroy();
        process.exitCode = 1;
        return;
    }
    console.log(`[Discord preflight] PASS: guild ${channelCheck.guildId}, channel #${channelCheck.channelName} (${channelCheck.channelId}); required permissions: ${channelCheck.requiredPermissions.join(', ')}.`);
    console.log(`Tournament storage: ${tournamentStore.engine || 'JSON'} (${tournamentStore.path}).`);
    if (ENABLE_SLASH_COMMANDS) registerSlashCommands(readyClient).catch(error => console.error('Slash command registration failed:', error.message));
    else console.log('Slash command registration is disabled; use `!yolo panel` for public interactive controls.');
    console.log('The bot is online and the configured channel preflight passed. Missing or conflicting required fields trigger a correction prompt; missing ribbons never block posting.');
    if (ENABLE_DESKTOP_UI) {
        try {
            const desktopService = createDesktopService({
                getState: () => tournamentState,
                saveState: () => saveTournamentState({ archive: true }),
                // Browser uploads use the same bounded serial queue and supervised
                // extraction path as Discord attachment buffers.
                extractImage: (imageBuffer) => extractText(imageBuffer),
                validateScreenshot: (attempt, fields) => validateWorldOfWarshipsScreenshot(attempt, fields),
                // Desktop administrator authority is an explicit ID allowlist only.
                isAdminId: (discordUserId) => TOURNAMENT_ADMIN_IDS.has(discordUserId),
            });
            desktopBridge = createDesktopBridge({
                host: '127.0.0.1',
                port: Number(process.env.DESKTOP_UI_PORT || 8787),
                service: desktopService,
                oauth: {
                    clientId: process.env.DISCORD_OAUTH_CLIENT_ID,
                    clientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET,
                    redirectUri: process.env.DISCORD_OAUTH_REDIRECT_URI || undefined,
                },
                maxUploadBytes: MAX_IMAGE_BYTES,
            });
            const desktop = await desktopBridge.listen();
            console.log('[Desktop UI] Listening locally at ' + desktop.origin + '.');
            console.log('[Desktop UI] Discord OAuth redirect URI: ' + desktop.redirectUri);
        } catch (error) {
            console.error('[Desktop UI] Could not start the local interface; Discord bot remains online and desktop access is disabled:', error.message);
            try { await desktopBridge?.close(); } catch {}
            desktopBridge = null;
        }
    } else {
        console.log('[Desktop UI] Disabled. Set ENABLE_DESKTOP_UI=1 and configure local Discord OAuth to enable it.');
    }
});

async function terminateOcrWorker() {
    // Detach first so a queued job cannot acquire the worker while termination is
    // in flight. Any already-running task holds only its local worker reference.
    const worker = ocrWorker;
    ocrWorker = null;
    ocrWorkerGeneration += 1;
    ocrWorkerInitialization = null;
    if (worker) await worker.terminate();
}

async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`Received ${signal}; shutting down...`);
    try {
        await desktopBridge?.close();
        desktopBridge = null;
    } catch (error) {
        console.error('Error closing desktop bridge:', error);
    }
    try {
        await terminateOcrWorker();
    } catch (error) {
        console.error('Error stopping OCR worker:', error);
    }
    try { if (tournamentState) await tournamentStore.save(tournamentState); await tournamentStore.close?.(); } catch (error) { console.error('Error closing tournament storage:', error.message); }
    client.destroy();
    process.exit(0);
}

module.exports = {
    extractText,
    validateWorldOfWarshipsScreenshot,
    terminateOcrWorker,
    buildBattleRecord,
    getMissingRequiredFields,
    formatBattleRecord,
};

// Test-only seams let the offline integration suite exercise real command routing,
// permissions, JSON attachment generation, and same-channel recovery snapshots.
if (process.env.NODE_ENV === 'test') {
    module.exports.__test = {
        client,
        tournamentStore,
        pendingRecords,
        handleIncomingMessage,
        handleTournamentCommand,
        handleTournamentMappingReply,
        handleCorrectionMessage,
        beginTournamentMapping,
        postBattleRecord,
        saveTournamentState,
        flushArchiveSnapshot,
        syncPendingOcrCorrections,
        promptForMissingValues,
        restorePendingOcrCorrectionsFromState,
        handleInteraction,
        buildTournamentPanelComponents,
        tournamentPanelText,
        compactStandingsText,
        registerSlashCommands,
        runtimeSupported,
        buildSourceEvidence,
        ocrQueueStats: () => ocrTaskQueue.stats(),
        getTournamentState: () => tournamentState,
        setTournamentState: async (state) => {
            tournamentState = Tournament.normalizeState(state);
            await tournamentStore.save(tournamentState);
            return tournamentState;
        },
        getTargetChannelId: () => TARGET_CHANNEL_ID,
        getWorkbookPath: () => WORKBOOK_PATH,
    };
}

if (require.main === module) {
    if (!runtimeSupported()) {
        console.error(`Unsupported Node.js runtime ${process.version}. This release requires Node.js v22.16.0 or newer.`);
        process.exit(1);
    }
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // ============================================================
    // SECTION 8: VALIDATE CONFIGURATION AND START BOT
    // ============================================================
    if (!BOT_TOKEN || BOT_TOKEN === 'PASTE_YOUR_BOT_TOKEN_HERE') {
        console.error('Missing Discord bot token. Add DISCORD_BOT_TOKEN to your .env file.');
        process.exit(1);
    }
    if (!TARGET_CHANNEL_ID || TARGET_CHANNEL_ID === 'PASTE_TARGET_CHANNEL_ID_HERE') {
        console.error('Missing target channel ID. Add TARGET_CHANNEL_ID to your .env file.');
        process.exit(1);
    }
    tournamentStore.load().then(async (loaded) => {
        tournamentState = loaded;
        restorePendingOcrCorrectionsFromState();
        await tournamentStore.save(tournamentState);
        console.log(`Loaded tournament state: ${tournamentState.players.length} players and ${pendingRecords.size} resumable OCR correction(s) from ${TOURNAMENT_STATE_PATH}`);
        return client.login(BOT_TOKEN);
    }).catch((error) => {
        console.error('Could not load tournament state or log in to Discord:', error.message);
        process.exit(1);
    });
}

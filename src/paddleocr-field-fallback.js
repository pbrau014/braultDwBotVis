'use strict';

// Optional local-only second-engine fallback. It is disabled by default.
// PaddleOCR output is evidence only: each candidate is normalized through the
// existing field parser and inserted into the existing consensus candidate lists
// with confidence capped below the single-read acceptance threshold. It therefore
// cannot authorize a field on its own.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
    NOT_DETECTED, buildBattleRecord, getMissingRequiredFields,
    parseIdentityLine, validPlayer, parseModeMap, parseBattleStartTime,
} = require('./battle-record');
const { parseLocalizedNumericField, extractFocusedDamage, normaliseOcrNumber } = require('./number-parser');

const HELPER_PATH = path.join(__dirname, '..', 'scripts', 'paddleocr_field_crops.py');
const FIELDS = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const MAX_GROUPS = 7;
const SINGLE_READ_CONFIDENCE_CEILING = 84;
// Candidate scores are not calibrated probabilities. This low floor only filters
// missing/unusable recognition metadata; it is never an acceptance threshold.
const MIN_CANDIDATE_CONFIDENCE = 50;
const DEFAULT_MAX_CROPS = 7;
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 2_000_000;
const MAX_STDERR_BYTES = 24_000;

function enabled(env = process.env) {
    return String(env.PADDLEOCR_FIELD_FALLBACK || '0').trim() === '1';
}

function isUnresolved(value) {
    return value === null || value === undefined || String(value).trim() === '' ||
        String(value).trim().toLowerCase() === NOT_DETECTED.toLowerCase();
}

function canonicalNumber(value) {
    const digits = normaliseOcrNumber(value);
    return /^\d{1,9}$/.test(digits) ? digits : '';
}

function canonicalText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function outcomeFromText(text) {
    const source = String(text || '');
    const victory = /\bvictory\b/i.test(source) || /our[\s'’]+team completed (?:the )?(?:primary )?(?:mission|task|objective)|our[\s'’]+team\s+(?:won\s+by|wor['’]?by) points|all enemy warships destroyed/i.test(source);
    const defeat = /\bdefeat\b/i.test(source) || /the enemy team completed (?:the )?(?:primary )?(?:mission|task|objective)|all allied warships destroyed|battle time expired.{0,80}enemy team won/i.test(source);
    return victory === defeat ? '' : victory ? 'Victory' : 'Defeat';
}

function fieldCandidateValues(field, fields) {
    const values = [];
    if (field === 'player') {
        for (const candidate of fields.identityCandidates || []) {
            const parsed = parseIdentityLine(candidate.text || '');
            if (validPlayer(parsed.player)) values.push(parsed.player);
        }
    } else if (['map', 'mode', 'battleStart'].includes(field)) {
        for (const candidate of fields.metadataCandidates || []) {
            const text = String(candidate.text || '');
            const parsed = parseModeMap(text);
            const value = field === 'battleStart' ? parseBattleStartTime(text) : parsed[field];
            if (!isUnresolved(value)) values.push(value);
        }
    } else if (field === 'result') {
        for (const candidate of fields.resultCandidates || []) {
            const value = outcomeFromText(candidate.text);
            if (value) values.push(value);
        }
    } else if (['credits', 'xp', 'freeXp'].includes(field)) {
        for (const candidate of fields.rewardCandidates || []) {
            const value = canonicalNumber(candidate[field]);
            if (value) values.push(value);
        }
        for (const read of fields.localizedRewardEvidence?.reads?.[field] || []) {
            const value = canonicalNumber(read.value);
            if (value) values.push(value);
        }
        const localized = canonicalNumber(fields.localizedRewardEvidence?.values?.[field]);
        if (localized) values.push(localized);
    } else if (field === 'damage') {
        for (const candidate of fields.damageCandidates || []) {
            const value = canonicalNumber(candidate.value);
            if (value && value.length >= 5) values.push(value);
        }
        for (const candidate of fields.fullScreenDamageCandidates || []) {
            const value = canonicalNumber(candidate.value);
            if (value && value.length >= 5) values.push(value);
        }
    }
    return values;
}

function hasConflictingCandidates(field, fields) {
    const values = fieldCandidateValues(field, fields);
    const distinct = new Set(values.map(value => ['credits', 'xp', 'freeXp', 'damage'].includes(field)
        ? String(value).replace(/^0+(?=\d)/, '') : canonicalText(value)));
    return distinct.size > 1;
}

function determineNeededFields(rawText, fields) {
    const record = buildBattleRecord(rawText || '', fields || {});
    const missing = new Set(getMissingRequiredFields(record).map(item => item.key));
    const needed = [];
    for (const field of FIELDS) {
        const value = record[field];
        const unresolved = isUnresolved(value);
        const ambiguous = Boolean(record.ambiguities?.[field]);
        const conflict = hasConflictingCandidates(field, fields || {});
        if (unresolved || ambiguous || conflict) {
            const reasons = [];
            if (unresolved || missing.has(field)) reasons.push('unresolved-or-invalid');
            if (ambiguous) reasons.push('existing-parser-ambiguity');
            if (conflict) reasons.push('candidate-values-conflict');
            needed.push({ field, reasons, currentValue: unresolved ? null : value });
        }
    }
    return { needed, record };
}

function clampRect(rect, width, height) {
    if (!rect || !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null;
    const values = [rect.left, rect.top, rect.width, rect.height].map(Number);
    if (!values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0) return null;
    const [rawLeft, rawTop, rawWidth, rawHeight] = values;
    const left = Math.max(0, Math.min(width - 1, Math.floor(rawLeft)));
    const top = Math.max(0, Math.min(height - 1, Math.floor(rawTop)));
    const right = Math.max(left + 1, Math.min(width, Math.ceil(rawLeft + rawWidth)));
    const bottom = Math.max(top + 1, Math.min(height, Math.ceil(rawTop + rawHeight)));
    const result = { left, top, width: right - left, height: bottom - top };
    // Fail closed on unusually broad proposals: this path is intended for field crops.
    if (result.width > width * 0.72 || result.height > height * 0.32) return null;
    return result;
}

function scaledPreparedRect(rect, context) {
    const preparedWidth = Number(context.preparedWidth);
    const preparedHeight = Number(context.preparedHeight);
    const sourceWidth = Number(context.sourceWidth);
    const sourceHeight = Number(context.sourceHeight);
    if (![preparedWidth, preparedHeight, sourceWidth, sourceHeight].every(v => Number.isFinite(v) && v > 0)) return null;
    return clampRect({
        left: Number(rect.left) * sourceWidth / preparedWidth,
        top: Number(rect.top) * sourceHeight / preparedHeight,
        width: Number(rect.width) * sourceWidth / preparedWidth,
        height: Number(rect.height) * sourceHeight / preparedHeight,
    }, sourceWidth, sourceHeight);
}

function cvRect(fields, name, context, minScore = 0.15, requireIsolated = false) {
    const proposal = fields.cvFieldIsolation?.regions?.[name];
    if (!proposal?.rect || Number(proposal.score) < minScore || (requireIsolated && proposal.isolatedFromAdjacentUi !== true)) return null;
    return clampRect(proposal.rect, context.sourceWidth, context.sourceHeight);
}

function fixedRect(context, fractions) {
    const width = Number(context.sourceWidth); const height = Number(context.sourceHeight);
    return clampRect({ left: fractions[0] * width, top: fractions[1] * height, width: fractions[2] * width, height: fractions[3] * height }, width, height);
}

function rewardRect(field, fields, context) {
    const evidence = fields.localizedRewardEvidence || {};
    const rect = evidence.rects?.[`${field}-psm7`] || evidence.rects?.[`${field}-psm8`];
    if (rect) {
        const scaled = scaledPreparedRect(rect, context);
        if (scaled) return scaled;
    }
    const band = cvRect(fields, 'rewardBand', context, 0.18);
    if (band) {
        // OpenCV's reward band is a proposal for the value row. Subdivide it into
        // three non-overlapping column crops; parsing rejects multi-number crops.
        const specs = { credits: [0.00, 0.30], xp: [0.31, 0.27], freeXp: [0.60, 0.29] };
        const [start, widthFraction] = specs[field];
        return clampRect({ left: band.left + band.width * start, top: band.top,
            width: band.width * widthFraction, height: band.height }, context.sourceWidth, context.sourceHeight);
    }
    // Generic fallback is intentionally modest and is used only when neither the
    // existing Tesseract anchors nor OpenCV produced a more precise rectangle.
    const specs = {
        credits: [0.13, 0.27, 0.12, 0.15],
        xp: [0.265, 0.27, 0.10, 0.15],
        freeXp: [0.37, 0.27, 0.11, 0.15],
    };
    return fixedRect(context, specs[field]);
}

function damageRect(fields, context) {
    const isolated = cvRect(fields, 'damage', context, 0.15, true);
    if (isolated) return isolated;
    const preparedWords = fields.performanceOcrWords || [];
    const label = preparedWords.find(word => /^damage$/i.test(String(word.text || '').trim()) && word.bbox);
    if (label) {
        const rect = scaledPreparedRect({
            left: Math.max(0, Number(label.bbox.x0) - Number(context.preparedWidth) * 0.006),
            top: Math.max(0, Number(label.bbox.y0) - Number(context.preparedHeight) * 0.105),
            width: Math.max(Number(context.preparedWidth) * 0.085, Number(label.bbox.x1) - Number(label.bbox.x0)),
            height: Number(context.preparedHeight) * 0.09,
        }, context);
        if (rect) return rect;
    }
    return fixedRect(context, [0.025, 0.36, 0.20, 0.15]);
}

function buildCropRequests(needed, fields, context, env = process.env) {
    const requested = new Set(needed.map(item => item.field));
    const groups = [];
    const push = (id, fieldKeys, rect, priority) => {
        const active = fieldKeys.filter(field => requested.has(field));
        if (!active.length || !rect) return;
        groups.push({ id, fields: active, rect, priority });
    };
    if (requested.has('result')) push('result', ['result'], cvRect(fields, 'result', context, 0.12) || fixedRect(context, [0.02, 0.11, 0.50, 0.18]), 70);
    if (requested.has('player')) push('identity', ['player'], cvRect(fields, 'identity', context, 0.12) || fixedRect(context, [0.02, 0.19, 0.61, 0.16]), 100);
    if (['map', 'mode', 'battleStart'].some(field => requested.has(field))) {
        push('metadata', ['map', 'mode', 'battleStart'], cvRect(fields, 'metadata', context, 0.12) || fixedRect(context, [0.52, 0.105, 0.47, 0.19]), 95);
    }
    for (const field of ['credits', 'xp', 'freeXp']) {
        if (requested.has(field)) push(field, [field], rewardRect(field, fields, context), field === 'credits' ? 90 : field === 'freeXp' ? 86 : 82);
    }
    if (requested.has('damage')) push('damage', ['damage'], damageRect(fields, context), 88);
    const configured = Number.parseInt(env.PADDLEOCR_FIELD_FALLBACK_MAX_CROPS || '', 10);
    const maxCrops = Number.isFinite(configured) ? Math.max(1, Math.min(MAX_GROUPS, configured)) : DEFAULT_MAX_CROPS;
    groups.sort((a, b) => b.priority - a.priority);
    const selected = groups.slice(0, maxCrops).map(({ priority, ...item }) => item);
    const skipped = groups.slice(maxCrops).map(({ id, fields: keys }) => ({ id, fields: keys, reason: 'max-crops-limit' }));
    return { selected, skipped };
}

function parseCropCandidate(group, cropResult) {
    const rawText = String(cropResult.rawText || '').trim();
    const scores = (cropResult.lines || []).map(item => item.score === null || item.score === undefined || item.score === '' ? NaN : Number(item.score))
        .filter(value => Number.isFinite(value) && value >= 0 && value <= 1);
    const meanScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
    const confidence = Math.max(0, Math.min(SINGLE_READ_CONFIDENCE_CEILING, Math.round(meanScore * 100)));
    const base = { fieldGroup: group.id, rawText, confidence, elapsedMs: Number(cropResult.elapsedMs) || 0, cropRect: group.rect, fields: {} };
    if (cropResult.error) return { ...base, status: 'failed', reason: String(cropResult.error).slice(0, 500) };
    if (!rawText) return { ...base, status: 'rejected', reason: 'empty-ocr-output' };
    if (!scores.length) return { ...base, status: 'rejected', reason: 'ocr-confidence-unavailable' };
    if (confidence < MIN_CANDIDATE_CONFIDENCE) return { ...base, status: 'rejected', reason: 'ocr-confidence-below-candidate-floor' };
    for (const field of group.fields) {
        let value = '';
        if (field === 'player') {
            const parsed = parseIdentityLine(rawText);
            if (validPlayer(parsed.player)) value = parsed.player;
        } else if (['map', 'mode'].includes(field)) {
            const parsed = parseModeMap(rawText);
            value = parsed[field] === NOT_DETECTED ? '' : parsed[field];
        } else if (field === 'battleStart') {
            value = parseBattleStartTime(rawText);
            if (value === NOT_DETECTED) value = '';
        } else if (field === 'result') {
            value = outcomeFromText(rawText);
        } else if (['credits', 'xp', 'freeXp'].includes(field)) {
            // Strict existing parser: if Paddle merges adjacent reward values or
            // an icon digit into this crop, do not guess which token belongs here.
            value = parseLocalizedNumericField(rawText, field);
        } else if (field === 'damage') {
            value = extractFocusedDamage(rawText);
            if (value && (value.length < 5 || value.length > 9)) value = '';
        }
        if (value) base.fields[field] = value;
        else base.fields[field] = null;
    }
    const useful = Object.values(base.fields).some(value => value !== null);
    return { ...base, status: useful ? 'candidate' : 'rejected', reason: useful ? null : 'existing-field-parser-rejected-raw-output' };
}

function playersConfusable(left, right) {
    const a = String(left || '').toLowerCase(); const b = String(right || '').toLowerCase();
    if (!a || a.length !== b.length || a === b) return false;
    let different = false;
    const pairs = new Set(['o:0', '0:o', 'i:1', '1:i', 'l:1', '1:l', 's:5', '5:s', 'b:8', '8:b', 'g:6', '6:g']);
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] === b[i]) continue;
        different = true;
        if (!pairs.has(`${a[i]}:${b[i]}`)) return false;
    }
    return different;
}

function addCandidatesToFields(fields, parsedCandidates) {
    const decisions = [];
    fields.identityCandidates ||= [];
    fields.metadataCandidates ||= [];
    fields.resultCandidates ||= [];
    fields.rewardCandidates ||= [];
    fields.damageCandidates ||= [];
    fields.ambiguities ||= {};
    for (const candidate of parsedCandidates) {
        if (candidate.status !== 'candidate') { decisions.push({ fieldGroup: candidate.fieldGroup, status: 'not-admitted', reason: candidate.reason, rawText: candidate.rawText }); continue; }
        for (const [field, value] of Object.entries(candidate.fields)) {
            if (value === null) continue;
            const source = `paddleocr-local-field-crop:${candidate.fieldGroup}`;
            if (field === 'player') {
                const existing = fields.identityCandidates.map(item => parseIdentityLine(item.text || '').player).filter(validPlayer);
                const conflict = existing.find(item => playersConfusable(item, value));
                if (conflict) {
                    // Keep O/0 (and other known confusable glyph) conflicts visible.
                    // This explicitly marks the identity unresolved rather than
                    // using roster similarity or a second engine as a silent rewrite.
                    fields.ambiguities.player = `PaddleOCR identity conflicts with Tesseract on OCR-confusable glyphs (${conflict} vs ${value}); human review required`;
                    decisions.push({ field, status: 'conflict-preserved-for-review', currentCandidate: conflict, paddleCandidate: value, source });
                    continue;
                }
                // Only pass the parsed player identity into the existing parser.
                // The crop may include the ship on the same line, but ship is not
                // a requested/required fallback field and must not be changed as a
                // side effect of a player-only rescue.
                fields.identityCandidates.push({ text: String(value), confidence: candidate.confidence, weight: 0.65, source });
            } else if (['map', 'mode', 'battleStart'].includes(field)) {
                // One metadata crop contains the map/mode title and timestamp. The
                // normal parser independently extracts each field from its raw text.
                if (!fields.metadataCandidates.some(item => item.source === source && item.text === candidate.rawText)) {
                    fields.metadataCandidates.push({ text: candidate.rawText, confidence: candidate.confidence, weight: 0.65, source });
                }
            } else if (field === 'result') {
                fields.resultCandidates.push({ text: candidate.rawText, confidence: candidate.confidence, weight: 0.65, source });
            } else if (['credits', 'xp', 'freeXp'].includes(field)) {
                const tuple = { credits: '', xp: '', freeXp: '', confidence: candidate.confidence, source };
                tuple[field] = value;
                fields.rewardCandidates.push(tuple);
            } else if (field === 'damage') {
                fields.damageCandidates.push({ value, confidence: candidate.confidence, weight: 0.65, source });
            }
            decisions.push({ field, status: 'candidate-added-for-existing-consensus', candidate: value, source, confidenceCeiling: SINGLE_READ_CONFIDENCE_CEILING });
        }
    }
    return decisions;
}

function runHelper(imagePath, crops, options = {}) {
    const python = options.python || process.env.PADDLEOCR_PYTHON_BIN || process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    const helper = options.helperPath || HELPER_PATH;
    const timeoutMs = Math.max(500, Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS);
    return new Promise((resolve, reject) => {
        const child = spawn(python, [helper], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: false, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
        const stdout = []; const stderr = [];
        let stdoutSize = 0; let stderrSize = 0; let finished = false;
        let timer;
        const finish = (error, value) => {
            if (finished) return;
            finished = true; clearTimeout(timer);
            if (error) reject(error); else resolve(value);
        };
        const terminate = () => { try { child.kill('SIGKILL'); } catch {} };
        timer = setTimeout(() => {
            const error = new Error(`Local PaddleOCR field-crop fallback exceeded ${timeoutMs} ms.`);
            error.code = 'PADDLEOCR_FIELD_TIMEOUT';
            terminate(); finish(error);
        }, timeoutMs);
        child.stdout.on('data', chunk => {
            stdoutSize += chunk.length;
            if (stdoutSize > MAX_OUTPUT_BYTES) {
                const error = new Error('PaddleOCR field-crop helper output exceeded the size limit.');
                error.code = 'PADDLEOCR_OUTPUT_LIMIT'; terminate(); finish(error); return;
            }
            stdout.push(chunk);
        });
        child.stderr.on('data', chunk => {
            if (stderrSize >= MAX_STDERR_BYTES) return;
            const keep = chunk.subarray(0, MAX_STDERR_BYTES - stderrSize);
            stderr.push(keep); stderrSize += keep.length;
        });
        child.once('error', error => finish(new Error(`Could not start local PaddleOCR Python process: ${error.message}`, { cause: error })));
        child.once('close', (code, signal) => {
            if (finished) return;
            const details = Buffer.concat(stderr).toString('utf8').trim().slice(0, 1200);
            let response;
            const outputText = Buffer.concat(stdout).toString('utf8');
            try { response = JSON.parse(outputText); }
            catch (parseError) {
                const error = new Error(`Invalid PaddleOCR field-crop response${code !== 0 ? ` (exit ${code}${signal ? `/${signal}` : ''})` : ''}: ${parseError.message}${details ? `; ${details}` : ''}`);
                error.code = 'PADDLEOCR_INVALID_RESPONSE'; finish(error); return;
            }
            if (response?.schemaVersion !== 1 || !Array.isArray(response.results) || !Number.isFinite(Number(response.networkAttemptCount))) {
                const error = new Error('PaddleOCR helper returned a malformed response schema.');
                error.code = 'PADDLEOCR_INVALID_RESPONSE'; finish(error); return;
            }
            if (Number(response.networkAttemptCount) !== 0 || (Array.isArray(response.networkAttempts) && response.networkAttempts.length > 0)) {
                const error = new Error('Local PaddleOCR helper reported a blocked network attempt; candidates rejected.');
                error.code = 'PADDLEOCR_NETWORK_ATTEMPT_BLOCKED';
                error.networkAttemptCount = Number(response.networkAttemptCount) || 0;
                error.networkAttempts = response.networkAttempts || [];
                finish(error); return;
            }
            if (code !== 0 || ['error', 'blocked'].includes(response.status)) {
                const error = new Error(`PaddleOCR field-crop helper exited (${code}${signal ? `/${signal}` : ''})${response.error ? `: ${response.error}` : details ? `: ${details}` : ''}`);
                error.code = 'PADDLEOCR_FIELD_HELPER_FAILED';
                error.networkAttemptCount = 0;
                error.helperStatus = response.status || null;
                finish(error); return;
            }
            finish(null, response);
        });
        child.stdin.once('error', error => { if (error.code !== 'EPIPE') finish(new Error(`Could not send local crop request: ${error.message}`, { cause: error })); });
        child.stdin.end(JSON.stringify({ schemaVersion: 1, imagePath, crops }));
    });
}

function percentile(values, p) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

function summarizeCropLatency(results) {
    const values = results.map(item => Number(item.elapsedMs)).filter(value => Number.isFinite(value) && value >= 0);
    return { count: values.length, totalMs: values.reduce((sum, value) => sum + value, 0),
        medianMs: percentile(values, 0.5), p95Ms: percentile(values, 0.95),
        meanMs: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
}

async function applyFieldFallback({ imageBuffer, rawText, fields, sourceWidth, sourceHeight, preparedWidth, preparedHeight, timeoutMs, env = process.env } = {}) {
    const outputFields = fields || {};
    if (!enabled(env)) {
        outputFields.paddleOcrFallback = { schemaVersion: 1, enabled: false, status: 'disabled', elapsedMs: 0, reason: 'PADDLEOCR_FIELD_FALLBACK is not 1' };
        return outputFields;
    }
    const started = Date.now();
    const requested = determineNeededFields(rawText, outputFields);
    if (!requested.needed.length) {
        outputFields.paddleOcrFallback = { schemaVersion: 1, enabled: true, status: 'not-needed', elapsedMs: 0, requestedFields: [], crops: [], decisions: [] };
        return outputFields;
    }
    const modelDet = String(env.PADDLEOCR_DET_MODEL_DIR || '').trim();
    const modelRec = String(env.PADDLEOCR_REC_MODEL_DIR || '').trim();
    const python = String(env.PADDLEOCR_PYTHON_BIN || env.PYTHON || '').trim();
    if (!Buffer.isBuffer(imageBuffer) || !modelDet || !modelRec || !python) {
        outputFields.paddleOcrFallback = { schemaVersion: 1, enabled: true, status: 'blocked', elapsedMs: 0,
            requestedFields: requested.needed, reason: 'image buffer, explicit local model directories, and PADDLEOCR_PYTHON_BIN are required; no default models or network fallback permitted' };
        return outputFields;
    }
    const context = { sourceWidth, sourceHeight, preparedWidth, preparedHeight };
    const requestSet = buildCropRequests(requested.needed, outputFields, context, env);
    if (!requestSet.selected.length) {
        outputFields.paddleOcrFallback = { schemaVersion: 1, enabled: true, status: 'no-valid-crops', elapsedMs: 0,
            requestedFields: requested.needed, skippedCrops: requestSet.skipped, crops: [], decisions: [] };
        return outputFields;
    }
    const suppliedBudget = timeoutMs === undefined || timeoutMs === null ? DEFAULT_TIMEOUT_MS : Number(timeoutMs);
    if (!Number.isFinite(suppliedBudget) || suppliedBudget < 500) {
        outputFields.paddleOcrFallback = { schemaVersion: 1, enabled: true, status: 'budget-exhausted', elapsedMs: 0,
            requestedFields: requested.needed, attemptedCrops: [], skippedCrops: requestSet.selected.map(crop => ({ id: crop.id, fields: crop.fields, reason: 'remaining-image-budget-under-500ms' })),
            reason: 'Insufficient remaining image deadline; Tesseract result preserved without starting PaddleOCR.' };
        return outputFields;
    }
    const configuredTimeout = Number(env.PADDLEOCR_FIELD_FALLBACK_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
    const budget = Math.max(500, Math.min(DEFAULT_TIMEOUT_MS, configuredTimeout, suppliedBudget));
    let tempDir;
    try {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wows-paddle-fields-'));
        const imagePath = path.join(tempDir, 'source.img');
        await fs.writeFile(imagePath, imageBuffer);
        const response = await runHelper(imagePath, requestSet.selected, { python, timeoutMs: budget });
        const candidates = response.results.map((item, index) => parseCropCandidate(requestSet.selected[index] || item, item));
        const decisions = addCandidatesToFields(outputFields, candidates);
        outputFields.paddleOcrFallback = {
            schemaVersion: 1, enabled: true, status: response.status === 'complete' ? 'complete' : 'partial',
            elapsedMs: Date.now() - started, helperElapsedMs: response.elapsedMs || null,
            networkAttemptCount: response.networkAttemptCount, modelVersions: response.modelVersions || null,
            requestedFields: requested.needed, attemptedCrops: requestSet.selected, skippedCrops: requestSet.skipped,
            cropResults: candidates.map(item => ({ fieldGroup: item.fieldGroup, status: item.status, reason: item.reason,
                fields: item.fields, confidence: item.confidence, elapsedMs: item.elapsedMs, cropRect: item.cropRect, rawText: item.rawText })),
            cropLatency: summarizeCropLatency(candidates),
            decisions, candidateConfidenceCeiling: SINGLE_READ_CONFIDENCE_CEILING,
            acceptancePolicy: 'candidates pass existing field parsers and battle-record consensus; single PaddleOCR evidence is capped below the single-read threshold; conflicting O/0-style player identities remain unresolved for human review',
        };
        return outputFields;
    } catch (error) {
        outputFields.paddleOcrFallback = { schemaVersion: 1, enabled: true, status: 'failed-open', elapsedMs: Date.now() - started,
            requestedFields: requested.needed, attemptedCrops: requestSet.selected, skippedCrops: requestSet.skipped,
            error: `${error.code || 'PADDLEOCR_FIELD_ERROR'}: ${error.message}`,
            networkAttemptCount: Number(error.networkAttemptCount) || 0,
            networkAttempts: Array.isArray(error.networkAttempts) ? error.networkAttempts : [],
            helperStatus: error.helperStatus || null,
            acceptancePolicy: 'primary Tesseract results preserved; no fallback candidate accepted' };
        if (env.PADDLEOCR_FIELD_FALLBACK_DEBUG === '1') console.warn(`[PaddleOCR fallback] ${error.message}`);
        return outputFields;
    } finally {
        if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

module.exports = {
    applyFieldFallback, enabled, determineNeededFields, buildCropRequests, parseCropCandidate,
    addCandidatesToFields, playersConfusable, summarizeCropLatency,
    __test: { HELPER_PATH, FIELDS, MAX_GROUPS, SINGLE_READ_CONFIDENCE_CEILING, MIN_CANDIDATE_CONFIDENCE, DEFAULT_TIMEOUT_MS, fieldCandidateValues, hasConflictingCandidates, clampRect, scaledPreparedRect, rewardRect, damageRect, runHelper },
};

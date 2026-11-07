'use strict';

const MODE_PATTERN = /\b(?:Co-op\s*Battle|Random\s*Battle|Ranked\s*Battle|Asymmetric\s*Battle|Scenario\s*Battle|Training\s*Battle|Convoy\s*Battle|Operations?|Brawl|Clan\s*Battle|Airship\s*Escort|Big\s*Hunt)\b/i;

function lineEvidence(line, field, sourceSha256, sourceWidth, sourceHeight) {
    return {
        field,
        source: 'azure-document-intelligence-line',
        status: 'success',
        text: String(line.text || ''),
        pageIndex: line.pageIndex ?? null,
        pageNumber: line.pageNumber ?? null,
        polygon: Array.isArray(line.polygon) ? line.polygon : [],
        geometryValid: line.geometryValid === true,
        geometryIssue: line.geometryIssue || null,
        pageWidth: line.pageWidth ?? null,
        pageHeight: line.pageHeight ?? null,
        pageUnit: line.pageUnit || '',
        words: Array.isArray(line.words) ? line.words.slice(0, 500) : [],
        confidenceValues: Array.isArray(line.words)
            ? line.words.map(word => word.confidence).filter(value => Number.isFinite(value))
            : [],
        originalScreenshotSha256: sourceSha256 || null,
        providerInputSha256: sourceSha256 || null,
        originalScreenshotWidth: Number(sourceWidth) || null,
        originalScreenshotHeight: Number(sourceHeight) || null,
        coordinateSpace: line.pageUnit === 'pixel' && Number(sourceWidth) > 0 && Number(sourceHeight) > 0
            ? 'original-screenshot-pixels' : 'azure-page-units',
        transformToOriginalScreenshot: line.pageUnit === 'pixel' &&
            Number(sourceWidth) > 0 && Number(sourceHeight) > 0 &&
            Number(line.pageWidth) > 0 && Number(line.pageHeight) > 0
            ? { scaleX: Number(sourceWidth) / Number(line.pageWidth),
                scaleY: Number(sourceHeight) / Number(line.pageHeight), offsetX: 0, offsetY: 0 }
            : null,
    };
}

/**
 * Produce field-scoped Azure evidence only from explicit lexical anchors.
 * Player identity is intentionally not emitted by this remote diagnostic path.
 * These candidates are corroboration/conflict diagnostics, never direct acceptance.
 */
function buildAzureFieldEvidence(lines, { sourceSha256 = null, sourceWidth = null, sourceHeight = null } = {}) {
    const evidence = [];
    for (const line of Array.isArray(lines) ? lines : []) {
        const text = String(line?.text || '').trim();
        if (!text) continue;
        if (/^(?:victory|defeat)$/i.test(text)) {
            evidence.push(lineEvidence(line, 'result', sourceSha256, sourceWidth, sourceHeight));
        }
        if (MODE_PATTERN.test(text) || /battle\s*start\s*time/i.test(text)) {
            evidence.push(lineEvidence(line, 'battleMetadata', sourceSha256, sourceWidth, sourceHeight));
        }
        if (/\bcredits\b/i.test(text)) evidence.push(lineEvidence(line, 'credits', sourceSha256, sourceWidth, sourceHeight));
        const isFreeXp = /\bfree\s*xp\b/i.test(text);
        if (isFreeXp) evidence.push(lineEvidence(line, 'freeXp', sourceSha256, sourceWidth, sourceHeight));
        else if (/\bxp\b/i.test(text)) evidence.push(lineEvidence(line, 'xp', sourceSha256, sourceWidth, sourceHeight));
        if (/\bdamage\b/i.test(text)) evidence.push(lineEvidence(line, 'damage', sourceSha256, sourceWidth, sourceHeight));
    }
    return evidence;
}

module.exports = { buildAzureFieldEvidence };

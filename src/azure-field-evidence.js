'use strict';

const MODE_PATTERN = /\b(?:Co-op\s*Battle|Random\s*Battle|Ranked\s*Battle|Asymmetric\s*Battle|Scenario\s*Battle|Training\s*Battle|Convoy\s*Battle|Operations?|Brawl|Clan\s*Battle|Airship\s*Escort|Big\s*Hunt)\b/i;

function lineEvidence(line, field, sourceSha256, sourceWidth, sourceHeight) {
    const providerPolygon = Array.isArray(line.polygon) ? line.polygon : [];
    const pageWidth = Number(line.pageWidth);
    const pageHeight = Number(line.pageHeight);
    const width = Number(sourceWidth);
    const height = Number(sourceHeight);
    const canTransform = line.geometryValid === true && line.pageUnit === 'pixel' &&
        Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 &&
        Number.isFinite(pageWidth) && pageWidth > 0 && Number.isFinite(pageHeight) && pageHeight > 0;
    const transform = canTransform ? {
        scaleX: width / pageWidth, scaleY: height / pageHeight, offsetX: 0, offsetY: 0,
    } : null;
    const polygon = transform ? providerPolygon.map((value, index) =>
        Number(value) * (index % 2 === 0 ? transform.scaleX : transform.scaleY)) : providerPolygon;
    const originalCoordinateGeometryValid = Boolean(transform && polygon.length >= 8 &&
        polygon.every(Number.isFinite) && polygon.every((value, index) =>
            value >= 0 && value <= (index % 2 === 0 ? width : height)));
    return {
        field,
        source: 'azure-document-intelligence-line',
        status: 'success',
        text: String(line.text || ''),
        pageIndex: line.pageIndex ?? null,
        pageNumber: line.pageNumber ?? null,
        polygon,
        providerPolygon,
        geometryValid: line.geometryValid === true,
        originalCoordinateGeometryValid,
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
        coordinateSpace: originalCoordinateGeometryValid ? 'original-screenshot-pixels' : 'azure-page-units',
        transformToOriginalScreenshot: originalCoordinateGeometryValid ? transform : null,
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

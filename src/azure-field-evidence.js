'use strict';

const MODE_PATTERN = /\b(?:Co-op\s*Battle|Random\s*Battle|Ranked\s*Battle|Asymmetric\s*Battle|Scenario\s*Battle|Training\s*Battle|Convoy\s*Battle|Operations?|Brawl|Clan\s*Battle|Airship\s*Escort|Big\s*Hunt)\b/i;

function polygonBounds(polygon) {
    if (!Array.isArray(polygon) || polygon.length < 8 || polygon.length % 2) return null;
    const values = polygon.map(Number);
    if (!values.every(Number.isFinite)) return null;
    const xs = values.filter((_, index) => index % 2 === 0);
    const ys = values.filter((_, index) => index % 2 === 1);
    const bounds = { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
    return bounds.right > bounds.left && bounds.bottom > bounds.top ? bounds : null;
}

function mergeMetadataNeighbor(previous, current) {
    if (!previous || previous.geometryValid !== true || current.geometryValid !== true ||
        previous.pageIndex !== current.pageIndex) return null;
    const previousText = String(previous.text || '').trim();
    if (!previousText || /battle|personal score|team score|victory|defeat|battle start|received|credits|free xp|damage|\bxp\b/i.test(previousText)) return null;
    const a = polygonBounds(previous.polygon);
    const b = polygonBounds(current.polygon);
    if (!a || !b) return null;
    const previousHeight = a.bottom - a.top;
    const currentHeight = b.bottom - b.top;
    const verticalGap = b.top - a.bottom;
    const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const minimumWidth = Math.max(1, Math.min(a.right - a.left, b.right - b.left));
    if (verticalGap < -Math.max(previousHeight, currentHeight) * 0.5 ||
        verticalGap > Math.max(previousHeight, currentHeight) * 2 ||
        overlap / minimumWidth < 0.2) return null;
    const bounds = {
        left: Math.min(a.left, b.left), top: Math.min(a.top, b.top),
        right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom),
    };
    return {
        ...current,
        text: previousText + '\n' + String(current.text || '').trim(),
        polygon: [bounds.left, bounds.top, bounds.right, bounds.top,
            bounds.right, bounds.bottom, bounds.left, bounds.bottom],
        geometryValid: true,
        words: [...(Array.isArray(previous.words) ? previous.words : []),
            ...(Array.isArray(current.words) ? current.words : [])].slice(0, 500),
        sourceLinePolygons: [previous.polygon, current.polygon],
        sourceLineIndices: [previous.lineIndex ?? null, current.lineIndex ?? null],
        geometrySource: 'union-of-adjacent-azure-lines',
    };
}

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
        providerPolygon: line.sourceLinePolygons ? null : providerPolygon,
        sourceLinePolygons: Array.isArray(line.sourceLinePolygons) ? line.sourceLinePolygons : [providerPolygon],
        sourceLineIndices: Array.isArray(line.sourceLineIndices) ? line.sourceLineIndices : [line.lineIndex ?? null],
        geometrySource: line.geometrySource || 'azure-provider-line',
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
    const sourceLines = Array.isArray(lines) ? lines : [];
    for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
        const line = { ...sourceLines[lineIndex], lineIndex };
        const text = String(line?.text || '').trim();
        if (!text) continue;
        if (/^(?:victory|defeat)$/i.test(text)) {
            evidence.push(lineEvidence(line, 'result', sourceSha256, sourceWidth, sourceHeight));
        }
        if (MODE_PATTERN.test(text)) {
            const previous = lineIndex > 0 ? { ...sourceLines[lineIndex - 1], lineIndex: lineIndex - 1 } : null;
            const combined = mergeMetadataNeighbor(previous, line);
            if (combined && previous) {
                const combinedText = combined.text;
                const mapLine = {
                    ...previous, text: combinedText,
                    sourceLinePolygons: [previous.polygon],
                    sourceLineIndices: [lineIndex - 1],
                    geometrySource: 'azure-adjacent-map-line',
                };
                const modeLine = {
                    ...line, text: combinedText,
                    sourceLinePolygons: [line.polygon],
                    sourceLineIndices: [lineIndex],
                    geometrySource: 'azure-mode-line',
                };
                evidence.push(lineEvidence(mapLine, 'map', sourceSha256, sourceWidth, sourceHeight));
                evidence.push(lineEvidence(modeLine, 'mode', sourceSha256, sourceWidth, sourceHeight));
            } else {
                evidence.push(lineEvidence(line, 'mode', sourceSha256, sourceWidth, sourceHeight));
            }
        }
        if (/battle\s*start\s*time/i.test(text)) {
            evidence.push(lineEvidence(line, 'battleStart', sourceSha256, sourceWidth, sourceHeight));
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

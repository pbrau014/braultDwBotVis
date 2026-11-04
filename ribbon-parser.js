'use strict';

const LABELS = [
    'Assisted in destruction', 'Assisted in capture', 'Aircraft shot down',
    'Caused flooding', 'Hits to citadel', 'Citadel hits', 'Incapacitations',
    'Target hits', 'Set on fire', 'Destroyed', 'Spotted', 'Defended', 'Captured', 'Scouted',
];

function normalizeWords(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9×x]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function lineLabel(lineText) {
    const norm = normalizeWords(lineText);
    const labels = [...LABELS].sort((a, b) => b.length - a.length);
    for (const label of labels) {
        const target = normalizeWords(label);
        if (new RegExp(`(?:^| )${target.replace(/ /g, '\\s+')}(?: |$)`, 'i').test(norm)) return label;
    }
    return '';
}

function tokenCount(words, imageWidth, imageHeight) {
    const sorted = [...(words || [])].filter((word) => word.bbox).sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
    const counts = [];
    const consumed = new Set();
    for (let i = 0; i < sorted.length; i += 1) {
        if (consumed.has(i)) continue;
        const w = sorted[i];
        let match = String(w.text || '').replace(/[|Il]/g, '1').match(/^[x×]\s*(\d{1,4})[.,]?$/i);
        if (!match && /^x$/i.test(String(w.text || '').trim()) && i + 1 < sorted.length) {
            const next = sorted[i + 1];
            const sameRow = Math.abs(((w.bbox.y0 + w.bbox.y1) / 2) - ((next.bbox.y0 + next.bbox.y1) / 2)) <= Math.max(w.bbox.y1 - w.bbox.y0, next.bbox.y1 - next.bbox.y0) * 0.8;
            const gap = next.bbox.x0 - w.bbox.x1;
            if (sameRow && gap >= -2 && gap <= imageWidth * 0.015 && /^\d{1,4}[.,]?$/.test(String(next.text || '').trim())) {
                match = [null, String(next.text).replace(/[^\d]/g, '')];
                consumed.add(i + 1);
            }
        }
        if (match) {
            const digits = String(match[1] || '').replace(/\D/g, '');
            if (digits.length >= 1 && digits.length <= 4) {
                counts.push({
                    count: digits,
                    x: (w.bbox.x0 + w.bbox.x1) / 2,
                    y: (w.bbox.y0 + w.bbox.y1) / 2,
                    confidence: Number(w.confidence) || 0,
                });
            }
        }
    }
    return counts;
}

/**
 * Assign ribbon counts by screen geometry rather than character distance.
 * label lines have horizontal centers; xN tokens on the ribbon strip are
 * associated with their nearest plausible label center. Unreadable counts
 * remain blank, which is deliberately non-fatal to the battle report.
 */
function extractSpatialRibbons(ocrResult, imageWidth, imageHeight) {
    const lines = Array.isArray(ocrResult?.lines) ? ocrResult.lines : [];
    const heading = lines.find((line) => /battle\s+performance/i.test(String(line.text || '')));
    const missions = lines.find((line) => /combat\s+missions/i.test(String(line.text || '')));
    const headingY = heading?.bbox ? heading.bbox.y1 : imageHeight * 0.25;
    const missionsY = missions?.bbox ? missions.bbox.y0 : imageHeight * 0.72;
    const candidates = [];
    for (const line of lines) {
        if (!line?.bbox || !String(line.text || '').trim()) continue;
        const b = line.bbox;
        const centerY = (b.y0 + b.y1) / 2;
        // Only inspect the strip between the detected performance and mission
        // headings, keeping player names/rewards/navigation text out of ribbon OCR.
        if (centerY <= headingY || centerY >= missionsY) continue;
        let label = lineLabel(line.text);
        if (!label) {
            const raw = String(line.text || '').replace(/[x×]\s*\d{1,4}/ig, '').replace(/[|•·]/g, ' ').replace(/\s+/g, ' ').trim();
            const normalized = normalizeWords(raw);
            if (!raw || raw.length > 40 || /\d/.test(raw) || /battle performance|combat missions|damage|received for the battle|personal score|team score|detailed report|credits and xp|back to port|battle on|missions? in total|earn |receive |convoy escort|free xp|base xp/i.test(raw)) continue;
            if (!/[a-z]{3}/i.test(raw) || normalized.split(' ').length > 5) continue;
            label = raw.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
        }
        const candidate = {
            label,
            x: (b.x0 + b.x1) / 2,
            y: centerY,
            top: b.y0,
            bottom: b.y1,
            confidence: Number(line.confidence) || 0,
        };
        const duplicate = candidates.some((old) => old.label.toLowerCase() === candidate.label.toLowerCase() && Math.abs(old.x - candidate.x) <= imageWidth * 0.012 && Math.abs(old.y - candidate.y) <= imageHeight * 0.025);
        if (!duplicate) candidates.push(candidate);
    }
    if (!candidates.length) return [];

    const counts = tokenCount(ocrResult.words, imageWidth, imageHeight).filter((token) => token.y > headingY && token.y < missionsY);
    const assignments = new Map();
    const maxXDistance = imageWidth * 0.085;
    const maxYDistance = imageHeight * 0.12;
    for (const count of counts) {
        let best = null;
        let bestScore = Infinity;
        for (let i = 0; i < candidates.length; i += 1) {
            const label = candidates[i];
            const dx = Math.abs(count.x - label.x);
            const dy = Math.abs(count.y - label.y);
            if (dx > maxXDistance || dy > maxYDistance) continue;
            // Counts are drawn on/above the tile label. Do not assign a token
            // from the next row simply because its text is close horizontally.
            if (count.y > label.y + imageHeight * 0.015) continue;
            const score = (dx / Math.max(1, imageWidth)) + (dy / Math.max(1, imageHeight)) * 0.45;
            if (score < bestScore) { best = i; bestScore = score; }
        }
        if (best !== null) {
            const assigned = assignments.get(best) || [];
            assigned.push({ count: count.count, score: bestScore });
            assignments.set(best, assigned);
        }
    }

    return candidates.sort((a, b) => a.x - b.x || a.y - b.y).map((candidate) => {
        const idx = candidates.indexOf(candidate);
        const assigned = (assignments.get(idx) || []).sort((a, b) => a.score - b.score);
        const distinct = [...new Set(assigned.map((entry) => entry.count))];
        return { label: candidate.label, count: distinct.length === 1 ? distinct[0] : '', confidence: candidate.confidence };
    });
}

module.exports = { extractSpatialRibbons, lineLabel, tokenCount };

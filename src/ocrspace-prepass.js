'use strict';

const MIN_IDENTITY_REGION_SCORE = 0.12;

function finiteRect(rect, width, height) {
    if (!rect || typeof rect !== 'object') return null;
    const left = Number(rect.left), top = Number(rect.top);
    const right = left + Number(rect.width), bottom = top + Number(rect.height);
    if (![left, top, right, bottom].every(Number.isFinite)) return null;
    const x0 = Math.max(0, Math.floor(left)), y0 = Math.max(0, Math.floor(top));
    const x1 = Math.min(width, Math.ceil(right)), y1 = Math.min(height, Math.ceil(bottom));
    if (x1 - x0 < 8 || y1 - y0 < 6) return null;
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Build OCR.Space crop proposals from OpenCV geometry only.
 * The identity ROI is an exclusion boundary and is never returned as a crop.
 */
function buildSafeOcrSpacePrepassCropPlan({ regions = {}, width, height } = {}) {
    const w = Number(width), h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 320 || h < 240) return [];
    // A nominal/fallback rectangle is not proof that the player's identity was excluded.
    // Require the actual OpenCV identity proposal used by the local cvRegion() threshold.
    const identityProposal = regions.identity;
    const identity = identityProposal?.rect;
    const identityScore = Number(identityProposal?.score);
    if (!identity || !Number.isFinite(identityScore) || identityScore < MIN_IDENTITY_REGION_SCORE || identityScore > 1) return [];
    const identityLeft = Number(identity.left);
    const identityTop = Number(identity.top);
    const identityWidth = Number(identity.width);
    const identityHeight = Number(identity.height);
    const identityRight = identityLeft + identityWidth;
    const identityBottom = identityTop + identityHeight;
    // Do not clamp an invalid identity ROI: clipping it could leave identity pixels outside
    // the exclusion boundary. An invalid, undersized or out-of-bounds ROI disables remote OCR.
    if (![identityLeft, identityTop, identityWidth, identityHeight, identityRight, identityBottom].every(Number.isFinite) ||
        identityLeft < 0 || identityTop < 0 || identityWidth < 8 || identityHeight < 6 ||
        identityRight > w || identityBottom > h) return [];

    const plan = [];
    const add = (field, source, rawRect, isTable = false) => {
        const rect = finiteRect(rawRect, w, h);
        if (!rect) return;
        // Hard exclusion: a crop may not intersect the detected player identity box.
        const intersectsIdentity = rect.left < identityRight && rect.left + rect.width > identityLeft &&
            rect.top < identityBottom && rect.top + rect.height > identityTop;
        if (intersectsIdentity) return;
        plan.push({ field, source, engine: 3, isTable, scale: true, rect });
    };

    const result = regions.result?.rect;
    if (result) {
        const bottom = Math.min(Number(result.top) + Number(result.height), h * 0.205,
            identityTop - h * 0.004);
        add('result', 'opencv-result-title', { ...result, height: bottom - Number(result.top) });
    }

    const metadata = regions.metadata?.rect;
    if (metadata) {
        const top = Math.max(Number(metadata.top), h * 0.115);
        const bottom = Math.min(Number(metadata.top) + Number(metadata.height), h * 0.275, identityTop - h * 0.004);
        const left = Math.max(Number(metadata.left), w * 0.585, identityRight + w * 0.004);
        add('battleMetadata', 'opencv-battle-metadata', {
            left, top, width: Math.min(Number(metadata.left) + Number(metadata.width), w) - left, height: bottom - top,
        });
    }

    const reward = regions.rewardBand?.rect;
    if (reward) {
        const top = Math.max(Number(reward.top), identityBottom + h * 0.004, h * 0.315);
        const bottom = Math.min(Number(reward.top) + Number(reward.height), h * 0.405);
        add('rewardBand', 'opencv-reward-band', {
            left: Number(reward.left), top, width: Number(reward.width), height: bottom - top,
        }, true);
    }

    const damage = regions.damage?.rect;
    if (damage) {
        const left = Math.max(Number(damage.left), w * 0.025);
        const top = Math.max(Number(damage.top), h * 0.365, identityBottom + h * 0.004);
        const right = Math.min(Number(damage.left) + Number(damage.width), w * 0.275);
        const bottom = Math.min(Number(damage.top) + Number(damage.height), h * 0.505);
        add('damage', 'opencv-damage', { left, top, width: right - left, height: bottom - top });
    }
    return plan;
}

module.exports = { buildSafeOcrSpacePrepassCropPlan, __test: { finiteRect } };

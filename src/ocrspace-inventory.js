'use strict';

const ELIGIBLE_DISPOSITION = 'eligible_user_verified_visible_fields';
const EXCLUDED_DISPOSITION = 'exclude_user_verified';
const REQUIRED_FIELDS = [
    'result', 'player', 'map', 'mode', 'battleStart',
    'credits', 'freeXp', 'damage', 'xp',
];

function partitionReviewedInventory(inventory) {
    if (!inventory || inventory.imageCount !== 64 || !Array.isArray(inventory.records) || inventory.records.length !== 64) {
        throw new Error('Reviewed 64-image inventory must contain exactly 64 records.');
    }
    const hashes = inventory.records.map(item => String(item?.sha256 || '').toLowerCase());
    if (hashes.some(value => !/^[a-f0-9]{64}$/.test(value)) || new Set(hashes).size !== 64) {
        throw new Error('Reviewed 64-image inventory has missing or duplicate SHA-256 values.');
    }
    if (inventory.records.some(item => item?.decodeVerified !== true)) {
        throw new Error('Reviewed inventory includes an image that was not decode-verified.');
    }

    const eligibleRecords = inventory.records.filter(item => item.corpusDisposition === ELIGIBLE_DISPOSITION);
    const excludedRecords = inventory.records.filter(item => item.corpusDisposition === EXCLUDED_DISPOSITION);
    if (eligibleRecords.length + excludedRecords.length !== inventory.records.length) {
        throw new Error('Reviewed inventory contains an unknown corpus disposition; refusing provider submission.');
    }

    const review = inventory.userReview;
    if (!review || !Array.isArray(review.excludedFilenames) || !Array.isArray(review.requiredFields)) {
        throw new Error('Reviewed inventory user-review disposition record is missing.');
    }
    const declaredExcluded = new Set(review.excludedFilenames);
    const actualExcluded = new Set(excludedRecords.map(item => item.filename));
    if (declaredExcluded.size !== review.excludedFilenames.length
        || declaredExcluded.size !== actualExcluded.size
        || [...declaredExcluded].some(filename => !actualExcluded.has(filename))) {
        throw new Error('Per-image excluded dispositions do not match the reviewed exclusion list.');
    }
    if (Number(review.eligibleCount) !== eligibleRecords.length
        || Number(review.excludedCount) !== excludedRecords.length) {
        throw new Error('Reviewed inventory eligibility counts do not match per-image dispositions.');
    }
    if (JSON.stringify(review.requiredFields) !== JSON.stringify(REQUIRED_FIELDS)) {
        throw new Error('Reviewed inventory does not preserve the exact nine mandatory OCR fields.');
    }

    return { eligibleRecords, excludedRecords };
}

module.exports = {
    ELIGIBLE_DISPOSITION,
    EXCLUDED_DISPOSITION,
    REQUIRED_FIELDS,
    partitionReviewedInventory,
};

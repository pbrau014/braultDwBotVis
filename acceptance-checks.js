'use strict';

const { REQUIRED_MANUAL_FIELDS } = require('./battle-record');
const REQUIRED_FIELD_KEYS = REQUIRED_MANUAL_FIELDS.map((field) => field.key);

function compareExpected(actual, expected) {
    const comparison = Object.fromEntries(Object.keys(expected || {}).map((key) => [key, {
        expected: expected[key],
        actual: actual?.[key] ?? null,
        pass: (actual?.[key] ?? null) === expected[key],
    }]));
    const allMatch = Object.values(comparison).length > 0 && Object.values(comparison).every(item => item.pass);
    const isPresent = (value) => value !== null && value !== undefined &&
        (typeof value !== 'string' || value.trim().length > 0);
    const requiredFieldsPass = REQUIRED_FIELD_KEYS.every((key) =>
        Object.prototype.hasOwnProperty.call(expected || {}, key) &&
        isPresent(expected[key]) && isPresent(actual?.[key]) && comparison[key]?.pass === true);
    return { comparison, allMatch, requiredFieldsPass };
}

function acceptancePasses(result) {
    // Fail closed: legacy reports without the explicit nine-field result cannot
    // establish the current contract, even if their old all-fields flag is true.
    return Boolean(result)
        && result.pipelineCompleted === true
        && result.allRequiredFieldsPass === true
        && Array.isArray(result.requiredMissing)
        && result.requiredMissing.length === 0;
}

/**
 * Validate the real-extraction negative control. It is only meaningful when a
 * known-good baseline first passes all mandatory fields, then a single
 * mandatory expected value is deliberately changed while OCR actuals remain
 * identical. XP is mandatory and determines acceptance alongside the other eight fields.
 */
function validateNegativeExpectedControl(baselineRow, negativeRow, negativeExitCode) {
    const baselineComparison = compareExpected(baselineRow?.actual, baselineRow?.expected);
    const baselinePasses = acceptancePasses(baselineRow)
        && baselineComparison.allMatch === true
        && baselineComparison.requiredFieldsPass === true
        && baselineRow?.actual?.damage !== null
        && baselineRow?.actual?.damage !== undefined
        && baselineRow?.actual?.damage === baselineRow?.expected?.damage;
    if (!baselinePasses || !negativeRow || negativeExitCode !== 1) return false;
    if (negativeRow.pipelineCompleted !== true) return false;
    if (negativeRow.allRequiredFieldsPass !== false) return false;
    if (!Array.isArray(negativeRow.requiredMissing) || negativeRow.requiredMissing.length !== 0) return false;
    if (JSON.stringify(negativeRow.actual) !== JSON.stringify(baselineRow.actual)) return false;
    const baselineExpected = baselineRow.expected || {};
    const negativeExpected = negativeRow.expected || {};
    const negativeComparison = compareExpected(negativeRow.actual, negativeExpected);
    if (negativeComparison.allMatch !== false || negativeComparison.requiredFieldsPass !== false) return false;
    const baselineKeys = Object.keys(baselineExpected).sort();
    const negativeKeys = Object.keys(negativeExpected).sort();
    if (JSON.stringify(baselineKeys) !== JSON.stringify(negativeKeys)) return false;
    if (baselineKeys.some(key => key !== 'damage' && baselineExpected[key] !== negativeExpected[key])) return false;
    if (negativeExpected.damage === baselineRow.actual.damage) return false;
    const failedFields = Object.entries(negativeRow.comparison || {})
        .filter(([, result]) => result?.pass === false)
        .map(([key]) => key);
    return failedFields.length === 1
        && failedFields[0] === 'damage'
        && negativeRow.comparison?.damage?.actual === baselineRow.actual.damage
        && negativeRow.comparison?.damage?.expected === negativeExpected.damage;
}

module.exports = { REQUIRED_FIELD_KEYS, compareExpected, acceptancePasses, validateNegativeExpectedControl };

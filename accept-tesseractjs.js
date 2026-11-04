'use strict';

// Cross-platform acceptance launcher. This is intentionally expected to exit
// nonzero while any exact-field, lifecycle, asset or local-only check fails.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { quoteRequireOption } = require('./node-options-path');
const root = path.join(__dirname, '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(root, 'testdata', 'ocr-acceptance', `${stamp}-${process.pid}`);
fs.mkdirSync(runDir, { recursive: true });
const blockNetworkPath = path.join(__dirname, 'block-network.js');
const blockLogPath = path.join(runDir, 'blocked-network-attempts.log');
const packageInfo = require('../package.json');
const { nativeTesseractAvailable } = require('../src/ocr-worker');
const { validateNegativeExpectedControl } = require('../src/acceptance-checks');
const { describeOcrConfiguration } = require('../src/ocr-report-metadata');
const { version: tesseractJsVersion } = require('tesseract.js/package.json');
const { version: tesseractCoreVersion } = require('tesseract.js-core/package.json');
const results = [];

function run(label, args, envOverrides = {}, networkBlocked = false) {
    const logfile = path.join(runDir, `${label.replace(/[^a-z0-9_-]/gi, '-')}.log`);
    const env = {
        ...process.env,
        OCR_ENGINE: 'tesseractjs',
        OCR_SAVE_RAW_DIAGNOSTICS: '1',
        OCR_DEBUG_TIMINGS: '1',
        OCR_RECYCLE_WORKER_PER_IMAGE: '1',
        OCR_OPERATION_TIMEOUT_MS: process.env.OCR_OPERATION_TIMEOUT_MS || '15000',
        ...envOverrides,
    };
    if (networkBlocked) {
        env.OCR_NETWORK_BLOCK_LOG = blockLogPath;
        env.OCR_NETWORK_BLOCK_ENABLED = '1';
        // NODE_OPTIONS propagates the network guard into the per-image supervised
        // child process too; preloading only the sequence parent would not prove
        // that the OCR worker path itself is offline-safe.
        const preload = quoteRequireOption(blockNetworkPath);
        env.NODE_OPTIONS = [env.NODE_OPTIONS, preload].filter(Boolean).join(' ');
    }
    const argv = [...args];
    console.log(`\n[ACCEPTANCE] START ${label}`);
    const started = Date.now();
    // Redirect child output to files instead of pipes. A timed-out scenario can
    // leave a worker grandchild holding inherited pipe handles open; spawnSync
    // would then wait forever even after its direct child was killed. File-backed
    // stdio keeps the timeout bounded, and we explicitly terminate the process
    // group/tree after a timeout on POSIX/Windows respectively.
    const stdoutPath = `${logfile}.stdout.tmp`;
    const stderrPath = `${logfile}.stderr.tmp`;
    const stdoutFd = fs.openSync(stdoutPath, 'w');
    const stderrFd = fs.openSync(stderrPath, 'w');
    let child;
    try {
        child = spawnSync(process.execPath, argv, {
            cwd: root, env, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024,
            timeout: Number(process.env.OCR_ACCEPTANCE_CHILD_TIMEOUT_MS) || (label === 'additional-sixteen-images-sequential-no-network' ? 1_200_000 : 480_000),
            detached: process.platform !== 'win32',
            stdio: ['ignore', stdoutFd, stderrFd],
        });
    } finally {
        fs.closeSync(stdoutFd);
        fs.closeSync(stderrFd);
    }
    if (child.error && (child.error.code === 'ETIMEDOUT' || /timed out/i.test(child.error.message || '')) && child.pid) {
        try {
            if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000, stdio: 'ignore' });
            else process.kill(-child.pid, 'SIGKILL');
        } catch {}
    }
    const stdout = fs.readFileSync(stdoutPath, 'utf8');
    const stderr = fs.readFileSync(stderrPath, 'utf8');
    fs.unlinkSync(stdoutPath);
    fs.unlinkSync(stderrPath);
    fs.writeFileSync(logfile, `COMMAND: ${process.execPath} ${argv.join(' ')}\nEXIT: ${child.status}\nERROR: ${child.error?.message || ''}\n\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`);
    const row = {
        label, args, exitCode: child.status,
        signal: child.signal || null,
        spawnError: child.error?.message || null,
        elapsedMs: Date.now() - started,
        logfile: path.relative(root, logfile),
        networkBlocked,
        passed: child.status === 0 && !child.error,
    };
    results.push(row);
    console.log(`[ACCEPTANCE] ${row.passed ? 'PASS' : 'FAIL'} ${label}; exit=${row.exitCode}; elapsed=${row.elapsedMs}ms; log=${row.logfile}`);
    if (stdout.trim()) console.log(stdout.trim().split('\n').slice(-6).join('\n'));
    if (stderr.trim()) console.error(stderr.trim().split('\n').slice(-4).join('\n'));
    return row;
}

function sourceFingerprint() {
    const roots = ['src', 'scripts', 'tests', path.join('fixtures', 'additional-screenshots')];
    const files = [];
    function visit(dir) {
        for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const relative = path.posix.join(dir.replaceAll(path.sep, '/'), entry.name);
            if (entry.isDirectory()) visit(relative);
            else if (entry.isFile() && !relative.endsWith('.bak')) files.push(relative);
        }
    }
    for (const dir of roots) if (fs.existsSync(path.join(root, dir))) visit(dir);
    files.push('package.json', 'package-lock.json', path.join('testdata', 'additional-screenshot-ground-truth.json'));
    const hash = crypto.createHash('sha256');
    for (const relative of [...new Set(files)].sort()) {
        const bytes = fs.readFileSync(path.join(root, relative));
        hash.update(relative).update('\0').update(bytes).update('\0');
    }
    return { sha256: hash.digest('hex'), files: [...new Set(files)].sort().length };
}

function report() {
    const blockedLogPresent = fs.existsSync(blockLogPath) && fs.statSync(blockLogPath).size > 0;
    const output = {
        schemaVersion: 1,
        runId: path.basename(runDir),
        createdAt: new Date().toISOString(),
        package: { name: packageInfo.name, version: packageInfo.version, engines: packageInfo.engines, lockfileSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'package-lock.json'))).digest('hex') },
        sourceBuild: sourceFingerprint(),
        runtime: { node: process.version, npm: process.env.npm_config_user_agent || null, platform: process.platform, arch: process.arch },
        engineVersions: { tesseractJs: tesseractJsVersion, tesseractJsCore: tesseractCoreVersion },
        ocrConfiguration: describeOcrConfiguration(process.env),
        configuredEngine: 'tesseractjs',
        expectedEngineVersions: { tesseractJs: tesseractJsVersion, tesseractCore: tesseractCoreVersion },
        nativeTesseractAvailable: nativeTesseractAvailable(),
        networkIsolation: { networkBlocked: true, blockedAttemptLog: path.relative(root, blockLogPath), blockedAttemptsDetected: blockedLogPresent },
        results,
        passed: results.every(result => result.passed) && !blockedLogPresent,
    };
    const jsonPath = path.join(runDir, 'acceptance-report.json');
    fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(jsonPath)).digest('hex');
    fs.writeFileSync(path.join(runDir, 'acceptance-report.sha256'), `${digest}  acceptance-report.json\n`);
    console.log(`\n[ACCEPTANCE] Report: ${path.relative(root, jsonPath)}`);
    console.log(`[ACCEPTANCE] Report SHA-256: ${digest}`);
    console.log(`[ACCEPTANCE] Summary ${results.filter(r => r.passed).length}/${results.length} commands passed; blocked network attempts=${blockedLogPresent ? 'yes' : 'no'}`);
    if (!output.passed) process.exitCode = 1;
}

(async () => {
    try {
        // Unit tests cover exact-match fail-closed logic, watchdog timeout/recovery,
        // confirmed underlying worker exit, Windows-compatible child cancellation,
        // queue semantics, and local asset-path validation.
        run('unit-and-contract-tests', [
            '--test',
            'tests/battle-record.test.js',
            'tests/damage-consensus.test.js',
            'tests/reward-geometry.test.js',
            'tests/localized-numeric-parser.test.js',
            'tests/ocr-process-supervisor.test.js',
            'tests/ocr-watchdog.test.js',
            'tests/windows-process-cancel.test.js',
            'tests/tesseractjs-acceptance.test.js',
            'tests/ocr-report-metadata.test.js',
            'tests/ocr-local-assets.test.js',
            'tests/serial-task-queue.test.js',
            'tests/additional-screenshot-corpus.test.js',
        ]);
        run('local-asset-package-check', ['scripts/check-tesseractjs-assets.js']);
        // First establish that the control fixture passes exact-field acceptance
        // in this same runtime. The previous negative-control used the reported
        // screenshot whose damage was already unresolved, so it could not prove
        // that the injected wrong expectation alone caused rejection.
        const negativeBaselinePath = path.join(runDir, 'negative-control-asashio-baseline.json');
        const negativeBaseline = run('negative-control-asashio-known-good-baseline', ['scripts/run-ocr-sequence.js', 'asashio-defeat.jpg'], {
            OCR_SEQUENCE_REPORT_PATH: negativeBaselinePath,
            OCR_NETWORK_BLOCK_LOG: blockLogPath,
            OCR_NETWORK_BLOCK_ENABLED: '1',
        }, true);
        let negativeBaselineValid = false;
        let baselineRow = null;
        try {
            const baselineReport = JSON.parse(fs.readFileSync(negativeBaselinePath, 'utf8'));
            baselineRow = baselineReport.results?.find(item => item.fixtureKey === 'asashio-defeat.jpg') || null;
            negativeBaselineValid = negativeBaseline.exitCode === 0 && baselineRow?.pipelineCompleted === true &&
                baselineRow?.allRequiredFieldsPass === true && Array.isArray(baselineRow?.requiredMissing) &&
                baselineRow.requiredMissing.length === 0 && baselineRow?.comparison?.damage?.pass === true &&
                baselineRow?.actual?.damage === 171577 && baselineRow?.expected?.damage === 171577;
        } catch {}
        negativeBaseline.passed = negativeBaselineValid;
        negativeBaseline.exactBaselineValidated = negativeBaselineValid;
        negativeBaseline.note = 'Negative control is only meaningful if this same-runtime Asashio baseline first matches all nine mandatory fields exactly, including XP.';
        console.log(`[ACCEPTANCE] ${negativeBaseline.passed ? 'PASS' : 'FAIL'} known-good negative-control baseline; verified=${negativeBaselineValid}`);

        // Run the same fixture again with exactly one deliberately incorrect
        // expected value. The stage is green only if the baseline was fully
        // exact, the OCR actuals stayed identical, and damage is the sole field
        // rejected by the expected-value override.
        const negativeReportPath = path.join(runDir, 'negative-expected-value.json');
        const negative = run('deliberately-wrong-expected-value-must-fail', ['scripts/run-ocr-sequence.js', 'asashio-defeat.jpg'], {
            OCR_ACCEPTANCE_TEST_MODE: '1',
            OCR_ACCEPTANCE_TEST_EXPECTED_OVERRIDE: 'asashio-defeat.jpg.damage=171578',
            OCR_SEQUENCE_REPORT_PATH: negativeReportPath,
            OCR_NETWORK_BLOCK_LOG: blockLogPath,
            OCR_NETWORK_BLOCK_ENABLED: '1',
        }, true);
        let negativeReportValid = false;
        try {
            const negativeReport = JSON.parse(fs.readFileSync(negativeReportPath, 'utf8'));
            const row = negativeReport.results?.find(item => item.fixtureKey === 'asashio-defeat.jpg');
            negativeReportValid = negativeBaselineValid && validateNegativeExpectedControl(baselineRow, row, negative.exitCode);
        } catch {}
        negative.passed = negativeReportValid;
        negative.expectedFailureValidated = negativeReportValid;
        negative.note = 'Expected nonzero exit is a pass only after an exact mandatory-field Asashio baseline, identical OCR actuals, and damage as the sole expected-value mismatch.';
        console.log(`[ACCEPTANCE] ${negative.passed ? 'PASS' : 'FAIL'} negative expected-value test; verified=${negativeReportValid}`);

        // Independently gate the lifecycle sequence on the already known-good
        // Asashio fixture. This reports exact-field accuracy, but does not let an
        // unrelated reported-screenshot ambiguity fail the lifecycle-only gate.
        run('isolated-asashio-stall-recovery-lifecycle', [
            'scripts/integrated-ocr-stall-recovery.js', '--fixture=asashio-defeat.jpg', '--lifecycle-only',
        ], {
            OCR_OPERATION_TIMEOUT_MS: process.env.OCR_INJECTED_STALL_OPERATION_TIMEOUT_MS || '15000',
        }, true);

        // Keep the reported-screenshot's post-recovery exact-field check as a
        // separate accuracy/end-to-end gate; it must continue to fail while the
        // screenshot's damage remains unresolved.
        run('integrated-reported-screenshot-recovery-exactness', ['scripts/integrated-ocr-stall-recovery.js'], {
            OCR_OPERATION_TIMEOUT_MS: process.env.OCR_INJECTED_STALL_OPERATION_TIMEOUT_MS || '15000',
        }, true);
        run('reported-screenshot-no-network', ['scripts/run-reported-screenshot-regression.js'], {
            REPORTED_SCREENSHOT_REPORT_PATH: path.join(runDir, 'reported-screenshot.json'),
            OCR_NETWORK_BLOCK_LOG: blockLogPath,
            OCR_NETWORK_BLOCK_ENABLED: '1',
        }, true);
        // Repeat the complete five-image acceptance batch three times by default.
        // This is intentionally measured end-to-end; isolated fixture passes are
        // not a substitute for repeatable sequential acceptance. PowerShell can
        // override OCR_ACCEPTANCE_BATCH_REPEATS without shell-specific syntax.
        const batchRepeats = Math.max(1, Math.min(3, Number(process.env.OCR_ACCEPTANCE_BATCH_REPEATS) || 3));
        for (let batch = 1; batch <= batchRepeats; batch += 1) {
            run(`five-image-sequential-no-network-${batch}`, ['scripts/run-ocr-sequence.js'], {
                OCR_SEQUENCE_REPORT_PATH: path.join(runDir, `five-image-sequence-${batch}.json`),
                OCR_NETWORK_BLOCK_LOG: blockLogPath,
                OCR_NETWORK_BLOCK_ENABLED: '1',
            }, true);
        }
        run('hoffmann-then-asashio-no-network', ['scripts/run-ocr-sequence.js', 'hoffmann-victory.png', 'asashio-defeat.jpg'], {
            OCR_SEQUENCE_REPORT_PATH: path.join(runDir, 'hoffmann-asashio.json'),
            OCR_NETWORK_BLOCK_LOG: blockLogPath,
            OCR_NETWORK_BLOCK_ENABLED: '1',
        }, true);
        run('asashio-then-hoffmann-no-network', ['scripts/run-ocr-sequence.js', 'asashio-defeat.jpg', 'hoffmann-victory.png'], {
            OCR_SEQUENCE_REPORT_PATH: path.join(runDir, 'asashio-hoffmann.json'),
            OCR_NETWORK_BLOCK_LOG: blockLogPath,
            OCR_NETWORK_BLOCK_ENABLED: '1',
        }, true);
        // Add the 16 user-supplied screenshots as a separate, exact-match
        // acceptance stage. This keeps the established five-image repeat tests
        // comparable while ensuring the expanded corpus is exercised each run.
        run('additional-sixteen-images-sequential-no-network', ['scripts/run-additional-screenshot-regression.js'], {
            OCR_SEQUENCE_REPORT_PATH: path.join(runDir, 'additional-screenshot-sequence.json'),
            OCR_NETWORK_BLOCK_LOG: blockLogPath,
            OCR_NETWORK_BLOCK_ENABLED: '1',
        }, true);
    } finally {
        report();
    }
})().catch(error => {
    console.error('[ACCEPTANCE] Fatal launcher error:', error);
    process.exitCode = 1;
    report();
});

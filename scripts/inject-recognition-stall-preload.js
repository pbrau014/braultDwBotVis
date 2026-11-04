'use strict';

// Test-only NODE_OPTIONS preload. It permits one real Tesseract.js recognition
// call, then stalls the next call so the production operation watchdog must
// terminate and confirm the underlying worker thread. Never enable in normal
// bot execution; the acceptance harness loads this file only for one child job.
const Module = require('node:module');
const originalLoad = Module._load;
let patchedExports = null;

Module._load = function loadWithRecognitionStall(request, parent, isMain) {
    const loaded = originalLoad.call(this, request, parent, isMain);
    if (request !== 'tesseract.js' || !loaded || typeof loaded.createWorker !== 'function') return loaded;
    if (patchedExports) return patchedExports;

    patchedExports = { ...loaded };
    patchedExports.createWorker = async (...createArgs) => {
        const rawWorker = await loaded.createWorker(...createArgs);
        let recognitionCalls = 0;
        return new Proxy(rawWorker, {
            get(target, property) {
                if (property === 'recognize') {
                    return async (...recognizeArgs) => {
                        recognitionCalls += 1;
                        if (recognitionCalls === 1) {
                            console.log('[STALL-TEST] real-recognition-start');
                            const result = await target.recognize(...recognizeArgs);
                            console.log('[STALL-TEST] real-recognition-complete');
                            return result;
                        }
                        if (recognitionCalls === 2) {
                            console.log('[STALL-TEST] injected-recognition-stall');
                            return new Promise(() => {});
                        }
                        return target.recognize(...recognizeArgs);
                    };
                }
                const value = Reflect.get(target, property, target);
                return typeof value === 'function' ? value.bind(target) : value;
            },
        });
    };
    return patchedExports;
};

'use strict';

function isReusableLocalReader(reader, engine) {
    return Boolean(reader && reader.engine === engine
        && ['complete', 'partial'].includes(reader.status)
        && reader.record && typeof reader.record === 'object' && !Array.isArray(reader.record));
}

function planReaderRecovery(priorReaders, engines) {
    const rows = Array.isArray(priorReaders) ? priorReaders : [];
    const preserved = [];
    const pending = [];
    for (const engine of engines) {
        const matching = rows.filter(reader => reader?.engine === engine);
        if (matching.length === 1 && isReusableLocalReader(matching[0], engine)) preserved.push(matching[0]);
        else pending.push(engine);
    }
    return { preserved, pending };
}

module.exports = { isReusableLocalReader, planReaderRecovery };

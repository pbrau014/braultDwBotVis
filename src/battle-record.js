'use strict';

const { createHash } = require('node:crypto');

const NOT_DETECTED = 'Not detected';

// These nine fields are mandatory for acceptance. XP is the ninth/final field.
// Ship, description, and ribbon names/counts remain optional metadata.
const REQUIRED_MANUAL_FIELDS = [
    { key: 'result', label: 'Battle Result', hint: 'Victory or Defeat' },
    { key: 'player', label: 'Player', hint: '[CLAN]PlayerName' },
    { key: 'map', label: 'Map', hint: 'the map or operation name' },
    { key: 'mode', label: 'Battle Mode', hint: 'e.g. Random Battle or Co-op Battle' },
    { key: 'battleStart', label: 'Battle Start Time', hint: 'DD.MM.YYYY HH:MM' },
    { key: 'credits', label: 'Credits', hint: 'the complete Credits amount shown in the screenshot' },
    { key: 'freeXp', label: 'Free XP', hint: 'the complete Free XP amount shown in the screenshot' },
    { key: 'damage', label: 'Damage', hint: 'the complete Damage amount shown in the screenshot' },
    { key: 'xp', label: 'XP', hint: 'the complete XP amount shown in the screenshot' },
];

const FIELD_ALIASES = new Map([
    ['battle result', 'result'], ['result', 'result'], ['victory/defeat', 'result'], ['defeat/victory', 'result'], ['victory defeat', 'result'],
    ['player', 'player'], ['player name', 'player'], ['clan/player', 'player'], ['clan/player name', 'player'],
    ['ship', 'ship'], ['ship name', 'ship'], ['result description', 'description'], ['description', 'description'],
    ['map', 'map'], ['map name', 'map'], ['operation', 'map'], ['operation name', 'map'],
    ['battle mode', 'mode'], ['mode', 'mode'], ['battle start time', 'battleStart'], ['timestamp', 'battleStart'],
    ['battle timestamp', 'battleStart'], ['start time', 'battleStart'], ['credits', 'credits'], ['xp', 'xp'],
    ['experience', 'xp'], ['free xp', 'freeXp'], ['freexp', 'freeXp'], ['free experience', 'freeXp'], ['damage', 'damage'],
]);

function cleanText(value) {
    return String(value ?? '')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function normaliseNumber(value) {
    const source = String(value ?? '').trim();
    return /^[\d\s,.'’]+$/.test(source) ? source.replace(/\D/g, '') : '';
}

function parseBattleResult(text) {
    const source = cleanText(text);
    const victory = /\bvictory\b/i.test(source) || /our[\s'’]+team completed (?:the )?(?:primary )?(?:mission|task|objective)|our[\s'’]+team\s+(?:won\s+by|wor['’]?by) points|all enemy warships destroyed/i.test(source);
    const defeat = /\bdefeat\b/i.test(source) || /the enemy team completed (?:the )?(?:primary )?(?:mission|task|objective)|all allied warships destroyed|battle time expired.{0,80}enemy team won/i.test(source);
    return victory === defeat ? NOT_DETECTED : (victory ? 'Victory' : 'Defeat');
}

function parseResultDescription(text) {
    const source = cleanText(text);
    // Normalize a recurring OCR substitution in the result line without exposing
    // the malformed token as the saved record description.
    if (/our[\s'’]+team\s+wor['’]?by points/i.test(source)) return 'Our team won by points.';
    const patterns = [
        /Our[\s'’]+team\s+won by points\.?/i,
        /Battle time expired\.?\s*Enemy team won by points\.?/i,
        /The enemy team completed (?:the )?(?:primary )?(?:mission|task|objective)\.?/i,
        /Our[\s'’]+team completed (?:the )?(?:primary )?(?:mission|task|objective)\.?/i,
        /All allied warships destroyed\.?/i,
        /All enemy warships destroyed\.?/i,
        /The enemy team won by points\.?/i,
    ];
    for (const pattern of patterns) {
        const match = source.match(pattern);
        if (match) return match[0].replace(/\s+/g, ' ').trim();
    }
    return NOT_DETECTED;
}

function parseIdentityLine(text) {
    // This parser receives the dedicated identity crop, not merged full-page OCR.
    const lines = cleanText(text).split('\n').map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
        const playerMatch = line.match(/\[([A-Z0-9_-]{2,})\]\s*([A-Z0-9][A-Z0-9_.-]{1,})/i);
        if (!playerMatch) continue;

        const player = `[${playerMatch[1]}]${playerMatch[2]}`;
        let after = line.slice(playerMatch.index + playerMatch[0].length);
        // Strip arrows/ornaments and stop before any following UI heading that OCR
        // may accidentally concatenate to the same line.
        after = after
            .replace(/[►»›]|={1,}|-{2,}|[|/\\]+/g, ' ')
            .replace(/\b(?:received|battle performance|combat missions|victory|defeat|personal score|team score|detailed report|credits and xp)\b.*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();

        const shipPatterns = [
            /\b(XI|VIII|VII|VI|IX|V|IV|III|II|X|I)\s+([A-Z][A-Z0-9-]{2,}(?:\s+[A-Z][A-Z0-9-]{2,})?)(?=\s|$)/i,
            /\b(XI|VIII|VII|VI|IX|IV|III|II|X)([A-Z][A-Z0-9-]{5,})\b/i,
        ];
        let ship = NOT_DETECTED;
        for (const pattern of shipPatterns) {
            const match = after.match(pattern);
            if (match) {
                ship = `${match[1].toUpperCase()} ${match[2].toUpperCase()}`.replace(/\s+/g, ' ').trim();
                break;
            }
        }
        return { player, ship, line };
    }
    return { player: NOT_DETECTED, ship: NOT_DETECTED, line: '' };
}

function parseModeMap(text) {
    const source = cleanText(text);
    const lines = source.split('\n').map((line) => line.trim()).filter(Boolean);
    // OCR often removes spaces in the small top-right mode line (RandomBattle),
    // or clips the final glyph of Brawl when its crop ends at the screen edge.
    // Allow only known mode spellings/one narrowly documented truncation.
    const modePattern = /\b(Co-op\s*Battle|Random\s*Battle|Ranked\s*Battle|Asymmetric\s*Battle|Scenario\s*Battle|Training\s*Battle|Convoy\s*Battle|Operations?|Brawl|Braw|Clan\s*Battle|Airship\s*Escort|Big\s*Hunt)\b/i;
    let map = NOT_DETECTED;
    let mode = NOT_DETECTED;

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(modePattern);
        if (!match) continue;
        const rawMode = match[1].replace(/\s+/g, ' ').trim().toLowerCase();
        if (/^co-op/.test(rawMode)) mode = 'Co-op Battle';
        else if (/^random/.test(rawMode)) mode = 'Random Battle';
        else if (/^ranked/.test(rawMode)) mode = 'Ranked Battle';
        else if (/^asymmetric/.test(rawMode)) mode = 'Asymmetric Battle';
        else if (/^scenario/.test(rawMode)) mode = 'Scenario Battle';
        else if (/^training/.test(rawMode)) mode = 'Training Battle';
        else if (/^convoy/.test(rawMode)) mode = 'Convoy Battle';
        else if (/^clan/.test(rawMode)) mode = 'Clan Battle';
        else if (/^operation/.test(rawMode)) mode = 'Operations';
        else if (/^braw$/i.test(rawMode) || /^brawl$/i.test(rawMode)) mode = 'Brawl';
        else if (/^airship/i.test(rawMode)) mode = 'Airship Escort';
        else if (/^big\s*hunt/i.test(rawMode)) mode = 'Big Hunt';
        else mode = match[1];

        const before = line.slice(0, match.index).replace(/[\s—–=:-]+$/, '').trim();
        const after = line.slice(match.index + match[0].length).replace(/^[—–-]+\s*/, '').trim();
        if (before && !/battle start time|victory|defeat|personal score|received/i.test(before)) map = before;
        else if (after && !/battle start time/i.test(after)) map = after;
        else if (index > 0 && !/battle start time|victory|defeat|received|battle performance/i.test(lines[index - 1])) {
            map = lines[index - 1].replace(/[—–-]+\s*$/, '').trim();
        }
        break;
    }

    if (map === NOT_DETECTED) {
        const match = source.match(/(?:map|operation)\s*:\s*([^\n|]{2,80})/i);
        if (match && !/battle start time/i.test(match[1])) map = match[1].trim();
    }
    // Some native Tesseract crops retain the separator after the map but omit
    // the adjacent mode token. In that narrowly bounded shape, the pre-separator
    // text is a usable map candidate; do not infer a mode or whitelist map names.
    if (map === NOT_DETECTED) {
        // OCR often emits the map title and trailing separator on their own line,
        // followed by the timestamp or other metadata. Search individual lines,
        // not only a one-line document, and exclude known non-map headings.
        const trailingSeparatorLine = lines
            .map((line) => line.match(/^([^\n|]{2,80}?)\s+[—–-]+\s*$/))
            .find((match) => match && !/battle start time|victory|defeat|received|battle performance/i.test(match[1]));
        if (trailingSeparatorLine) map = trailingSeparatorLine[1].trim();
    }
    // Repair common OCR separators in a map title without making a closed list
    // of map names. The fused "Sealof" token is a recurring OCR artifact for
    // the short word "of" in this particular title; leave all other words intact.
    if (map !== NOT_DETECTED) {
        map = String(map)
            .replace(/[\\/]+/g, ' ')
            .replace(/\bSealof\b/gi, 'Sea of')
            // Tesseract can insert a lowercase `i` at a fused title-case boundary
            // (e.g. `MountainiRange`). Treat only that pattern as a separator; do
            // not whitelist map names or rewrite other internal characters.
            .replace(/([a-z])i(?=[A-Z])/g, '$1 ')
            .replace(/\s+[—–-]+\s*$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    if (map !== NOT_DETECTED) map = cleanMapOcrPrefix(map);
    return { map, mode };
}

function parseBattleStartTime(text) {
    const source = cleanText(text);
    // Tesseract sometimes inserts a glyph inside the heading (e.g. Battlefstartitime)
    // and removes the space between the year and clock. Restrict tolerated noise to
    // one common OCR character at each heading boundary; date/time validation below
    // remains strict and rejects impossible calendar values.
    const labelled = /battle\s*[fli]?\s*start\s*[fi]?\s*time[s]?\s*[:：.]?\s*(\d{1,2})[\s./,:-]+(\d{1,2})[\s./,:-]+(\d{4})\s*(\d{1,2})[:.](\d{2})/i;
    // Some source-panel reads collapse the separators and insert a stray `1`
    // after the day (e.g. `2810912024 17:04` for 28.09.2024). Accept this only
    // under the explicit Battle Start Time label and only as a nine-digit date.
    const labelledNoisyCompact = /battle\s*[fli]?\s*start\s*[fi]?\s*time[s]?\s*[:：.]?\s*(\d{2})1(\d{2})1?(\d{4})\D{0,4}(\d)\s*(\d)[:.](\d{2})/i;
    const labelledNoisySeparated = /battle\s*[fli]?\s*start\s*[fi]?\s*time[s]?\s*[:：.]?\s*(\d{2})1(\d{2})[^\d]{1,2}(\d{4})\D{0,4}(\d)\s*(\d)[:.](\d{2})/i;
    const labelledCompact = /battle\s*[fli]?\s*start\s*[fi]?\s*time[s]?\s*[:：.]?\s*(\d{2})(\d{2})(\d{4})\D{0,4}(\d{1,2})[:.](\d{2})/i;
    const bare = /\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\s*(\d{1,2})[:.](\d{2})\b/;
    let match = source.match(labelled) || source.match(bare);
    let groups;
    if (match) groups = match.slice(1, 6);
    else {
        const noisy = source.match(labelledNoisyCompact) || source.match(labelledNoisySeparated);
        if (noisy) {
            const [, day, month, year, hourTens, hourOnes, minute] = noisy;
            groups = [day, month, year, `${hourTens}${hourOnes}`, minute];
        } else {
            match = source.match(labelledCompact);
            if (!match) return NOT_DETECTED;
            groups = match.slice(1, 6);
        }
    }
    const [dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw] = groups;
    const day = Number(dayRaw); const month = Number(monthRaw); const year = Number(yearRaw);
    const hour = Number(hourRaw); const minute = Number(minuteRaw);
    if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return NOT_DETECTED;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return NOT_DETECTED;
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function numberField(value, minDigits, maxDigits) {
    const normalised = normaliseNumber(value);
    return normalised.length >= minDigits && normalised.length <= maxDigits ? normalised : NOT_DETECTED;
}

function validPlayer(value) {
    return /^\[[A-Z0-9_-]{2,}\][A-Z0-9][A-Z0-9_.-]{1,}$/i.test(String(value || '').replace(/\s+/g, ''));
}

function comparisonKey(value) {
    return String(value || '').toLowerCase().replace(/[—–-]/g, ' ').replace(/[^a-z0-9.:[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanMapOcrPrefix(value) {
    // OCR sometimes prepends fragments from the nearby result banner to an otherwise
    // legible map name (e.g. `D ef e 1 Northern Lights`, `0 PTR Al Crash Zone Alpha`,
    // or `= i | Sea of Fortune`). Drop only leading tokens that are unambiguously
    // debris: punctuation-only, numeric, one/two characters, or short all-caps UI
    // fragments. Preserve plausible title-case map words such as `Sea of Fortune`.
    const source = String(value || '').replace(/^[\s|=:+–—-]+/, '').replace(/[|=]+/g, ' ')
        .replace(/[\s\]\[{}~&^®©]+$/g, '').replace(/[\s—–-]+$/u, '').replace(/\s+/g, ' ').trim();
    const words = source.split(' ').filter(Boolean);
    // A stray bracket/pipe inside a leading OCR fragment is a strong sign that
    // the first one or two tokens came from the Victory banner, not the map title
    // (e.g. `Hil avi] Big Race`). Remove only the malformed prefix through that
    // token; retain the clean title words after it.
    const malformedPrefixIndex = words.findIndex((word, wordIndex) => wordIndex < words.length - 1 && /[\]\[{}|=~]/.test(word));
    let index = malformedPrefixIndex >= 0 ? malformedPrefixIndex + 1 : 0;
    while (index < words.length - 1 && /[\]\[{}|=~]/.test(words[index])) index += 1;
    while (index < words.length - 1) {
        const word = words[index];
        // OCR can include a partial Victory banner token before the map name
        // (e.g. `Victor Mountain Range`) or a short all-caps artifact (`ATRAT
        // Crash Zone Alpha`). Strip these only at the leading edge, never from
        // within a plausible map name.
        const debris = /^\(?\d+\)?[.,;:]?$/.test(word) || /^[()[\]{}\\]+$/.test(word) ||
            word.length <= 2 || /^(?:victor|victory|defeat)$/i.test(word) || /^[A-Z]{2,5}$/.test(word) ||
            /^[A-Za-z]{1,3}[.:]+$/.test(word);
        if (!debris) break;
        index += 1;
    }
    return words.slice(index).join(' ') || source;
}

function areOcrConfusableVariants(left, right) {
    const a = String(left || '').toLowerCase();
    const b = String(right || '').toLowerCase();
    if (!a || a.length !== b.length) return false;
    const pairs = new Set(['0:o', 'o:0', '1:l', 'l:1', '1:i', 'i:1', 'i:l', 'l:i', '5:s', 's:5', '8:b', 'b:8', '6:g', 'g:6', 'h:b', 'b:h']);
    let changed = false;
    for (let index = 0; index < a.length; index += 1) {
        if (a[index] === b[index]) continue;
        changed = true;
        if (!pairs.has(`${a[index]}:${b[index]}`)) return false;
    }
    return changed;
}

function weightedTextWinner(groups, fieldKey) {
    if (!['player', 'map', 'mode', 'battleStart', 'result', 'ship'].includes(fieldKey)) return null;
    const ranked = [...groups.values()].map((group) => ({
        ...group,
        weight: group.candidates.reduce((sum, candidate) => sum + candidate.weight, 0),
        averageConfidence: group.candidates.reduce((sum, candidate) => sum + candidate.confidence, 0) / group.candidates.length,
    })).sort((a, b) => b.weight - a.weight || b.candidates.length - a.candidates.length || b.averageConfidence - a.averageConfidence);
    if (ranked.length < 2) return null;
    const first = ranked[0];
    const second = ranked[1];
    const allCandidates = ranked.flatMap(group => group.candidates);
    // Player names get one narrow exception: when otherwise identical player
    // strings differ only by common OCR-confusable glyphs (O/0, l/I/1, S/5,
    // B/8, G/6), choose a uniquely supported exact spelling. Any substantive
    // name disagreement remains fail-closed and asks for a correction.
    if (fieldKey === 'player') {
        // Low-confidence snippets frequently produce partial clan/player names and
        // should not veto a stronger dedicated-source identity crop. Restrict the
        // glyph-confusion tie-break to the >=60-confidence candidates, then retain
        // the source weights so an exact raw-source identity crop wins over a weak
        // fragmented full-screen variant. Any substantive high-confidence mismatch
        // remains fail-closed.
        const highQuality = allCandidates.filter(candidate => candidate.confidence >= 60);
        const confusablePlayerVariants = highQuality.length >= 2 &&
            highQuality.every((candidate) => areOcrConfusableVariants(candidate.value, highQuality[0].value) || candidate.value === highQuality[0].value);
        if (confusablePlayerVariants) {
            const highQualityGroups = [...groups.values()].map(group => {
                const candidates = group.candidates.filter(candidate => candidate.confidence >= 60);
                return { ...group, candidates, weight: candidates.reduce((sum, candidate) => sum + candidate.weight, 0) };
            }).filter(group => group.candidates.length > 0)
                .sort((a, b) => b.weight - a.weight || b.candidates.length - a.candidates.length);
            if (highQualityGroups.length === 1) return highQualityGroups[0];
            if (highQualityGroups.length > 1 && highQualityGroups[0].weight > highQualityGroups[1].weight &&
                highQualityGroups[0].weight >= 1 && highQualityGroups[0].candidates.length >= 1) return highQualityGroups[0];
        }
    }
    // Text fields can tolerate one weak/fragmented crop disagreeing when two
    // independent, reasonably confident reads agree exactly. This does not apply
    // to numeric fields, where plausible-looking wrong digits must remain absent.
    if (first.candidates.length >= 2 && first.candidates.length > second.candidates.length &&
        first.weight > second.weight && first.averageConfidence >= 65) return first;
    return null;
}

function preferredMapSpelling(group) {
    const supported = group.candidates.filter((candidate) => {
        const letters = String(candidate.value || '').match(/\\p{L}/gu) || [];
        const first = String(candidate.value || '').trim().match(/^\\p{L}/u)?.[0];
        const initialIsUppercase = first && first === first.toLocaleUpperCase() && first !== first.toLocaleLowerCase();
        const hasLowercase = letters.some((letter) => letter === letter.toLocaleLowerCase() && letter !== letter.toLocaleUpperCase());
        return Boolean(initialIsUppercase && hasLowercase);
    });
    supported.sort((a, b) => b.weight - a.weight || b.confidence - a.confidence);
    return supported[0]?.value || null;
}

function consensus(candidates, fieldKey, ambiguities, label, singleReadConfidence = 85) {
    const usable = candidates
        .map((candidate) => typeof candidate === 'object' && candidate !== null
            ? { value: String(candidate.value ?? '').trim(), confidence: Number(candidate.confidence) || 0, weight: Number(candidate.weight) > 0 ? Number(candidate.weight) : 1, source: candidate.source || '' }
            : { value: String(candidate ?? '').trim(), confidence: 0, weight: 1, source: '' })
        .filter((candidate) => candidate.value && candidate.value !== NOT_DETECTED);
    const grouped = new Map();
    for (const candidate of usable) {
        const key = comparisonKey(candidate.value);
        const group = grouped.get(key) || { value: candidate.value, candidates: [] };
        group.candidates.push(candidate);
        // Keep the highest-confidence spelling variant when the passes differ
        // only in whitespace/case/punctuation.
        if (candidate.confidence > (group.bestConfidence || -1)) {
            group.value = candidate.value;
            group.bestConfidence = candidate.confidence;
        }
        grouped.set(key, group);
    }
    if (grouped.size > 1) {
        const winner = weightedTextWinner(grouped, fieldKey);
        if (winner) {
            if (fieldKey === 'map') {
                const spelling = preferredMapSpelling(winner);
                if (!spelling) {
                    ambiguities[fieldKey] = 'Map capitalization was not corroborated by a title-case OCR reading';
                    return NOT_DETECTED;
                }
                return spelling;
            }
            return winner.value;
        }
        ambiguities[fieldKey] = `${label} OCR passes disagreed: ${[...grouped.values()].map((group) => group.value).join(' vs ')}`;
        return NOT_DETECTED;
    }
    const onlyGroup = grouped.values().next().value;
    if (!onlyGroup) return NOT_DETECTED;
    if (onlyGroup.candidates.length < 2 && onlyGroup.candidates[0].confidence < singleReadConfidence) {
        ambiguities[fieldKey] = `${label} was readable in only one OCR pass (confidence ${Math.round(onlyGroup.candidates[0].confidence)}%); another agreeing read or manual correction is needed`;
        return NOT_DETECTED;
    }
    if (fieldKey === 'map') {
        const spelling = preferredMapSpelling(onlyGroup);
        if (!spelling) {
            ambiguities[fieldKey] = 'Map capitalization was not corroborated by a title-case OCR reading';
            return NOT_DETECTED;
        }
        return spelling;
    }
    return onlyGroup.value;
}

function buildBattleRecord(rawText, fields = {}) {
    const text = cleanText(rawText);
    const ambiguities = {};
    const identityCandidates = fields.identityCandidates?.length
        ? fields.identityCandidates
        : [{ text: fields.identityText || text, confidence: 100 }];
    const identity = identityCandidates.map((candidate) => ({ ...parseIdentityLine(candidate.text), confidence: Number(candidate.confidence) || 0, weight: Number(candidate.weight) > 0 ? Number(candidate.weight) : 1, source: candidate.source || '' }));
    const player = consensus(identity.map((candidate) => ({ value: candidate.player, confidence: candidate.confidence, weight: candidate.weight, source: candidate.source })), 'player', ambiguities, 'Player');
    const ship = consensus(identity.map((candidate) => ({ value: candidate.ship, confidence: candidate.confidence, weight: candidate.weight, source: candidate.source })), 'ship', ambiguities, 'Ship');

    const metadataCandidates = fields.metadataCandidates?.length
        ? fields.metadataCandidates
        : [{ text: fields.metadataText || text, confidence: 100 }];
    const metadata = metadataCandidates.map((candidate) => {
        const parsedMetadata = parseModeMap(candidate.text);
        return {
            ...parsedMetadata,
            // Drop OCR debris such as an opening quote before a map name.
            map: cleanMapOcrPrefix(String(parsedMetadata.map || NOT_DETECTED).replace(/^[\s'"`‘’“”.,:;|]+/, '').trim()) || NOT_DETECTED,
            battleStart: parseBattleStartTime(candidate.text),
            confidence: Number(candidate.confidence) || 0,
            weight: Number(candidate.weight) > 0 ? Number(candidate.weight) : 1,
            source: candidate.source || '',
        };
    });
    const map = consensus(metadata.map((candidate) => ({ value: candidate.map, confidence: candidate.confidence, weight: candidate.weight, source: candidate.source })), 'map', ambiguities, 'Map');
    const mode = consensus(metadata.map((candidate) => ({ value: candidate.mode, confidence: candidate.confidence, weight: candidate.weight, source: candidate.source })), 'mode', ambiguities, 'Battle Mode');
    const battleStart = consensus(metadata.map((candidate) => ({ value: candidate.battleStart, confidence: candidate.confidence, weight: candidate.weight, source: candidate.source })), 'battleStart', ambiguities, 'Battle Start Time');
    const resultSourceCandidates = fields.resultCandidates?.length ? fields.resultCandidates : [{ text, confidence: 100 }];
    const result = consensus(resultSourceCandidates.map((candidate) => ({ value: parseBattleResult(candidate.text), confidence: Number(candidate.confidence) || 0, weight: candidate.weight, source: candidate.source })), 'result', ambiguities, 'Battle Result');

    const rewardCandidates = fields.rewardCandidates?.length
        ? fields.rewardCandidates
        : (fields.rewards ? [fields.rewards] : []);
    const rewards = {};
    for (const key of ['credits', 'xp', 'freeXp']) {
        const min = key === 'credits' ? 5 : 1;
        const max = key === 'credits' ? 9 : 7;
        rewards[key] = consensus(rewardCandidates.map((candidate) => ({ value: numberField(candidate[key], min, max), confidence: Number(candidate.confidence) || 0 })), key, ambiguities, key === 'freeXp' ? 'Free XP' : key.toUpperCase());
    }
    const damageCandidates = fields.damageCandidates?.length
        ? fields.damageCandidates
        : (fields.damage ? [{ value: fields.damage }] : []);
    // OCR candidates are deliberately length-guarded to avoid accepting a partial
    // crop. Manual user correction has a separate, less restrictive validator.
    const prefixQuorumSupportsDamage = damageCandidates.some((candidate) => candidate.supportedByIsolatedPrefixQuorum === true);
    const damage = consensus(damageCandidates.map((candidate) => ({ value: numberField(candidate.value, 5, 9), confidence: Number(candidate.confidence) || 0 })),
        'damage', ambiguities, 'Damage', prefixQuorumSupportsDamage ? 65 : 85);

    for (const [key, value] of Object.entries(fields.ambiguities || {})) ambiguities[key] = value;
    for (const key of Object.keys(ambiguities)) {
        if (['credits', 'xp', 'freeXp'].includes(key)) rewards[key] = NOT_DETECTED;
    }
    // Unicode replacement characters indicate undecodable OCR output, not a
    // legitimate map/player/mode value. Reject rather than persisting strings
    // such as "Estuary �" as if they were recognized metadata.
    const invalidOrAmbiguous = (key, value) => ambiguities[key] ||
        (typeof value === 'string' && value.includes('\uFFFD')) ? NOT_DETECTED : value;

    return {
        result: invalidOrAmbiguous('result', result),
        player: invalidOrAmbiguous('player', player),
        ship: invalidOrAmbiguous('ship', ship),
        description: fields.description && fields.description !== NOT_DETECTED ? fields.description : parseResultDescription(text),
        map: invalidOrAmbiguous('map', map),
        mode: invalidOrAmbiguous('mode', mode),
        battleStart: invalidOrAmbiguous('battleStart', battleStart),
        credits: invalidOrAmbiguous('credits', rewards.credits),
        xp: invalidOrAmbiguous('xp', rewards.xp),
        freeXp: invalidOrAmbiguous('freeXp', rewards.freeXp),
        damage: invalidOrAmbiguous('damage', damage),
        ribbons: Array.isArray(fields.ribbons) ? fields.ribbons : [],
        ambiguities,
        sourceText: text,
    };
}

function getMissingRequiredFields(record) {
    return REQUIRED_MANUAL_FIELDS.filter((field) => {
        const value = String(record[field.key] || '').trim();
        let valid = Boolean(value && value !== NOT_DETECTED);
        if (field.key === 'result') valid = value === 'Victory' || value === 'Defeat';
        if (field.key === 'player') valid = validPlayer(value);
        if (field.key === 'map') valid = valid && value.length >= 2 && value.length <= 80;
        if (field.key === 'mode') valid = valid && value.length >= 2 && value.length <= 60;
        if (field.key === 'battleStart') valid = parseBattleStartTime(`Battle start time: ${value}`) !== NOT_DETECTED;
        if (field.key === 'credits') valid = /^\d{5,9}$/.test(value);
        if (field.key === 'freeXp') valid = /^\d{1,7}$/.test(value);
        if (field.key === 'damage') valid = /^\d{1,9}$/.test(value);
        if (field.key === 'xp') valid = /^\d{1,7}$/.test(value);
        if (value.includes('\uFFFD')) valid = false;
        return !valid;
    }).map((field) => ({
        ...field,
        reason: record.ambiguities?.[field.key] || `OCR could not confidently read ${field.label}`,
    }));
}

function normalizeCorrections(content) {
    const values = {};
    const invalid = [];
    const labels = {
        credits: 'Credits', freeXp: 'Free XP', xp: 'XP', damage: 'Damage', battleStart: 'Battle Start Time',
        map: 'Map', mode: 'Battle Mode', ship: 'Ship', description: 'Result Description', result: 'Battle Result', player: 'Player',
    };
    for (const line of cleanText(content).split('\n')) {
        const match = line.match(/^\s*([^:=]{2,40})\s*[:=]\s*(.*?)\s*$/);
        if (!match || !match[2]) continue;
        const label = match[1].toLowerCase().replace(/\s+/g, ' ').trim();
        const key = FIELD_ALIASES.get(label);
        if (!key) continue;
        const raw = match[2].trim();
        if (raw.includes('\uFFFD')) {
            invalid.push({ key, label: labels[key] || key, value: raw, reason: 'the OCR text contains an undecodable replacement character; re-enter the value from the screenshot' });
            continue;
        }
        let value = raw;
        if (key === 'result') {
            if (/^victory$/i.test(raw)) value = 'Victory';
            else if (/^defeat$/i.test(raw)) value = 'Defeat';
            else { invalid.push({ key, label: labels[key], value: raw, reason: 'enter exactly Victory or Defeat' }); continue; }
        } else if (key === 'player') {
            value = raw.replace(/\s+/g, '');
            if (!validPlayer(value)) { invalid.push({ key, label: labels[key], value: raw, reason: 'use [CLAN]PlayerName, e.g. [WOLF1]PlayerName' }); continue; }
        } else if (key === 'credits') value = numberField(raw, 5, 9);
        else if (key === 'freeXp' || key === 'xp') value = numberField(raw, 1, 7);
        else if (key === 'damage') value = numberField(raw, 1, 9);
        else if (key === 'battleStart') value = parseBattleStartTime(`Battle start time: ${raw}`);
        else if (key === 'map') value = raw.length >= 2 && raw.length <= 80 ? raw : NOT_DETECTED;
        else if (key === 'mode') value = raw.length >= 2 && raw.length <= 60 ? raw : NOT_DETECTED;
        else if (key === 'ship' || key === 'description') value = raw.length >= 2 && raw.length <= 120 ? raw : NOT_DETECTED;

        if (!value || value === NOT_DETECTED) {
            invalid.push({ key, label: labels[key] || key, value: raw, reason: 'the value has an unexpected format' });
            continue;
        }
        values[key] = value;
    }
    return { values, invalid };
}

function applyCorrections(record, content) {
    const parsed = normalizeCorrections(content);
    const next = { ...record, ambiguities: { ...(record.ambiguities || {}) } };
    for (const [key, value] of Object.entries(parsed.values)) {
        next[key] = value;
        delete next.ambiguities[key];
    }
    for (const issue of parsed.invalid) {
        // An invalid attempted correction for a required field must not silently
        // leave an older OCR guess in place. Mark that field unresolved and ask
        // the user to re-enter only that value. Invalid optional fields are ignored.
        if (REQUIRED_MANUAL_FIELDS.some((field) => field.key === issue.key)) {
            next[issue.key] = NOT_DETECTED;
            next.ambiguities[issue.key] = `Your correction for ${issue.label} was not accepted: ${issue.reason}`;
        }
    }
    return { record: next, recognized: Object.keys(parsed.values).length, invalid: parsed.invalid };
}

function formatBattleRecord(record) {
    const valueOf = (key) => {
        const value = String(record[key] || NOT_DETECTED).trim();
        return value || NOT_DETECTED;
    };
    const lines = [
        '# World of Warships — Battle Record', '',
        `**Battle Result:** ${valueOf('result')}`, '',
        `**Player:** ${valueOf('player')}`,
        `**Ship:** ${valueOf('ship')}`, '',
        `**Result Description:** ${valueOf('description')}`, '',
        `**Map:** ${valueOf('map')}`,
        `**Battle Mode:** ${valueOf('mode')}`,
        `**Battle Start Time:** ${valueOf('battleStart')}`, '',
        '## Received for the Battle', '',
        `- Credits: ${valueOf('credits')}`,
        `- XP: ${valueOf('xp')}`,
        `- Free XP: ${valueOf('freeXp')}`, '',
        '## Battle Performance', '',
        `- **Damage:** ${valueOf('damage')}`,
    ];
    const canonical = (name) => {
        const normal = String(name || '').toLowerCase().trim();
        if (['hits to citadel', 'citadel hit', 'citadel hits'].includes(normal)) return 'Citadel hits';
        const known = ['Destroyed', 'Target hits', 'Incapacitations', 'Set on fire', 'Caused flooding', 'Spotted', 'Aircraft shot down', 'Defended', 'Captured'];
        return known.find((label) => label.toLowerCase() === normal) || '';
    };
    const labels = ['Destroyed', 'Target hits', 'Citadel hits', 'Incapacitations', 'Set on fire', 'Caused flooding', 'Spotted', 'Aircraft shot down', 'Defended', 'Captured'];
    const used = new Set();
    for (const label of labels) {
        const matches = [];
        (Array.isArray(record.ribbons) ? record.ribbons : []).forEach((ribbon, index) => {
            if (canonical(ribbon.label || ribbon.name) === label) {
                matches.push(ribbon);
                used.add(index);
            }
        });
        lines.push(`- ${label}: ${matches.length ? matches.map((ribbon) => ribbon.count ? `×${ribbon.count}` : 'count not detected').join('; ') : 'Not detected'}`);
    }
    const ribbons = Array.isArray(record.ribbons) ? record.ribbons : [];
    const otherRibbons = ribbons.filter((ribbon, index) => !used.has(index));
    lines.push(`- Other ribbons: ${otherRibbons.length ? otherRibbons.map((ribbon) => `${ribbon.label || ribbon.name}${ribbon.count ? `: ×${ribbon.count}` : ': count not detected'}`).join('; ') : 'Not detected'}`);
    return lines.join('\n');
}

function numericValueOrNull(value) {
    if (value === null || value === undefined) return null;
    const source = String(value).trim();
    if (!source || source === NOT_DETECTED) return null;
    const digits = source.replace(/[\s,.'’]/g, '');
    if (!/^\d+$/.test(digits)) return null;
    const number = Number(digits);
    return Number.isSafeInteger(number) ? number : null;
}

function parseTierFromShip(ship) {
    const match = String(ship || '').trim().match(/^(XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/i);
    if (!match) return null;
    return ({ I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11 })[match[1].toUpperCase()] ?? null;
}

function makeTournamentExport(record, options = {}) {
    const valueOf = (key) => {
        const value = String(record?.[key] ?? '').trim();
        return value && value !== NOT_DETECTED ? value : null;
    };
    const player = valueOf('player');
    const ship = valueOf('ship');
    const damage = numericValueOrNull(record?.damage);
    const destroyedRibbon = (Array.isArray(record?.ribbons) ? record.ribbons : [])
        .find((ribbon) => String(ribbon?.label || ribbon?.name || '').trim().toLowerCase() === 'destroyed');
    const kills = numericValueOrNull(destroyedRibbon?.count);
    const battleIdentity = [
        player, ship, valueOf('result'), valueOf('map'), valueOf('mode'),
        valueOf('battleStart'), damage,
    ].map((value) => String(value ?? '')).join('|');
    const recordId = createHash('sha256').update(battleIdentity, 'utf8').digest('hex').slice(0, 24);
    const safeFileName = String(options.sourceFileName || '').replace(/[\r\n]/g, '').slice(0, 180) || null;
    const rawEvidence = options.sourceEvidence && typeof options.sourceEvidence === 'object'
        ? options.sourceEvidence : null;
    const sourceEvidence = rawEvidence ? {
        platform: ['discord', 'desktop'].includes(rawEvidence.platform) ? rawEvidence.platform : null,
        message_id: /^\d{5,30}$/.test(String(rawEvidence.messageId || '')) ? String(rawEvidence.messageId) : null,
        channel_id: /^\d{5,30}$/.test(String(rawEvidence.channelId || '')) ? String(rawEvidence.channelId) : null,
        message_url: /^https:\/\/discord\.com\/channels\/\d{5,30}\/\d{5,30}\/\d{5,30}$/.test(String(rawEvidence.messageUrl || ''))
            ? String(rawEvidence.messageUrl) : null,
        attachment_id: /^\d{5,30}$/.test(String(rawEvidence.attachmentId || '')) ? String(rawEvidence.attachmentId) : null,
        sha256: /^[a-f0-9]{64}$/i.test(String(rawEvidence.sha256 || '')) ? String(rawEvidence.sha256).toLowerCase() : null,
        size_bytes: Number.isSafeInteger(rawEvidence.sizeBytes) && rawEvidence.sizeBytes > 0 ? rawEvidence.sizeBytes : null,
        content_type: /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(String(rawEvidence.contentType || ''))
            ? String(rawEvidence.contentType).toLowerCase() : null,
        retrieved_at: typeof rawEvidence.retrievedAt === 'string' && !Number.isNaN(Date.parse(rawEvidence.retrievedAt))
            ? new Date(rawEvidence.retrievedAt).toISOString() : null,
    } : null;
    const exportedAt = options.exportedAt || new Date().toISOString();

    return {
        format: 'wows-yolo-tourney-battle',
        schema_version: 1,
        record_id: recordId,
        exported_at: exportedAt,
        source: {
            application: 'wows-ocr-bot',
            screenshot_filename: safeFileName,
            evidence: sourceEvidence,
        },
        verification: {
            required_fields_complete: getMissingRequiredFields(record).length === 0,
            required_fields: REQUIRED_MANUAL_FIELDS.map((field) => field.key),
            tournament_mapping_complete: false,
        },
        battle: {
            player_name: player,
            ship,
            result: valueOf('result'),
            result_description: valueOf('description'),
            map: valueOf('map'),
            mode: valueOf('mode'),
            battle_start_time: valueOf('battleStart'),
            rewards: {
                credits: numericValueOrNull(record?.credits),
                xp: numericValueOrNull(record?.xp),
                free_xp: numericValueOrNull(record?.freeXp),
            },
            metrics: {
                damage,
                // The Destroyed ribbon is the closest available per-battle kill count.
                // Leave it null when it was not read.
                kills,
                time: null,
            },
            ribbons: (Array.isArray(record?.ribbons) ? record.ribbons : []).map((ribbon) => ({
                label: String(ribbon?.label || ribbon?.name || '').trim() || null,
                count: numericValueOrNull(ribbon?.count),
            })),
        },
        tournament: {
            round: null,
            game_number: null,
            ship_class: null,
            tier: null,
            suggestions: { tier_from_ship_name: parseTierFromShip(ship) },
        },
    };
}

function makeCorrectionPrompt(fileName, record, missing, extraReason = '') {
    const safeName = String(fileName || 'uploaded image').replace(/[`\\]/g, '').slice(0, 120);
    const field = Array.isArray(missing) ? missing[0] : null;
    if (!field) return `✅ All required values are complete for \`${safeName}\`.`;

    const lines = [
        `⚠️ **${field.label} needed**`,
        `I couldn't confidently read **${field.label}** from \`${safeName}\`.`,
        '',
        `**What is the correct ${field.label}?**`,
        `Reply with the value only. ${field.hint}.`,
    ];
    if (extraReason) lines.push('', String(extraReason).replace(/[\r\n]+/g, ' ').slice(0, 180));
    lines.push('', 'Type `cancel correction` to cancel this screenshot.');
    return lines.join('\n');
}

module.exports = {
    NOT_DETECTED,
    REQUIRED_MANUAL_FIELDS,
    parseBattleResult,
    parseResultDescription,
    parseIdentityLine,
    parseModeMap,
    parseBattleStartTime,
    normalizeCorrections,
    buildBattleRecord,
    getMissingRequiredFields,
    applyCorrections,
    formatBattleRecord,
    makeTournamentExport,
    parseTierFromShip,
    makeCorrectionPrompt,
    normaliseNumber,
    numericValueOrNull,
    validPlayer,
};

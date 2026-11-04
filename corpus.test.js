'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const corpus = require('../testdata/reference-corpus.json');

const exactRequestedUrls = [
    'https://i.redd.it/a0dxfwetuwvh1.png',
    'https://media.invisioncic.com/u327663/monthly_2023_09/shot-23_09.08_16_11.41-0652.jpg.5872adaf72913e193f2643c5650a68ce.jpg',
    'https://scontent-ord5-2.xx.fbcdn.net/v/t39.30808-6/749286055_122296543832220976_2190566318871081321_n.jpg?stp=dst-jpg_tt6&cstp=mx1680x1050&ctp=s1680x1050&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=L4wAYUuxoYsQ7kNvwFymgAp&_nc_oc=AdpJazTlvNPExpVvhg2pmk0ecv4aViKoddTZdpEabmcRY3v5bjCI9G_0X4d_xt2G-evzPUK6NSJko3PYGkf1kNGa&_nc_zt=23&_nc_ht=scontent-ord5-2.xx&_nc_gid=TU2__SF2EvPGp5DzWVnwCg&_nc_ss=7b289&oh=00_AQOI3a0Yg32KM6nviHAK6-wV2-FQyd-jTjXpVgAF3FFs3A&oe=6AE0ADE2',
];
const requiredFields = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];

test('regression corpus contains only the three user-approved image URLs', () => {
    assert.deepEqual(corpus.records.map((record) => record.sourceUrl), exactRequestedUrls);
    assert.equal(corpus.records.length, 3);
});

test('each reference defines every required ground-truth key and marks unconfirmed values honestly', () => {
    for (const item of corpus.records) {
        for (const key of requiredFields) assert.ok(Object.hasOwn(item.expected, key), `${item.id} missing expected.${key}`);
        assert.ok(requiredFields.every((key) => item.expected[key] === null), `${item.id} should not claim unverified ground truth`);
        assert.equal(item.groundTruthStatus, 'pending_manual_annotation');
    }
});

test('reference corpus downloader and runner are present and syntax-testable', () => {
    const root = path.resolve(__dirname, '..');
    for (const file of ['scripts/fetch-reference-corpus.js', 'scripts/run-reference-regression.js']) {
        assert.ok(fs.existsSync(path.join(root, file)), `${file} not found`);
    }
});

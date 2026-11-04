'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectTargetChannelPermissions } = require('./src/discord-gateway-diagnostics');

const required = [
    { name: 'ViewChannel', flag: 1 },
    { name: 'SendMessages', flag: 2 },
    { name: 'AttachFiles', flag: 4 },
];

function channelWith(granted = [1, 2, 4]) {
    return {
        id: '123456789012345678',
        guildId: '234567890123456789',
        name: 'dwbot-test',
        isTextBased: () => true,
        send: async () => ({}),
        permissionsFor: () => ({ has: flag => granted.includes(flag) }),
    };
}

test('Discord preflight rejects an inaccessible or missing target channel', () => {
    const result = inspectTargetChannelPermissions(null, { id: 'bot' }, required);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'target-channel-not-found-or-not-accessible');
});

test('Discord preflight rejects non-guild and non-sendable channels', () => {
    const nonGuild = channelWith();
    delete nonGuild.guildId;
    assert.equal(inspectTargetChannelPermissions(nonGuild, {}, required).ok, false);

    const nonSendable = channelWith();
    delete nonSendable.send;
    assert.equal(inspectTargetChannelPermissions(nonSendable, {}, required).ok, false);
});

test('Discord preflight rejects unresolved permission state', () => {
    const channel = channelWith();
    channel.permissionsFor = () => null;
    assert.equal(inspectTargetChannelPermissions(channel, {}, required).reason, 'bot-channel-permissions-could-not-be-resolved');
});

test('Discord preflight passes when all required channel permissions are present', () => {
    const result = inspectTargetChannelPermissions(channelWith(), { id: 'bot' }, required);
    assert.equal(result.ok, true);
    assert.equal(result.guildId, '234567890123456789');
    assert.deepEqual(result.missingPermissions, []);
});

test('Discord preflight identifies each missing required permission without guessing', () => {
    const result = inspectTargetChannelPermissions(channelWith([1]), { id: 'bot' }, required);
    assert.equal(result.ok, false);
    assert.deepEqual(result.missingPermissions, ['SendMessages', 'AttachFiles']);
});

test('Discord preflight fails closed when a required permission flag is undefined', () => {
    const result = inspectTargetChannelPermissions(channelWith(), { id: 'bot' }, [
        { name: 'UnknownPermission', flag: undefined },
    ]);
    assert.equal(result.ok, false);
    assert.deepEqual(result.missingPermissions, ['UnknownPermission']);
});


test('Discord preflight fails closed when the bot guild member is not resolved', () => {
    const channel = channelWith();
    channel.permissionsFor = () => {
        throw new Error('permissionsFor must not be called without a GuildMember');
    };
    const result = inspectTargetChannelPermissions(channel, null, required);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bot-guild-member-not-resolved');
});

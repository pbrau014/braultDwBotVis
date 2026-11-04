'use strict';

/**
 * Validate the one configured guild channel after the Discord Gateway reaches
 * ClientReady. This is intentionally a read-only permission check: it does not
 * send a test message, mutate guild settings, or expose credentials.
 */
function inspectTargetChannelPermissions(channel, botUser, requiredPermissions = []) {
    if (!channel) {
        return {
            ok: false,
            reason: 'target-channel-not-found-or-not-accessible',
            channelId: null,
            guildId: null,
            channelName: null,
            requiredPermissions: requiredPermissions.map(item => item.name),
            missingPermissions: [],
        };
    }

    if (typeof channel.isTextBased !== 'function' || !channel.isTextBased()
        || !channel.guildId || typeof channel.permissionsFor !== 'function'
        || typeof channel.send !== 'function') {
        return {
            ok: false,
            reason: 'target-channel-must-be-a-sendable-guild-text-channel',
            channelId: String(channel.id || ''),
            guildId: String(channel.guildId || ''),
            channelName: String(channel.name || ''),
            requiredPermissions: requiredPermissions.map(item => item.name),
            missingPermissions: [],
        };
    }

    if (!botUser) {
        return {
            ok: false,
            reason: 'bot-guild-member-not-resolved',
            channelId: String(channel.id || ''),
            guildId: String(channel.guildId || ''),
            channelName: String(channel.name || ''),
            requiredPermissions: requiredPermissions.map(item => item.name),
            missingPermissions: [],
        };
    }

    const permissions = channel.permissionsFor(botUser);
    if (!permissions || typeof permissions.has !== 'function') {
        return {
            ok: false,
            reason: 'bot-channel-permissions-could-not-be-resolved',
            channelId: String(channel.id || ''),
            guildId: String(channel.guildId || ''),
            channelName: String(channel.name || ''),
            requiredPermissions: requiredPermissions.map(item => item.name),
            missingPermissions: [],
        };
    }

    const missingPermissions = requiredPermissions
        .filter(item => item.flag === undefined || !permissions.has(item.flag))
        .map(item => item.name);

    return {
        ok: missingPermissions.length === 0,
        reason: missingPermissions.length ? 'missing-required-channel-permissions' : 'ready',
        channelId: String(channel.id || ''),
        guildId: String(channel.guildId || ''),
        channelName: String(channel.name || ''),
        requiredPermissions: requiredPermissions.map(item => item.name),
        missingPermissions,
    };
}

module.exports = { inspectTargetChannelPermissions };

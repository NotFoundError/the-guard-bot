'use strict';

// Utils
const { link } = require('../../utils/tg');
const { logError } = require('../../utils/log');

// Config
const { numberOfWarnsToBan } = require('../../config.json');

// Bot
const bot = require('../../bot');
const { replyOptions } = require('../../bot/options');

// DB
const { isAdmin, ban, getWarns, warn } = require('../../stores/user');

const warnHandler = async ({ message, chat, reply, me, state }) => {
	const { user } = state;
	if (!state.isAdmin) return null;

	const userToWarn = message.reply_to_message
		? message.reply_to_message.from
		: message.commandMention
			? message.commandMention
			: null;

	if (!userToWarn) {
		return reply('ℹ️ <b>Reply to a message or mention a user.</b>',
			replyOptions);
	}

	if (message.chat.type === 'private' || userToWarn.username === me) {
		return null;
	}

	const reason = message.text.split(' ').slice(1).join(' ').trim();

	if (await isAdmin(userToWarn)) {
		return reply('ℹ️ <b>Can\'t warn other admins.</b>', replyOptions);
	}

	if (reason.length === 0) {
		return reply('ℹ️ <b>Need a reason to warn.</b>', replyOptions);
	}

	await warn(userToWarn, reason);
	const warnCount = await getWarns(userToWarn);
	const promises = [
		bot.telegram.deleteMessage(chat.id, message.message_id)
	];

	if (message.reply_to_message) {
		promises.push(bot.telegram.deleteMessage(
			chat.id,
			message.reply_to_message.message_id));
	}

	if (warnCount.length < numberOfWarnsToBan) {
		promises.push(reply(
			`⚠️ ${link(user)} <b>warned</b> ${link(userToWarn)} ` +
			`<b>for:</b>\n\n ${reason} (${warnCount.length}/3)`,
			replyOptions));
	} else {
		promises.push(bot.telegram.kickChatMember(chat.id, userToWarn.id));
		promises.push(ban(userToWarn, 'Reached max number of warnings'));
		promises.push(reply(
			`🚫 ${link(user)} <b>banned</b> ${link(userToWarn)} ` +
			'<b>for:</b>\n\nReached max number of warnings ' +
			`(${warnCount.length}/3)\n\n`,
			replyOptions));
	}

	return Promise.all(promises).catch(logError);
};

module.exports = warnHandler;

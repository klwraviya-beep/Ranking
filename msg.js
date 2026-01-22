import { formatName, numberToJid } from './utils.js';
import { MESSAGES, OWNER_NUMBER, PREFIX } from './config.js';
import { handleRankingListener, handleRankingCommand, handleMyRankCommand } from './ranking.js';

const extractBody = m =>
  m.message?.conversation ??
  m.message?.extendedTextMessage?.text ??
  m.message?.imageMessage?.caption ??
  m.message?.videoMessage?.caption ??
  '';

const isMessageFromBot = m => {
  const text = extractBody(m);
  return /\b(bot|system)\b/i.test(text);
};

export const onGroupParticipantsUpdate = async ({ sock, update }) => {
  try {
    const { id: groupId, participants, action } = update;
    if (action === 'add') {
      const subject = (await sock.groupMetadata(groupId))?.subject || 'this group';
      for (const jid of participants) {
        let name = `@${jid.split('@')[0]}`;
        try {
          const contact = await sock.onWhatsApp(jid);
          if (contact?.[0]?.notify) {
            name = contact[0].notify;
          }
        } catch (err) {
          console.error('Error fetching contact info:', err);
        }
        const text = MESSAGES.welcome(formatName(name, jid), subject);
        await sock.sendMessage(groupId, { text }, { mentions: [jid] });
      }
    }
  } catch (e) {
    console.error('Welcome error:', e);
  }
};

export const onMessageReceived = async ({ sock, msg }) => {
  try {
    const isGroup = !!msg.key.remoteJid?.endsWith('@g.us');
    const senderId = msg.key.participant || msg.key.remoteJid;
    const finalId = senderId;

    const ignore = isMessageFromBot(msg);
    if (isGroup && !ignore) {
      await handleRankingListener({ msg, isGroup, finalId });
    }

    const body = extractBody(msg);
    if (!body || !body.startsWith(PREFIX)) return;

    const parts = body.slice(PREFIX.length).trim().split(/\s+/);
    const command = (parts.shift() || '').toLowerCase();
    const args = parts;

    if (['menu', 'help'].includes(command)) {
      await sock.sendMessage(msg.key.remoteJid, { text: MESSAGES.menu }, { quoted: msg });
    } else if (command === 'owner') {
      const ownerJid = numberToJid(OWNER_NUMBER);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: MESSAGES.owner, mentions: [ownerJid] },
        { quoted: msg }
      );
    } else if (['ranking', 'global', 'daily', 'weekly'].includes(command)) {
      const groupMetadata = isGroup ? await sock.groupMetadata(msg.key.remoteJid) : null;
      await handleRankingCommand({ sock, msg, args, command, groupMetadata });
    } else if (['rank', 'myrank'].includes(command)) {
      await handleMyRankCommand({ sock, msg, senderId: finalId });
    } else {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: `Unknown command: ${command}\nType ${PREFIX}menu` },
        { quoted: msg }
      );
    }
  } catch (e) {
    console.error('Message router error:', e);
  }
};
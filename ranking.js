import fs from 'fs';
import moment from 'moment-timezone';
import { RANKING_FOLDER, TIMEZONE, MESSAGES } from './config.js';
import { getDayKey, getWeekKey, jidToNumber } from './utils.js';

// In-memory cache: groupId -> { userId: stats }
export const rankingCache = {};
export const groupsToSave = new Set();

export const persistDirtyGroups = () => {
  for (const groupId of Array.from(groupsToSave)) {
    const filePath = `${RANKING_FOLDER}/${groupId}.json`;
    try {
      fs.writeFileSync(
        filePath,
        JSON.stringify(rankingCache[groupId] || {}, null, 2),
        'utf-8'
      );
      groupsToSave.delete(groupId);
    } catch (e) {
      console.error('Persist error:', e);
    }
  }
};

export const handleRankingListener = async ({ msg, isGroup, finalId }) => {
  if (!isGroup) return;
  try {
    const groupId = msg.key.remoteJid;
    const senderId = finalId;
    const filePath = `${RANKING_FOLDER}/${groupId}.json`;

    if (!rankingCache[groupId]) {
      if (fs.existsSync(filePath)) {
        try {
          rankingCache[groupId] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (err) {
          console.error('Failed to parse ranking file:', err);
          rankingCache[groupId] = {};
        }
      } else {
        rankingCache[groupId] = {};
      }
    }

    const rankDb = rankingCache[groupId];

    if (!rankDb[senderId]) {
      rankDb[senderId] = {
        global: 0,
        daily: { count: 0, dayKey: getDayKey() },
        weekly: { count: 0, weekKey: getWeekKey() }
      };
    }

    const userStats = rankDb[senderId];
    const currentDay = getDayKey();
    const currentWeek = getWeekKey();

    userStats.global = (userStats.global || 0) + 1;

    // Daily
    if (userStats.daily?.dayKey !== currentDay) {
      userStats.daily = { count: 1, dayKey: currentDay };
    } else {
      userStats.daily.count += 1;
    }

    // Weekly
    if (userStats.weekly?.weekKey !== currentWeek) {
      userStats.weekly = { count: 1, weekKey: currentWeek };
    } else {
      userStats.weekly.count += 1;
    }

    groupsToSave.add(groupId);
  } catch (e) {
    console.error('Error in Ranking Listener:', e);
  }
};

export const handleRankingCommand = async ({ sock, msg, args, command, groupMetadata }) => {
  const chatId = msg.key.remoteJid;
  const filePath = `${RANKING_FOLDER}/${chatId}.json`;

  if (!rankingCache[chatId]) {
    if (fs.existsSync(filePath)) {
      try {
        rankingCache[chatId] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (err) {
        console.error(`Corrupt ranking file for ${chatId}`, err);
        rankingCache[chatId] = {};
      }
    } else {
      return sock.sendMessage(chatId, { text: MESSAGES.noData }, { quoted: msg });
    }
  }

  const rankDb = rankingCache[chatId];

  let mode = 'global';
  const text = (args.join(' ') || '').toLowerCase();
  const cmd = command.toLowerCase();

  if (cmd.includes('daily') || text.includes('daily')) mode = 'daily';
  else if (cmd.includes('weekly') || text.includes('weekly')) mode = 'weekly';

  // Use the same key helpers for consistency
  const currentDay = getDayKey();   // moment().tz(TIMEZONE).format('YYYY-MM-DD')
  const currentWeek = getWeekKey(); // moment().tz(TIMEZONE).format('YYYY-WW')

  const sortedStats = Object.entries(rankDb)
    .map(([id, data]) => {
      let count = 0;
      if (mode === 'global') count = data.global || 0;
      else if (mode === 'daily') {
        if (data.daily && data.daily.dayKey === currentDay) count = data.daily.count;
      } else if (mode === 'weekly') {
        if (data.weekly && data.weekly.weekKey === currentWeek) count = data.weekly.count;
      }
      return { id, count };
    })
    .filter(u => u.count > 0)
    .sort((a, b) => b.count - a.count);

  if (sortedStats.length === 0) {
    return sock.sendMessage(chatId, { text: MESSAGES.noActive(mode) }, { quoted: msg });
  }

  const topList = sortedStats.slice(0, 15);
  let mentionText = `🏆 ${mode.toUpperCase()} CHAT RANKING\n`;
  mentionText += `Top active members in ${groupMetadata?.subject || 'this group'}\n\n`;

  const mentions = [];

  topList.forEach((user, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    mentions.push(user.id); // JID mention
    const cleanId = jidToNumber(user.id);
    mentionText += `${medal} @${cleanId} : ${user.count}\n`;
  });

  mentionText += `\n_Total active users: ${sortedStats.length}_`;

  await sock.sendMessage(chatId, { text: mentionText, mentions }, { quoted: msg });
};

export const handleMyRankCommand = async ({ sock, msg, senderId }) => {
  const chatId = msg.key.remoteJid;
  const filePath = `${RANKING_FOLDER}/${chatId}.json`;

  if (!rankingCache[chatId]) {
    if (fs.existsSync(filePath)) {
      try {
        rankingCache[chatId] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (err) {
        console.error('Failed to parse ranking file:', err);
        rankingCache[chatId] = {};
      }
    } else {
      return sock.sendMessage(chatId, { text: MESSAGES.noData }, { quoted: msg });
    }
  }
  const rankDb = rankingCache[chatId];

  const userStats = rankDb[senderId];
  if (!userStats) {
    return sock.sendMessage(chatId, { text: MESSAGES.notRanked }, { quoted: msg });
  }

  const sortedUsers = Object.entries(rankDb)
    .map(([id, data]) => ({ id, global: data.global || 0 }))
    .sort((a, b) => b.global - a.global);

  const myIndex = sortedUsers.findIndex(user => user.id === senderId);
  const myRank = myIndex + 1;
  const myCount = sortedUsers[myIndex]?.global || 0;

  const currentDay = getDayKey();
  const currentWeek = getWeekKey();

  const dailyCount = userStats.daily?.dayKey === currentDay ? userStats.daily.count : 0;
  const weeklyCount = userStats.weekly?.weekKey === currentWeek ? userStats.weekly.count : 0;

  let gapText = '';

  if (myIndex > 0) {
    const userAbove = sortedUsers[myIndex - 1];
    const diff = (userAbove.global - myCount) + 1; // msgs needed to overtake
    gapText += `🔼 Rank Up: Need ${diff} msgs to beat Top ${myRank - 1}\n`;
  } else {
    gapText += '👑 You are the Leader! Keep it up!\n';
  }

  if (myIndex < sortedUsers.length - 1) {
    const userBelow = sortedUsers[myIndex + 1];
    const lead = myCount - userBelow.global;
    const leadMsg = lead === 0 ? '⚠️ Tied!' : `${lead} msgs ahead`;
    gapText += `🔽 Safety: ${leadMsg} of Top ${myRank + 1}`;
  } else {
    gapText += '🔽 Bottom: You are at the last rank.';
  }

  let text = `👤 YOUR RANK PROFILE\n`;
  text += `Stats for @${jidToNumber(senderId)}\n\n`;

  let medal = '';
  if (myRank === 1) medal = '🥇 ';
  else if (myRank === 2) medal = '🥈 ';
  else if (myRank === 3) medal = '🥉 ';

  text += `${medal}🏆 Rank: #${myRank} (of ${sortedUsers.length})\n`;
  text += `🌐 Global: ${myCount} msgs\n`;
  text += `📅 Daily: ${dailyCount} msgs\n`;
  text += `🗓️ Weekly: ${weeklyCount} msgs\n\n`;

  text += `📊 Position Analysis:\n${gapText}`;

  await sock.sendMessage(chatId, { text, mentions: [senderId] }, { quoted: msg });
};
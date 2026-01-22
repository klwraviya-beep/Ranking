export const BOT_NAME = 'KLW Ranking';
export const OWNER_NUMBER = '94778430626'; // without +
export const TIMEZONE = 'Asia/Colombo';

export const DATA_FOLDER = 'data';
export const SESSION_FOLDER = `${DATA_FOLDER}/sessions`;
export const RANKING_FOLDER = `${DATA_FOLDER}/ranking`;

export const SAVE_INTERVAL_MS = 60 * 1000; // 1 minute
export const PREFIX = '.';

// Messages
export const MESSAGES = {
  welcome: (name, group) =>
    `👋 Welcome, ${name}! You’re now part of ${group}.\nType ${PREFIX}menu to see commands.`,

  menu: `📜 ${BOT_NAME} Menu
- ${PREFIX}menu — Show this menu
- ${PREFIX}owner — Show owner contact
- ${PREFIX}ranking — Show global rankings
- ${PREFIX}daily — Show today’s rankings
- ${PREFIX}weekly — Show this week’s rankings
- ${PREFIX}myrank — Show your rank profile`,

  owner: `👤 Owner: +${OWNER_NUMBER}\nYou can reach out for support.`,

  noData: '📊 No messaging data recorded for this group yet.',

  noActive: mode =>
    `📉 No active messages found for ${mode} ranking yet.`,

  notRanked:
    '📉 You haven’t sent any messages yet. Start chatting to get ranked!'
};
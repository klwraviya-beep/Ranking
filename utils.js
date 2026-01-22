import fs from 'fs';
import moment from 'moment-timezone';
import { TIMEZONE, DATA_FOLDER, RANKING_FOLDER, SESSION_FOLDER } from './config.js';

export const ensureDirs = () => {
  try {
    if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER, { recursive: true });
    if (!fs.existsSync(RANKING_FOLDER)) fs.mkdirSync(RANKING_FOLDER, { recursive: true });
    if (!fs.existsSync(SESSION_FOLDER)) fs.mkdirSync(SESSION_FOLDER, { recursive: true });
  } catch (err) {
    console.error('Directory creation error:', err);
  }
};

export const getDayKey = () => moment().tz(TIMEZONE).format('YYYY-MM-DD');
export const getWeekKey = () => moment().tz(TIMEZONE).format('YYYY-WW');

export const safeReadJson = path => {
  if (!fs.existsSync(path)) return null;
  try {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  } catch (err) {
    console.error(`Failed to read JSON from ${path}:`, err);
    return null;
  }
};

export const safeWriteJson = (path, obj) => {
  try {
    fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Failed to write JSON to ${path}:`, err);
    return false;
  }
};

export const jidToNumber = jid => (jid || '').split('@')[0];
export const numberToJid = num => `${num}@s.whatsapp.net`;

export const formatName = (userName, jid) => {
  const id = jidToNumber(jid);
  return userName || `@${id}`;
};
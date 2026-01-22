// index.js (Corrected Version)
import Pino from 'pino'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  makeWASocket,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'

import { ensureDirs } from './utils.js'
import { SESSION_FOLDER, SAVE_INTERVAL_MS, BOT_NAME } from './config.js'
import { onMessageReceived, onGroupParticipantsUpdate } from './msg.js'
import { persistDirtyGroups } from './ranking.js'

// Ensure required directories exist
ensureDirs()

const logger = Pino({ level: 'info' })
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let sock // reuse in pairing endpoints

async function start() {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: !process.env.PAIR_NUMBER, // If no pair number, show QR
    logger
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', update => {
    const { connection, lastDisconnect } = update
    // Only log essential connection updates
    if(connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401
        if(shouldReconnect) start()
    } else if (connection === 'open') {
      logger.info(`${BOT_NAME} connected.`)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue
      await onMessageReceived({ sock, msg })
    }
  })

  sock.ev.on('group-participants.update', async update => {
    await onGroupParticipantsUpdate({ sock, update })
  })

  setInterval(persistDirtyGroups, SAVE_INTERVAL_MS)

  // --- Web Server Setup ---
  const app = express()

  // Serve static HTML files
  app.use(express.static(path.join(__dirname, '/'))) 
  // Note: Changed to root so it finds main.html easily if it's in the root folder

  // HTML file එක ඉල්ලන endpoint එක (GET /code)
  app.get('/code', async (req, res) => {
    const number = req.query.number;
    if (!number) {
        return res.status(400).json({ code: "Enter Number!" });
    }
    if (!sock) {
        return res.status(500).json({ code: "Service Unavailable" });
    }

    try {
        // Pairing code එක ඉල්ලීම
        const code = await sock.requestPairingCode(number);
        res.json({ code: code });
    } catch (e) {
        logger.error(e);
        res.status(500).json({ code: "Error Generating Code" });
    }
  });

  // Default route
  app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'main.html'));
  });

  const port = process.env.PORT || 10000
  app.listen(port, () => logger.info(`HTTP server on :${port}`))
}

start().catch(err => {
  console.error('Fatal start error:', err)
})
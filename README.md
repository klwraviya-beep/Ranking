# KLW Ranking Bot

WhatsApp group ranking bot (global/daily/weekly), menu, welcome, owner info (+94778430626). Built on Baileys; deploy on Render. Includes HTML UI to generate/view pairing codes.

## Features
- Global/Daily/Weekly leaderboards
- Personal rank profile with gap analysis
- Welcome messages on member add
- Menu and owner info commands
- JSON storage per group, lazy-loaded
- Asia/Colombo timezone
- QR login or pairing code
- Web UI: `/public/index.html` to generate and view pairing codes

## Commands
- `.menu` — show menu
- `.owner` — owner info
- `.ranking` / `.global` — global leaderboard
- `.daily` — today’s leaderboard
- `.weekly` — this week’s leaderboard
- `.myrank` — your stats and gaps

## Setup
1. Node.js 18+.
2. Create folders: `mkdir -p data/ranking data/sessions`
3. `npm install`

### Local run (QR)
- `npm start`
- Scan QR in terminal.

### Pairing code
- Env var: `export PAIR_NUMBER=94778430626`
- CLI: `npm run pair` (prints code in terminal)
- Web UI:
  - Start service: `npm start`
  - Open `http://localhost:10000/` for status (keep-alive)
  - Open `http://localhost:10000/index.html`
  - Enter number (no `+`) and click “Generate”.

## Deploy on Render
1. Push repo to GitHub.
2. Create Render Web Service:
   - Build: `npm install`
   - Start: `npm start`
3. Optional env: `PAIR_NUMBER=94778430626` for auto code in logs.
4. Use the web UI at `/index.html` to generate pairing code anytime.

## Paths
- Sessions: `data/sessions/` (not committed)
- Rankings: `data/ranking/*.json` per group

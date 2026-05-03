# 🤖 AI CRM Pro v2.0

**Full-stack AI-powered CRM** — TypeScript + Node.js + Docker + MCP Native

## ✨ Features

| Feature | Description |
|---|---|
| 📊 Google Sheets | 2-way sync — read leads, write all results back |
| 📧 AI Email | Claude-generated personalized emails per lead |
| 📞 AI Calling | Bland AI auto-calls with AI-generated scripts |
| 📹 Call Recording | Auto-saved URL stored in Sheet |
| 🧠 AI Analysis | Claude scores each lead 0-100, analyzes intent |
| 🗓️ Google Meet | Auto-creates meet links for interested leads |
| 💬 WhatsApp | Twilio WhatsApp follow-up messages |
| 🔄 Follow-ups | Day 3, 7, 14 automatic follow-up sequence |
| 📡 Live Dashboard | Real-time Socket.IO dashboard |
| 🐳 Docker | One-command deployment |

## 🚀 Quick Start

```bash
git clone https://github.com/Khushnoorkm1/Ai-crm-agent-2.git
cd Ai-crm-agent-2
npm install
cp .env.example .env
# Fill in your API keys in .env
npm run dev
```

Open: **http://localhost:3000**

## 🔑 Required API Keys

1. **Anthropic** → [console.anthropic.com](https://console.anthropic.com) — `ANTHROPIC_API_KEY`
2. **Google OAuth** → Sheets API + Calendar API — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
3. **Gmail App Password** → Google Account → Security → App Passwords — `EMAIL_PASS`
4. **Bland AI** → [bland.ai](https://bland.ai) — `BLAND_API_KEY`
5. **Twilio** (optional) → [twilio.com](https://twilio.com) — WhatsApp messages

## 🔄 CRM Pipeline Flow

```
Google Sheet (50 leads)
        ↓
   AI Score (Claude 0-100)
        ↓
   Send Personalized Email
        ↓ (48h wait)
   AI Phone Call (Bland AI)
        ↓
   ├─ Interested? → Google Meet → Email + WhatsApp
   ├─ No Answer?  → Retry in 24h
   └─ Not Interested? → Mark DNC
        ↓
   Follow-ups: Day 3, 7, 14
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Dashboard stats |
| GET | `/api/leads` | All leads from Sheet |
| POST | `/api/pipeline/run` | Run full pipeline |
| POST | `/api/leads/:row/process` | Process single lead |
| POST | `/api/webhooks/call` | Bland AI webhook |

## 🐳 Docker

```bash
docker compose up -d
```

## 📁 Project Structure

```
src/
├── agents/
│   ├── aiAgent.ts         # Claude AI brain
│   └── orchestrator.ts    # Main pipeline
├── services/
│   ├── googleSheets.ts    # 2-way Sheet sync
│   ├── emailService.ts    # AI emails
│   ├── callService.ts     # Bland AI calls
│   ├── meetingService.ts  # Google Meet
│   └── whatsappService.ts # WhatsApp
├── routes/api.ts          # REST API
├── types/index.ts         # TypeScript types
└── server.ts              # Express server
public/index.html          # Live dashboard
```

---
Made with ❤️ using Claude AI
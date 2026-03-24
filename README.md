# OMEGA AI — Infinite Evolution Engine

> Self-improving AI assistant deployed on Vercel that continuously evolves through every interaction.

## Features

- **💬 AI Chat** — Powered by OpenAI GPT-4o-mini with a versioned, self-improving system prompt
- **🧬 Self-Evolution** — Trigger evolution manually or let the AI auto-evolve on a timer; each evolution rewrites and improves its own system prompt
- **📊 Evolution Dashboard** — Full history of every evolution: version, trigger, improvements, and performance scores
- **⭐ Feedback Loop** — Rate responses 1–10; scores are tracked and used to drive the next evolution cycle
- **🔄 Auto-Evolve Mode** — Toggle automatic evolution every 2 minutes

## Quick Start

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Local Development

```bash
# 1. Clone and install
npm install

# 2. Set your API key
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# 3. Run the dev server
npm run dev
# Open http://localhost:3000
```

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/spaja86/OMEGA-AI-za-Vercel-)

1. Click the button above, or import this repo in your [Vercel dashboard](https://vercel.com/new)
2. Add the environment variable `OPENAI_API_KEY` in Vercel project settings
3. Deploy — Vercel will build and host the app automatically

## How Evolution Works

```
User interacts → Feedback score recorded
      ↓
Evolution triggered (manual or auto)
      ↓
OMEGA AI analyzes its own system prompt
      ↓
GPT generates an improved prompt + changelog
      ↓
New version applied — AI responds better
      ↓
Repeat ∞
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Send a message, get an AI response |
| `POST` | `/api/evolve` | Trigger an evolution cycle |
| `GET`  | `/api/evolution-log` | Fetch full evolution history & current state |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | Your OpenAI API key |

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS 4**
- **OpenAI SDK 6**
- **Vercel** (deployment platform)


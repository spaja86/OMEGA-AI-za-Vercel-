# OMEGA AI – DIAJOLOGIJA

> **OMEGA AI** is a continuously-evolving AI assistant built on Vercel.  
> **DIAJOLOGIJA** is the conversational dialogue layer that powers it.

## Features

- 🗣️ **Streaming chat** – real-time token-by-token assistant responses via SSE
- 🧠 **Context memory** – last 20 messages assembled automatically per request
- 🔒 **Rate limiting** – 30 requests / minute per IP (in-memory, swap for Upstash in production)
- 🛡️ **Moderation** – optional OpenAI moderation endpoint integration
- 🏳️ **Fallback mode** – works without an API key (returns a demo response)
- 📊 **Feedback loop** – 👍 / 👎 per message for quality tracking
- 🚩 **Feature flags** – env-var driven, no deploy needed to toggle behaviour
- 🚀 **Vercel-ready** – `vercel.json` pre-configured, 60 s streaming function timeout

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# 3. Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | *(none)* | OpenAI key – omit to run in fallback mode |
| `DIAJOLOGIJA_STREAMING` | `true` | Enable SSE streaming |
| `DIAJOLOGIJA_MODERATION` | `false` | Enable input moderation |
| `DIAJOLOGIJA_MODEL_SELECTOR` | `false` | Show model picker in UI |
| `DIAJOLOGIJA_USAGE_LOGGING` | `true` | Log token usage server-side |

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/conversations` | Create a new conversation |
| `GET` | `/api/conversations` | List all conversations |
| `GET` | `/api/conversations/:id` | Get full conversation |
| `DELETE` | `/api/conversations/:id` | Delete conversation |
| `POST` | `/api/conversations/:id/messages` | Send a message (SSE stream) |
| `POST` | `/api/conversations/:id/feedback` | Submit 👍/👎 feedback |

## Architecture

```
src/
  app/
    api/conversations/          ← REST + SSE API routes
  components/
    DiajologijaPage.tsx         ← Root chat UI (client component)
    MessageList.tsx             ← Message bubbles + feedback
    ChatInput.tsx               ← Textarea + send/stop
  hooks/
    useChat.ts                  ← Client-side state + streaming logic
  lib/
    types.ts                    ← Domain model (Conversation, Message …)
    store.ts                    ← In-memory store (swap for DB)
    orchestration.ts            ← OpenAI provider abstraction + streaming
    flags.ts                    ← Feature flags
    safety.ts                   ← Rate limiting + moderation helpers
```

## Deploying to Vercel

```bash
npx vercel --prod
```

Set `OPENAI_API_KEY` (and optional flags) in **Project Settings → Environment Variables**.

## Roadmap

- [ ] Persistent storage (Vercel Postgres / Upstash Redis)
- [ ] Authentication (NextAuth / Clerk)
- [ ] Multi-model selector (GPT-4o, Claude, Gemini)
- [ ] Conversation export (JSON / Markdown)
- [ ] Long-term memory (RAG over past conversations)
- [ ] A/B prompt experimentation framework
- [ ] Analytics dashboard


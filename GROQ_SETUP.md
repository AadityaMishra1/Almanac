# Groq API Setup Guide

## Overview

Almanac has been migrated from Anthropic Claude to **Groq's Llama-3-Groq-70B-Tool-Use** model, which is:

- ✅ **Completely free** (no credit card required)
- ✅ **#1 on Berkeley Function Calling Leaderboard** (beats GPT-4 and Claude 3.5 Sonnet)
- ✅ **Fastest inference** in the industry
- ✅ **Purpose-built for tool calling** (critical for calendar event operations)

## Quick Setup (5 minutes)

### 1. Get Your Free API Key

1. Visit [https://console.groq.com](https://console.groq.com)
2. Sign up with GitHub, Google, or email (no credit card required)
3. Navigate to **API Keys** in the dashboard
4. Click **Create API Key**
5. Copy your new API key (starts with `gsk_...`)

### 2. Add to Your Environment

Add the key to your `.env.local` file:

```bash
GROQ_API_KEY=gsk_your_api_key_here
```

### 3. Restart Your Dev Server

```bash
npm run dev
```

## Free Tier Limits

- **Requests:** ~1,000 requests per day
- **Tokens:** ~500,000 tokens per day
- **Rate Limit:** Generous for personal/dev use
- **Upgrade:** Free to upgrade to Developer Tier (10x limits) if needed

## Available Models

The chat route is configured to use **`llama-3-groq-70b-tool-use`** by default.

Alternative models you can try (edit `app/api/chat/route.ts`):

| Model | Best For | Speed |
|-------|----------|-------|
| `llama-3-groq-70b-tool-use` | Tool calling, event operations (recommended) | Fast |
| `llama-3.1-70b-versatile` | General chat, good tool support | Fast |
| `llama-3-groq-8b-tool-use` | Lower latency, faster responses | Very Fast |

## Verification

After setup, test the chat:

1. Navigate to `/calendar`
2. Click the chat bubble (bottom-right)
3. Type: "What events do I have this week?"
4. You should see a streaming response from Groq

## Troubleshooting

**"GROQ_API_KEY is not configured" error:**
- Ensure `.env.local` has `GROQ_API_KEY=gsk_...`
- Restart your dev server after adding the key
- Check for typos in the variable name

**Rate limit errors (429):**
- You've hit the free tier daily limit
- Wait 24 hours or upgrade to Developer Tier
- Consider using the 8B model for lower token usage

**Tool calling not working:**
- Ensure you're using `llama-3-groq-70b-tool-use` model
- This model is specifically trained for function calling
- Check console for API errors

## Why Groq?

Groq was chosen after comprehensive research of free AI APIs with tool calling support:

1. **Superior Tool Calling**: #1 on Berkeley Function Calling Leaderboard (88.5 score)
2. **Free & Generous**: No credit card, 500K tokens/day
3. **Fast**: Industry-leading inference speed (great for chat UX)
4. **Production Ready**: Used by major companies, reliable uptime
5. **Perfect Integration**: Official Vercel AI SDK support

## Cost Comparison

| Provider | Cost | Free Tier | Tool Calling Quality |
|----------|------|-----------|---------------------|
| **Groq** | Free | 500K tokens/day | #1 (BFCL: 88.5) |
| Anthropic | $15/M tokens | None | Excellent |
| OpenAI | $15/M tokens | None | Very Good |
| DeepSeek | $0.28/M tokens | 5M tokens ($8 value) | Moderate |

## Support

- Groq Docs: https://console.groq.com/docs
- Groq Discord: https://groq.com/discord
- Vercel AI SDK + Groq: https://console.groq.com/docs/ai-sdk/

---

**Ready to test!** Once you've added your `GROQ_API_KEY`, proceed with the Phase 5 verification testing.

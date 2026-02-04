# DeepSeek V3 Setup Guide

## Overview

Almanac now uses **DeepSeek V3**, a leading Chinese AI model that:

- ✅ **Free 5M tokens** ($8.40 value) to start
- ✅ **Very cheap** ongoing: $0.28/M input, $0.42/M output (vs $15/M for Claude/GPT-4)
- ✅ **Competitive with GPT-4** on many benchmarks
- ✅ **Tool calling support** for event operations
- ✅ **Chinese company** (DeepSeek AI)

## Quick Setup (3 minutes)

### 1. Get Your Free API Key

1. Visit [https://platform.deepseek.com](https://platform.deepseek.com)
2. Sign up with email or phone
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy your new API key (starts with `sk-...`)
6. **Free 5M tokens** automatically credited to your account

### 2. Add to Your Environment

Add the key to your `.env.local` file:

```bash
DEEPSEEK_API_KEY=sk-your_api_key_here
```

### 3. Restart Your Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Pricing

| Tier | Input | Output | Notes |
|------|-------|--------|-------|
| **Free** | 5M tokens | 5M tokens | $8.40 value, no credit card |
| **Paid** | $0.28/M | $0.42/M | 50x cheaper than GPT-4 |

**Example costs for 1000 chat messages:**
- DeepSeek: ~$0.56
- GPT-4: ~$30
- Claude: ~$30

## Model Details

**Model:** `deepseek-chat` (DeepSeek V3)
- **Context:** 64K tokens
- **Tool Calling:** Supported
- **Streaming:** Supported
- **Languages:** English, Chinese, and 多语言

## Verification

After setup, test the chat:

1. Navigate to `/calendar`
2. Click the chat bubble (bottom-right)
3. Type: "What events do I have this week?"
4. You should see a streaming response from DeepSeek

## Troubleshooting

**"DEEPSEEK_API_KEY is not configured" error:**
- Ensure `.env.local` has `DEEPSEEK_API_KEY=sk-...`
- Restart your dev server after adding the key
- Check for typos in the variable name

**Rate limit errors:**
- Free tier has 5M tokens total
- Monitor usage in DeepSeek dashboard
- Upgrade to paid tier if needed (very cheap)

**Tool calling not working:**
- DeepSeek V3 supports OpenAI-compatible function calling
- Check console for API errors
- Verify model name is `deepseek-chat`

## Why DeepSeek?

After testing Groq (which had tool calling compatibility issues), DeepSeek was chosen because:

1. **Proven Tool Calling**: OpenAI-compatible API with documented function calling
2. **Generous Free Tier**: 5M tokens vs Groq's daily limits
3. **Chinese Model**: As requested by user
4. **Very Affordable**: 50x cheaper than Western models for ongoing use
5. **Good Performance**: Competitive with GPT-4 on many tasks

## API Documentation

- Platform: https://platform.deepseek.com
- API Docs: https://api-docs.deepseek.com
- Function Calling Guide: https://api-docs.deepseek.com/guides/function_calling
- Pricing: https://api-docs.deepseek.com/quick_start/pricing

## Alternative Models

If you want to try other models, edit `app/api/chat/route.ts`:

```typescript
// Current: DeepSeek V3
model: deepseek('deepseek-chat')

// Alternative: DeepSeek Coder (for code-heavy tasks)
model: deepseek('deepseek-coder')
```

---

**Ready to test!** Once you've added your `DEEPSEEK_API_KEY` and restarted the server, proceed with Phase 5 verification.

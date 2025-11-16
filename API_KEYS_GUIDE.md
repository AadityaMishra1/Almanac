# API Keys Setup Guide

This guide will walk you through getting all the free API keys you need.

## 1. Google Gemini API Key (FREE - AI Parsing)

**Cost**: Completely FREE with generous limits
- 15 requests per minute
- 1,500 requests per day
- 1 million requests per month

**Steps**:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Click **"Create API key in new project"** (or select existing project)
5. Copy the API key (starts with `AIza...`)
6. Paste it in `backend/.env`:
   ```
   GEMINI_API_KEY=AIzaSy...your_key_here
   ```

**That's it!** No credit card required, no billing setup.

---

## 2. Google OAuth Credentials (FREE - Calendar & Gmail Access)

**Cost**: FREE
**Purpose**: Let users connect their Google Calendar and Gmail

**Note**: You do NOT need Firebase for this. Direct Google OAuth is simpler.

### Step-by-Step:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a Project**
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Name: `AI-Calendar` (or whatever you like)
   - Click **"Create"**

3. **Enable Required APIs**
   - In the left sidebar, go to **"APIs & Services"** → **"Library"**
   - Search and enable these APIs (click each, then click "Enable"):
     - ✅ **Google Calendar API**
     - ✅ **Gmail API**

4. **Configure OAuth Consent Screen**
   - Go to **"APIs & Services"** → **"OAuth consent screen"**
   - Select **"External"** (for testing with any Google account)
   - Click **"Create"**

   **Fill in the form**:
   - **App name**: AI Calendar
   - **User support email**: Your email
   - **Developer contact**: Your email
   - Click **"Save and Continue"**

   **Add Scopes**:
   - Click **"Add or Remove Scopes"**
   - Search and add:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/gmail.readonly`
   - Click **"Update"** → **"Save and Continue"**

   **Add Test Users**:
   - Click **"Add Users"**
   - Add your Gmail address (and any friends who want to test)
   - Click **"Save and Continue"**

5. **Create OAuth Credentials**
   - Go to **"APIs & Services"** → **"Credentials"**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Application type: **"Web application"**
   - Name: `AI Calendar Web Client`

   **Authorized redirect URIs** - Add both:
   ```
   http://localhost:8000/api/v1/calendar/oauth/callback
   http://localhost:3000/api/auth/callback/google
   ```

   - Click **"Create"**

6. **Copy Your Credentials**
   - A popup shows your **Client ID** and **Client Secret**
   - Copy these to `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234efgh5678ijkl
   ```

---

## 3. Database Setup Options

### Option A: Supabase (Recommended - FREE)

**Cost**: FREE tier with generous limits
- 500 MB database
- Unlimited API requests
- Perfect for student projects

**Steps**:

1. Go to [Supabase](https://supabase.com/)
2. Sign up (free)
3. Create a new project
4. Go to **Settings** → **Database**
5. Copy the **Connection String** (URI format)
6. Paste in `backend/.env`:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Option B: Local PostgreSQL with Docker (Included)

**Cost**: FREE
**Already configured in docker-compose.yml!**

```bash
# Just run docker-compose and it sets up PostgreSQL for you
docker-compose up -d

# Use this in backend/.env:
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_calendar
```

### Option C: Local PostgreSQL Installation

```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Start PostgreSQL and create database
createdb ai_calendar

# Use in backend/.env:
DATABASE_URL=postgresql://localhost/ai_calendar
```

---

## 4. Other Configuration

### Secret Key (JWT)

Generate a random secret key:

```bash
# Generate a secure random key
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output to `backend/.env`:
```
SECRET_KEY=your_generated_key_here
```

### Redis

**Already included in docker-compose.yml!**

```bash
# Just use Docker Compose
docker-compose up -d

# Use in backend/.env:
REDIS_URL=redis://redis:6379/0
```

Or install locally:
```bash
# macOS: brew install redis
# Ubuntu: sudo apt install redis

# Use:
REDIS_URL=redis://localhost:6379/0
```

---

## Final backend/.env File

Your complete `backend/.env` should look like:

```bash
# App Settings
APP_NAME=AI Calendar
DEBUG=True

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]

# Database (choose one option from above)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_calendar

# Google Gemini API (FREE!)
GEMINI_API_KEY=AIzaSy...your_key_here
GEMINI_MODEL=gemini-1.5-flash

# Google OAuth
GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234efgh5678ijkl
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/calendar/oauth/callback

# Redis
REDIS_URL=redis://redis:6379/0

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# JWT
SECRET_KEY=your_generated_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

---

## Testing Your Setup

1. **Test Gemini API**:
   ```bash
   cd backend
   python -c "import google.generativeai as genai; genai.configure(api_key='YOUR_KEY'); print('✅ Gemini API works!')"
   ```

2. **Test Google OAuth**:
   - Start your app
   - Visit: http://localhost:8000/api/v1/calendar/oauth/authorize
   - Should redirect to Google login

3. **Test Database**:
   ```bash
   docker-compose exec backend python init_db.py
   # Should see "Database tables created successfully!"
   ```

---

## Cost Summary

| Service | Free Tier | Cost After Free Tier | What We Use |
|---------|-----------|---------------------|-------------|
| **Gemini API** | 1M requests/month | $0.00 (free only) | AI Parsing |
| **Google OAuth** | Unlimited | FREE | Calendar/Gmail |
| **Supabase** | 500 MB DB | $25/month (unlikely to hit) | Database |
| **Docker/Local** | FREE | FREE | Everything |

**Total monthly cost for typical student use: $0.00** 🎉

---

## Why No Firebase?

Firebase is great but overkill for this:
- **Firebase**: Auth + Database + Storage + Functions ($$$)
- **Our setup**: Just OAuth (FREE) + PostgreSQL (FREE)

Firebase adds complexity and cost when we only need:
1. Google OAuth → Direct Google Cloud Console (FREE, simpler)
2. Database → PostgreSQL/Supabase (FREE, better for relational data)

---

## Need Help?

- **Gemini Issues**: https://ai.google.dev/docs
- **Google OAuth Issues**: https://console.cloud.google.com/
- **Supabase Issues**: https://supabase.com/docs

All services have excellent free tiers and documentation!

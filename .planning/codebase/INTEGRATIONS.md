# External Integrations

**Analysis Date:** 2026-02-01

## APIs & External Services

**Google APIs:**
- Google Calendar API - Create all-day events from syllabus
  - SDK/Client: googleapis 156.0.0 (`lib/google.ts`)
  - Auth: OAuth 2.0 via next-auth
  - Implementation: `getCalendarClient()` creates authenticated calendar client
  - Scope: `https://www.googleapis.com/auth/calendar.events`

**LLM/AI Services:**
- Groq Cloud API - Extract events from syllabus text using LLM
  - Endpoint: `https://api.groq.com/openai/v1/chat/completions`
  - Auth: Bearer token via `GROQ_API_KEY` environment variable
  - Model: Configurable via `GROQ_MODEL` (default: llama-3.1-8b-instant)
  - Implementation: `lib/groq.ts` - `extractEventsFromSyllabusText()`
  - Uses: System and user prompts to extract calendar events as JSON

## Data Storage

**Databases:**
- None detected - Application is stateless
- Session state: JWT tokens stored in NextAuth session (client-side)
- No persistent database configured in current codebase

**File Storage:**
- Local filesystem only - PDF files uploaded to memory buffer
- No cloud storage (S3, GCS, etc.) detected
- File upload: `/app/api/parse/route.ts` accepts form-data with PDF file

**Caching:**
- None detected - No Redis or in-memory cache configured

## Authentication & Identity

**Auth Provider:**
- Google OAuth 2.0 via next-auth
  - Implementation: `lib/auth.ts` - NextAuth configuration
  - Provider: GoogleProvider from next-auth
  - Session Strategy: JWT (server-less, stateless)
  - Access Token Refresh: Automatic via `refreshGoogleAccessToken()` in `lib/google.ts`
  - Refresh logic: Checks token expiration and refreshes 60 seconds before expiry
  - Callback: `http://localhost:3000/api/auth/callback/google`
  - Route: `/app/api/auth/[...nextauth]/route.ts`

**Session Management:**
- JWT tokens stored in session object
- Access token passed in `session.accessToken`
- Error handling: Session includes `error` field for auth failures
- Token refresh: Automatic via `refreshGoogleAccessToken()` when tokens expire

## Monitoring & Observability

**Error Tracking:**
- None detected - No external error tracking service integrated

**Logs:**
- Console logging only - Standard Node.js/browser console
- Next.js server logs available at runtime

## CI/CD & Deployment

**Hosting:**
- Not specified - Application supports:
  - Vercel (native Next.js support)
  - Self-hosted Node.js
  - Docker containers (docker-compose.yml provided for legacy stack)

**CI Pipeline:**
- None detected in current codebase

**Docker:**
- Legacy docker-compose.yml references FastAPI backend, PostgreSQL, Redis, Celery
- Current focus is Next.js + Groq/Google integration (frontend-centric)

## Environment Configuration

**Required env vars:**
- `NEXTAUTH_URL` - Base URL for OAuth callback (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET` - Random string for JWT signing
- `GOOGLE_CLIENT_ID` - From Google Cloud Console OAuth Client
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console OAuth Client
- `GROQ_API_KEY` - API key from Groq (required for syllabus parsing)
- `GROQ_MODEL` - LLM model name (optional, defaults to llama-3.1-8b-instant)

**Secrets location:**
- `.env.local` - Local development (git-ignored)
- `.env.example` - Template with variable names (no values)
- Production: Environment variables set in deployment platform

## Webhooks & Callbacks

**Incoming:**
- `/api/auth/[...nextauth]/route.ts` - NextAuth OAuth callbacks
  - Google redirect URI: `/api/auth/callback/google`
  - Processes OAuth tokens and establishes session

**Outgoing:**
- Google Calendar API - Event creation only
- Groq API - Synchronous HTTP requests only (no webhooks)

## Data Flow

**Syllabus Parsing:**
1. User uploads PDF via `/api/parse/route.ts` (POST, multipart/form-data)
2. PDF parsed to text via pdf-parse library
3. Text sent to Groq API with extraction prompt
4. Groq returns JSON array of events (title, date, type, description)
5. Events validated and normalized with Zod schema
6. Events returned to client for review/editing

**Calendar Sync:**
1. User selects events in UI
2. `syncEventsToCalendar()` server action called from `app/server-actions/calendar.ts`
3. Retrieves authenticated session and Google access token
4. Creates authenticated Google Calendar client
5. Inserts each event as all-day event (start: date, end: date+1)
6. Returns success/error status to client

**Authentication Flow:**
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent screen
3. User grants calendar.events scope
4. Google redirects to `/api/auth/callback/google`
5. NextAuth extracts access_token and refresh_token
6. JWT stored with tokens and expiration time
7. On subsequent requests, token refreshed if expiring
8. Access token injected into Google Calendar API client

## API Integration Details

**Groq API:**
- Protocol: HTTPS REST/JSON
- Authentication: Bearer token in Authorization header
- Request format: OpenAI-compatible chat completions format
- Response: JSON with message content containing extracted events
- Prompt strategy: System role defines task, user role provides syllabus text

**Google Calendar API:**
- SDK: googleapis 156.0.0
- Authentication: OAuth 2.0 with automatic token refresh
- Operations: `calendar.events.insert()`
- Event format: All-day events with start/end dates
- Calendar: Always inserts to "primary" calendar

---

*Integration audit: 2026-02-01*

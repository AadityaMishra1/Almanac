# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Full-stack Next.js application with Client-Server separation

**Key Characteristics:**
- Next.js App Router with server-side rendering (SSR) for root layout and API routes
- Client components for interactive state management and UI updates
- Server actions for protected operations and session-dependent logic
- Authentication-gated external API integration (Google Calendar)
- Three-stage pipeline: PDF parsing → AI extraction → Calendar sync

## Layers

**Presentation Layer:**
- Purpose: Render UI and handle user interactions
- Location: `components/`, `app/page.tsx`, `app/layout.tsx`
- Contains: React components (client and server), UI primitives
- Depends on: Session/auth via `next-auth/react`, server actions, event types
- Used by: Root page, users via browser

**API/Route Layer:**
- Purpose: Handle HTTP requests and protocol-level concerns
- Location: `app/api/`
- Contains: Route handlers for parsing (`parse`) and authentication (`auth/[...nextauth]/`)
- Depends on: Business logic layer (PDF parsing, AI extraction, validation)
- Used by: Client-side fetch calls, NextAuth protocol handlers

**Server Actions Layer:**
- Purpose: Execute protected mutations on the server with session context
- Location: `app/server-actions/`
- Contains: `syncEventsToCalendar()` - validates events and inserts to Google Calendar
- Depends on: Auth layer (session tokens), Google API client
- Used by: Client components via async function calls

**Business Logic Layer:**
- Purpose: Core domain logic and external service integration
- Location: `lib/`
- Contains:
  - `events.ts`: Event schema definition and normalization
  - `auth.ts`: NextAuth configuration with Google OAuth and token refresh
  - `google.ts`: Google Calendar client and OAuth token refresh
  - `pdf.ts`: PDF text extraction
  - `groq.ts`: LLM prompt engineering and JSON parsing
  - `utils.ts`: Class name utilities
- Depends on: External SDKs (googleapis, next-auth, pdf-parse, groq API)
- Used by: API routes, server actions, presentation layer

**Type/Schema Layer:**
- Purpose: Runtime and compile-time type safety
- Location: `types/`, inline in `lib/events.ts`
- Contains: Zod schemas for event validation, TypeScript type definitions
- Depends on: Zod library
- Used by: All layers for data validation and type inference

## Data Flow

**Syllabus Parsing Pipeline:**

1. User uploads PDF via `UploadDropzone` (client component)
2. `SyllabusToCalendar` sends POST to `/api/parse` with FormData
3. `/api/parse` (API route):
   - Extracts file from FormData
   - Calls `parseSyllabusPdfToText()` to convert PDF → raw text
   - Calls `extractEventsFromSyllabusText()` to send text to Groq API
   - Calls `normalizeAndValidateEvents()` to validate and normalize response
   - Returns `{ events: SyllabusEvent[] }`
4. Client receives events, renders table with `EventsTable` for user review/edit
5. User selects events and clicks "Sync to Google Calendar"

**Calendar Sync Pipeline:**

1. `SyllabusToCalendar` calls server action `syncEventsToCalendar(selected)`
2. Server action:
   - Retrieves session from NextAuth
   - Validates accessToken exists
   - Validates each event with `SyllabusEventSchema`
   - Creates Google Calendar client with accessToken
   - Loops through events, calls `calendar.events.insert()` for each
   - Returns success or error result
3. Client receives result and displays success/error message

**State Management:**

- **Client Component State:** `SyllabusToCalendar` manages `rows`, `isParsing`, `isSyncing`, `error` with `useState`
- **Row State:** Extends `SyllabusEvent` with `selected: boolean` for checkboxes
- **Session State:** Provided by `SessionProvider` from NextAuth, accessed via `useSession()` hook
- **Authentication State:** JWT tokens managed by NextAuth (stored in secure session)

## Key Abstractions

**SyllabusEvent:**
- Purpose: Represent an extracted calendar event from syllabus text
- Examples: `lib/events.ts`, used in `components/events-table.tsx`, `app/server-actions/calendar.ts`
- Pattern: Zod schema for validation + TypeScript interface for type inference
- Fields: `title`, `date` (ISO format), `type`, `description` (optional)

**NextAuth Configuration:**
- Purpose: Manage Google OAuth authentication and token lifecycle
- Examples: `lib/auth.ts` exports `authOptions`
- Pattern: NextAuth with JWT strategy, callback-based token refresh
- Behavior: Automatically refreshes expired tokens, persists to session

**Google Calendar Client:**
- Purpose: Typed wrapper around googleapis calendar API
- Examples: `lib/google.ts` exports `getCalendarClient(accessToken)`
- Pattern: Factory function that returns configured `google.calendar` instance
- Use: Called in `app/server-actions/calendar.ts`

**Date Normalization:**
- Purpose: Convert human-readable dates from AI to ISO 8601
- Examples: `lib/events.ts` implements `coerceToIsoDate()`
- Pattern: Regex-based pattern matching with fallback to Date parsing
- Handles: YYYY-MM-DD, MM/DD, current year inference, month-day matching

## Entry Points

**Web Application:**
- Location: `app/page.tsx`
- Triggers: Browser request to `/`
- Responsibilities: Render main layout with `SyllabusToCalendar` component

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Every request through App Router
- Responsibilities: Set metadata, wrap with `Providers` (SessionProvider), load session server-side

**PDF Parsing API:**
- Location: `app/api/parse/route.ts`
- Triggers: POST request from client
- Responsibilities: Validate file, extract text, call Groq, validate response

**NextAuth Handler:**
- Location: `app/api/auth/[...nextauth]/route.ts`
- Triggers: OAuth callback and session requests
- Responsibilities: Route auth protocol to NextAuth handler

**Server Action:**
- Location: `app/server-actions/calendar.ts`
- Triggers: Called from `SyllabusToCalendar` client component
- Responsibilities: Validate session, validate events, insert to Google Calendar

## Error Handling

**Strategy:** Try-catch with user-friendly error messages returned to client

**Patterns:**

- **API Routes:** Catch errors, return NextResponse with error message and 500 status
  - Example: `app/api/parse/route.ts` wraps entire handler in try-catch

- **Server Actions:** Return discriminated union `{ ok: true } | { ok: false; error: string }`
  - Example: `syncEventsToCalendar()` never throws, always returns result object
  - Client checks `result.ok` before treating as success

- **Groq API Errors:** Nested error handling with JSON parsing fallback
  - Example: `groq.ts` tries to parse JSON, strips code fences, re-throws if still invalid

- **PDF Validation:** Validate file type and size before processing
  - Example: `app/api/parse/route.ts` checks `file.type` and extension

- **Date Parsing:** Graceful fallback - invalid dates returned as-is for user correction
  - Example: `coerceToIsoDate()` returns original string if parsing fails

- **Google API Errors:** Caught in server action, error message returned to client
  - No stack traces exposed to client

## Cross-Cutting Concerns

**Logging:** None - uses browser console.error implicitly via thrown errors

**Validation:**
- Zod schema-based validation at boundaries (input/output of API routes, server actions)
- Schema enforcement: `SyllabusEventSchema` in `lib/events.ts`
- Date format validation: ISO 8601 coercion in `coerceToIsoDate()`

**Authentication:**
- NextAuth JWT strategy with Google OAuth provider
- Token refresh via `refreshGoogleAccessToken()` in callbacks
- Access control: Server actions check `getServerSession()` before proceeding
- Scope: `https://www.googleapis.com/auth/calendar.events` for Calendar API

**Authorization:**
- Calendar sync gated by session existence and accessToken availability
- UI disabled state: "Sign in to sync" button message
- Server-side enforcement: `syncEventsToCalendar()` returns error if no token

---

*Architecture analysis: 2026-02-01*

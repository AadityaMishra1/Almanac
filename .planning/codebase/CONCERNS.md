# Codebase Concerns

**Analysis Date:** 2026-02-01

## Tech Debt

**Type Safety with `any` Casting:**
- Issue: Critical type coercion using `as any` in PDF parsing and event response handling without proper type guards
- Files: `lib/pdf.ts` (line 7), `lib/events.ts` (line 56)
- Impact: Silent type errors at runtime; impossible to catch payload shape issues from Groq or pdf-parse until code executes
- Fix approach: Define proper TypeScript interfaces for pdf-parse module output and use discriminated unions for Groq response shapes instead of raw type assertions

**Implicit Date Year Correction Logic:**
- Issue: Date coercion in `lib/events.ts` `coerceToIsoDate()` has implicit year-shifting behavior (lines 26, 43) that increases past dates to current year
- Files: `lib/events.ts` (lines 14-47)
- Impact: Silently changes syllabus dates without user awareness; ambiguous month/day dates (e.g., "4/5") could be interpreted incorrectly; edge case at year boundary
- Fix approach: Make year correction explicit in UI with user confirmation or provide separate "inferred dates" field that shows correction applied

**JSON Parsing Recovery Strategy Too Permissive:**
- Issue: `extractJsonCandidate()` in `lib/groq.ts` (lines 13-30) uses simple string searching for JSON delimiters which can match nested structures or partial JSON
- Files: `lib/groq.ts` (lines 13-30)
- Impact: Malformed nested JSON from LLM may be partially extracted; no validation that extracted substring is actually valid JSON until `safeParseJson()` is called
- Fix approach: Use proper JSON parsing with stack-based bracket counting or validate structure before extraction attempt

**Environment Variables Without Runtime Validation:**
- Issue: Critical env vars (`GROQ_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`) are checked at function call time, not at application startup
- Files: `lib/groq.ts` (line 45-46), `lib/google.ts` (lines 6-8), `lib/auth.ts` (lines 11-12)
- Impact: Application starts successfully but fails at first API call; hard to debug in production
- Fix approach: Create startup validation hook that checks all required env vars before Next.js server boots

**No File Size Validation on Upload:**
- Issue: Syllabus upload mentions "Max 10MB recommended" in UI (`components/upload-dropzone.tsx` line 84) but no server-side file size limit is enforced
- Files: `components/upload-dropzone.tsx`, `app/api/parse/route.ts`
- Impact: Large malformed PDFs could consume server resources; Groq API call with 100MB+ text payload would fail cryptically
- Fix approach: Add file size validation in `app/api/parse/route.ts` before parsing; set explicit limit (e.g., 20MB)

**Broad Error Catching Without Classification:**
- Issue: Multiple routes use generic `catch (e)` blocks that treat all errors the same way
- Files: `app/api/parse/route.ts` (line 28), `app/server-actions/calendar.ts` (line 49), `components/syllabus-to-calendar.tsx` (lines 33-34)
- Impact: Network errors, validation errors, and permission errors all produce generic error messages to user; harder to implement retry logic
- Fix approach: Create error classification utility to distinguish `NetworkError`, `ValidationError`, `AuthorizationError`, `NotFoundError` at catch sites

## Known Bugs

**EventsTable Component Key Anti-Pattern:**
- Symptoms: Row reordering, filtering, or duplicate event titles will cause React reconciliation failures; input state can be lost or mixed
- Files: `components/events-table.tsx` (line 30)
- Trigger: User uploads PDF with duplicate assignment names; table uses `key={`${row.title}-${row.date}-${idx}`}` combining title+date (which change on edit) with index
- Workaround: Use stable unique IDs from event parsing (currently events have no IDs until added to calendar)
- Fix approach: Assign unique UUID to each event during parsing in `lib/events.ts`; use only that UUID as React key

**Console Logs in Production:**
- Symptoms: Debugging information leaking to browser/server logs
- Files: Found 21 console.* calls across frontend components
- Trigger: Any operation that executes logged code paths
- Workaround: None - logs are persistent
- Fix approach: Replace with structured logging library; add environment-based log level filtering

**Google Token Refresh Without Expiration Check:**
- Symptoms: Stale access tokens passed to Calendar API causing 401 errors mid-sync
- Files: `lib/auth.ts` (lines 30-42)
- Trigger: User starts calendar sync > 1 hour after last token refresh; OAuth callback may not have set `expiresAt`
- Workaround: User signs out and back in to force token refresh
- Fix approach: Always recalculate expiration even for already-refreshed tokens; add explicit logging when token refresh is skipped

## Security Considerations

**API Key Exposure in Groq Requests:**
- Risk: `process.env.GROQ_API_KEY` sent in fetch Authorization header without rate limiting or request signing
- Files: `lib/groq.ts` (lines 61-75)
- Current mitigation: Running on Next.js server-side only (not exposed to browser)
- Recommendations:
  - Add request rate limiting (rate-limit by user, not global)
  - Consider API key rotation strategy documentation
  - Add request timeout (currently no timeout on fetch)

**OAuth Scope Overpermissioning:**
- Risk: Requesting `calendar.events` scope allows creating/modifying ALL events in user's calendar without granular resource-based access control
- Files: `lib/auth.ts` (line 5)
- Current mitigation: UI only creates events from parsed syllabi
- Recommendations:
  - Document scope limitations in README
  - Consider requesting read-only scope for initial implementation, add write scope only for sync
  - Add audit logging for which events are created

**Missing CSRF Protection on State Machine:**
- Risk: User A could theoretically trick User B into syncing their own syllabus to User B's calendar if sync is initiated with state from user A
- Files: `components/syllabus-to-calendar.tsx`, `app/server-actions/calendar.ts`
- Current mitigation: State held client-side in React; server validates session on each sync request
- Recommendations:
  - Add strict-same-site SameSite=Strict to session cookie
  - Verify POST request origin matches request.headers.origin

**No Input Sanitization Before Calendar Insert:**
- Risk: Malicious syllabus with event titles containing XSS payloads could be stored in Google Calendar
- Files: `app/server-actions/calendar.ts` (lines 37-46)
- Current mitigation: Google Calendar API escapes content server-side
- Recommendations:
  - Add explicit title/description length limits (Google Calendar has limits but fail silently)
  - Sanitize HTML-like patterns from titles before insert

## Performance Bottlenecks

**Synchronous PDF Text Extraction:**
- Problem: `parseSyllabusPdfToText()` is synchronous blocking operation on request thread
- Files: `lib/pdf.ts`
- Cause: pdf-parse library is CPU-bound; large PDFs (>50MB) will block request handler
- Improvement path:
  - Queue PDF parsing to background job (Celery from backend exists but unused in frontend app)
  - Add progress callback for user feedback
  - Set 30-second timeout on parse operation

**No Streaming for Large API Responses:**
- Problem: Entire Groq API response buffered in memory before JSON parsing
- Files: `lib/groq.ts` (line 82)
- Cause: Using `res.json()` instead of streaming parser
- Improvement path: Use streaming JSON parser for robustness with partial responses

**N+1 Calendar API Calls:**
- Problem: Each selected event creates individual `calendar.events.insert()` call sequentially (no batching)
- Files: `app/server-actions/calendar.ts` (lines 32-46)
- Cause: Google Calendar API doesn't support batch insert in current implementation
- Improvement path:
  - Implement batch endpoint if available in googleapis library
  - Show user progress during multi-event sync
  - Add parallel request limiting (max 5 concurrent requests)

**Missing Pagination in EventsTable:**
- Problem: No pagination on calendar event display; if user syncs 500+ events, entire table renders
- Files: `components/events-table.tsx`, `frontend/components/CalendarView.tsx`
- Cause: Virtual scrolling not implemented; all events loaded into React state
- Improvement path: Implement react-window or similar for virtualization; paginate API calls to backend

## Fragile Areas

**Date Parsing Heuristic Brittleness:**
- Files: `lib/events.ts` (lines 14-47)
- Why fragile: Multiple regex patterns and Date constructor parsing with different locale assumptions; edge cases with "1/2" (Jan 2 or Feb 1?); semester boundaries
- Safe modification: Add explicit test cases for edge cases (year boundaries, ambiguous dates, non-English month names); document locale assumptions
- Test coverage: No unit tests for `coerceToIsoDate()` - completely untested

**Groq LLM Output Variability:**
- Files: `lib/groq.ts` (lines 48-59 prompt design)
- Why fragile: Prompt tells LLM to "Return ONLY valid JSON" but LLM may still return markdown, truncation, or nested structures; temperature=0 helps but doesn't guarantee format
- Safe modification: Add schema validation with error recovery path (log rejected response for analysis); consider switching to JSON mode if Groq supports it
- Test coverage: No test cases for malformed Groq responses

**Token Expiry State Machine:**
- Files: `lib/auth.ts` (lines 23-42)
- Why fragile: Multiple branching paths for token refresh decision; unclear when `expiresAt` is undefined vs. 0; refresh logic in callback can silently fail
- Safe modification: Use explicit state enum (VALID | EXPIRED | REFRESHING) instead of optional timestamp comparisons; add integration test with fake time
- Test coverage: No tests for token refresh edge cases

**Missing Session Validation in Server Actions:**
- Files: `app/server-actions/calendar.ts` (lines 20-22)
- Why fragile: `getServerSession()` can return null; code returns error but doesn't log which step failed
- Safe modification: Create session middleware wrapper; validate session at route handler level before entering business logic
- Test coverage: No test for unauthorized sync attempt

## Dependencies at Risk

**pdf-parse Version Pinned Without Updates:**
- Risk: `pdf-parse@1.1.1` is stable but package has known memory leaks with large PDFs; no updates in 2+ years
- Impact: Out-of-memory crashes on production with PDFs >100MB
- Migration plan:
  - Monitor for community-maintained forks (pdfjs is heavy alternative)
  - Document known limitations in README
  - Consider switching to backend PDF processing (Python has better libraries)

**next-auth Callback Implicit Error Handling:**
- Risk: `refreshGoogleAccessToken()` in callback throws but doesn't have typed error boundary
- Impact: Callback failure doesn't properly propagate to user as authentication error
- Migration plan: Upgrade to next-auth v5 (currently v4) which has better callback error handling

**googleapis Client Deprecated Methods:**
- Risk: googleapis v156 may have deprecation warnings in newer Node versions
- Impact: Logs noise; API may break if Google changes implementation
- Migration plan: Monitor googleapis release notes; consider using @google-cloud/calendar if switching backends

## Missing Critical Features

**No Retry Logic for Transient Failures:**
- Problem: Single failed Groq API call fails entire upload; no retry or user-initiated retry button
- Blocks: Users with flaky networks; rate-limited Groq API calls
- Recommendation: Add exponential backoff retry (max 3 attempts) on Groq failures; show retry button to user

**No Duplicate Event Detection:**
- Problem: User can sync same syllabus twice to calendar, creating duplicate events
- Blocks: Users can't detect accidental double-syncs
- Recommendation: Hash event titles/dates before insert; check if similar event already exists in date range

**No Event Modification/Deletion:**
- Problem: Once synced to calendar, user can't remove events from almanac-created set without going to Google Calendar directly
- Blocks: Full workflow requires leaving app to fix mistakes
- Recommendation: Add "unlink from calendar" feature that stores Google event IDs

**No Offline Support:**
- Problem: Entire flow requires network access; no draft state persistence
- Blocks: Users on intermittent connections lose work
- Recommendation: Use service workers + IndexedDB for draft persistence

## Test Coverage Gaps

**No Unit Tests for Date Parsing:**
- What's not tested: `coerceToIsoDate()` function with ambiguous dates, semester boundaries, non-standard formats
- Files: `lib/events.ts` (lines 14-47)
- Risk: Silently wrong dates in production due to regex or Date constructor edge cases
- Priority: High - core functionality

**No Integration Tests for PDF → Groq → Calendar Flow:**
- What's not tested: End-to-end flow with real PDF file (even small test PDF); Groq response handling with various output formats
- Files: `app/api/parse/route.ts`, `lib/groq.ts`, `lib/events.ts`
- Risk: Entire feature could silently fail on deployment
- Priority: High - critical path

**No Error Scenario Tests:**
- What's not tested: Missing env vars, API timeouts, invalid PDF files, Groq API errors (rate limit, auth failure), Google Calendar API errors
- Files: All API integration points
- Risk: Error messages leaking implementation details; confusing user-facing errors
- Priority: Medium - user experience

**No Server Action Tests:**
- What's not tested: `syncEventsToCalendar()` with missing session, invalid event data, Google Calendar insert failures
- Files: `app/server-actions/calendar.ts`
- Risk: Calendar sync failures produce cryptic errors
- Priority: Medium - important feature

**No Component Unit Tests:**
- What's not tested: SyllabusToCalendar state management, EventsTable row updates, UploadDropzone drag/drop
- Files: `components/syllabus-to-calendar.tsx`, `components/events-table.tsx`, `components/upload-dropzone.tsx`
- Risk: UI regressions on refactoring
- Priority: Low - less critical than business logic

---

*Concerns audit: 2026-02-01*

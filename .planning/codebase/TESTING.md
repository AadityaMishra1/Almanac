# Testing Patterns

**Analysis Date:** 2026-02-01

## Test Framework

**Status:** Not configured

**Current state:**
- No test runner installed (Jest, Vitest, or similar not present in `package.json`)
- No test files found in codebase (no `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files)
- No test configuration files (jest.config.js, vitest.config.ts, etc.)

**npm scripts:** Only `dev`, `build`, `start`, and `lint` defined. No test script.

## Test File Organization

**Location:** Not applicable - testing not implemented

**Recommendation when adding tests:**
- Co-locate tests with source files or use parallel `__tests__` directories
- Adopt pattern used by Next.js community: `src/[feature]/__tests__/[feature].test.ts` or `src/[feature]/[feature].test.ts`

## Test Coverage

**Requirements:** None enforced

**Current coverage:** 0% - no tests written

## Testing Areas & Recommendations

Given the absence of tests, here are key areas that should be tested when test infrastructure is added:

### High-Priority Testing Areas

**1. PDF Parsing (`lib/pdf.ts`)**
- Currently untested async operation with external dependency (pdf-parse)
- Should test: empty file handling, valid PDF parsing, error cases
- Import tests: ensure pdf-parse module loads correctly in Node.js environment
- Currently has minimal error handling: `if (!buffer || buffer.length === 0)`

**2. Event Normalization & Validation (`lib/events.ts`)**
- Complex validation logic with Zod schemas
- Should test: valid events, invalid events, nested response handling, date coercion
- Date parsing function `coerceToIsoDate()` handles multiple formats and year inference
- Edge cases: ambiguous dates, missing components, past years
- Current implementation: no tests, relies on Zod schema validation

**3. AI Response Parsing (`lib/groq.ts`)**
- Multiple parsing attempts to extract JSON from LLM responses
- Should test: code-fenced JSON, bare JSON arrays/objects, malformed responses
- Helper functions: `stripCodeFences()`, `extractJsonCandidate()`, `safeParseJson()`
- Error handling: throws on invalid JSON with descriptive message
- Environment variable validation: requires `GROQ_API_KEY`

**4. Server Actions (`app/server-actions/calendar.ts`)**
- Authentication checks, schema validation, Google Calendar API calls
- Should test: missing auth token, invalid events, successful sync, API errors
- Returns typed result objects: success case and error case
- Current: relies on error handling pattern `e instanceof Error`

**5. API Routes (`app/api/parse/route.ts`)**
- File upload validation, PDF parsing, AI extraction, event normalization
- Should test: missing file, non-PDF file, empty PDF, successful parse, error propagation
- Currently validates file type twice (MIME and extension check)
- Chains multiple operations that can each fail

**6. Components (`components/*.tsx`)**
- User interaction testing: drag-drop, form changes, sync button
- State management: parsing state, syncing state, error state
- Conditional rendering based on auth/loading/error states
- Should test: `SyllabusToCalendar`, `EventsTable`, `UploadDropzone`, `AuthButton`

### Test Types by Category

**Unit Tests - Library Functions:**
```
lib/events.ts
- coerceToIsoDate() date format conversions
- normalizeAndValidateEvents() schema validation
- Zod schema validation edge cases

lib/groq.ts
- stripCodeFences() JSON cleaning
- extractJsonCandidate() JSON extraction
- safeParseJson() error handling

lib/google.ts
- refreshGoogleAccessToken() token refresh logic
- Error handling for missing env vars

lib/auth.ts
- JWT token manipulation
- Session callbacks
```

**Integration Tests - Server Operations:**
```
app/api/parse/route.ts
- Full PDF parsing pipeline
- File validation → PDF parsing → AI extraction → Event normalization

app/server-actions/calendar.ts
- Event validation → Google Calendar insertion
- Auth verification → batch event sync
```

**Component Tests - Client Rendering:**
```
components/SyllabusToCalendar.tsx
- File upload handling
- Loading states
- Error display
- Event table display and editing
- Sync button interaction

components/UploadDropzone.tsx
- Drag-and-drop interaction
- File selection
- Disabled state during upload

components/EventsTable.tsx
- Row rendering
- Field editing (title, date, type, description)
- Checkbox toggling for selection
```

## Framework Recommendations

When implementing testing, consider:

1. **For unit/integration tests:**
   - **Vitest** (recommended for Next.js): Fast, modern, similar to Jest but ESM-native
   - **Jest**: Industry standard, slightly slower, excellent documentation
   - Zod schema validation pairs well with unit tests of `lib/events.ts`

2. **For component/E2E tests:**
   - **React Testing Library**: Test components by user interaction, not implementation
   - **Playwright or Cypress**: End-to-end testing for full workflows (PDF upload → sync)

3. **For mocking:**
   - **vi.mock()** (Vitest) or **jest.mock()** for module mocking
   - Mock dependencies: Google Calendar API, Groq API, pdf-parse, fs operations
   - Consider **MSW** (Mock Service Worker) for HTTP mocking

## Current Code Testing Readiness

**Testability Score: Medium**

**Strengths:**
- Clear function interfaces with explicit types
- Separation of concerns: parsing, normalization, API integration are separate
- Error handling patterns are consistent (try/catch with typed returns)
- Zod schemas provide validation layer that's already testable

**Weaknesses:**
- Heavy reliance on environment variables (GROQ_API_KEY, GOOGLE_CLIENT_ID, etc.)
- External API dependencies (Groq, Google APIs) need mocking
- Some complex logic in single functions: `coerceToIsoDate()` handles 4+ date formats
- Async operations chained without explicit error boundaries in some paths

## Testing Strategy When Implemented

**Phase 1 - Unit Tests (High Priority):**
1. Library functions in `lib/` (events.ts, groq.ts, utils.ts)
2. Date parsing logic with edge cases
3. JSON extraction and parsing helpers

**Phase 2 - Integration Tests (Medium Priority):**
1. API route: POST /api/parse with mock PDF files
2. Server action: syncEventsToCalendar with mock auth
3. Full parsing pipeline: file → PDF → AI extraction → events

**Phase 3 - Component Tests (Medium Priority):**
1. SyllabusToCalendar state management
2. EventsTable user interactions
3. UploadDropzone drag-drop and file selection

**Phase 4 - E2E Tests (Lower Priority):**
1. Full workflow: upload PDF → review events → sync to calendar
2. Authentication flow integration
3. Error recovery scenarios

---

*Testing analysis: 2026-02-01*

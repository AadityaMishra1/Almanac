# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
almanac/
├── app/                        # Next.js App Router pages and API routes
│   ├── api/                    # HTTP API routes
│   │   ├── auth/               # NextAuth handler
│   │   └── parse/              # PDF parsing endpoint
│   ├── server-actions/         # Next.js server actions
│   │   └── calendar.ts         # Calendar sync mutation
│   ├── layout.tsx              # Root layout with session setup
│   ├── page.tsx                # Main page (home)
│   ├── providers.tsx           # SessionProvider wrapper
│   └── globals.css             # Global styles
├── components/                 # React components
│   ├── ui/                     # Primitive UI components (button, input, etc.)
│   ├── auth-button.tsx         # Sign in/out button
│   ├── events-table.tsx        # Editable events table
│   ├── syllabus-to-calendar.tsx # Main feature component
│   └── upload-dropzone.tsx     # PDF file uploader
├── lib/                        # Business logic and utilities
│   ├── auth.ts                 # NextAuth configuration
│   ├── events.ts               # Event schema and validation
│   ├── google.ts               # Google API clients
│   ├── groq.ts                 # LLM event extraction
│   ├── pdf.ts                  # PDF text extraction
│   └── utils.ts                # Class name utilities
├── types/                      # TypeScript type definitions
│   ├── next-auth.d.ts          # NextAuth session augmentation
│   └── pdf-parse.d.ts          # pdf-parse module types
├── frontend/                   # Legacy frontend (separate Next.js project)
├── backend/                    # Legacy backend (Python, not analyzed)
├── .next/                      # Build output (generated)
├── node_modules/               # Dependencies (generated)
├── .planning/                  # GSD planning documents
│   └── codebase/               # This directory
├── next.config.mjs             # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
├── tailwind.config.ts          # Tailwind CSS configuration
├── postcss.config.mjs          # PostCSS configuration
└── .env.local                  # Environment variables (local)
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router entry point for web application
- Contains: Pages, API routes, server actions, root layout
- Key files: `page.tsx` (home), `layout.tsx` (root), `globals.css` (styles)

**`app/api/`:**
- Purpose: HTTP API endpoints
- Contains: Route handlers using Next.js route handler syntax
- Key files: `parse/route.ts` (PDF parsing), `auth/[...nextauth]/route.ts` (OAuth)

**`app/server-actions/`:**
- Purpose: Server-side mutations called from client components
- Contains: Async functions marked with `"use server"`
- Key files: `calendar.ts` (insert events to Google Calendar)

**`components/`:**
- Purpose: React component library
- Contains: UI components and feature components
- Structure:
  - `ui/`: Headless, reusable primitives (button, input, table, etc.)
  - Root level: Feature components (auth, upload, events, sync)

**`components/ui/`:**
- Purpose: Primitive UI building blocks with minimal logic
- Contains: Styled components (Radix UI + Tailwind)
- Key pattern: All components are client components (`"use client"`)
- Examples: `button.tsx`, `card.tsx`, `input.tsx`, `table.tsx`, `checkbox.tsx`, `textarea.tsx`

**`lib/`:**
- Purpose: Business logic, domain models, and service integrations
- Contains: Schema definitions, API clients, utility functions
- Key files:
  - `auth.ts`: NextAuth config with OAuth flow
  - `events.ts`: Zod schemas for event validation
  - `google.ts`: Google Calendar API wrapper
  - `groq.ts`: LLM prompt and response parsing
  - `pdf.ts`: PDF text extraction
  - `utils.ts`: Shared utilities (cn for class names)

**`types/`:**
- Purpose: TypeScript type definitions and augmentations
- Contains: Module type definitions, interface extensions
- Key files:
  - `next-auth.d.ts`: Extends Session to include accessToken
  - `pdf-parse.d.ts`: Types for pdf-parse module

**`frontend/` and `backend/`:**
- Status: Legacy directories (separate projects)
- Not part of current active development

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Home page component, renders `SyllabusToCalendar`
- `app/layout.tsx`: Root layout, loads session server-side, wraps with SessionProvider
- `app/api/parse/route.ts`: POST `/api/parse` - PDF parsing endpoint
- `app/api/auth/[...nextauth]/route.ts`: NextAuth OAuth handler

**Configuration:**
- `tsconfig.json`: TypeScript settings, path aliases (`@/*` → `./`)
- `next.config.mjs`: Next.js runtime config
- `tailwind.config.ts`: Tailwind CSS settings
- `postcss.config.mjs`: PostCSS plugin setup
- `package.json`: Dependencies, dev scripts
- `.env.local`: Runtime environment variables (secrets)

**Core Logic:**
- `lib/auth.ts`: OAuth config, token refresh callbacks
- `lib/events.ts`: Event schema with Zod, date normalization
- `lib/google.ts`: Google Calendar client factory, token refresh
- `lib/groq.ts`: Groq API integration, JSON parsing
- `lib/pdf.ts`: PDF text extraction via pdf-parse

**Testing:**
- No test files detected in codebase

**Styling:**
- `app/globals.css`: Global styles and Tailwind directives
- Component styles: Inline via Tailwind className (no CSS modules)

## Naming Conventions

**Files:**

- **React Components:** `PascalCase.tsx` or `.jsx`
  - Examples: `SyllabusToCalendar.tsx`, `EventsTable.tsx`, `UploadDropzone.tsx`, `AuthButton.tsx`
  - Pattern: Filename matches exported component name

- **Utilities/Functions:** `camelCase.ts`
  - Examples: `events.ts`, `auth.ts`, `google.ts`, `groq.ts`, `pdf.ts`, `utils.ts`

- **API Routes:** `route.ts` in directory matching URL path
  - Examples: `app/api/parse/route.ts` → POST `/api/parse`
  - Examples: `app/api/auth/[...nextauth]/route.ts` → `/api/auth/*`

- **Server Actions:** `camelCase.ts` in `app/server-actions/`
  - Example: `calendar.ts` exports `syncEventsToCalendar()`

- **Type Definitions:** `PascalCase.d.ts` or `index.d.ts`
  - Examples: `next-auth.d.ts`, `pdf-parse.d.ts`

**Directories:**

- **Feature Directories:** `kebab-case`
  - Examples: `app/server-actions/`, `components/ui/`, `app/api/`

- **URL Route Segments:** `[brackets]` for dynamic segments
  - Examples: `[...nextauth]/`, `[courseId]/` (planned)

- **API Endpoints:** Path structure matches REST convention
  - Examples: `/api/parse`, `/api/auth`, `/api/courses/[courseId]`

**Functions:**

- **React Components:** Export as default or named export matching filename
  - Pattern: `export function SyllabusToCalendar() { ... }`

- **Business Logic:** Named exports for modularity
  - Examples:
    - `export const SyllabusEventSchema = z.object(...)`
    - `export function normalizeAndValidateEvents(input) { ... }`
    - `export async function syncEventsToCalendar(events) { ... }`

- **Async Functions:** Prefixed with verb
  - Examples: `extractEventsFromSyllabusText()`, `parseSyllabusPdfToText()`, `refreshGoogleAccessToken()`

**Variables:**

- **Component State:** camelCase with semantic names
  - Examples: `rows`, `isParsing`, `isSyncing`, `error`, `selectedCount`

- **Constants:** UPPER_SNAKE_CASE for module constants
  - Examples: `CALENDAR_SCOPE` in `lib/auth.ts`

- **Type Schemas:** PascalCase ending in "Schema"
  - Examples: `SyllabusEventSchema`, `SyllabusEventsResponseSchema`

**Types:**

- **Type Names:** PascalCase
  - Examples: `SyllabusEvent`, `Row`, `JWT`, `Session`

- **Type Inference:** Use `z.infer<typeof Schema>`
  - Example: `type SyllabusEvent = z.infer<typeof SyllabusEventSchema>`

- **Optional Fields:** Mark with `?` or use `.optional()`
  - Example: `description: z.string().optional().default("")`

## Where to Add New Code

**New Feature (e.g., "Add exam scheduling"):**
- Primary code: `lib/exams.ts` (domain logic), `components/exams.tsx` (UI)
- API endpoint: `app/api/exams/route.ts`
- Server action (if mutation): `app/server-actions/exams.ts`
- Types: Extend `types/exams.d.ts` or use Zod in `lib/exams.ts`

**New Component (e.g., "Add exam viewer modal"):**
- Implementation: `components/exam-viewer.tsx` (client component)
- Import in parent: `components/syllabus-to-calendar.tsx` or new feature component
- Style: Use Tailwind classes + `cn()` utility for dynamic classes
- Reuse: Use primitives from `components/ui/`

**New Utility Function:**
- Shared helpers: `lib/utils.ts` if general purpose
- Domain-specific: Create file in `lib/` (e.g., `lib/math.ts` for calculations)
- Import pattern: `import { functionName } from "@/lib/utils"` or `"@/lib/domain"`

**New API Endpoint (e.g., "POST /api/exams"):**
- File: Create `app/api/exams/route.ts`
- Pattern: Export `async function POST(request: Request)`
- Validation: Use Zod schema from `lib/`
- Response: `return NextResponse.json({ data })` or `NextResponse.json({ error }, { status })`
- Error handling: Wrap in try-catch, return 500 with error message

**New Server Action (e.g., "deleteEvent"):**
- File: `app/server-actions/calendar.ts` (add function to existing file)
- Pattern: `"use server"` directive at file top, `export async function deleteEvent(...)`
- Session: Call `getServerSession(authOptions)` to get auth context
- Response: Return result object `{ ok: true } | { ok: false; error: string }`

**New Page/Route:**
- File: `app/[route]/page.tsx` for static routes
- Pattern: `export default async function Page() { const session = await getServerSession(...); ... }`
- Layout: Update `app/layout.tsx` if sharing layout with other pages

**Tests (currently none detected):**
- Suggested pattern: `__tests__/` directory in each domain, or `.test.ts` / `.spec.ts` suffix
- Framework suggestion: Vitest (lightweight) or Jest (more established)

## Special Directories

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (in .gitignore)
- Contents: Compiled pages, API routes, static assets

**`.planning/`:**
- Purpose: GSD (Getting Stuff Done) planning documents
- Generated: Yes (by GSD commands)
- Committed: Yes
- Contents: Architecture, structure, conventions, testing, concerns analyses

**`node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (by npm install)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-02-01*

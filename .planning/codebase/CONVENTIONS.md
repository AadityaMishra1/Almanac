# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `AuthButton.tsx`, `SyllabusToCalendar.tsx`, `UploadDropzone.tsx`)
- Library/utilities: camelCase with `.ts` extension (e.g., `events.ts`, `groq.ts`, `auth.ts`)
- UI components: PascalCase in `components/ui/` folder (e.g., `button.tsx`, `card.tsx`, `input.tsx`)
- API routes: function name matches HTTP verb as handler (e.g., `export async function POST()`)
- Server actions: kebab-case file names, exported functions are camelCase (e.g., `server-actions/calendar.ts` exports `syncEventsToCalendar()`)

**Functions:**
- PascalCase for React components (e.g., `export function AuthButton()`, `export function SyllabusToCalendar()`)
- camelCase for helper functions and utilities (e.g., `normalizeAndValidateEvents()`, `syncEventsToCalendar()`, `extractEventsFromSyllabusText()`)
- camelCase for internal utility functions (e.g., `coerceToIsoDate()`, `stripCodeFences()`, `safeParseJson()`, `addDays()`)

**Variables:**
- camelCase for all variables and state (e.g., `const [rows, setRows]`, `const [isParsing, setIsParsing]`, `let accessToken`, `let year`)
- Boolean variables prefixed with `is` or has when appropriate (e.g., `isParsing`, `isSyncing`, `isBusy`, `isDragging`, `isPdf`)
- Event handler functions prefixed with `on` or `handle` (e.g., `onDragOver()`, `handlePdf()`, `onChange()`, `handleDroppedFiles()`)

**Types:**
- PascalCase for types and interfaces (e.g., `ButtonProps`, `SyllabusEvent`, `Row`)
- Type names describe what they represent without redundant "Type" suffix (e.g., `InputProps`, `GroqChatCompletionResponse`)
- Exported Zod schemas use PascalCase (e.g., `SyllabusEventSchema`, `SyllabusEventsResponseSchema`)

## Code Style

**Formatting:**
- No explicit formatter configured; using Next.js defaults
- Import statements organized with line breaks between groups
- Spread operator used for object spreading: `{...event, selected: true}`

**Linting:**
- ESLint with `eslint-config-next` (extends `next/core-web-vitals`)
- Config file: `.eslintrc.json` (minimal, inherits Next.js rules)
- Run command: `npm run lint` (via Next.js)
- No explicit rule customizations visible; using defaults

**Typescript:**
- Strict mode enabled: `"strict": true` in `tsconfig.json`
- `target: "ES2022"`
- Path aliases configured: `@/*` maps to root directory (`./*`)
- `resolveJsonModule: true` allows importing JSON
- `isolatedModules: true` enforces proper module boundaries

## Import Organization

**Order:**
1. React and built-in libraries (e.g., `import * as React from "react"`)
2. Third-party packages (e.g., `import { clsx } from "clsx"`, `import { google } from "googleapis"`)
3. Next.js specific imports (e.g., `import { NextResponse } from "next/server"`, `import { getServerSession } from "next-auth"`)
4. Local imports using `@/` alias (e.g., `import { Button } from "@/components/ui/button"`)
5. Type imports using `type` keyword (e.g., `import type { SyllabusEvent } from "@/lib/events"`)

**Examples from codebase:**
```typescript
// From app/page.tsx
import { AuthButton } from "@/components/auth-button";
import { SyllabusToCalendar } from "@/components/syllabus-to-calendar";

// From components/syllabus-to-calendar.tsx
import * as React from "react";
import { UploadDropzone } from "@/components/upload-dropzone";
import { EventsTable } from "@/components/events-table";
import type { SyllabusEvent } from "@/lib/events";
import { syncEventsToCalendar } from "@/app/server-actions/calendar";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

// From app/api/parse/route.ts
import { NextResponse } from "next/server";
import { parseSyllabusPdfToText } from "@/lib/pdf";
import { extractEventsFromSyllabusText } from "@/lib/groq";
import { normalizeAndValidateEvents } from "@/lib/events";
```

**Path Aliases:**
- `@/*` points to root directory - use this for all local imports

## Error Handling

**Patterns:**
- Try/catch blocks wrapping async operations in API routes and server actions
- Return typed result objects for controlled error states: `{ ok: true } | { ok: false; error: string }`
- Throw `Error` instances with descriptive messages in library functions
- Check for `instanceof Error` before accessing error message in catch blocks: `e instanceof Error ? e.message : "fallback message"`
- Explicit environment variable checks with fallback error messages: `if (!apiKey) throw new Error("Missing GROQ_API_KEY env var.")`
- JSON parsing wrapped with try/catch and fallback handling (see `safeParseJson()` in `lib/groq.ts`)

**Examples from codebase:**
```typescript
// From app/api/parse/route.ts
try {
  // ... operations
  return NextResponse.json({ events });
} catch (e) {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Failed to parse syllabus." },
    { status: 500 }
  );
}

// From app/server-actions/calendar.ts
async function syncEventsToCalendar(events: SyllabusEvent[]): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // ... operations
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Calendar insert failed." };
  }
}

// From lib/groq.ts - explicit env var check
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) throw new Error("Missing GROQ_API_KEY env var.");
```

## Logging

**Framework:** `console` (standard browser/Node.js console)

**Patterns:**
- Logging not extensively used in current codebase
- Comments preferred for explaining complex logic (see `lib/pdf.ts`: "Importing the internal parser avoids pdf-parse's debug test file loader in Next.js.")
- Error messages served directly to users via NextResponse or returned in result objects

## Comments

**When to Comment:**
- Used sparingly, only for non-obvious implementation details
- Single-line comments (`//`) used for brief explanations
- No JSDoc or TSDoc comments observed in this codebase

**Example from codebase:**
```typescript
// From lib/pdf.ts
// Importing the internal parser avoids pdf-parse's debug test file loader in Next.js.
const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
```

## Function Design

**Size:**
- Functions are kept concise, typically 10-40 lines
- Complex multi-step processes broken into helper functions (e.g., `stripCodeFences()`, `extractJsonCandidate()`, `safeParseJson()`)

**Parameters:**
- Single object parameter for components with multiple props: `{ onFile, isBusy }`
- Destructured parameters in function signatures for clarity
- Type annotations on all parameters in exported functions

**Return Values:**
- Explicit return types on function declarations: `async function syncEventsToCalendar(...): Promise<{ ok: true } | { ok: false; error: string }>`
- Components typically return JSX without explicit return type
- Server functions return typed objects for predictable error handling
- Async functions explicitly return Promise types

## Module Design

**Exports:**
- Named exports preferred (e.g., `export function AuthButton()`, `export const authOptions`)
- Type exports use `export type` or `export interface` (e.g., `export type SyllabusEvent = z.infer<typeof SyllabusEventSchema>`)
- Default exports used for page components in Next.js App Router (e.g., `export default function Page()`)

**Barrel Files:**
- Not used in current structure; each component/utility imported directly by path

**React Patterns:**
- Functional components with hooks (React.useState, useSession, etc.)
- Forward refs for UI components: `const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(...)`
- Display name assigned to forwardRef components: `Button.displayName = "Button"`
- "use client" pragma at top of files using client-side features
- "use server" pragma for server actions

**Examples:**
```typescript
// UI Component with forwardRef
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

// Client component
"use client";
export function AuthButton() {
  const { data: session } = useSession();
  // ...
}

// Server action
"use server";
export async function syncEventsToCalendar(events: SyllabusEvent[]) {
  // ...
}
```

---

*Convention analysis: 2026-02-01*

# Almanac

A calendar app for college students: upload a syllabus PDF, AI extracts deadlines/exams/assignments, sync to Google Calendar.

## Stack

- Next.js 15 (App Router), TypeScript strict, Tailwind CSS 3.4, shadcn/ui (Radix + CVA)
- Auth: NextAuth v4 (Google OAuth)
- DB: Prisma ORM (PostgreSQL via Supabase in prod)
- State: Zustand · Icons: Lucide React · Dates: date-fns
- AI: Gemini (syllabus/calendar parsing), Groq (chat)
- Calendar sync: Google Calendar API via googleapis
- PDF text extraction: `pdf-parse` npm package in `lib/pdf.ts`
- Python backend in `backend/` (Gemini + Groq multi-model parsing with fallback)

## Structure

```
app/                → Pages & API routes (App Router)
  api/parse/        → Syllabus upload + event extraction
  api/calendar/     → Calendar event endpoints
  dashboard/        → Calendar dashboard view
components/         → React components
  ui/               → shadcn primitives (button, card, input, table, checkbox, textarea)
  calendar/         → Calendar-specific components
  navigation.tsx    → Persistent nav header
frontend/           → Older components (still partially imported — e.g. Notifications)
lib/                → auth.ts, api.ts, store.ts, utils.ts, groq.ts, pdf.ts, google.ts
backend/            → Python AI parsing services (Gemini + Groq, multi-model fallback)
prisma/             → Schema & migrations
```

## Commands

```
npm run dev          # dev server
npm run build        # production build
npm run lint         # eslint
npx prisma studio    # DB GUI
npx prisma db push   # push schema
npx shadcn@latest add <component> --yes  # add UI primitives
```

## Code Rules

- Server Components by default; `"use client"` only when needed
- Path aliases: `@/components/`, `@/lib/`, `@/app/`
- No `any` types — define interfaces. Validate API input with Zod.
- All DB queries scoped by `userId` (multi-tenant)
- Named exports for components, default export only for page.tsx

## Frontend Design

**Design bar**: Notion, Linear, Cal.com, Apple Calendar. This should feel like a product by a YC startup with a dedicated design team — not a hackathon prototype. Every screen should look like something a student would screenshot and show friends.

You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates "AI slop." Avoid this. Focus on:

**Typography**: Import via `next/font/google` in layout.tsx. Never use Inter, Roboto, Arial, Open Sans, or system font stacks. Pick a characterful display font (e.g. Instrument Serif, Fraunces, Bricolage Grotesque, Cabinet Grotesk) paired with a clean sans body font. Extreme weight contrast: 200 vs 800, not 400 vs 600. Size jumps of 3x+.

**Color & Theme**: Use the brand palette in globals.css (warm amber `brand-*` tokens) and semantic `surface-*`, `border-*`, `text-*` CSS variables. One dominant accent with sharp contrast — not timid evenly-distributed palettes. Dark mode via `dark` class.

**Motion**: `transition-colors duration-150` minimum on every interactive element. Use: `animate-fade-in`, `animate-fade-in-up`, `animate-slide-in-bottom`, `animate-scale-in`. Stagger list reveals with `animation-delay`. One orchestrated page entrance > scattered micro-interactions.

**Surfaces & Depth**: Not flat white. Use `surface`, `surface-secondary`, `surface-tertiary` tokens for layering. Subtle borders, soft shadows, slight background tints. Cards should feel tangible. Think Notion's warm gray surfaces.

**Layout**: Reference Linear's density — information-rich without being cluttered. Generous whitespace in hero areas, compact in data views. Sidebar + main content pattern for dashboard. Responsive: mobile-first, `sm:` / `md:` / `lg:` breakpoints.

**Avoid**: Purple gradients on white, cookie-cutter centered-card layouts, bare spinners (use skeleton shimmer), unstyled HTML, walls of text, low-contrast disabled-looking UI, inconsistent border-radius (use `rounded-xl` containers, `rounded-lg` controls).

## Component Conventions

- Build on shadcn/ui primitives in `components/ui/`
- Accept `className` prop, merge with `cn()` from `lib/utils`
- Every interactive element: hover, focus-visible, active, disabled states
- Loading: skeleton shimmer. Empty states: illustration + helpful text. Errors: styled, not raw.
- Mobile-first responsive: start mobile, add `sm:`, `md:`, `lg:` breakpoints

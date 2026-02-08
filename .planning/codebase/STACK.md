# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- TypeScript 5.7.3 - All application code (frontend and API routes)
- JSX/TSX - React components and Next.js pages

**Secondary:**
- JavaScript - Configuration files and build setup

## Runtime

**Environment:**
- Node.js 20.19.5 - Primary runtime
- Next.js 15.1.0 - Full-stack framework (API routes, server-side rendering, static generation)

**Package Manager:**
- npm 10.8.2
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 15.1.0 - Full-stack React framework with API routes, server actions, and file-based routing
- React 19.0.0 - UI component library

**UI & Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Radix UI (@radix-ui/react-checkbox 1.3.2, @radix-ui/react-slot 1.2.3) - Unstyled, accessible component primitives
- lucide-react 0.542.0 - SVG icon library
- clsx 2.1.1 - Conditional CSS class composition
- tailwind-merge 2.6.0 - Merge Tailwind CSS classes without conflicts
- class-variance-authority 0.7.1 - CSS class variance pattern library

**Authentication:**
- next-auth 4.24.11 - Authentication framework for Next.js
- Google OAuth 2.0 - Via next-auth GoogleProvider

**APIs & Data Processing:**
- googleapis 156.0.0 - Official Google APIs client library
- pdf-parse 1.1.1 - PDF text extraction
- zod 3.25.76 - Schema validation and runtime type checking

## Key Dependencies

**Critical:**
- next-auth 4.24.11 - Handles Google OAuth authentication and JWT session management
- googleapis 156.0.0 - Integrates with Google Calendar API for event creation
- pdf-parse 1.1.1 - Extracts text from uploaded PDF syllabi
- zod 3.25.76 - Validates and coerces event data from AI responses

**UI Components:**
- @radix-ui/* - Accessible component primitives (checkbox, slot)
- lucide-react 0.542.0 - Icon rendering

**Utilities:**
- clsx 2.1.1 - CSS class conditionals
- tailwind-merge 2.6.0 - Smart Tailwind class merging
- class-variance-authority 0.7.1 - Component variant patterns

## Build & Dev Tools

**Build:**
- Next.js 15.1.0 - Built-in build system via `next build`
- TypeScript 5.7.3 - Type checking

**CSS Processing:**
- Tailwind CSS 3.4.17 - CSS generation and utility classes
- AutoPrefixer 10.4.20 - CSS vendor prefixes
- PostCSS 8.4.49 - CSS transformation pipeline

**Development & Linting:**
- ESLint 9.17.0 - JavaScript/TypeScript linter
- eslint-config-next 15.1.0 - Next.js recommended ESLint rules

**Type Definitions:**
- @types/node 22.13.1 - Node.js type definitions
- @types/react 19.0.8 - React type definitions
- @types/react-dom 19.0.3 - React DOM type definitions

## Configuration

**Environment:**
- `.env.local` - Local development environment variables (not committed, see `.env.example`)
- `NEXTAUTH_URL` - NextAuth configuration (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GROQ_API_KEY` - Groq API key for LLM
- `GROQ_MODEL` - LLM model selection (default: llama-3.1-8b-instant)

**Build Configuration:**
- `tsconfig.json` - TypeScript compiler options (ES2022 target, strict mode, path aliases)
- `next.config.mjs` - Next.js configuration with serverActions body size limit (10mb)
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration for Tailwind
- `.eslintrc*` - ESLint configuration (via eslint-config-next)

## Platform Requirements

**Development:**
- Node.js 20.19.5 or compatible
- npm 10.8.2 or compatible
- Git (for version control)
- Modern web browser supporting ES2022 JavaScript

**Production:**
- Node.js 20.x runtime environment
- 10MB+ request body limit support (configured in Next.js)
- HTTPS required for OAuth callback (Google Calendar API)
- Environment variables: NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GROQ_API_KEY

**Deployment Target:**
- Vercel (Next.js native support)
- Self-hosted Node.js server
- Containerized deployment (Docker compatible)

---

*Stack analysis: 2026-02-01*

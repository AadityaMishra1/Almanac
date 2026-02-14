---
description: Rules for API route handlers
globs: ["app/api/**/*.ts"]
---

# API Route Rules

- Use Next.js App Router route handlers (export async function GET/POST/etc.)
- Validate request bodies with Zod schemas
- Always check authentication via `getServerSession(authOptions)`
- Return proper HTTP status codes with JSON responses
- Use try/catch with meaningful error messages
- Never expose internal errors to clients — log them server-side, return generic 500
- Scope all database queries by `userId` for multi-tenancy

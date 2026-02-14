---
description: Rules for building frontend React components and pages
globs: ["components/**/*.tsx", "app/**/page.tsx", "app/**/layout.tsx"]
---

# Frontend Component Rules

When building or editing any frontend component or page, read the frontend-design skill at `~/.claude/plugins/cache/claude-plugins-official/frontend-design/2cd88e7947b7/skills/frontend-design/SKILL.md` for aesthetic inspiration. Then follow CLAUDE.md design standards.

## Before You Code

1. Check `components/ui/` for existing shadcn primitives
2. Check `components/` for patterns already in the codebase
3. Decide: does this need `"use client"`? Only if it uses hooks, event handlers, or browser APIs.

## Styling

- Tailwind utilities only — no inline styles, no CSS modules
- Use `cn()` from `lib/utils` for conditional/merged classes
- Brand colors: `brand-500` accent, `surface-*` backgrounds, `border-*` borders (defined as CSS vars)
- `rounded-xl` for cards/containers, `rounded-lg` for buttons/inputs — be consistent
- `transition-colors duration-150` minimum on every interactive element
- Hover, focus-visible, active, disabled states on everything clickable

## Quality Bar

- [ ] No bare/unstyled HTML elements
- [ ] Generous whitespace — nothing cramped
- [ ] Clear text hierarchy (size + weight contrast, not just color)
- [ ] Skeleton shimmer loading states (not spinners)
- [ ] Empty states with helpful messaging
- [ ] Error states that are styled and actionable
- [ ] Responsive: tested at 375px, 768px, 1024px mental model
- [ ] Animations: fade-in on mount, staggered list reveals, smooth transitions

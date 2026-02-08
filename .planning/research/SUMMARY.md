# Project Research Summary

**Project:** Almanac
**Domain:** Academic calendar management with AI-powered PDF extraction
**Researched:** 2026-02-01
**Confidence:** MEDIUM

## Executive Summary

Almanac is enhancing an existing Next.js 15 + React 19 application with four major capabilities: OCR/vision-based PDF extraction (for scanned syllabi), calendar UI components (month/week/day views), AI chatbot interface (for conversational event editing), and drag-and-drop interactions. The research reveals a clear technology direction favoring modern, AI-first approaches over traditional OCR, and identifies critical architectural patterns around maintaining source authority between Almanac-created and external calendar events.

The recommended approach leverages Claude 3.5 Sonnet Vision for document understanding (superior to traditional OCR), React Big Calendar for calendar UI (mature, customizable), Vercel AI SDK for chat (Next.js native with streaming support), and React Big Calendar's built-in drag-and-drop (with dnd-kit as fallback). The architecture follows a layered pattern with clear separation between presentation, application, integration, and data layers, with the critical insight that maintaining event source metadata (almanac vs external) is foundational to all features.

The key risks center on data accuracy and trust: OCR hallucinations can extract wrong dates, calendar rendering can hit performance death spirals with 200+ events, and Google Calendar sync conflicts can cause event duplication or data loss. Mitigation requires preview-before-sync UIs, validation against semester date bounds, performance budgets tested with realistic data volumes, and robust event ID mapping for idempotent sync operations. Mobile-first design is non-negotiable given that students primarily use phones.

## Key Findings

### Recommended Stack

The stack research identified vision APIs as superior to traditional OCR for mixed-content documents (text + tables + images). Claude 3.5 Sonnet Vision is recommended over GPT-4V for cost-effectiveness ($3 vs $10 per 1M tokens) and superior document understanding. The calendar UI space has two viable options (React Big Calendar vs FullCalendar), with React Big Calendar winning on cost (free vs $199-599/year) and bundle size (52KB vs 150KB). Vercel AI SDK is the clear choice for chat interfaces in Next.js projects, providing streaming support and `useChat()` hooks that eliminate boilerplate.

**Core technologies:**
- **Claude 3.5 Sonnet Vision**: Vision-based PDF extraction — handles scanned/mixed PDFs better than traditional OCR, extracts structured data in one pass
- **React Big Calendar**: Calendar component library — mature (8+ years), multiple views (month/week/day), customizable, DnD built-in
- **Vercel AI SDK**: AI chat framework — Next.js native, streaming responses, tool calling support, TypeScript-first
- **date-fns**: Date manipulation — lightweight, tree-shakeable, needed for React Big Calendar localizer
- **dnd-kit**: Drag-and-drop (if needed) — modern, accessible, React 19 compatible (React Big Calendar DnD may suffice)

**Supporting libraries:**
- pdf-lib, pdfjs-dist, canvas: PDF to image conversion for vision API
- sharp: Image optimization for API size limits
- react-markdown, remark-gfm: Markdown rendering in chat responses

**Bundle size impact:** ~135KB (gzipped) added across calendar + chat pages, server-side libraries (PDF processing, AI SDKs) don't affect client bundle.

### Expected Features

Students expect familiar calendar patterns (month/week/day views, event details, color coding) as table stakes — missing these makes the product feel incomplete. The true differentiators are domain-specific: PDF syllabus parsing (30 minutes → 2 minutes), AI chat for bulk operations ("move all exams by one week"), academic calendar awareness, and conflict detection (warning about two exams on same day).

**Must have (table stakes):**
- Month/week/day calendar views with standard interaction patterns
- Event click for details, create/edit/delete operations
- Mobile responsive layout (students use phones more than desktop)
- Color coding by course
- Google Calendar sync (students already live in Google Calendar)

**Should have (competitive differentiators):**
- PDF syllabus parsing (already in progress) — core value proposition
- AI chatbot for event editing — natural language beats manual dragging
- Academic calendar awareness — auto-fills semester dates, holidays
- Conflict detection — scan all events, warn about overlaps
- Bulk operations via chat — "delete all readings for finals week"

**Defer (v2+):**
- Drag-and-drop rescheduling — complex to implement, AI chat provides better UX for students ("move exam to Friday" faster than precise dragging on mobile)
- LMS integration (Moodle) — high complexity, unvalidated need
- Shared course calendars — privacy concerns, community verification needed
- Task management features — different product category (events = "when", tasks = "what")

**Anti-features (explicitly avoid):**
- Full calendar replacement — students use Google Calendar, sync model not replacement
- Manual CSV/Excel upload — defeats automation value prop
- Non-Google calendar integrations — spread effort thin, most students use Google
- Social/collaboration features — privacy concerns, unvalidated demand

### Architecture Approach

The architecture follows a layered pattern with clear component boundaries: presentation layer (calendar view + chat interface), application layer (event manager + AI assistant), integration layer (Google Calendar sync + AI service client), and data layer (event store with metadata). The critical design insight is maintaining source authority: events created by Almanac can be modified, external events from Google Calendar are read-only. This requires robust metadata tracking at the storage layer.

**Major components:**

1. **Event Manager (Application Service)** — Central orchestration for all event operations with permission enforcement. Checks `event.source === "almanac"` before allowing mutations. Prevents AI from modifying external events (breaks user expectations). Handles CRUD, validation, conflict detection, bulk operations.

2. **AI Assistant (Application Service)** — Intent-Action-Response pipeline for natural language processing. Parses user messages into structured commands, executes via Event Manager, generates responses. Requires calendar context injection (visible events, current date) to handle ambiguous references ("tomorrow", "that meeting"). Two-phase parsing: intent classification (cheap/fast), then parameter extraction.

3. **Calendar Sync Service (Integration Layer)** — Bidirectional synchronization with Google Calendar. Maintains mapping between local event IDs and Google Calendar event IDs for idempotent operations. Conflict resolution: Almanac events are local source of truth, external events follow Google Calendar. Incremental sync every 5 minutes using `updatedMin` parameter.

4. **Calendar View Component (Presentation)** — React Big Calendar wrapper displaying events with drag-and-drop. Visual distinction between Almanac events (editable) and external events (read-only). Performance considerations: virtual scrolling for 100+ events, memoization, lazy loading.

5. **Data Layer** — Local event store with metadata tracking. Recommended: file-based (JSON) for MVP, migrate to PostgreSQL for production. Schema includes critical metadata: `source` (almanac | google_calendar), `createdBy` (pdf_parser | ai_assistant | manual | external), `gcalId` (for sync mapping), `editable` (computed from source).

**Key patterns to follow:**
- Command pattern for event operations (encapsulate mutations, enable undo/logging)
- Repository pattern for data access (swap storage backends without changing business logic)
- Observer pattern for UI updates (components subscribe to event changes)
- Optimistic UI updates (update UI immediately, rollback on failure)
- Context injection for AI (include visible events and current date in prompts)

### Critical Pitfalls

The research identified 15 domain-specific pitfalls across critical/moderate/minor severity. The top 5 require architectural decisions in Phase 1 to avoid rewrites.

1. **OCR Hallucinations in Date Extraction** — Vision models confidently return wrong dates ("Feb 15" → "Feb 18", month/day order confusion). Silent data corruption leads to missed deadlines. Prevent with: multi-pass validation, date sanity checks against semester bounds, confidence thresholds, preview UI before sync, relative date anchoring to course start date.

2. **Calendar Rendering Performance Death Spiral** — 200+ events cause re-renders on every scroll, O(n²) overlap calculations, UI freezes on mobile. Prevent with: virtual scrolling, event aggregation ("+3 more" indicators), lazy loading per month, memoization, Web Workers for layout, load budgets tested with 500+ events.

3. **AI Date/Time Parsing Ambiguity Explosion** — "Assignment due Thursday Week 3" or "2/3 and 2/5" have multiple interpretations. LLMs make inconsistent guesses without context. Prevent with: context injection (course start/end dates, term type), structured output schema with confidence scores, ambiguity flagging, format learning (MM/DD vs DD/MM), validation rules, user correction feedback loops.

4. **Google Calendar Sync Conflict Hellscape** — Revised syllabus uploads create duplicate events. User edits in Google Calendar overwritten by app. No canonical source of truth. Prevent with: sync metadata storage (almanac_event_id → google_event_id mapping), idempotent sync operations, user-controlled sync modes, sync preview diffs, one-way sync initially (app → Google only), event ownership metadata, conflict detection flags.

5. **Mobile Responsiveness Afterthought** — Desktop-first design leads to unreadable month views on mobile, unusable date pickers, PDF upload failures on iOS Safari. 60% mobile traffic with 80% bounce rate. Prevent with: mobile-first design, real device testing (not just browser responsive mode), 44x44px touch targets, week view as mobile default, native file picker, viewport-aware CSS, 60fps performance budget on mid-tier Android.

## Implications for Roadmap

Based on research, the roadmap should sequence phases to establish foundational architecture (data layer + event manager) before building visible features. Performance and sync reliability must be addressed in Phase 1, not deferred to "polish" phases. Mobile design should drive UI decisions from the start.

### Suggested Phase Structure

**Phase 1: Foundation (Data Layer + Event Manager)**
- **Rationale:** All other components depend on proper event storage and permission enforcement. Getting source authority wrong forces rewrites. Must establish event schema, metadata tracking, and CRUD operations before building UI or AI features.
- **Delivers:** Event repository (file-based for MVP), Event Manager with permission checks (almanac vs external events), basic CRUD operations, event schema with critical metadata fields
- **Addresses:** Architecture foundation (prevents Pitfall #4: sync conflicts)
- **Avoids:** Technical debt from mixing source authority

**Phase 2: Calendar UI (React Big Calendar Integration)**
- **Rationale:** Primary UI for visualizing events. Validates Event Manager API design. Must address performance concerns (Pitfall #2) before launch, not as polish phase.
- **Delivers:** Calendar grid component (month/week/day views), event rendering with visual distinction (almanac vs external), event details modal, date navigation, mobile-responsive layout
- **Uses:** React Big Calendar, date-fns
- **Addresses:** Table stakes features (month/week/day views, event click, mobile responsive)
- **Avoids:** Performance death spiral (virtual scrolling, memoization, load budgets with 500+ events)

**Phase 3: Google Calendar Sync**
- **Rationale:** Enables real data integration. Must validate source tagging works correctly and sync is idempotent. Critical to establish event ID mapping before adding AI features that modify events.
- **Delivers:** Bidirectional sync with Google Calendar, source tagging (almanac vs google_calendar), event ID mapping for idempotent operations, incremental sync (poll every 5 minutes), conflict detection
- **Uses:** Existing Google Calendar API integration (lib/google.ts)
- **Addresses:** Differentiator (Google Calendar sync)
- **Avoids:** Event duplication and sync conflicts (Pitfall #4: metadata storage, idempotent sync, sync preview)

**Phase 4: Vision-Based PDF Extraction**
- **Rationale:** Extends existing PDF parsing to handle scanned/mixed PDFs. Builds on existing text-based extraction. Must include validation and preview UI to prevent date hallucinations (Pitfall #1).
- **Delivers:** Vision API integration (Claude 3.5 Sonnet), PDF to image conversion pipeline, mixed PDF detection (text vs scanned), preview UI with confidence scores, date validation against semester bounds
- **Uses:** Claude Vision API, pdf-lib, pdfjs-dist, sharp
- **Addresses:** Differentiator (OCR for scanned PDFs)
- **Avoids:** Date hallucinations (Pitfall #1: multi-pass validation, sanity checks, preview before sync)

**Phase 5: AI Chat Interface**
- **Rationale:** Depends on Event Manager, Calendar View, and Sync being stable. Chat must have access to full event database and calendar context. Complex feature requiring careful design.
- **Delivers:** Chat UI component, Vercel AI SDK integration, intent parsing (create/query/update/delete), command execution via Event Manager, calendar context injection, response streaming
- **Uses:** Vercel AI SDK, @ai-sdk/anthropic, react-markdown
- **Addresses:** Differentiator (AI chat for event editing, bulk operations)
- **Avoids:** Context overload (Pitfall #10: RAG for event retrieval, require disambiguation), date ambiguity (Pitfall #3: context injection with course dates)

**Phase 6: Drag-and-Drop (Enhanced UX)**
- **Rationale:** Polish feature, depends on solid event update flow. Can use React Big Calendar's built-in DnD initially, migrate to dnd-kit if more customization needed.
- **Delivers:** Drag-and-drop event rescheduling, permission checking before drop, optimistic updates, visual feedback for editable vs read-only events
- **Uses:** React Big Calendar DnD addon (or dnd-kit)
- **Addresses:** Nice-to-have UX enhancement
- **Avoids:** Accessibility issues (dnd-kit has built-in keyboard support)

**Phase 7: Polish & Advanced Features**
- **Rationale:** After core features stable, add power user capabilities and refinements.
- **Delivers:** Bulk event operations (select all, bulk delete/edit), academic calendar awareness, conflict detection warnings, smart event suggestions, study time auto-blocking
- **Uses:** Existing AI infrastructure
- **Addresses:** Secondary differentiators, usability improvements

### Phase Ordering Rationale

- **Data layer first:** Prevents rewrites from incorrect source authority handling. Event metadata schema must be right from the start.
- **Calendar UI before AI chat:** Chat depends on calendar context, validates Event Manager API, provides visual feedback for AI operations.
- **Sync before vision extraction:** Establishes source tagging patterns that vision extraction follows. Validates idempotent operations before adding more event creation flows.
- **Vision extraction before chat:** Chat can reference events from both text and scanned PDFs, validates preview UI patterns.
- **Drag-and-drop last:** Nice-to-have feature, AI chat may provide better UX for students anyway.

**Dependencies from research:**
- Calendar View requires Event Manager (query operations)
- AI Chat requires Calendar View (context sharing), Event Manager (execute operations), Sync (permission enforcement)
- Sync requires Event Manager (storage layer)
- Vision extraction requires preview UI (prevent hallucinations), validation logic (date sanity checks)

**Pitfall avoidance:**
- Phase 1 establishes source authority (prevents Pitfall #4: sync conflicts)
- Phase 2 addresses performance early (prevents Pitfall #2: performance death spiral)
- Phase 3 implements idempotent sync (prevents Pitfall #4: event duplication)
- Phase 4 adds validation and preview (prevents Pitfall #1: OCR hallucinations)
- Phase 5 includes context injection (prevents Pitfall #3: date ambiguity, Pitfall #10: context overload)
- All phases: mobile-first design (prevents Pitfall #5: mobile responsiveness afterthought)

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 4 (Vision Extraction):** Vision API performance on syllabus PDFs needs real-world benchmarking. Compare Claude 3.5 Sonnet vs GPT-4V accuracy. Test with various scan qualities, fonts, layouts. Measure cost per page, latency, confidence score calibration.

- **Phase 5 (AI Chat):** Chat context management patterns need investigation. How many messages to include in chat history (cost vs accuracy tradeoff). RAG patterns for event retrieval. Tool calling schemas for structured operations. Confirmation UX for destructive actions.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Data Layer):** File-based JSON storage or PostgreSQL patterns are well-documented. Event schema design is straightforward.

- **Phase 2 (Calendar UI):** React Big Calendar has extensive documentation, established patterns, large community. Calendar rendering is solved problem.

- **Phase 3 (Sync):** Google Calendar API is mature, well-documented. Incremental sync patterns are standard.

- **Phase 6 (Drag-and-Drop):** React Big Calendar DnD or dnd-kit both have comprehensive guides.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Technology choices based on training data from Jan 2025. Need to verify: library versions (npm), React 19 compatibility, pricing for Claude Vision API. Core recommendations (Vision > OCR, React Big Calendar, Vercel AI SDK) are sound but versions may have changed. |
| Features | MEDIUM | Table stakes and differentiators based on student workflow patterns and competitor analysis (Google Calendar, Notion Calendar, Coursicle). Anti-features based on common scope creep patterns. Would benefit from: NC State student surveys, validation that AI chat beats drag-and-drop UX, LMS integration demand assessment. |
| Architecture | HIGH | Component boundaries and patterns derived from codebase analysis (existing PDF parse pipeline, Google Calendar integration) + industry best practices. Layered architecture is appropriate for calendar apps with external integrations. Source authority pattern is critical insight validated by Pitfall #4. |
| Pitfalls | HIGH | Critical pitfalls (OCR hallucinations, performance, sync conflicts, date ambiguity, mobile) are well-founded based on codebase analysis + training data on calendar apps and document extraction. Prevention strategies are proven patterns. Moderate/minor pitfalls cover edge cases but don't require deep verification. |

**Overall confidence: MEDIUM**

High confidence in architecture patterns and pitfall identification. Medium confidence in specific technology versions and feature prioritization. Low confidence areas (vision API accuracy, chat context management) are flagged for Phase-specific research.

### Gaps to Address

**Technology verification gaps:**
- Library versions stated (e.g., `@anthropic-ai/sdk ^0.27.0`) are from Jan 2025 training data. Before installation, verify with `npm info <package> version` and check React 19 compatibility.
- Claude Vision API pricing and rate limits may have changed. Validate current costs before committing to vision approach.
- React Big Calendar React 19 compatibility needs testing (library claims support but real-world validation needed).

**Feature validation gaps:**
- Drag-and-drop rescheduling deferred to Phase 6 based on hypothesis that AI chat provides better mobile UX. Should A/B test during Phase 5 to validate.
- LMS integration (Moodle) demand is assumed low based on complexity. Survey NC State students to confirm.
- Shared course calendars privacy concerns may be overstated. Consider lightweight sharing (export iCal links) as middle ground.

**Architecture validation gaps:**
- File-based storage recommended for MVP (simple deployment), but scalability to 1000+ events per user needs testing. May hit file I/O limits earlier than expected.
- Incremental sync interval (5 minutes) is standard but aggressive. Monitor Google Calendar API quota usage in production.
- Event duplication detection by title/date is fragile. May need fuzzy matching (edit distance) for user-edited titles.

**How to handle during planning:**
- Phase 1: Choose file-based storage, but design repository interface to support PostgreSQL migration later.
- Phase 3: Implement conservative sync interval (10 minutes), add rate limiting, monitor quota.
- Phase 4: Budget time for vision API experimentation (compare Claude vs GPT-4V with real syllabi).
- Phase 5: Prototype chat context management separately before full integration.
- Throughout: Test with realistic data volumes (500+ events, 5+ courses) not demo data.

## Sources

### Primary (HIGH confidence)

**Codebase analysis:**
- `/Users/aadityamishra/Projects/almanac/app/api/parse/route.ts` — Existing two-phase parse pipeline (structure extraction, semantic classification)
- `/Users/aadityamishra/Projects/almanac/lib/events.ts` — Event schema, date parsing logic (coerceToIsoDate)
- `/Users/aadityamishra/Projects/almanac/lib/google.ts` — Google Calendar API integration patterns
- `/Users/aadityamishra/Projects/almanac/app/server-actions/calendar.ts` — Current sync implementation (one-way: Almanac → Google)
- `/Users/aadityamishra/Projects/almanac/components/syllabus-to-calendar.tsx` — Current UI patterns (table-based event review)

### Secondary (MEDIUM confidence)

**Training knowledge (January 2025):**
- Claude 3.5 Sonnet Vision capabilities, pricing, API patterns
- React Big Calendar vs FullCalendar comparison
- Vercel AI SDK streaming and tool calling patterns
- Google Calendar API sync best practices
- React calendar component performance patterns
- AI date parsing challenges (ambiguity, context requirements)
- Student calendar app competitors (Coursicle, MyHomework)

**Inferred from domain expertise:**
- Calendar app architecture patterns (layered, source authority)
- PDF/OCR pitfalls (hallucinations, confidence calibration)
- Mobile-first design requirements for student apps
- Sync conflict resolution strategies

### Tertiary (LOW confidence, needs validation)

**Assumptions requiring validation:**
- Vision API accuracy claims (need empirical testing with syllabi)
- React 19 compatibility of stated libraries (need real-world testing)
- Drag-and-drop vs AI chat UX preference (need user testing)
- LMS integration demand (need student surveys)
- Bundle size impact calculations (need actual builds)

**Verification methods:**
- Technology: `npm info`, library GitHub issues, React 19 compatibility matrices
- Performance: Lighthouse audits with 500+ events, mobile device testing
- Features: NC State student surveys, competitor analysis (updated 2026)
- Architecture: Load testing sync operations, file I/O benchmarks

---

*Research completed: 2026-02-01*
*Ready for roadmap: yes*

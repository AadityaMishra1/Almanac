# Almanac

## What This Is

Almanac is a calendar management app for college students that turns syllabus PDFs into organized calendars. Students upload their course syllabi, and Almanac extracts assignments, exams, and deadlines using AI, syncing them to Google Calendar. The app includes a built-in calendar view for managing these events and an AI chat assistant for making changes without manual editing.

## Core Value

Reliable PDF extraction that works across all syllabus formats (text, scanned images, Excel exports, mixed layouts) so students spend 2 minutes uploading instead of 30+ minutes manually entering dates.

## Requirements

### Validated

- ✓ User can upload PDF syllabus — existing
- ✓ User can authenticate with Google OAuth — existing
- ✓ System extracts events from PDF text using Groq — existing
- ✓ User can review extracted events in editable table — existing
- ✓ User can sync selected events to Google Calendar — existing
- ✓ Events sync as all-day entries to Google Calendar — existing

### Active

- [ ] PDF extraction handles scanned/image-based syllabi (OCR or vision model)
- [ ] PDF extraction handles Excel/spreadsheet-based syllabi
- [ ] PDF extraction handles mixed/complex formatting reliably
- [ ] User can view Almanac events in built-in calendar (month/week/day views)
- [ ] User can interact with AI chatbot to modify extracted events before syncing
- [ ] User can interact with AI chatbot to add/modify events after syncing
- [ ] AI chatbot can read full Google Calendar for context (detect conflicts)
- [ ] AI chatbot only modifies Almanac-created events, not external events
- [ ] User can drag-and-drop events to reschedule in calendar view
- [ ] User can click events to edit details inline
- [ ] App UI matches polish of Google Calendar/Notion (clean design, smooth animations)
- [ ] App works seamlessly on mobile devices

### Out of Scope

- Manual text input fallback — AI extraction must work, no copy-paste workarounds
- Multi-user collaboration — single-student use case only for v1
- Integration with other calendar services (Outlook, Apple Calendar) — Google Calendar only
- Standalone calendar replacement — still syncs to Google Calendar, not a full replacement yet
- Non-NCSU universities — building for NC State students initially

## Context

**Current state:**
- Next.js 15 + React 19 app with TypeScript
- Google OAuth authentication via next-auth
- PDF text extraction via pdf-parse library
- Event extraction via Groq (llama-3.1-8b-instant)
- Google Calendar API integration for event insertion
- Current UI is basic: upload dropzone + editable table + sync button

**Technical debt:**
- pdf-parse only handles text-based PDFs, fails on scanned images
- No OCR capability for image-based syllabi
- Date parsing has edge cases (ambiguous formats, year inference)
- JSON extraction from LLM responses is fragile
- No calendar view - just table editing
- No AI chat interface
- Limited error handling for extraction failures

**Target users:**
- College students at NC State University
- Building for scale: any student should be able to use it
- Students expect <2 minute upload-to-calendar workflow

## Constraints

- **Stack**: Next.js + React (existing), must stay TypeScript
- **Timeline**: Building for current semester use, need iterative improvements
- **Performance**: PDF parsing must be fast (<30 seconds for typical syllabus)
- **Accuracy**: 95%+ extraction accuracy target across diverse formats
- **Mobile**: Must work on phones, not just desktop

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Google Calendar sync | Students already use Google Calendar; don't force migration | — Pending |
| Built-in calendar shows Almanac-only events | Simplifies v1, avoids sync complexity with full Google Calendar | — Pending |
| AI chatbot for modifications | Faster than manual table editing, better UX than form fields | — Pending |
| NCSU focus initially | Validate with single university before expanding | — Pending |
| Vision model vs OCR for images | Need to evaluate: GPT-4V/Claude 3 vs Tesseract/Google Vision | — Pending |

---
*Last updated: 2026-02-01 after initialization*

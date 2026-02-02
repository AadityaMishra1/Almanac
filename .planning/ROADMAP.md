# Roadmap: Almanac

## Overview

This roadmap transforms Almanac from a basic text-based PDF parser into a comprehensive calendar management system that handles all syllabus formats (text, scanned, Excel), provides rich calendar UI (month/week/day views), and enables AI-powered event editing. The journey starts with establishing a robust data foundation that enforces source authority (Almanac vs external events), extends PDF extraction to handle scanned documents with OCR, builds a calendar interface for visualizing events, implements bidirectional Google Calendar sync, and culminates in an AI chat interface for natural language event management.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - Establish event storage with source authority and permission enforcement ✓
- [ ] **Phase 2: Enhanced PDF Extraction** - Extend parsing to handle scanned/image PDFs and spreadsheet layouts
- [ ] **Phase 3: Calendar UI** - Build month/week/day calendar views with mobile-responsive interface
- [ ] **Phase 4: Event Management & Sync** - Implement CRUD operations and bidirectional Google Calendar sync
- [ ] **Phase 5: AI Chat Interface** - Enable natural language event editing and bulk operations

## Phase Details

### Phase 1: Data Foundation
**Goal**: Establish local event storage with metadata tracking and permission enforcement that distinguishes Almanac-created events from external Google Calendar events

**Depends on**: Nothing (first phase)

**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04

**Success Criteria** (what must be TRUE):
  1. System can persist events locally with complete metadata (source, createdBy, editability)
  2. System can distinguish Almanac-created events from external Google Calendar events
  3. System enforces read-only permissions on external events (mutation attempts fail)
  4. Event schema includes all critical fields: title, date, time, type, course, source, editable flag

**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Set up Prisma ORM with Event/Course schemas and source authority tracking
- [x] 01-02-PLAN.md — Integrate Prisma Client, create type adapters, implement CRUD with permission enforcement
- [x] 01-03a-PLAN.md — Add database persistence to parse endpoint with simple course input field
- [x] 01-03b-PLAN.md — Update UI integration and sync to work with database-backed events

### Phase 2: Enhanced PDF Extraction
**Goal**: Extend existing PDF parser to handle scanned/image-based syllabi and Excel/spreadsheet layouts with validation and confidence scoring

**Depends on**: Phase 1 (requires event storage to save extracted events)

**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05

**Success Criteria** (what must be TRUE):
  1. User can upload scanned/image-based PDF and system extracts events using OCR
  2. User can upload Excel/spreadsheet-based PDF and system extracts tabular event data
  3. System auto-categorizes each event as exam/quiz/assignment/reading with confidence score
  4. User sees extraction preview showing all events with confidence scores before syncing
  5. User can manually correct misidentified dates or event types in preview table

**Plans**: 5 plans

Plans:
- [ ] 02-01-PLAN.md — Build OCR extraction pipeline with PDF type detection and Tesseract.js
- [ ] 02-02-PLAN.md — TDD: Confidence scoring with semester date validation and enhanced LLM extraction
- [ ] 02-03-PLAN.md — Wire enhanced extraction + table extraction into parse route
- [ ] 02-04-PLAN.md — Build preview UI with confidence badges and inline editing
- [ ] 02-05-PLAN.md — End-to-end integration testing and checkpoint verification

### Phase 3: Calendar UI
**Goal**: Provide students with familiar calendar interface (month/week/day views) for visualizing and navigating Almanac events on both desktop and mobile

**Depends on**: Phase 1 (requires event storage to query events)

**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06, CAL-07, CAL-08, CAL-09, CAL-10, CAL-11

**Success Criteria** (what must be TRUE):
  1. User can switch between month, week, and day calendar views
  2. User can click any event to view full details in modal or sidebar
  3. User can edit event details inline from calendar view (title, date, time, type)
  4. Calendar displays events color-coded by course or event type for quick scanning
  5. Calendar highlights conflicting events with overlapping times
  6. Calendar shows NCSU academic calendar overlay (semester dates, breaks, finals week)
  7. Calendar view works seamlessly on mobile devices with touch-friendly interactions
  8. User can navigate dates using previous/next buttons and date picker
  9. Calendar shows current date/time indicator to orient user
  10. Calendar displays all-day events above timeline in day/week views

**Plans**: TBD

Plans:
- TBD during planning

### Phase 4: Event Management & Sync
**Goal**: Enable complete event lifecycle management (create, edit, delete) with bidirectional Google Calendar synchronization that prevents duplicates and respects source authority

**Depends on**: Phase 3 (requires calendar UI for event display and interaction)

**Requirements**: EVENT-01, EVENT-02, EVENT-03, EVENT-04, EVENT-05, EVENT-06

**Success Criteria** (what must be TRUE):
  1. User can manually create new events via form UI without uploading syllabus
  2. User can delete events with confirmation dialog preventing accidental deletion
  3. System tags all events with source metadata indicating origin (almanac vs external)
  4. System tracks comprehensive event metadata (course code, event type, editability flag)
  5. Events sync bidirectionally with Google Calendar (fetch external events, push Almanac events)
  6. System prevents duplicate events during sync using event ID mapping

**Plans**: TBD

Plans:
- TBD during planning

### Phase 5: AI Chat Interface
**Goal**: Allow students to modify events using natural language ("move exam to Friday", "delete all readings") instead of manual editing

**Depends on**: Phase 4 (requires event CRUD operations and sync to execute AI commands)

**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07

**Success Criteria** (what must be TRUE):
  1. User can modify events via natural language commands ("move exam to Friday")
  2. User can perform bulk operations via chat ("delete all readings for finals week")
  3. User can create new events via conversational input ("add club meeting Wednesdays 5-7pm")
  4. AI assistant has read access to full Google Calendar for context and conflict detection
  5. AI assistant only modifies Almanac-created events, not external Google Calendar events
  6. Chat interface shows confirmation dialog before executing any changes
  7. User can undo or revert chat-initiated changes with single action

**Plans**: TBD

Plans:
- TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 4/4 | ✓ Complete | 2026-02-02 |
| 2. Enhanced PDF Extraction | 0/5 | Not started | - |
| 3. Calendar UI | 0/TBD | Not started | - |
| 4. Event Management & Sync | 0/TBD | Not started | - |
| 5. AI Chat Interface | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-01*
*Depth: standard (5-8 phases)*
*Coverage: 32/32 v1 requirements mapped*

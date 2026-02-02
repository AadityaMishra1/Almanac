# Requirements: Almanac

**Defined:** 2026-02-01
**Core Value:** Reliable PDF extraction that works across all syllabus formats so students spend 2 minutes uploading instead of 30+ minutes manually entering dates

## v1 Requirements

### PDF Extraction

- [ ] **PDF-01**: System handles scanned/image-based PDFs using open-source OCR (Tesseract)
- [ ] **PDF-02**: System handles Excel/spreadsheet-based PDFs
- [ ] **PDF-03**: System auto-categorizes events as exam/quiz/assignment/reading
- [ ] **PDF-04**: User sees extraction preview with confidence scores before syncing
- [ ] **PDF-05**: User can manually correct misidentified dates or event types in preview

### Calendar View

- [ ] **CAL-01**: User can switch between month/week/day calendar views
- [ ] **CAL-02**: User can click event to view full details in modal/sidebar
- [ ] **CAL-03**: User can edit event details inline from calendar view
- [ ] **CAL-04**: Events are color-coded by course or event type
- [ ] **CAL-05**: Calendar highlights conflicting events (overlapping times)
- [ ] **CAL-06**: Calendar shows NCSU academic calendar overlay (semester dates, breaks, finals)
- [ ] **CAL-07**: Calendar view is fully responsive on mobile devices
- [ ] **CAL-08**: User can navigate dates with previous/next buttons and date picker
- [ ] **CAL-09**: Calendar shows current date/time indicator
- [ ] **CAL-10**: Calendar displays all-day events above timeline
- [ ] **CAL-11**: User can see "Today" button to return to current date

### AI Chat Interface

- [ ] **CHAT-01**: User can modify events via natural language ("move exam to Friday")
- [ ] **CHAT-02**: User can perform bulk operations ("delete all readings")
- [ ] **CHAT-03**: User can create events via chat ("add club meeting Wednesdays 5-7pm")
- [ ] **CHAT-04**: AI assistant has read access to full Google Calendar for context
- [ ] **CHAT-05**: AI assistant only modifies Almanac-created events (not external events)
- [ ] **CHAT-06**: Chat interface shows confirmation before executing changes
- [ ] **CHAT-07**: User can undo/revert chat-initiated changes

### Event Management

- [ ] **EVENT-01**: User can manually create events via form UI
- [ ] **EVENT-02**: User can delete events with confirmation
- [ ] **EVENT-03**: System tags all events with source metadata (almanac vs external)
- [ ] **EVENT-04**: System tracks event metadata (course code, event type, editability)
- [ ] **EVENT-05**: Events sync bidirectionally with Google Calendar (fetch + push)
- [ ] **EVENT-06**: System prevents duplicate events during sync (event ID mapping)

### Data Layer

- [ ] **DATA-01**: System persists event data locally with source and permission metadata
- [ ] **DATA-02**: System distinguishes Almanac-created events from external Google Calendar events
- [ ] **DATA-03**: System enforces read-only permissions on external events
- [ ] **DATA-04**: Event schema includes: title, date, time, type, course, source, editable flag

## v2 Requirements

### Advanced PDF Extraction

- **PDF-06**: System detects recurring patterns ("Quiz every Friday")
- **PDF-07**: System handles multi-page syllabi with page-spanning tables
- **PDF-08**: System extracts course metadata (instructor, office hours, grading policy)

### Smart Calendar Features

- **CAL-12**: System suggests study blocks before exams based on event type
- **CAL-13**: User can filter calendar by course or event type
- **CAL-14**: System sends smart reminders (2 days before exam vs 1 hour before class)
- **CAL-15**: Calendar shows grade integration (track assignment completion)

### Advanced AI Features

- **CHAT-08**: AI provides event suggestions based on user patterns
- **CHAT-09**: AI auto-populates recurring events from pattern detection
- **CHAT-10**: Chat interface supports multi-turn conversations with context

### Integration

- **INT-01**: System integrates with NCSU Moodle for assignment pulling
- **INT-02**: User can export calendar to iCal format for other apps
- **INT-03**: System supports batch upload of multiple syllabi

### Collaboration

- **COLLAB-01**: Students can share verified syllabus extractions for same course
- **COLLAB-02**: System validates community-contributed syllabus data

## Out of Scope

| Feature | Reason |
|---------|--------|
| Paid vision APIs (GPT-4V, Claude Vision) | Use open-source OCR where possible to reduce costs |
| Manual text input for syllabi | Defeats core value; extraction must work reliably |
| Full calendar replacement | Google Calendar remains source of truth; Almanac is input layer |
| Task management (to-dos, subtasks) | Feature creep; calendars ≠ project management |
| Collaboration features (v1) | Privacy concerns, unvalidated need |
| Non-Google calendar integration | Google only for v1; spreads effort too thin |
| Drag-and-drop rescheduling | AI chat provides better UX, especially on mobile |
| Custom themes/skins | Low value vs implementation cost |
| Social features (see classmates' calendars) | Privacy concerns, not validated |
| Time/habit tracking | Different product category |
| Email-to-calendar | Google Calendar already handles this |
| Video conferencing integration | Zoom links handled by Google Calendar |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| PDF-01 | Phase 2 | Pending |
| PDF-02 | Phase 2 | Pending |
| PDF-03 | Phase 2 | Pending |
| PDF-04 | Phase 2 | Pending |
| PDF-05 | Phase 2 | Pending |
| CAL-01 | Phase 3 | Pending |
| CAL-02 | Phase 3 | Pending |
| CAL-03 | Phase 3 | Pending |
| CAL-04 | Phase 3 | Pending |
| CAL-05 | Phase 3 | Pending |
| CAL-06 | Phase 3 | Pending |
| CAL-07 | Phase 3 | Pending |
| CAL-08 | Phase 3 | Pending |
| CAL-09 | Phase 3 | Pending |
| CAL-10 | Phase 3 | Pending |
| CAL-11 | Phase 3 | Pending |
| EVENT-01 | Phase 4 | Pending |
| EVENT-02 | Phase 4 | Pending |
| EVENT-03 | Phase 4 | Pending |
| EVENT-04 | Phase 4 | Pending |
| EVENT-05 | Phase 4 | Pending |
| EVENT-06 | Phase 4 | Pending |
| CHAT-01 | Phase 5 | Pending |
| CHAT-02 | Phase 5 | Pending |
| CHAT-03 | Phase 5 | Pending |
| CHAT-04 | Phase 5 | Pending |
| CHAT-05 | Phase 5 | Pending |
| CHAT-06 | Phase 5 | Pending |
| CHAT-07 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after roadmap creation*

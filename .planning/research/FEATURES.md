# Feature Landscape

**Domain:** Student Calendar Management Apps
**Researched:** 2026-02-01
**Confidence:** MEDIUM (based on training knowledge of major calendar apps and student workflows)

## Executive Summary

Modern calendar apps fall into two camps: general-purpose (Google Calendar, Apple Calendar) and productivity-focused (Notion Calendar, Reclaim.ai). For students, table stakes are viewing events in familiar calendar layouts and basic CRUD operations. Differentiators come from domain-specific intelligence: understanding academic schedules, detecting conflicts between courses, and reducing manual data entry.

**Key insight:** Students don't want a calendar replacement—they want a calendar assistant. The differentiator isn't better calendar UI (Google Calendar already works), it's removing the friction of getting syllabus data into that calendar.

## Table Stakes

Features users expect from any calendar application. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Month view | Default mental model for calendars | Low | Grid layout, 4-6 weeks visible, today indicator |
| Week view | Detail view for upcoming events | Low | Column per day, time slots, scrollable |
| Day view | Deep focus on single day | Low | Timeline with hourly slots |
| Event click to view details | Basic interaction pattern | Low | Modal or sidebar with event info |
| Today button | Quick navigation reset | Low | Universal pattern in calendar apps |
| Create event via UI | Manual event addition | Medium | Form with title, date, time, description |
| Edit event inline | Quick modifications | Medium | Click-to-edit or modal form |
| Delete event | Basic CRUD operation | Low | With confirmation to prevent accidents |
| Date navigation | Move between days/weeks/months | Low | Previous/next buttons, date picker |
| Current date/time indicator | Orientation in timeline | Low | Highlighted "now" line in day/week views |
| Multi-day events | Assignments with deadlines, exam periods | Medium | Span across multiple days in grid |
| All-day events | Common for exams, due dates | Low | Above timeline, not in hourly slots |
| Color coding | Visual categorization | Low | By course, event type, or calendar source |
| Event list view | Alternative to calendar grid | Low | Chronological list, good for mobile |
| Responsive mobile layout | Students use phones constantly | High | Touch targets, swipe navigation, collapsible views |

## Differentiators

Features that set Almanac apart from generic calendar apps. These leverage the student use case.

### Core Differentiators (Must Build)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| PDF syllabus parsing | 30 minutes → 2 minutes to populate calendar | High | Already in progress; handles text, OCR, Excel exports |
| AI chat for event editing | "Move all exams to the day before" vs manual dragging | High | Natural language → calendar operations |
| Academic calendar awareness | Auto-fills semester dates, holidays, exam periods | Medium | NC State calendar integration |
| Assignment type detection | Auto-categorizes assignments, exams, quizzes, readings | Medium | From syllabus context, LLM classification |
| Course-based organization | All events tagged by course code/name | Low | Inherent from syllabus upload |
| Conflict detection | "Two exams on same day" warnings | Medium | Scan Google Calendar + Almanac events |
| Google Calendar sync | Students already live in Google Calendar | Medium | Already implemented for event insertion |
| Bulk operations via AI | "Delete all readings" or "Change CS 101 to Fridays" | High | Chat interface with multi-event updates |
| Smart event suggestions | "You usually study 2 days before exams" prompts | High | Pattern recognition, optional nudges |

### Secondary Differentiators (Post-MVP)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Study time auto-blocking | Auto-creates study blocks before exams | Medium | Based on event type + user patterns |
| Multi-syllabus upload | Upload all syllabi at semester start | Low | Batch processing, already possible |
| Recurring event intelligence | "Quiz every Friday" → auto-populate semester | Medium | Pattern detection from syllabus text |
| Integration with LMS (Moodle) | Pull assignments from course management system | High | NC State uses Moodle; API integration |
| Export to other calendars | Apple Calendar, Outlook support | Medium | iCal format export |
| Shared course calendars | Students share verified syllabus extractions | High | Community verification, privacy concerns |
| Smart reminders | Context-aware (2 days before exam vs 1 hour before class) | Medium | Event type + user preferences |
| Grade integration | Link events to grades, track completion | High | Requires LMS integration or manual entry |

## Anti-Features

Features to explicitly NOT build. Common mistakes or scope creep for v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Manual text input for syllabi | Defeats core value prop; users expect AI extraction to work | Improve PDF/OCR quality, handle edge cases |
| Full calendar replacement | Students already use Google Calendar; syncing is sufficient | Keep Google Calendar as source of truth, Almanac as input layer |
| Collaboration features (shared calendars with classmates) | Adds complexity, privacy concerns, out of scope for v1 | Focus on single-student workflow |
| Task management (to-do lists, subtasks, dependencies) | Feature creep; calendars ≠ task managers | Keep events as calendar entries only |
| Integration with non-Google calendars | Spreads effort thin; most students use Google | Google Calendar only for v1 |
| Manual CSV/Excel upload | Users expect drag-and-drop PDF, not data wrangling | Only support PDF syllabi |
| Custom calendar themes/skins | Low value vs implementation cost | Use clean default theme matching Google/Notion |
| Social features (see classmates' calendars) | Privacy nightmare, not validated need | Individual use only |
| Time tracking (how long you studied) | Different product category | Calendar shows scheduled time, not tracked time |
| Habit tracking | Feature creep beyond calendar management | Focus on academic events only |
| Email integration (create events from email) | Google Calendar already does this | Don't duplicate existing Google features |
| Video conferencing integration | Zoom links handled by Google Calendar | Don't re-implement meeting tools |
| Weather integration | Nice-to-have, not student-specific | Unnecessary for MVP |
| Drag-and-drop rescheduling in calendar UI | Complex to implement, AI chat handles this better | Use AI: "Move exam to next Friday" |

## Feature Dependencies

```
Core Flow:
PDF Upload → Extraction → Review Table → Sync to Google Calendar
                ↓
         Calendar View (read-only display of synced events)
                ↓
         AI Chat (modify events, re-sync to Google)

Dependencies:
- Calendar View requires: Google Calendar API read access
- AI Chat requires: Calendar View (to show context), Google Calendar write access
- Conflict Detection requires: Full Google Calendar read (not just Almanac events)
- Bulk Operations require: AI Chat + event modification logic

View Dependencies:
- Week/Day views require: Time slot rendering (more complex than Month)
- Event details require: Click interaction + modal/sidebar UI
- Inline editing requires: Event details view working first

Mobile Dependencies:
- Touch interactions require: Gesture handlers (swipe, pinch-zoom)
- Responsive views require: Layout breakpoints, collapsible navigation
```

## Feature Complexity Matrix

| Feature Category | Low (1-3 days) | Medium (1 week) | High (2-4 weeks) |
|------------------|----------------|-----------------|------------------|
| **Calendar Views** | List view, Month view | Week view, Day view | Drag-and-drop rescheduling |
| **Event Operations** | View details, Delete | Create, Edit inline | Bulk operations via AI |
| **AI Features** | Event type classification | Conflict detection | Natural language chat interface |
| **PDF Processing** | Text-based syllabi | OCR for scanned PDFs | Excel/spreadsheet extraction |
| **Integrations** | Google Calendar read | Google Calendar write | LMS (Moodle) integration |
| **Mobile** | Responsive layout | Touch interactions | Gesture navigation |

## MVP Recommendation

For MVP (v1), prioritize table stakes + core differentiators:

### Must Have (Phase 1)
1. **Calendar View (Month + Week + Day)** - Students expect to see events visually
2. **Event details modal** - Click event → see full info
3. **Google Calendar read integration** - Show synced events in Almanac UI
4. **Basic event create/edit/delete** - Manual fallback if AI fails
5. **Mobile responsive layout** - Students use phones more than desktop
6. **Color coding by course** - Visual organization inherited from syllabus

### Should Have (Phase 2)
7. **AI chatbot for event editing** - Core differentiator, but calendar view must work first
8. **Conflict detection** - Scan all events, warn about overlaps
9. **Academic calendar awareness** - Pre-populate semester dates
10. **Bulk operations via chat** - "Delete all readings for week of finals"

### Could Have (Phase 3+)
11. **Study time auto-blocking** - Suggest study sessions before exams
12. **Smart reminders** - Context-aware notifications
13. **LMS integration** - Pull from Moodle automatically
14. **Shared course calendars** - Community-verified syllabi

## Defer to Post-MVP

- **Drag-and-drop rescheduling**: Complex, AI chat is better UX for students
  - Rationale: "Move exam to Friday" is faster than precise mouse dragging on mobile

- **Task management features**: Different product category
  - Rationale: Events are "when," tasks are "what"; keep scope focused

- **Non-Google calendar integrations**: Spreads effort, most students use Google
  - Rationale: Validate with Google first, expand if demand exists

- **Collaboration features**: Privacy concerns, unvalidated need
  - Rationale: Students want personal calendar management, not group coordination

- **Advanced recurrence rules**: Edge case, most syllabi have explicit dates
  - Rationale: Handle "every Tuesday" but not complex patterns like "2nd Thursday of month"

## Student-Specific Considerations

### What Students Actually Do

Based on typical college workflows:

- **Check calendar on phone** → Mobile must be first-class, not desktop-first with mobile adaptation
- **Add events in batches** (semester start) → Bulk upload must be smooth
- **Modify events rarely** → Read-heavy, write-light; AI chat removes friction when changes needed
- **Use Google Calendar already** → Sync model, not replacement model
- **Juggle 4-6 courses** → Color coding and filtering by course is critical
- **Care about conflicts** → Two exams same day is disaster; must surface this

### What Students Don't Do

- Manually enter recurring events → Syllabus has explicit dates, just extract them
- Customize calendar appearance → Care more about function than aesthetics
- Track time spent → Just need to know what's due when
- Share calendars with classmates → Privacy-conscious, individual workflows

## Calendar UI Patterns (Reference)

### Google Calendar Approach
- Clean grid, minimal chrome
- Hover → event preview, Click → full details
- Drag to reschedule (we'll skip for v1)
- Color by calendar source
- Keyboard shortcuts (we'll skip for v1)

### Notion Calendar Approach
- Time blocking emphasis
- Hold/drag to create events (we'll skip)
- Smart scheduling suggestions (similar to our AI chat)
- Multiple calendar overlay (we'll support: Google + Almanac)

### Apple Calendar Approach
- Native platform design
- Swipe gestures on mobile (we should adopt)
- Natural scrolling in day/week views
- Quick event creation (we have AI chat instead)

### Almanac's Approach (Recommended)
- **Borrow from Google**: Clean grid, color coding, month/week/day views
- **Borrow from Notion**: Multiple calendar overlay (Almanac + Google), smart suggestions
- **Differentiate with AI**: Chat interface replaces manual drag/drop and form filling
- **Student-specific**: Course-based filtering, assignment type detection, conflict warnings

## Implementation Notes

### Calendar View Requirements

For calendar view to feel polished:

1. **Performance**: Render 100+ events without lag
   - Virtual scrolling for long lists
   - Lazy load month data as user navigates

2. **Interactions**: Smooth, expected behavior
   - Click event → details modal (not navigation)
   - Today button → instant jump
   - Arrow keys navigate dates (desktop)
   - Swipe navigates dates (mobile)

3. **Visual clarity**: No cramped text, clear hierarchy
   - Truncate long event titles with ellipsis
   - Show time only if not all-day
   - Max 3-4 events per day cell before "+X more" link

4. **Mobile adaptations**:
   - Month view: smaller cells, fewer visible weeks (3-4 instead of 5-6)
   - Week view: horizontal scroll or single-day columns
   - Day view: primary mobile view (full timeline visible)

### AI Chatbot Requirements

For AI to manage events:

1. **Context awareness**: Read all events in view range
2. **Intent detection**: Parse "move," "delete," "add," "change" commands
3. **Confirmation**: Preview changes before executing
4. **Undo**: Allow rollback of AI operations
5. **Scope limiting**: Only modify Almanac-created events, not external Google Calendar entries

### Mobile-First Considerations

Students check calendars on phones more than desktop:

- **Touch targets**: 44px minimum for tap areas
- **Gesture support**: Swipe to navigate days/weeks
- **Bottom navigation**: Thumb-friendly controls
- **Collapsible filters**: Course picker, date range in drawer
- **Offline-first**: Cache calendar data, sync when online

## Confidence Assessment

| Category | Confidence | Rationale |
|----------|------------|-----------|
| Table Stakes | HIGH | Standard calendar patterns are well-established (Google/Apple/Notion) |
| Differentiators | MEDIUM | Student needs validated by existing tools (Coursicle, MyHomework), but specific feature prioritization is hypothesis |
| Anti-Features | MEDIUM | Based on common feature creep patterns, but some may have unvalidated student demand |
| Complexity Estimates | MEDIUM | Based on typical calendar app implementation, but Almanac's stack may differ |
| Mobile Requirements | HIGH | Student behavior is well-documented (mobile-first usage) |

## Sources

**Note**: Due to tool restrictions, this research is based on training knowledge (pre-January 2025) of:
- Google Calendar feature set and UI patterns
- Notion Calendar (formerly Cron) capabilities
- Apple Calendar iOS/macOS design
- Student calendar app competitors (Coursicle, MyHomework, Power Planner)
- General calendar app best practices

**Recommended verification**:
- [ ] Survey NC State students on table stakes expectations
- [ ] A/B test AI chat vs drag-and-drop for event modification
- [ ] Validate conflict detection importance with user interviews
- [ ] Check if LMS integration is actually wanted or just assumed

**Low confidence areas needing validation**:
- Whether drag-and-drop rescheduling is truly unnecessary (assumed AI chat is sufficient)
- Student appetite for shared course calendars (privacy vs convenience tradeoff)
- Importance of recurring event intelligence vs explicit date extraction
- Mobile gesture patterns students expect (swipe? pinch-zoom?)

---

*Last updated: 2026-02-01*
*Confidence: MEDIUM (training knowledge, unverified with current tools or student surveys)*

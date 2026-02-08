# Phase 4: Event Management & Sync - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable complete event lifecycle management (create, edit, delete) with bidirectional Google Calendar synchronization. System must prevent duplicates, respect source authority (Almanac vs external events), and handle conflicts gracefully.

</domain>

<decisions>
## Implementation Decisions

### Manual event creation flow
- **Create button location:** Both FAB (mobile) and toolbar button (desktop) for context-appropriate UX
- **Calendar click behavior:** Clicking date/time slot opens create modal pre-filled with that date/time (Google Calendar pattern)
- **Required fields:** Title + Date only (minimal friction). Time, course, type are optional for quick captures.
- **Course association:** Smart defaults — pre-select course if viewing filtered calendar, otherwise blank dropdown

### Conflict resolution strategy
- **Conflict winner:** User chooses per conflict (most control, explicit decision-making)
- **Dialog presentation:** Blocking modal on sync — pauses sync when conflict detected, shows both versions
- **Comparison detail:** Changed fields only (highlight differences, hide identical fields to reduce cognitive load)
- **Merge capability:** Yes, allow merging — user can pick title from Almanac, date from Google, etc. (field-by-field control)

### Sync trigger & timing
- **Sync trigger:** Hybrid auto + manual — auto-sync on page load + manual sync button for immediate refresh
- **Rate limiting:** Smart throttling — allow quick syncs but warn/block if exceeds reasonable threshold (5+ in 1 min)
- **Visual feedback:** Sync status indicator in toolbar (small icon/badge that animates during sync, subtle and always visible)
- **Status details:** Expandable details — default to simple 'Synced' status, user can click to see full summary (events added/updated/conflicts)

### Deletion behavior & safety
- **Deletion locations:** Calendar modal + inline hover action on calendar event chips (quick access without modal)
- **Confirmation style:** Two-step action — first click shows 'Click again to confirm', second click deletes (no modal interruption)
- **Google Calendar deletion:** Depends on source — Almanac-created events delete from both systems, external events just unlink from Almanac (respects ownership)
- **Bulk delete:** Deferred to Phase 5 (AI chat interface) — no manual bulk UI in this phase to avoid complexity

### Claude's Discretion
- Exact sync status indicator animation style
- Conflict modal layout and visual design
- Smart throttling threshold tuning (exact count and time window)
- Create modal field layout and validation UX

</decisions>

<specifics>
## Specific Ideas

- FAB placement should follow Material Design guidelines (16px from corner on mobile)
- Conflict modal should feel like a diff view tool — clear visual distinction between versions
- Smart throttling should give helpful message: "Synced recently. Try again in X seconds."
- Two-step delete should change button color/text on first click to make state obvious

</specifics>

<deferred>
## Deferred Ideas

- Bulk delete operations — Phase 5 (AI chat handles this better with natural language)
- Automatic background interval sync — start with page load + manual, evaluate need later
- Sync history or audit log — not critical for v1, consider for future
- Offline sync queue — out of scope for initial release

</deferred>

---

*Phase: 04-event-management-sync*
*Context gathered: 2026-02-02*

# Phase 5: AI Chat Interface - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Natural language interface for event modification using conversational commands. AI assistant can create, modify, and delete Almanac events through chat. AI has read-only access to Google Calendar for context but only modifies Almanac-created events. All changes require user confirmation before execution.

</domain>

<decisions>
## Implementation Decisions

### Chat interface layout
- Floating widget positioned bottom-right (collapsible chat bubble)
- Expanded state takes ~80% screen space (chat in focus, calendar dimmed/blurred behind)
- Collapsed state shows clean icon only (no preview badges or last message)
- Chat history persists like ChatGPT (users can scroll back) but each session starts with fresh conversation

### Command interpretation
- Moderately structured flexibility: accept common patterns with some variation, but require clarity
- Ambiguity handling: AI asks clarifying questions when command is unclear ('Which exam - CSC 316 Midterm or DATA 220 Final?')
- Rich relative date support: 'tomorrow', 'next Friday', 'in 2 weeks', 'day after exam', 'finals week'
- Command chaining: Claude's discretion (determine based on implementation complexity)

### Confirmation flow
- Detailed diff view for previews: show before/after for each field that changes ('Date: Mar 10 → Mar 15, Time: 2pm → 3pm')
- Bulk operations use per-item checkboxes: list all matches with pre-selected checkboxes, user can uncheck any before confirming
- History panel for undo mechanism: dedicated UI showing recent AI operations, click any to revert (like git history)
- Conflict warnings before confirmation: AI detects potential time overlaps and shows warnings ('Moving this creates a conflict with CSC 400 Lecture. Continue?') but doesn't block

### AI personality & tone
- Helpful & informative personality: explain context and offer insights ('I've moved CSC 316 Midterm to Friday. This leaves you 3 days to study.')
- Suggest when relevant: only offer proactive suggestions when detecting issues, not after every operation
- Ask clarifying questions on misunderstanding: 'Did you mean: move the exam to Friday, or delete the exam on Friday?'
- Google Calendar context with source distinction: reference external events but clarify they're from Google ('Moving to 3pm. Note: Google Calendar shows Team Meeting at 3:30.')

### Claude's Discretion
- Exact widget dimensions and animation behavior
- Command chaining implementation (single vs multiple operations per command)
- Error handling patterns for edge cases
- Styling details for diff view and history panel

</decisions>

<specifics>
## Specific Ideas

- Chat starts fresh each session but history persists (like ChatGPT model: new conversations, but scrollable history)
- Conflict warnings should highlight the conflicting event in preview (similar to Phase 4 conflict UI patterns)
- History panel should feel like version control (show operation, timestamp, ability to revert)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-ai-chat-interface*
*Context gathered: 2026-02-02*

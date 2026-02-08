# Architecture Patterns: Calendar Apps with AI Chat Assistants

**Domain:** Calendar applications with AI-powered chat interfaces
**Researched:** 2026-02-01
**Confidence:** MEDIUM (based on training data patterns + existing codebase analysis)

## Executive Summary

Calendar apps with AI assistants typically follow a **layered architecture** with clear separation between:
1. **Presentation layer** (calendar UI + chat interface)
2. **Application layer** (event management logic, AI orchestration)
3. **Integration layer** (external calendar APIs, AI services)
4. **Data layer** (event store, metadata, source tracking)

The critical architectural challenge is **maintaining source authority**: distinguishing between events the app created (can modify) vs external events (read-only). This requires robust metadata tracking at the storage layer.

## Recommended Architecture for Almanac

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
├──────────────────────────┬──────────────────────────────────┤
│   Calendar View          │   AI Chat Interface              │
│   - Month/Week/Day views │   - Chat UI component            │
│   - Event rendering      │   - Message history              │
│   - Drag-drop handling   │   - Typing indicators            │
│   - Quick actions        │   - Command suggestions          │
└──────────────────────────┴──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
├──────────────────────────┬──────────────────────────────────┤
│   Event Manager          │   AI Assistant                   │
│   - CRUD operations      │   - Intent parsing               │
│   - Validation           │   - Calendar queries             │
│   - Permission checks    │   - Command execution            │
│   - Conflict detection   │   - Response generation          │
└──────────────────────────┴──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                         │
├──────────────────────────┬──────────────────────────────────┤
│   Calendar Sync          │   AI Service Client              │
│   - Google Calendar API  │   - Groq/OpenAI client           │
│   - Bidirectional sync   │   - Prompt templates             │
│   - Conflict resolution  │   - Token management             │
│   - Rate limiting        │   - Streaming responses          │
└──────────────────────────┴──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│  - Local event store (primary source of truth)              │
│  - Event metadata (source, synced_at, gcal_id, editable)    │
│  - Chat history                                              │
│  - User preferences                                          │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### 1. Calendar View Component

**Responsibility:** Display events in calendar grid format with drag-and-drop capabilities

**Inputs:**
- Event list (from Event Manager)
- Current view mode (month/week/day)
- Date range

**Outputs:**
- User interactions (click, drag, resize)
- View navigation events

**Communicates With:**
- Event Manager (fetch/update events)
- AI Chat (context sharing - "events visible on screen")

**Key Concerns:**
- Performance with 100+ events visible
- Real-time updates (when AI modifies events)
- Visual distinction: Almanac events vs external events
- Timezone handling

### 2. AI Chat Interface Component

**Responsibility:** Conversational UI for natural language interaction with calendar

**Inputs:**
- User messages
- Calendar context (current view, selected events)
- Chat history

**Outputs:**
- User commands/queries
- UI events (scroll to date, highlight event)

**Communicates With:**
- AI Assistant (send commands, receive responses)
- Event Manager (execute modifications)
- Calendar View (update visual state)

**Key Concerns:**
- Streaming responses (real-time feedback)
- Multi-turn conversations with context
- Command confirmation UX
- Error handling and retry

### 3. Event Manager (Application Service)

**Responsibility:** Central orchestration for all event operations with permission enforcement

**Core Functions:**
```typescript
interface EventManager {
  // Query operations (all events)
  listEvents(filters: EventFilters): Promise<Event[]>
  getEvent(id: string): Promise<Event | null>
  searchEvents(query: string): Promise<Event[]>

  // Mutation operations (Almanac events only)
  createEvent(data: EventInput): Promise<Event>
  updateEvent(id: string, data: Partial<EventInput>): Promise<Event>
  deleteEvent(id: string): Promise<void>

  // Batch operations
  bulkUpdate(operations: EventOperation[]): Promise<BatchResult>

  // Permission checking
  canModify(eventId: string): Promise<boolean>
  getEditableEvents(filters: EventFilters): Promise<Event[]>
}
```

**Business Rules:**
- **Almanac events** (source = "almanac"): Full CRUD access
- **External events** (source = "google_calendar"): Read-only access
- Modifications must validate against schema
- Conflict detection before commits
- Audit logging for all mutations

**Communicates With:**
- Data Layer (event storage)
- Calendar Sync (push changes to Google Calendar)
- AI Assistant (provide data for queries/commands)

### 4. AI Assistant (Application Service)

**Responsibility:** Parse natural language, execute calendar operations, generate responses

**Architecture Pattern:** **Intent-Action-Response Pipeline**

```
User Message
    ↓
┌─────────────────┐
│ Intent Parser   │ ← Groq/OpenAI: classify intent
└─────────────────┘
    ↓
┌─────────────────┐
│ Action Planner  │ ← Determine operations + parameters
└─────────────────┘
    ↓
┌─────────────────┐
│ Executor        │ ← Call Event Manager with permission checks
└─────────────────┘
    ↓
┌─────────────────┐
│ Response Gen    │ ← Format results for user
└─────────────────┘
```

**Core Functions:**
```typescript
interface AIAssistant {
  // Chat operations
  processMessage(message: string, context: ChatContext): AsyncIterable<ChatChunk>

  // Supported intents
  queryEvents(query: string): Promise<Event[]>      // "What do I have this week?"
  createEvent(command: string): Promise<Event>      // "Add study session Tuesday 3pm"
  updateEvent(command: string): Promise<Event>      // "Move CS101 exam to next Friday"
  deleteEvent(command: string): Promise<void>       // "Delete the lab on Wednesday"

  // Context management
  buildContext(calendarView: CalendarState): ChatContext
}
```

**Key Design Decisions:**

1. **Two-phase parsing** (like existing syllabus extraction):
   - Phase 1: Intent classification (fast, cheap model)
   - Phase 2: Parameter extraction (if intent requires action)

2. **Calendar context injection**:
   - Include currently visible events in prompt
   - Reduces ambiguity ("the meeting" → which meeting?)
   - Enables relative references ("tomorrow", "next week")

3. **Confirmation for destructive actions**:
   - Deletions always require confirmation
   - Bulk modifications show preview
   - Undo/rollback capability

**Communicates With:**
- Event Manager (execute operations)
- AI Service Client (LLM API calls)
- Chat Interface (stream responses)

### 5. Calendar Sync Service (Integration Layer)

**Responsibility:** Bidirectional synchronization with Google Calendar

**Existing Pattern (from codebase):**
```typescript
// Current: One-way sync (Almanac → Google Calendar)
syncEventsToCalendar(events: SyllabusEvent[]) → creates events in GCal

// Needed: Bidirectional sync
interface CalendarSync {
  // Push: Almanac events → Google Calendar
  pushEvent(event: Event): Promise<{ gcalId: string }>
  updateRemoteEvent(eventId: string, data: Partial<Event>): Promise<void>
  deleteRemoteEvent(eventId: string): Promise<void>

  // Pull: Google Calendar → Local store
  fetchAllEvents(dateRange: DateRange): Promise<ExternalEvent[]>
  pollForUpdates(since: Date): Promise<EventUpdate[]>

  // Sync orchestration
  fullSync(): Promise<SyncResult>
  incrementalSync(): Promise<SyncResult>
}
```

**Critical Implementation Details:**

1. **Source tagging** (already partially in place):
```typescript
type Event = {
  id: string                    // Local ID
  gcalId?: string              // Google Calendar event ID (if synced)
  source: "almanac" | "google_calendar"
  title: string
  date: string
  // ... other fields
  metadata: {
    createdBy: "pdf_parser" | "ai_assistant" | "manual" | "external"
    syncedAt?: Date
    lastModified: Date
  }
}
```

2. **Conflict resolution strategy**:
   - Almanac events: Local is source of truth
   - External events: Google Calendar is source of truth
   - If Almanac event modified in both places: Last-write-wins with timestamp

3. **Sync frequency**:
   - Initial load: Fetch all events in visible range
   - Incremental: Poll every 5 minutes (using `updatedMin` parameter)
   - Real-time: Webhook notifications (advanced, Phase 3+)

**Communicates With:**
- Google Calendar API (via existing `lib/google.ts`)
- Event Manager (store fetched events)
- Data Layer (update sync metadata)

### 6. Data Layer

**Responsibility:** Persistent storage with metadata tracking

**Current State:** No persistence layer (events only exist in-memory during parse → sync flow)

**Needed:** Local event store with metadata

**Recommended Approach:**

Given Next.js stack and need for server-side operations:

**Option A: Database (PostgreSQL/Vercel Postgres)**
- Best for: Multi-user, production deployment
- Event table with full audit trail
- Fast queries for date ranges
- JSON fields for flexible metadata

**Option B: File-based (JSON files in user directory)**
- Best for: Single-user, MVP, simple deployment
- One JSON file per month or per course
- Easy backup/export
- No additional infrastructure

**Option C: Browser storage (IndexedDB)**
- Best for: Client-only, offline-first
- NOT recommended: Conflicts with server actions pattern
- Loses data on device switch

**Recommendation: Start with Option B (file-based) for MVP, migrate to Option A for production**

**Schema:**
```typescript
interface StoredEvent {
  // Identity
  id: string                           // UUID
  gcalId?: string                      // Google Calendar event ID

  // Event data
  title: string
  date: string                         // ISO date
  type: string
  description?: string

  // Metadata (CRITICAL for architecture)
  source: "almanac" | "google_calendar"
  createdBy: "pdf_parser" | "ai_assistant" | "manual" | "external"
  createdAt: Date
  lastModified: Date
  syncedAt?: Date

  // Permissions
  editable: boolean                    // Computed from source

  // AI context
  relatedCourse?: string
  tags?: string[]
}
```

**Communicates With:**
- Event Manager (CRUD operations)
- Calendar Sync (persist sync state)

## Data Flow Patterns

### Pattern 1: User Creates Event via Chat

```
1. User types: "Add study session for CS101 on Tuesday at 3pm"
   ↓
2. Chat Interface → AI Assistant.processMessage()
   ↓
3. AI Assistant → Intent Parser → classifies as "create_event"
   ↓
4. AI Assistant → Action Planner → extracts:
   {
     title: "Study session for CS101",
     date: "2026-02-04",
     time: "15:00",
     type: "study"
   }
   ↓
5. AI Assistant → Event Manager.createEvent()
   ↓
6. Event Manager:
   - Validates input
   - Creates event with source="almanac", createdBy="ai_assistant"
   - Saves to Data Layer
   ↓
7. Event Manager → Calendar Sync.pushEvent()
   ↓
8. Calendar Sync:
   - Calls Google Calendar API
   - Stores gcalId in local event
   ↓
9. Event Manager → returns Event
   ↓
10. AI Assistant → formats response: "I've added 'Study session for CS101' on Tuesday, February 4 at 3pm"
    ↓
11. Chat Interface → displays response
    ↓
12. Calendar View → receives update notification → re-renders with new event
```

### Pattern 2: AI Reads External Calendar Event

```
1. User types: "What meetings do I have this week?"
   ↓
2. AI Assistant → Event Manager.listEvents({
     dateRange: thisWeek(),
     types: ["meeting"]
   })
   ↓
3. Event Manager → Data Layer → returns all events (including external)
   ↓
4. AI Assistant → formats response including external events:
   "You have 3 meetings:
   - Monday 10am: Team standup (external)
   - Wednesday 2pm: CS101 project meeting (editable)
   - Friday 11am: Office hours with Prof. Smith (external)"
```

### Pattern 3: User Drags Event in Calendar

```
1. User drags "CS101 Midterm" from March 15 → March 22
   ↓
2. Calendar View → emits onEventDrop({
     eventId: "evt_123",
     newDate: "2026-03-22"
   })
   ↓
3. Calendar View → Event Manager.canModify("evt_123")
   ↓
4. Event Manager → checks event.source === "almanac" → returns true
   ↓
5. Calendar View → Event Manager.updateEvent("evt_123", { date: "2026-03-22" })
   ↓
6. Event Manager:
   - Updates local event
   - Updates lastModified timestamp
   - Saves to Data Layer
   ↓
7. Event Manager → Calendar Sync.updateRemoteEvent("evt_123")
   ↓
8. Calendar Sync → updates Google Calendar via API
   ↓
9. Calendar View → optimistically updates UI (event already moved)
```

### Pattern 4: External Event Updated in Google Calendar

```
1. Background sync timer fires (every 5 minutes)
   ↓
2. Calendar Sync.incrementalSync()
   ↓
3. Calendar Sync → Google Calendar API:
   events.list({ updatedMin: lastSyncTime })
   ↓
4. Calendar Sync → receives updated events (including external changes)
   ↓
5. For each updated event:
   - If source="google_calendar": Update local copy
   - If source="almanac": Check timestamps
     - If remote newer: Log conflict, keep local (or show prompt)
     - If local newer: Skip (already pushed)
   ↓
6. Calendar Sync → Event Manager.bulkUpdate(changes)
   ↓
7. Event Manager → saves to Data Layer
   ↓
8. Event Manager → notifies Calendar View → re-renders
```

## Patterns to Follow

### Pattern 1: Command Pattern for Event Operations

**What:** Encapsulate all event mutations as command objects

**When:** AI generates operations, bulk updates, undo/redo support

**Benefits:**
- Easy to validate before execution
- Can be queued, logged, rolled back
- Testable in isolation

**Example:**
```typescript
type EventCommand =
  | { type: "create", data: EventInput }
  | { type: "update", id: string, data: Partial<EventInput> }
  | { type: "delete", id: string }
  | { type: "reschedule", id: string, newDate: string }

async function executeCommand(cmd: EventCommand): Promise<Event | void> {
  switch (cmd.type) {
    case "create": return eventManager.createEvent(cmd.data)
    case "update": return eventManager.updateEvent(cmd.id, cmd.data)
    case "delete": return eventManager.deleteEvent(cmd.id)
    case "reschedule": return eventManager.updateEvent(cmd.id, { date: cmd.newDate })
  }
}
```

### Pattern 2: Repository Pattern for Data Access

**What:** Centralize all data access through repository interfaces

**When:** Switching between storage backends (file → DB), testing

**Benefits:**
- Swap storage implementation without changing business logic
- Easy to mock for tests
- Clear separation of concerns

**Example:**
```typescript
interface EventRepository {
  findById(id: string): Promise<Event | null>
  findByDateRange(start: string, end: string): Promise<Event[]>
  save(event: Event): Promise<Event>
  delete(id: string): Promise<void>
  findBySource(source: Event["source"]): Promise<Event[]>
}

// Implementations:
class FileEventRepository implements EventRepository { /* ... */ }
class PostgresEventRepository implements EventRepository { /* ... */ }
```

### Pattern 3: Observer Pattern for UI Updates

**What:** Components subscribe to event changes, automatically re-render

**When:** Multiple UI components show same data (calendar + chat + sidebar)

**Benefits:**
- Decouples data updates from UI rendering
- Ensures all views stay in sync
- Supports real-time updates

**Example:**
```typescript
// Event Manager emits change events
eventManager.on("event:created", (event) => {
  calendarView.refresh()
  chatInterface.showConfirmation(`Added ${event.title}`)
})

eventManager.on("event:updated", (event) => {
  calendarView.updateEvent(event)
})

// Or use React Context + hooks
const EventContext = createContext<EventManager>(null)

function useEvents(filters: EventFilters) {
  const manager = useContext(EventContext)
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    manager.listEvents(filters).then(setEvents)
    const unsubscribe = manager.on("change", () => {
      manager.listEvents(filters).then(setEvents)
    })
    return unsubscribe
  }, [filters])

  return events
}
```

### Pattern 4: Optimistic UI Updates

**What:** Update UI immediately, roll back if operation fails

**When:** Drag-and-drop, chat commands, any user-initiated action

**Benefits:**
- Feels instant (no loading spinners)
- Better perceived performance
- Handles offline scenarios

**Example:**
```typescript
async function handleEventDrop(eventId: string, newDate: string) {
  const originalEvent = events.find(e => e.id === eventId)

  // 1. Optimistic update
  setEvents(events.map(e =>
    e.id === eventId ? { ...e, date: newDate } : e
  ))

  try {
    // 2. Actual update
    await eventManager.updateEvent(eventId, { date: newDate })
  } catch (error) {
    // 3. Rollback on failure
    setEvents(events.map(e =>
      e.id === eventId ? originalEvent : e
    ))
    showError("Failed to move event")
  }
}
```

### Pattern 5: Context Injection for AI

**What:** Include relevant calendar state in every AI prompt

**When:** Processing chat messages

**Benefits:**
- More accurate intent parsing
- Better handling of ambiguous references
- Enables follow-up questions

**Example:**
```typescript
function buildChatContext(message: string, calendarView: CalendarState): ChatContext {
  const visibleEvents = calendarView.getVisibleEvents()
  const selectedDate = calendarView.currentDate

  return {
    message,
    context: {
      currentDate: selectedDate.toISOString(),
      viewMode: calendarView.mode, // "month" | "week" | "day"
      visibleEvents: visibleEvents.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        editable: e.source === "almanac"
      })),
      recentMessages: chatHistory.slice(-5) // Last 5 messages
    }
  }
}

// In prompt:
`The user is currently viewing ${context.viewMode} view for ${context.currentDate}.
Visible events: ${JSON.stringify(context.visibleEvents, null, 2)}

User message: ${context.message}

If the user refers to "tomorrow" or "next week", calculate relative to ${context.currentDate}.
If the user says "that meeting", determine which event from the visible list.`
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mixing Source Authority

**What goes wrong:** Allowing AI to modify external events, or showing Almanac events without permission checks

**Why it happens:** Not checking `event.source` before mutations

**Consequences:**
- Users expect changes to persist, but external events revert on sync
- Confusion about what can/can't be edited
- Potential data corruption if external events are overwritten

**Prevention:**
```typescript
// ALWAYS check before mutation
async function updateEvent(id: string, data: Partial<Event>) {
  const event = await repository.findById(id)
  if (!event) throw new Error("Event not found")

  if (event.source !== "almanac") {
    throw new Error("Cannot modify external events")
  }

  // Proceed with update...
}

// UI should disable editing for external events
<EventCard
  event={event}
  readOnly={event.source !== "almanac"}
/>
```

**Detection:**
- External events show different visual treatment
- Edit/delete buttons disabled for external events
- AI responds: "I can't modify that event because it wasn't created by Almanac"

### Anti-Pattern 2: Stateless AI Assistant

**What goes wrong:** AI processes each message in isolation, loses conversation context

**Why it happens:** Not maintaining chat history or calendar context

**Consequences:**
- User: "What's on Tuesday?" AI: "Which Tuesday?"
- User: "Move it to Wednesday" AI: "Move what?"
- Poor user experience, feels broken

**Prevention:**
- Include last N messages in prompt
- Maintain conversation state
- Inject calendar context (visible date range)
- Track referenced entities

**Instead:**
```typescript
interface ChatSession {
  messages: ChatMessage[]
  referencedEvents: Map<string, Event>  // "it" → Event object
  currentFocus?: {
    date: string
    eventId?: string
  }
}

function processMessage(message: string, session: ChatSession) {
  const context = {
    history: session.messages.slice(-5),
    referencedEvents: Array.from(session.referencedEvents.values()),
    focus: session.currentFocus
  }

  // AI can resolve "it", "that meeting", etc.
}
```

### Anti-Pattern 3: Polling-Based Sync Without Throttling

**What goes wrong:** Hitting Google Calendar API rate limits, draining quota

**Why it happens:** Aggressive polling (every 10 seconds) or sync on every UI action

**Consequences:**
- 429 errors from Google API
- App becomes unusable
- User quota exhausted

**Prevention:**
- Reasonable poll interval (5 minutes is standard)
- Exponential backoff on errors
- Batch operations where possible
- Cache aggressively

**Instead:**
```typescript
const SYNC_INTERVAL = 5 * 60 * 1000  // 5 minutes

let syncInProgress = false
let lastSyncTime = Date.now()

async function scheduleSync() {
  if (syncInProgress) return

  const timeSinceLastSync = Date.now() - lastSyncTime
  if (timeSinceLastSync < SYNC_INTERVAL) {
    return // Too soon
  }

  try {
    syncInProgress = true
    await calendarSync.incrementalSync()
    lastSyncTime = Date.now()
  } catch (error) {
    if (error.status === 429) {
      // Rate limited, back off exponentially
      await sleep(SYNC_INTERVAL * 2)
    }
  } finally {
    syncInProgress = false
  }
}
```

### Anti-Pattern 4: Fat AI Prompts With Full Event Data

**What goes wrong:** Including entire calendar (1000+ events) in every AI prompt

**Why it happens:** Thinking AI needs all data to answer questions

**Consequences:**
- Expensive tokens ($$$)
- Slow response times (large context window)
- Potential context overflow

**Prevention:**
- Only include visible/relevant events (20-50 events max)
- Use date range filtering
- Let AI query for more data if needed

**Instead:**
```typescript
// BAD: Include everything
const allEvents = await repository.findAll() // 1000+ events
const prompt = `Events: ${JSON.stringify(allEvents)}\n\nUser: ${message}`

// GOOD: Include only relevant subset
const relevantEvents = await repository.findByDateRange(
  startOfWeek(currentDate),
  endOfWeek(currentDate)
) // 10-20 events

const prompt = `Current view shows ${currentDate.toLocaleDateString()}.
Visible events (this week): ${JSON.stringify(relevantEvents)}

If you need events outside this range, respond with: "QUERY_NEEDED: <date_range>"

User: ${message}`
```

### Anti-Pattern 5: Synchronous Calendar Operations in UI Thread

**What goes wrong:** Calendar view freezes while waiting for Google Calendar API

**Why it happens:** Using `await` in event handlers without loading states

**Consequences:**
- UI feels sluggish
- User clicks multiple times (duplicate operations)
- Poor perceived performance

**Prevention:**
- Always show loading states
- Use optimistic updates
- Run API calls in background

**Instead:**
```typescript
// BAD:
async function handleCreateEvent(data: EventInput) {
  const event = await eventManager.createEvent(data) // UI frozen
  await calendarSync.pushEvent(event)                // Still frozen
  refreshCalendar()
}

// GOOD:
async function handleCreateEvent(data: EventInput) {
  setLoading(true)

  // Create locally first (fast)
  const event = await eventManager.createEvent(data)
  refreshCalendar() // UI updates immediately

  // Sync to Google in background
  calendarSync.pushEvent(event).catch(error => {
    // Handle errors, maybe retry
    showError("Failed to sync to Google Calendar")
  }).finally(() => {
    setLoading(false)
  })
}
```

## Scalability Considerations

| Concern | At 10 events | At 100 events | At 1000+ events |
|---------|--------------|---------------|-----------------|
| **Calendar rendering** | Render all in DOM | Render visible month | Virtual scrolling, lazy load months |
| **AI context size** | Include all events | Include visible range (20-50) | Query-based retrieval, vector search |
| **Sync strategy** | Full sync on load | Incremental sync (poll every 5min) | Webhooks + incremental sync |
| **Storage** | In-memory / JSON file | JSON files per course/month | Database with indexes on date |
| **Search** | Array.filter() | Array.filter() on indexed fields | Full-text search, ElasticSearch |

## Build Order Recommendations

Based on component dependencies and risk:

### Phase 1: Data Layer + Event Manager (Foundation)

**Why first:** All other components depend on this. Get source authority right before building UI.

**Deliverables:**
- Event repository (file-based)
- Event schema with metadata
- Event Manager with permission checks
- Basic CRUD operations

**Validation:** Can create/read/update/delete events programmatically

### Phase 2: Calendar View (Core Value)

**Why second:** Primary UI for visualizing events. Validates Event Manager API.

**Deliverables:**
- Calendar grid component (month view)
- Event rendering
- Click to view details
- Date navigation

**Validation:** Can see Almanac events + external events (mock data)

### Phase 3: Calendar Sync (Critical Integration)

**Why third:** Enables real data. Must validate source tagging works correctly.

**Deliverables:**
- Bidirectional sync with Google Calendar
- Source tagging (almanac vs google_calendar)
- Incremental sync
- Conflict detection

**Validation:** External events show in calendar, Almanac events push to Google, permissions enforced

### Phase 4: Basic AI Chat (MVP Feature)

**Why fourth:** Depends on Event Manager + Calendar View being stable.

**Deliverables:**
- Chat UI component
- Intent parsing (create, query, update, delete)
- Command execution via Event Manager
- Response generation

**Validation:** Can ask "What's this week?" and "Add study session Tuesday"

### Phase 5: Drag-and-Drop (Enhanced UX)

**Why fifth:** Polish feature, depends on solid event update flow.

**Deliverables:**
- Drag-and-drop event rescheduling
- Permission checking before drop
- Optimistic updates
- Visual feedback

**Validation:** Can drag Almanac events, cannot drag external events

### Phase 6: Advanced AI Features (Nice-to-Have)

**Why last:** Complex features that require stable foundation.

**Deliverables:**
- Multi-event operations ("Move all midterms by one week")
- Smart suggestions ("You have 3 exams in one day, should I reschedule?")
- Calendar context understanding ("What's the lightest week for studying?")

**Validation:** AI can handle complex, multi-step operations

## Confidence Assessment

**Overall Confidence: MEDIUM**

This assessment is based on:
- Existing codebase analysis (HIGH confidence)
- Industry patterns from training data (MEDIUM confidence - may be outdated)
- Web search unavailable (would have upgraded to HIGH)

**Verification needed:**
- [ ] Current best practices for Next.js 15 calendar components (2026)
- [ ] Latest Google Calendar API features/limits (2026)
- [ ] State-of-the-art AI agent patterns for tool use (2026)
- [ ] React 19 patterns for real-time updates (2026)

## Sources

**Codebase Analysis:**
- `/Users/aadityamishra/Projects/almanac/app/api/parse/route.ts` - Existing parse pipeline
- `/Users/aadityamishra/Projects/almanac/lib/events.ts` - Event schema
- `/Users/aadityamishra/Projects/almanac/lib/google.ts` - Google Calendar integration
- `/Users/aadityamishra/Projects/almanac/app/server-actions/calendar.ts` - Sync implementation
- `/Users/aadityamishra/Projects/almanac/components/syllabus-to-calendar.tsx` - Current UI patterns

**Industry Knowledge (Training Data - Jan 2025):**
- Calendar application architecture patterns
- AI assistant integration patterns
- Google Calendar API best practices
- React state management for real-time updates

**Confidence Note:** WebSearch was unavailable during research. Recommendations are based on training data + codebase analysis. Verify with current 2026 documentation before implementation.

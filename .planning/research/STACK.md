# Technology Stack - Enhanced Features

**Project:** Almanac
**Milestone:** OCR/Vision PDF extraction, Calendar UI, AI Chat Interface
**Researched:** 2026-02-01
**Overall Confidence:** MEDIUM (based on training data from January 2025, needs verification with current docs)

## Executive Summary

Adding four major capabilities to existing Next.js 15 + React 19 app:
1. **OCR/Vision-based PDF extraction** - Handle scanned PDFs and images
2. **Calendar UI components** - Month/week/day views with event rendering
3. **AI chatbot interface** - Conversational event editing
4. **Drag-and-drop interactions** - Calendar event rescheduling

**Key recommendations:**
- **Vision API over OCR** for scanned PDFs (GPT-4V or Claude 3.5 Sonnet)
- **React Big Calendar** for calendar UI (mature, well-maintained)
- **Vercel AI SDK** for chatbot (Next.js native, streaming support)
- **dnd-kit** for drag-and-drop (modern, accessible, React 19 compatible)

---

## 1. OCR/Vision-Based PDF Extraction

### Recommended: Vision Model API (GPT-4V or Claude 3.5 Sonnet)

**Primary Recommendation: Claude 3.5 Sonnet Vision**

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Anthropic Claude API | Latest (claude-3-5-sonnet-20241022) | Vision-based PDF page extraction | MEDIUM |
| @anthropic-ai/sdk | ^0.27.0 | Official SDK for Node.js | MEDIUM |

**Why Claude 3.5 Sonnet:**
- Superior document understanding compared to pure OCR
- Handles mixed layouts (text + images + tables)
- Can understand context and extract structured data in one pass
- No separate OCR → text extraction → LLM pipeline
- Cost-effective for document processing (~$3/1M input tokens)
- Works with PDF pages converted to images

**Implementation approach:**
1. Convert PDF pages to images (use `pdf-lib` or `pdfjs-dist`)
2. Send images to Claude Vision API with structured extraction prompt
3. Get JSON response with events directly (no separate parsing step)

**Alternative: GPT-4V (GPT-4 with Vision)**

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| OpenAI API | GPT-4 Turbo with Vision | Vision-based PDF extraction | MEDIUM |
| openai | ^4.67.0 | Official SDK | MEDIUM |

**Why GPT-4V as alternative:**
- Similar capabilities to Claude for document understanding
- Slightly higher cost (~$10/1M input tokens for GPT-4 Turbo)
- More widely adopted (more examples/tutorials)
- Integration similar to existing Groq setup

**NOT RECOMMENDED: Traditional OCR (Tesseract, Google Vision)**

| Approach | Why Not |
|----------|---------|
| Tesseract.js | Low accuracy on varied fonts, poor table handling, requires post-processing |
| Google Cloud Vision API | Adds complexity (separate OCR step), still needs LLM for extraction, higher latency |
| AWS Textract | Overkill for syllabus PDFs, expensive, complex setup |

**Supporting Libraries:**

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| pdf-lib | ^1.17.1 | PDF manipulation, page extraction | Lightweight, browser + Node.js, extract pages as images |
| pdfjs-dist | ^4.8.0 | PDF.js distribution (Mozilla) | Render PDF pages to canvas for vision API |
| canvas | ^2.11.2 | Node.js canvas implementation | Required for pdfjs-dist in Node.js environment |

**Installation:**
```bash
# Claude Vision (recommended)
npm install @anthropic-ai/sdk

# OR OpenAI Vision (alternative)
npm install openai

# PDF to image conversion
npm install pdf-lib pdfjs-dist canvas
```

**Confidence: MEDIUM** - Based on training data knowledge of Claude 3.5 Sonnet and GPT-4V capabilities. Need to verify:
- Current pricing (training data from mid-2024)
- Latest API versions and model names
- Performance benchmarks on syllabus-like documents

---

## 2. Calendar UI Components

### Recommended: React Big Calendar

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| react-big-calendar | ^1.15.0 | Calendar component library | MEDIUM |
| date-fns | ^4.1.0 | Date manipulation (alternative to moment.js) | HIGH |

**Why React Big Calendar:**
- **Mature and stable** - 8+ years of development, 8k+ GitHub stars
- **Multiple views** - Month, week, day, agenda built-in
- **Customizable** - Full control over event rendering, cell styling
- **Drag-and-drop support** - Built-in DnD with add-on package
- **Accessible** - ARIA labels, keyboard navigation
- **No jQuery dependency** - Pure React, works with React 19
- **Localizer flexibility** - Works with date-fns, moment, luxon, or dayjs

**Features included:**
- Month, week, work week, day, and agenda views
- Event rendering with custom components
- Event click and selection handlers
- Time slots and custom time ranges
- Drag-and-drop event rescheduling (with react-big-calendar-dnd)
- Responsive design support

**Supporting Libraries:**

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| react-big-calendar | ^1.15.0 | Core calendar component | Standard choice for React calendars |
| date-fns | ^4.1.0 | Date manipulation | Lightweight, tree-shakeable, TypeScript native |
| react-big-calendar/lib/addons/dragAndDrop | included | Drag-and-drop addon | First-party DnD support |

**Alternative Considered: FullCalendar**

| Library | Version | Why Not |
|---------|---------|---------|
| @fullcalendar/react | ^6.1.15 | Premium features require paid license, heavier bundle, more complex API |

**FullCalendar comparison:**
- **Pros:** More polished default styling, resource scheduling, timeline views
- **Cons:** Premium features paywalled ($199-599/year), larger bundle size (~150KB vs ~50KB), commercial license required for commercial use
- **Verdict:** Overkill for student calendar app, React Big Calendar sufficient

**NOT RECOMMENDED:**

| Library | Why Not |
|---------|---------|
| react-calendar | Too basic, no week/day views, no event rendering |
| react-modern-calendar-datepicker | Date picker only, not event calendar |
| DIY custom calendar | Reinventing wheel, accessibility issues, time sink |

**Installation:**
```bash
npm install react-big-calendar date-fns
```

**Styling Approach:**
- Import base CSS: `import 'react-big-calendar/lib/css/react-big-calendar.css'`
- Override with Tailwind utilities using custom event components
- Use CSS modules or styled-components for deep customization

**Confidence: HIGH** - React Big Calendar is well-established, widely used, and maintained. date-fns is industry standard.

---

## 3. AI Chatbot Interface

### Recommended: Vercel AI SDK

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| ai | ^3.4.0 | Vercel AI SDK core | HIGH |
| @ai-sdk/anthropic | ^1.0.0 | Anthropic provider for AI SDK | HIGH |
| @ai-sdk/openai | ^1.0.0 | OpenAI provider (if using GPT) | HIGH |

**Why Vercel AI SDK:**
- **Next.js native** - Built by Vercel for Next.js App Router
- **Streaming responses** - Built-in support for streaming LLM responses
- **React hooks** - `useChat()` hook handles state, streaming, and UI updates
- **Edge runtime compatible** - Works in Edge Functions for low latency
- **Multi-provider** - Supports Anthropic, OpenAI, Groq, Cohere with unified API
- **Tool calling** - Built-in function calling for structured operations
- **TypeScript-first** - Full type safety for chat messages and responses
- **Production-ready** - Used by thousands of deployed apps

**Key Features:**
- `useChat()` hook - Auto-manages messages, input, loading states
- Streaming responses with `streamText()` in API route
- Function/tool calling for structured actions (edit event, delete event, etc.)
- Message persistence and retry logic
- Automatic error handling and recovery

**Implementation Pattern:**
```typescript
// API route: app/api/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    tools: {
      editEvent: {
        description: 'Edit an event in the calendar',
        parameters: z.object({
          eventId: z.string(),
          changes: z.object({ ... })
        }),
        execute: async ({ eventId, changes }) => {
          // Edit event logic
        }
      }
    }
  });

  return result.toDataStreamResponse();
}

// Component: components/chat.tsx
import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  // Renders chat UI with streaming support
}
```

**Supporting Libraries:**

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| ai | ^3.4.0 | Core AI SDK | Unified chat API, streaming, hooks |
| @ai-sdk/anthropic | ^1.0.0 | Claude provider | Connect to Claude models |
| zod | ^3.25.76 (existing) | Schema validation | Already in project, used for tool parameters |

**Alternative Considered: LangChain.js**

| Library | Version | Why Not |
|---------|---------|---------|
| langchain | ^0.3.0 | Overly complex for simple chat, poor TypeScript experience, slower updates |

**LangChain comparison:**
- **Pros:** More features (agents, chains, memory), broader provider support
- **Cons:** Steep learning curve, verbose API, frequent breaking changes, heavier bundle
- **Verdict:** Overkill for chatbot use case, Vercel AI SDK better DX for Next.js

**NOT RECOMMENDED:**

| Approach | Why Not |
|----------|---------|
| Raw API calls | Reinvents streaming, state management, error handling |
| ChatGPT API only | Locks into OpenAI, no streaming hooks, manual state management |
| Botpress/Rasa | Overkill, requires separate backend, not React native |

**Installation:**
```bash
npm install ai @ai-sdk/anthropic
# OR if using OpenAI
npm install ai @ai-sdk/openai
```

**Chat UI Components:**
- Use existing Radix UI + Tailwind for styling
- Message bubbles with markdown rendering (use `react-markdown`)
- Typing indicators built into `useChat()` loading state
- Auto-scroll to latest message

**Confidence: HIGH** - Vercel AI SDK is actively maintained, well-documented, and designed specifically for Next.js App Router.

---

## 4. Drag-and-Drop Interactions

### Recommended: dnd-kit

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| @dnd-kit/core | ^6.3.1 | Core drag-and-drop functionality | HIGH |
| @dnd-kit/sortable | ^9.0.0 | Sortable lists (if needed) | HIGH |
| @dnd-kit/utilities | ^3.2.2 | Helper utilities | HIGH |

**Why dnd-kit:**
- **Modern architecture** - Built with React hooks, works with React 19
- **Accessible by default** - WCAG 2.1 AA compliant, keyboard navigation, screen reader support
- **Performant** - Uses CSS transforms, minimal re-renders
- **Flexible** - Works with any layout (calendar, lists, grids)
- **TypeScript native** - Full type safety
- **No jQuery** - Pure React, lightweight
- **Touch support** - Works on mobile devices
- **Collision detection** - Built-in algorithms for drop zones

**Integration with React Big Calendar:**
- Use dnd-kit for custom drag interactions
- Override React Big Calendar's built-in DnD if more control needed
- Handle drag start → calculate new date/time → update event → sync to backend

**Alternative: React Big Calendar's Built-in DnD**

| Library | Pros | Cons |
|---------|------|------|
| react-big-calendar DnD addon | Integrated, no extra dependencies | Less flexible, harder to customize |

**Decision:** Start with React Big Calendar's built-in DnD, migrate to dnd-kit if customization needed.

**Alternative Considered: react-dnd**

| Library | Version | Why Not |
|---------|---------|---------|
| react-dnd | ^16.0.1 | Older architecture (not hooks-first), less accessible, more complex API |

**react-dnd comparison:**
- **Pros:** Mature, battle-tested
- **Cons:** Harder to learn, less accessible, not designed for modern React
- **Verdict:** dnd-kit is successor, better DX

**NOT RECOMMENDED:**

| Library | Why Not |
|---------|---------|
| react-beautiful-dnd | Archived/deprecated by Atlassian in 2023 |
| interact.js | Vanilla JS, not React-native, manual state management |

**Installation:**
```bash
# If using React Big Calendar DnD (start here)
# Already included with react-big-calendar

# If customization needed later
npm install @dnd-kit/core @dnd-kit/utilities
```

**Implementation Note:**
React Big Calendar's DnD addon provides:
- Drag existing events to new times/dates
- Resize events to change duration
- Callbacks for `onEventDrop` and `onEventResize`

If additional DnD needed (e.g., drag from sidebar to calendar), add dnd-kit.

**Confidence: HIGH** - dnd-kit is actively maintained, widely adopted, and designed for modern React.

---

## 5. Supporting Libraries

### Image Handling for Vision API

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| sharp | ^0.33.5 | Image processing/optimization | Fast, memory-efficient, resize for API limits |
| pdf-lib | ^1.17.1 | PDF manipulation | Extract pages, split PDFs |
| pdfjs-dist | ^4.8.0 | PDF rendering | Render pages to canvas for screenshots |

**Installation:**
```bash
npm install sharp pdf-lib pdfjs-dist
```

### Markdown Rendering (for Chat)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| react-markdown | ^9.0.3 | Markdown to React components | Render formatted chat responses |
| remark-gfm | ^4.0.0 | GitHub Flavored Markdown | Support tables, strikethrough, task lists |

**Installation:**
```bash
npm install react-markdown remark-gfm
```

### Date Handling (Enhanced)

| Library | Status | Purpose | Why |
|---------|--------|---------|-----|
| date-fns | New: ^4.1.0 | Date manipulation | Already needed for React Big Calendar, replaces manual date logic |

**Why date-fns over existing Date logic:**
- Consistent API for parsing, formatting, manipulating dates
- Immutable date operations (no mutation bugs)
- Tree-shakeable (only import functions used)
- TypeScript native
- ~150KB smaller than moment.js

**Replace existing date handling:**
- Migrate `lib/events.ts` date parsing to date-fns
- Use `parseISO`, `format`, `addDays`, `isValid`, etc.

---

## Complete Installation

```bash
# Vision-based PDF extraction
npm install @anthropic-ai/sdk pdf-lib pdfjs-dist canvas sharp

# Calendar UI
npm install react-big-calendar date-fns

# AI Chatbot
npm install ai @ai-sdk/anthropic react-markdown remark-gfm

# Drag-and-drop (included with react-big-calendar initially)
# npm install @dnd-kit/core @dnd-kit/utilities  # Add later if needed
```

---

## Updated package.json (New Dependencies)

```json
{
  "dependencies": {
    // ... existing dependencies ...
    "@anthropic-ai/sdk": "^0.27.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "ai": "^3.4.0",
    "canvas": "^2.11.2",
    "date-fns": "^4.1.0",
    "pdf-lib": "^1.17.1",
    "pdfjs-dist": "^4.8.0",
    "react-big-calendar": "^1.15.0",
    "react-markdown": "^9.0.3",
    "remark-gfm": "^4.0.0",
    "sharp": "^0.33.5"
  }
}
```

---

## Architecture Implications

### PDF Processing Pipeline (Updated)

**Old flow:**
1. Upload PDF → pdf-parse → text
2. Text → Groq LLM → events

**New flow (mixed PDFs):**
1. Upload PDF → Detect type (text vs scanned)
   - **Text PDFs**: pdf-parse (existing, fast)
   - **Scanned/mixed PDFs**: pdfjs-dist → render pages → sharp → optimize → Claude Vision → events
2. Unified event extraction (both paths produce events)

**Optimization:**
- Try text extraction first (fast, cheap)
- Fall back to vision if text empty/garbled
- Cache vision results (expensive API calls)

### API Routes Structure

```
app/api/
├── chat/
│   └── route.ts          # POST - Vercel AI SDK chat endpoint
├── pdf/
│   ├── extract-text/     # Existing text-based extraction
│   └── extract-vision/   # New vision-based extraction
├── events/
│   └── [eventId]/
│       └── route.ts      # PATCH - Update event (called by chat tools)
└── calendar/
    └── route.ts          # GET - Fetch events for calendar view
```

### Component Structure

```
components/
├── calendar/
│   ├── calendar-view.tsx       # React Big Calendar wrapper
│   ├── event-renderer.tsx      # Custom event component
│   └── toolbar.tsx             # View switcher (month/week/day)
├── chat/
│   ├── chat-interface.tsx      # useChat() hook consumer
│   ├── message-list.tsx        # Message bubbles
│   └── input-bar.tsx           # Chat input with send button
└── pdf/
    ├── upload-dropzone.tsx     # Existing upload
    └── extraction-status.tsx   # Shows text vs vision mode
```

---

## Environment Variables (New)

```bash
# Existing
GROQ_API_KEY=...           # Keep for text-based extraction
GROQ_MODEL=...             # Keep for text PDFs

# New
ANTHROPIC_API_KEY=...      # Claude Vision API
# OR
OPENAI_API_KEY=...         # If using GPT-4V instead
```

---

## Performance Considerations

### Bundle Size Impact

| Library | Size (gzipped) | When Loaded |
|---------|----------------|-------------|
| react-big-calendar | ~52KB | Calendar page only |
| date-fns | ~11KB | (tree-shaken, functions used only) |
| ai + @ai-sdk/anthropic | ~45KB | Chat page only |
| react-markdown | ~25KB | Chat page only |
| @anthropic-ai/sdk | Server-only | API routes (not client bundle) |
| pdf-lib + pdfjs-dist | Server-only | API routes (not client bundle) |

**Total client-side addition:** ~135KB (gzipped) across calendar + chat pages

**Mitigation:**
- Route-based code splitting (Next.js automatic)
- Calendar and chat are separate pages → separate bundles
- Server components for non-interactive calendar (reduces client JS)

### API Latency

| Operation | Expected Latency | Optimization |
|-----------|------------------|--------------|
| Text PDF extraction | 2-5s | Cache parsed text |
| Vision PDF extraction | 10-20s | Show progress bar, process pages in parallel |
| Chat message (streaming) | 1-3s to first token | Stream UI updates, show typing indicator |
| Calendar event load | <500ms | Paginate events, virtual scrolling |
| Drag-and-drop update | <200ms | Optimistic UI update, background sync |

**Critical path:** Vision extraction is slowest (10-20s for multi-page PDF)

**UX strategy:**
- Show per-page progress ("Processing page 2 of 5...")
- Stream extracted events as pages complete
- Allow user to start editing while later pages process

---

## Migration Strategy

### Phase 1: Vision Extraction (Week 1)
1. Add Claude/OpenAI SDK
2. Implement vision extraction route (`app/api/pdf/extract-vision/route.ts`)
3. Update upload flow to detect text vs scanned PDFs
4. Test with sample scanned syllabi

### Phase 2: Calendar UI (Week 2)
1. Install react-big-calendar + date-fns
2. Create calendar page (`app/calendar/page.tsx`)
3. Implement event fetching API
4. Style calendar with Tailwind overrides
5. Add view switcher (month/week/day)

### Phase 3: Drag-and-Drop (Week 2)
1. Enable react-big-calendar DnD addon
2. Implement `onEventDrop` handler
3. Connect to event update API
4. Add optimistic UI updates

### Phase 4: AI Chat (Week 3)
1. Install Vercel AI SDK
2. Create chat API route with tool calling
3. Define tools (editEvent, deleteEvent, addEvent)
4. Build chat UI component
5. Integrate with calendar (show chat in sidebar)

### Phase 5: Polish (Week 4)
1. Add loading states and error handling
2. Optimize vision extraction (parallel pages)
3. Mobile responsive testing
4. Performance profiling and optimization

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vision API cost for large PDFs | High API costs if many pages | Limit to 20 pages, optimize image compression, cache results |
| Vision extraction accuracy | Events missed/incorrect | Fall back to manual editing, provide confidence scores |
| React 19 compatibility issues | Breaking changes in libraries | Test thoroughly, check library React 19 support |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Calendar performance with 100+ events | Slow rendering | Virtual scrolling, paginate event fetching |
| Chat UI on mobile | Poor UX on small screens | Responsive design, bottom sheet on mobile |
| date-fns migration breaks existing date logic | Bugs in date parsing | Thorough testing, keep existing tests |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Drag-and-drop accessibility | Keyboard users can't reschedule | dnd-kit has built-in keyboard support |
| Chat markdown rendering XSS | Security vulnerability | react-markdown sanitizes by default |

---

## Alternatives Comparison Matrix

### Vision/OCR Options

| Option | Accuracy | Cost | Latency | Complexity | Recommendation |
|--------|----------|------|---------|------------|----------------|
| Claude 3.5 Sonnet Vision | High | Medium | Medium | Low | **Recommended** |
| GPT-4V | High | High | Medium | Low | Alternative |
| Tesseract.js | Medium | Free | Fast | High | Not recommended |
| Google Cloud Vision | Medium | Medium | Medium | High | Not recommended |

### Calendar Libraries

| Option | Features | Bundle Size | Customization | Mobile | Recommendation |
|--------|----------|-------------|---------------|--------|----------------|
| React Big Calendar | Excellent | 52KB | High | Good | **Recommended** |
| FullCalendar | Excellent | 150KB | Medium (paywalled) | Excellent | Too expensive |
| react-calendar | Basic | 15KB | High | Good | Too basic |
| Custom build | Full control | Variable | Full | Variable | Too much work |

### Chat Frameworks

| Option | DX | Next.js Integration | Streaming | Bundle | Recommendation |
|--------|----|--------------------|-----------|--------|----------------|
| Vercel AI SDK | Excellent | Native | Built-in | 45KB | **Recommended** |
| LangChain.js | Poor | Manual | Manual | 200KB+ | Too complex |
| Raw API | Manual | Manual | Manual | Minimal | Reinventing wheel |

### Drag-and-Drop

| Option | Accessibility | React 19 | API | Bundle | Recommendation |
|--------|---------------|----------|-----|--------|----------------|
| dnd-kit | Excellent | Yes | Modern | 25KB | **Recommended** (if needed) |
| react-big-calendar DnD | Good | Yes | Integrated | Included | **Start here** |
| react-dnd | Medium | Yes | Legacy | 40KB | Not recommended |
| react-beautiful-dnd | Good | No | Legacy | 35KB | Deprecated |

---

## Version Verification Needed

**CRITICAL: The following versions are based on training data from January 2025 and MUST be verified:**

| Library | Stated Version | Verification Method | Confidence |
|---------|----------------|---------------------|------------|
| @anthropic-ai/sdk | ^0.27.0 | Check npm or Context7 | MEDIUM |
| ai (Vercel AI SDK) | ^3.4.0 | Check npm or Vercel docs | MEDIUM |
| react-big-calendar | ^1.15.0 | Check npm | MEDIUM |
| date-fns | ^4.1.0 | Check npm | HIGH |
| @dnd-kit/core | ^6.3.1 | Check npm | MEDIUM |
| pdfjs-dist | ^4.8.0 | Check npm | MEDIUM |
| sharp | ^0.33.5 | Check npm | MEDIUM |

**Before installation:**
1. Run `npm info <package> version` to get latest stable version
2. Check React 19 compatibility in package README/issues
3. Review CHANGELOG for breaking changes since stated version

**Sources:**
- As of training cutoff (January 2025), these were latest stable versions
- NPM registry: https://www.npmjs.com
- Need real-time verification before installation

---

## Open Questions for Phase-Specific Research

1. **Vision API performance:** Real-world benchmarks on syllabus PDFs (need to test both Claude and GPT-4V)
2. **Calendar mobile UX:** React Big Calendar mobile responsiveness (may need custom CSS)
3. **Chat context management:** How many messages to include in chat context (cost vs accuracy tradeoff)
4. **Drag-and-drop mobile:** Touch interactions on mobile calendar (may need special handling)
5. **Date parsing edge cases:** How vision models handle ambiguous dates (e.g., "next Thursday")

---

## Confidence Summary

| Category | Confidence | Rationale |
|----------|------------|-----------|
| Vision/OCR | MEDIUM | Training data on Claude/GPT-4V, need cost/accuracy verification |
| Calendar UI | HIGH | React Big Calendar is mature and well-documented |
| AI Chat | HIGH | Vercel AI SDK is current standard for Next.js |
| Drag-and-drop | HIGH | dnd-kit and RBC DnD are proven solutions |
| Versions | MEDIUM | All versions from Jan 2025 training, need npm verification |
| React 19 compatibility | MEDIUM | Most libraries claim support, need testing |

**Overall Stack Confidence: MEDIUM**

**Recommendation:** Proceed with stack, but verify library versions and React 19 compatibility during implementation.

---

*Stack research completed: 2026-02-01*
*Researcher: GSD Project Researcher Agent*
*Next step: Roadmap creation with phase-by-phase implementation plan*

# AI Chat Assistant - Test Plan

## Test Scenarios

### 1. Create Events Without Course
**Test:** "I have a poker club meeting every Thursday at 8pm at Talley Hall for the next 8 weeks"
**Expected:**
- AI should create 8 recurring events
- Events should have type "Meeting"
- No courseId required
- Events should appear on calendar
- Calendar should show "Poker Club Meeting" (no course prefix)

**Test:** "Add a dentist appointment on December 25th at 2pm"
**Expected:**
- Single event created
- Type "Other" or "Meeting"
- No course associated
- Appears in calendar

### 2. Create Events With Course
**Test:** "I need to study for my Physics exam on January 15th at 3pm"
**Expected:**
- AI should match "Physics" to existing course
- Event created with correct courseId
- Calendar shows "Physics: Study for Exam"

**Test:** "CSC 216 has a project due on January 20th"
**Expected:**
- AI should match "CSC 216" to course
- Event type "Project"
- Shows in calendar with course color

### 3. Recurring Events
**Test:** "I have club meetings every Thursday at 5pm for the next 12 weeks"
**Expected:**
- 12 events created
- All on Thursdays
- All at 5pm
- Proper recurrence

**Test:** "Problem sessions for Math happen every other Wednesday at 6pm, starting next week, for 6 sessions"
**Expected:**
- 6 biweekly events
- All on Wednesdays
- Proper date offsets (14 days apart)

### 4. Update Events
**Test:** "Move my problem session from Thursday 8pm to Thursday 6pm"
**Expected:**
- AI finds the event
- Updates startDate to 6pm
- Confirms update
- Calendar refreshes

**Test:** "Rename 'Study Session' to 'Group Study for Final'"
**Expected:**
- Event title updated
- No other changes

### 5. Delete Events
**Test:** "Delete the poker meeting on December 26th"
**Expected:**
- AI finds specific event
- Asks for confirmation (ideally)
- Deletes event
- Calendar refreshes

### 6. Search Events
**Test:** "What events do I have next week?"
**Expected:**
- AI lists all events in next 7 days
- Includes dates and times

**Test:** "Find all my Physics events"
**Expected:**
- Filters by course
- Returns list

### 7. Schedule Analysis
**Test:** "What's my busiest day this week?"
**Expected:**
- AI analyzes current week
- Identifies day with most events
- Lists the events

**Test:** "Do I have any conflicts on Friday?"
**Expected:**
- Checks for overlapping events
- Reports conflicts if any

### 8. Study Planning
**Test:** "I need to study for my Physics exam next week, help me plan"
**Expected:**
- AI finds Physics exam
- Suggests study sessions
- Considers current workload
- Recommends specific times

### 9. Edge Cases
**Test:** Empty queries
- "help"
- "what can you do?"
**Expected:** AI explains capabilities

**Test:** Ambiguous references
- "Move my exam to next Friday" (when multiple exams exist)
**Expected:** AI asks for clarification, lists options

**Test:** Invalid dates
- "Add event on Foobar 35th"
**Expected:** AI handles gracefully, asks for valid date

### 10. Integration Tests
**After creating event via AI:**
- Event appears in calendar view
- Event appears in list view
- Event appears in analytics
- Event can be clicked to open drawer
- Event can be synced to Google Calendar
- Event persists after page refresh

## Manual Testing Steps

1. **Open chat bubble** (bottom-right blue button)

2. **Test basic creation:**
   - "I have a poker club meeting every Thursday at 8pm for the next 8 weeks"
   - Verify 8 events created
   - Check calendar shows them
   - Check they have no course

3. **Test course-linked creation:**
   - "Add a study session for Physics on Monday at 2pm"
   - Verify course is matched
   - Verify event has course color

4. **Test rescheduling:**
   - "Move my poker meeting from Thursday 8pm to Thursday 6pm"
   - Verify time updated
   - Verify calendar refreshes

5. **Test deletion:**
   - "Delete the poker meeting on [specific date]"
   - Verify event removed

6. **Test analysis:**
   - "What's my busiest day this week?"
   - Verify AI analyzes schedule

7. **Test study planning:**
   - "I need to study for my Physics exam"
   - Verify AI provides suggestions

8. **Check Analytics Tab:**
   - Events from AI should appear in workload heatmap
   - Events should appear in upcoming deadlines

9. **Check Google Calendar Sync:**
   - Open event drawer for AI-created event
   - Click "Sync to Google Calendar"
   - Verify it syncs successfully

## Known Limitations

- AI may struggle with very ambiguous course names
- Natural language date parsing depends on Groq's interpretation
- Function calling may occasionally fail if parameters are malformed
- Timezone handling uses server timezone

## Success Criteria

✅ Can create events without courses
✅ Can create events with courses
✅ Handles recurring events correctly
✅ Can update existing events
✅ Can delete events
✅ Can search and analyze schedule
✅ Calendar auto-refreshes after AI actions
✅ Events appear in all views (calendar, list, analytics)
✅ No crashes or 500 errors
✅ TypeScript types handle null courses correctly

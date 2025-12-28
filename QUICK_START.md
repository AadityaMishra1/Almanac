# Quick Start Guide - AI Chat Testing

## 🚀 Start Testing in 3 Steps

### 1. Open the App
Navigate to: **http://localhost:3000**

### 2. Find the Chat Bubble
Look for the **blue chat bubble** in the bottom-right corner of the screen.

### 3. Try These Commands

#### Create a recurring event without course:
```
I have a poker club meeting every Thursday at 8pm for the next 8 weeks
```

#### Create an event with a course:
```
Add a study session for Physics on Monday at 2pm
```

#### Reschedule an event:
```
Move my poker meeting from Thursday 8pm to Thursday 6pm
```

#### Analyze your schedule:
```
What's my busiest day this week?
```

#### Get study help:
```
I need to study for my Physics exam, help me plan
```

---

## ✨ What to Look For

After each AI response:
1. ✅ Success message from AI
2. ✅ Calendar updates automatically (no refresh needed)
3. ✅ Events appear in correct date/time
4. ✅ Events show in calendar AND list view
5. ✅ Analytics tab reflects new events

---

## 🎨 Visual Indicators

**Events with courses:**
- Show as "[Course Name]: Event Title"
- Use course color

**Events without courses:**
- Show as "Event Title" only
- Use gray color (#6b7280)
- Display "No Course" in list view

---

## 🐛 If Something Breaks

1. **Check Browser Console** (F12) for errors
2. **Check Terminal** where dev server is running
3. **Try refreshing** the page
4. **Check** [SYSTEM_STATUS.md](SYSTEM_STATUS.md) for known issues

---

## 📊 Advanced Testing

### Test Recurring Events
- "Weekly meetings every Monday at 3pm for 10 weeks"
- "Biweekly sessions every other Friday at 2pm for 6 sessions"

### Test Event Updates
- "Change my study session to 4pm"
- "Rename poker meeting to poker tournament"

### Test Event Deletion
- "Delete the meeting on December 26th"

### Test Schedule Analysis
- "Do I have any conflicts this week?"
- "When am I free on Friday?"
- "What's my workload like next week?"

---

## 📈 Check Analytics Tab

After creating events:
1. Click **"Analytics"** button in header
2. View **Workload Heatmap** (color-coded by hours)
3. Check **Upcoming Deadlines** list
4. Verify **Stats Cards** show correct counts

---

## 🔄 Google Calendar Sync

1. Click any event in calendar/list
2. Event drawer opens
3. Click **"Sync to Google Calendar"**
4. Verify it syncs successfully
5. Check your Google Calendar

---

## 💡 Pro Tips

- Be specific with dates: "next Thursday" works better than "soon"
- Mention course names that exist in your account
- For recurring events, specify count: "for 8 weeks" or "6 times"
- AI remembers conversation context within the chat session

---

**Happy Testing! 🎉**

For full test scenarios, see [AI_CHAT_TEST_PLAN.md](AI_CHAT_TEST_PLAN.md)

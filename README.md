# Almanac — Syllabus to Calendar

Upload a syllabus PDF, extract assignment/test dates via Groq, review/edit them, then sync selected items to your Google Calendar.

## 1) Setup

1. Install deps:
   - `npm install`
2. Create a `.env.local` from `.env.example`.
3. In Google Cloud Console:
   - Create OAuth Client (Web)
   - Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
   - Ensure the app has access to **Google Calendar API**
4. Run:
   - `npm run dev`

## Notes

- OAuth scope includes `https://www.googleapis.com/auth/calendar.events` so the app can insert events.
- Events are currently synced as **all-day** events (start `date`, end `date + 1`).

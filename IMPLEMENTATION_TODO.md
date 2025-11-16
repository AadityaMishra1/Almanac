# What's Left to Implement

This document details everything that still needs to be built to make the app fully functional.

## ✅ COMPLETED (Already Done)

- [x] Project structure
- [x] Database models (User, Course, Assignment, CalendarEvent, EmailLog)
- [x] Docker setup with PostgreSQL, Redis, Celery
- [x] Google Gemini AI integration (FREE!)
- [x] API endpoint scaffolding
- [x] Celery tasks structure
- [x] Google Calendar/Gmail service classes
- [x] Next.js frontend setup

---

## 🔴 PHASE 1: Core Backend (Essential)

### 1.1 User Authentication
**Status**: Not started
**Files**: `backend/app/api/endpoints/auth.py`, `backend/services/auth.py`

**What to build**:
- [ ] User registration endpoint (`POST /api/v1/auth/register`)
- [ ] User login endpoint (`POST /api/v1/auth/login`)
- [ ] JWT token generation and validation
- [ ] Password hashing utilities
- [ ] Protected route decorator/dependency
- [ ] User profile endpoint (`GET /api/v1/auth/me`)

**Why needed**: Users need accounts to store their courses and calendar data

---

### 1.2 File Upload & Storage
**Status**: Not started
**Files**: `backend/services/file_storage.py`

**What to build**:
- [ ] File upload handling (save PDFs temporarily or to cloud)
- [ ] Choose storage: Local filesystem OR cloud (AWS S3, Cloudflare R2, Supabase Storage)
- [ ] File validation (size limits, PDF only)
- [ ] File cleanup (delete after processing)

**Why needed**: Users upload PDF syllabi, need to store them temporarily

**Recommendation**: Start with local filesystem, upgrade to Supabase Storage later (FREE tier)

---

### 1.3 Complete Syllabus Endpoints
**Status**: Partially done
**Files**: `backend/app/api/endpoints/syllabi.py`

**What to build**:
- [x] Upload endpoint (done, but needs testing)
- [ ] Save parsed assignments to database
- [ ] Associate assignments with courses
- [ ] Handle duplicate assignments
- [ ] Course CRUD operations:
  - [ ] Create course (`POST /api/v1/courses`)
  - [ ] List user's courses (`GET /api/v1/courses`)
  - [ ] Update course (`PUT /api/v1/courses/{id}`)
  - [ ] Delete course (`DELETE /api/v1/courses/{id}`)

**Why needed**: Store the parsed data permanently

---

### 1.4 Assignment Management
**Status**: Not started
**Files**: `backend/app/api/endpoints/assignments.py`

**What to build**:
- [ ] List assignments (`GET /api/v1/assignments`)
  - [ ] Filter by course
  - [ ] Filter by date range
  - [ ] Sort by due date
- [ ] Get single assignment (`GET /api/v1/assignments/{id}`)
- [ ] Update assignment (`PUT /api/v1/assignments/{id}`)
- [ ] Delete assignment (`DELETE /api/v1/assignments/{id}`)
- [ ] Mark assignment complete (`POST /api/v1/assignments/{id}/complete`)

**Why needed**: Users need to manage their assignments

---

### 1.5 Complete Google Calendar Integration
**Status**: Partially done
**Files**: `backend/app/api/endpoints/calendar.py`, `backend/services/google_calendar.py`

**What to build**:
- [x] OAuth authorization flow (done)
- [ ] Save OAuth tokens to database
- [ ] Token refresh logic (when expired)
- [ ] Complete sync endpoint:
  - [ ] Fetch user's assignments
  - [ ] Create calendar events for each
  - [ ] Store event IDs in database
  - [ ] Handle existing events (don't duplicate)
- [ ] Update event when assignment changes
- [ ] Delete event when assignment deleted

**Why needed**: The core feature - sync assignments to Google Calendar

---

### 1.6 Complete Gmail Monitoring
**Status**: Partially done
**Files**: `backend/tasks/email_monitor.py`, `backend/services/gmail_service.py`

**What to build**:
- [x] Celery task structure (done)
- [ ] Fix date parsing in Gmail service (email['date'] format)
- [ ] Implement change detection logic:
  - [ ] Match email changes to existing assignments
  - [ ] Update assignment due dates
  - [ ] Update calendar events
  - [ ] Create notifications
- [ ] Course email filtering:
  - [ ] Let users specify course email addresses
  - [ ] Only process relevant emails
- [ ] Email processing history (show in UI)

**Why needed**: Automatically detect deadline changes from professor emails

---

## 🟡 PHASE 2: Frontend (User Interface)

### 2.1 Authentication Pages
**Status**: Not started
**Files**: `frontend/app/login/page.tsx`, `frontend/app/register/page.tsx`

**What to build**:
- [ ] Login page with form
- [ ] Registration page with form
- [ ] Form validation
- [ ] Error handling
- [ ] Redirect after login
- [ ] Store JWT token (localStorage or cookies)
- [ ] Auth context/state management

**Why needed**: Users need to sign up and log in

---

### 2.2 Dashboard Page
**Status**: Not started
**Files**: `frontend/app/dashboard/page.tsx`

**What to build**:
- [ ] Main dashboard layout
- [ ] Upcoming assignments list
- [ ] Calendar view (react-big-calendar or similar)
- [ ] Quick stats (total assignments, due this week, etc.)
- [ ] Notifications panel

**Why needed**: Main page users see after login

---

### 2.3 Syllabus Upload Page
**Status**: Not started
**Files**: `frontend/app/upload/page.tsx`, `frontend/components/SyllabusUpload.tsx`

**What to build**:
- [ ] Drag-and-drop file upload (react-dropzone)
- [ ] Course name input
- [ ] Upload progress indicator
- [ ] Preview parsed assignments
- [ ] Edit assignments before saving
- [ ] Confirm and save button
- [ ] Error handling (invalid PDF, parse errors)

**Why needed**: Users need to upload syllabi

---

### 2.4 Courses Page
**Status**: Not started
**Files**: `frontend/app/courses/page.tsx`

**What to build**:
- [ ] List all user's courses
- [ ] Add new course manually
- [ ] Edit course details
- [ ] Delete course (with confirmation)
- [ ] View course assignments
- [ ] Upload syllabus for existing course

**Why needed**: Manage courses

---

### 2.5 Assignments Page
**Status**: Not started
**Files**: `frontend/app/assignments/page.tsx`

**What to build**:
- [ ] List all assignments
- [ ] Filter by course
- [ ] Filter by date range
- [ ] Sort options (due date, course, type)
- [ ] Mark as complete
- [ ] Edit assignment
- [ ] Delete assignment
- [ ] Calendar view toggle

**Why needed**: View and manage all assignments

---

### 2.6 Settings Page
**Status**: Not started
**Files**: `frontend/app/settings/page.tsx`

**What to build**:
- [ ] Connect Google Calendar button
- [ ] Disconnect Google Calendar
- [ ] Enable/disable email monitoring
- [ ] Add course email addresses
- [ ] Notification preferences
- [ ] Account settings (name, email, password)
- [ ] Danger zone (delete account)

**Why needed**: Configure integrations and preferences

---

### 2.7 Google OAuth Callback
**Status**: Not started
**Files**: `frontend/app/api/auth/callback/google/route.ts`

**What to build**:
- [ ] Handle OAuth callback from Google
- [ ] Exchange code for tokens
- [ ] Save tokens via backend API
- [ ] Redirect to settings or dashboard
- [ ] Error handling

**Why needed**: Complete the Google OAuth flow

---

### 2.8 API Client & State Management
**Status**: Not started
**Files**: `frontend/lib/api.ts`, `frontend/lib/store.ts`

**What to build**:
- [ ] API client (axios) with auth headers
- [ ] React Query setup for data fetching
- [ ] Zustand store for global state:
  - [ ] User authentication state
  - [ ] Current user info
  - [ ] Notifications
- [ ] API error handling
- [ ] Loading states

**Why needed**: Frontend needs to communicate with backend

---

## 🟢 PHASE 3: Enhancements (Nice to Have)

### 3.1 Notifications System
**Status**: Not started
**Files**: `backend/models/notification.py`, `backend/services/notification_service.py`

**What to build**:
- [ ] Notification database model
- [ ] Create notification on events:
  - [ ] New assignment detected
  - [ ] Deadline changed
  - [ ] Assignment due soon
- [ ] Notification API endpoints (list, mark read)
- [ ] Frontend notification bell/dropdown
- [ ] Real-time notifications (WebSockets or polling)

**Why needed**: Alert users to changes

---

### 3.2 Email Notifications
**Status**: Not started
**Files**: `backend/services/email_service.py`

**What to build**:
- [ ] Email service (SendGrid, Mailgun, or SMTP)
- [ ] Email templates
- [ ] Send email on:
  - [ ] Deadline change detected
  - [ ] Assignment due soon (daily digest)
- [ ] User email preferences

**Why needed**: Users might want email alerts

---

### 3.3 Mobile App (Future)
**Status**: Not started
**Tech**: React Native or Flutter

**What to build**:
- [ ] Mobile app with same features
- [ ] Push notifications
- [ ] Camera to scan syllabi

**Why needed**: You mentioned wanting a mobile app later

---

### 3.4 AI Improvements
**Status**: Partially done
**Files**: `backend/services/ai_parser.py`

**What to build**:
- [ ] Better date parsing (handle relative dates like "next Tuesday")
- [ ] Extract more info (point values, submission instructions)
- [ ] Improve accuracy with few-shot examples
- [ ] Handle multiple date formats
- [ ] Parse non-English syllabi

**Why needed**: More accurate parsing

---

### 3.5 Analytics Dashboard
**Status**: Not started

**What to build**:
- [ ] Track user engagement
- [ ] Show statistics (assignments completed, etc.)
- [ ] Study time suggestions
- [ ] Workload visualization

**Why needed**: Help students manage time

---

## 🔵 PHASE 4: Testing & Deployment

### 4.1 Testing
**Status**: Not started

**What to build**:
- [ ] Backend unit tests (pytest)
- [ ] API endpoint tests
- [ ] Frontend component tests
- [ ] Integration tests
- [ ] Test with real syllabi

**Why needed**: Ensure quality

---

### 4.2 Deployment
**Status**: Not started

**What to build**:
- [ ] Production environment setup
- [ ] Deploy backend (Railway, Render, Fly.io)
- [ ] Deploy frontend (Vercel, Netlify)
- [ ] Set up production database (Supabase)
- [ ] Set up Redis (Upstash)
- [ ] Configure domain
- [ ] Set up SSL
- [ ] Environment variables in production
- [ ] CI/CD pipeline

**Why needed**: Make it available to users

---

### 4.3 Documentation
**Status**: Partially done

**What to build**:
- [x] Setup guide (done)
- [x] API keys guide (done)
- [ ] User documentation
- [ ] API documentation (expand Swagger)
- [ ] Contribution guidelines
- [ ] Video tutorials

**Why needed**: Help others use and contribute

---

## 🎯 Recommended Implementation Order

### Sprint 1: Basic Functionality (2-3 weeks)
1. User authentication (backend + frontend)
2. Course CRUD (backend + frontend)
3. Syllabus upload (backend + frontend)
4. Assignment listing (backend + frontend)

**Goal**: Users can upload a syllabus and see assignments

---

### Sprint 2: Google Integration (2 weeks)
5. Complete Google OAuth flow
6. Calendar sync implementation
7. Settings page
8. Test with real Google accounts

**Goal**: Assignments sync to Google Calendar

---

### Sprint 3: Email Monitoring (2 weeks)
9. Complete email monitoring logic
10. Implement change detection
11. Update assignments and calendar
12. Notifications for changes

**Goal**: Deadline changes detected and updated

---

### Sprint 4: Polish & Deploy (1-2 weeks)
13. Testing
14. Bug fixes
15. UI improvements
16. Deployment
17. Documentation

**Goal**: Production-ready app

---

## Priority Levels

### 🔴 Critical (Must Have for MVP)
- User authentication
- Syllabus upload and parsing
- Google Calendar sync
- Basic assignment management

### 🟡 Important (Should Have)
- Email monitoring
- Notifications
- Settings page
- Error handling

### 🟢 Nice to Have (Could Have)
- Email notifications
- Analytics
- Advanced filtering
- Mobile app

---

## Tech Debt & Improvements

### Current Issues to Fix:
1. **No error handling** in many endpoints
2. **No input validation** in endpoints
3. **No pagination** on list endpoints
4. **No rate limiting** on API
5. **No logging** configured
6. **No monitoring** (Sentry, etc.)
7. **Hardcoded values** in some places
8. **No database indexes** defined
9. **No database backups** configured
10. **No test coverage**

### Security Issues to Address:
1. Add request validation (Pydantic schemas)
2. Add rate limiting (slowapi)
3. Sanitize user inputs
4. Add CSRF protection
5. Secure session management
6. Audit third-party dependencies
7. Add API key rotation
8. Implement proper CORS

---

## Getting Started

**Where to start?**

1. **Get API keys** (see `API_KEYS_GUIDE.md`)
2. **Test the setup** with Docker Compose
3. **Start with authentication**:
   ```bash
   # Create these files first:
   backend/app/api/endpoints/auth.py
   backend/services/auth_service.py
   frontend/app/login/page.tsx
   ```

4. **Build incrementally** - one feature at a time
5. **Test as you go** - use Swagger UI at http://localhost:8000/docs

---

## Questions?

- Check `README.md` for setup
- Check `API_KEYS_GUIDE.md` for credentials
- Check `QUICKSTART.md` for quick start

**Estimated time to MVP**: 6-8 weeks (part-time development)
**Estimated time to full feature set**: 3-4 months

Good luck! 🚀

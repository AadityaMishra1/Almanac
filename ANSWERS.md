# Answers to Your Questions

## 1. ✅ Free AI Alternative - DONE!

**Switched from Claude to Google Gemini 1.5 Flash**

### Why Gemini?
- **100% FREE** with very generous limits:
  - 15 requests/minute
  - 1,500 requests/day
  - 1,000,000 requests/month
- **Native PDF support** - reads PDFs directly, no text extraction needed!
- **Smart** - comparable to Claude for document understanding
- **2 million token context** - can handle very long documents
- **No credit card required** - truly free forever for reasonable usage

### Cost Comparison
| Feature | Claude | Gemini 1.5 Flash |
|---------|--------|------------------|
| Free tier | $0 (5 free credits) | FREE unlimited |
| After free tier | $3-15 per million tokens | Still FREE up to 1M requests/month |
| PDF support | ❌ No (needs extraction) | ✅ Yes (native) |
| Context window | 200K tokens | 2M tokens |
| **Student project cost** | **$20-50/month** | **$0/month** |

### What Changed in the Code
✅ Updated: `backend/services/ai_parser.py` - now uses Gemini
✅ Updated: `backend/requirements.txt` - uses `google-generativeai`
✅ Updated: `backend/core/config.py` - `GEMINI_API_KEY` instead of `CLAUDE_API_KEY`
✅ Updated: All `.env.example` files

### Getting Your Free Gemini API Key
See `API_KEYS_GUIDE.md` Section 1, but here's the quick version:

1. Go to https://makersuite.google.com/app/apikey
2. Click "Get API Key"
3. Done! Copy it to `backend/.env`

**No credit card, no billing setup, just instant free access!**

---

## 2. ✅ Google OAuth - No Firebase Needed!

**Answer: You get OAuth keys directly from Google Cloud Console**

### Do You Need Firebase?
**NO!** Firebase is overkill for this project.

### Why Not Firebase?
- **Firebase = Auth + Database + Storage + Functions + Hosting** (complex, $$$)
- **You only need = OAuth credentials** (simple, FREE)

Firebase makes sense if you want:
- Firebase Auth (but you have JWT)
- Firestore (but you have PostgreSQL)
- Firebase Storage (but you have file system/Supabase Storage)
- Cloud Functions (but you have FastAPI)

**For this project: Direct Google OAuth is simpler, free, and better.**

### How to Get Google OAuth Keys

**📖 See `API_KEYS_GUIDE.md` Section 2 for detailed guide**

**Quick version:**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a project** (name it anything, like "AI-Calendar")
3. **Enable APIs**:
   - Google Calendar API
   - Gmail API
4. **Configure OAuth Consent Screen**:
   - Choose "External"
   - Add your email
   - Add scopes (Calendar, Gmail)
   - Add test users (your email)
5. **Create OAuth Credentials**:
   - Type: Web application
   - Redirect URI: `http://localhost:8000/api/v1/calendar/oauth/callback`
   - Copy Client ID and Client Secret
6. **Paste in `backend/.env`**:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_secret
   ```

**Total cost: $0.00**
**Time: 5-10 minutes**
**Credit card required: No**

### What We're Using OAuth For
- Let users sign in with Google (optional - you can also use email/password)
- Access their Google Calendar (to create events)
- Access their Gmail (to monitor for deadline changes)

---

## 3. ✅ What's Left to Implement - DETAILED LIST!

**📖 See `IMPLEMENTATION_TODO.md` for the complete breakdown**

Here's a summary:

### Already Complete ✅
- Project structure
- Database models (5 models)
- Docker setup (6 services)
- Gemini AI integration
- API scaffolding
- Celery background tasks setup
- Google Calendar/Gmail service classes
- Next.js frontend setup

### Still Need to Build 🔴

#### Phase 1: Core Backend (2-3 weeks)
**Priority: CRITICAL**

1. **User Authentication** ⭐ START HERE
   - Registration endpoint
   - Login endpoint
   - JWT tokens
   - Password hashing
   - Protected routes

2. **File Upload & Storage**
   - Handle PDF uploads
   - Store temporarily or in cloud (Supabase Storage is free)
   - Validation and cleanup

3. **Complete Syllabus Endpoints**
   - Save parsed assignments to database
   - Course CRUD operations
   - Handle duplicates

4. **Assignment Management**
   - List/filter/sort assignments
   - Update/delete operations
   - Mark as complete

5. **Complete Google Calendar Integration**
   - Save OAuth tokens to database
   - Token refresh logic
   - Complete sync logic (create events, avoid duplicates)
   - Update events when assignments change

6. **Complete Gmail Monitoring**
   - Fix date parsing
   - Match email changes to assignments
   - Update assignments and calendar
   - Filter by course emails

---

#### Phase 2: Frontend (2-3 weeks)
**Priority: HIGH**

1. **Authentication Pages**
   - Login form
   - Registration form
   - JWT storage
   - Auth state management

2. **Dashboard**
   - Upcoming assignments list
   - Calendar view
   - Quick stats
   - Notifications

3. **Syllabus Upload Page**
   - Drag-and-drop upload
   - Preview parsed assignments
   - Edit before saving
   - Error handling

4. **Courses Page**
   - List courses
   - Add/edit/delete courses
   - View course assignments

5. **Assignments Page**
   - List all assignments
   - Filter and sort
   - Mark complete
   - Edit/delete

6. **Settings Page**
   - Connect/disconnect Google Calendar
   - Enable email monitoring
   - Add course email addresses
   - Notification preferences

7. **API Client Setup**
   - Axios with auth headers
   - React Query for data fetching
   - Zustand for global state
   - Error handling

---

#### Phase 3: Enhancements (Later)
**Priority: NICE TO HAVE**

- In-app notifications
- Email notifications (SendGrid/Mailgun)
- Better AI parsing (handle relative dates, etc.)
- Analytics dashboard
- Mobile app (future)

---

#### Phase 4: Production
**Priority: BEFORE LAUNCH**

- Testing (unit, integration, end-to-end)
- Deployment (Railway, Vercel, Supabase)
- Security hardening
- Monitoring and logging
- Documentation

---

## Implementation Roadmap

### Sprint 1 (Weeks 1-3): Make it Work
**Goal: Users can upload a syllabus and see assignments**

- [ ] User auth (backend + frontend)
- [ ] Course CRUD
- [ ] Syllabus upload flow
- [ ] Assignment listing

### Sprint 2 (Weeks 4-5): Add Google
**Goal: Assignments sync to Google Calendar**

- [ ] Google OAuth flow
- [ ] Calendar sync
- [ ] Settings page

### Sprint 3 (Weeks 6-7): Email Monitoring
**Goal: Detect deadline changes from emails**

- [ ] Email monitoring logic
- [ ] Change detection
- [ ] Update assignments and calendar
- [ ] Notifications

### Sprint 4 (Week 8+): Polish & Deploy
**Goal: Production ready**

- [ ] Testing
- [ ] Bug fixes
- [ ] Deployment
- [ ] Documentation

**Total time to MVP: 6-8 weeks** (part-time)

---

## Where to Start?

### Step 1: Get Your API Keys (30 minutes)
Follow `API_KEYS_GUIDE.md` to get:
- ✅ Gemini API key (FREE)
- ✅ Google OAuth credentials (FREE)

### Step 2: Test the Setup (10 minutes)
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your keys
docker-compose up -d
docker-compose exec backend python init_db.py
```

Visit http://localhost:3000 - you should see the homepage!

### Step 3: Build Authentication First
**This is your starting point:**

Create these files:
```
backend/app/api/endpoints/auth.py
backend/services/auth_service.py
frontend/app/login/page.tsx
frontend/app/register/page.tsx
```

Why start here? Everything else needs user authentication.

### Step 4: Build Feature by Feature
Follow the order in `IMPLEMENTATION_TODO.md`

---

## Key Resources

| Document | What It's For |
|----------|---------------|
| `README.md` | Full project documentation |
| `QUICKSTART.md` | 5-minute setup guide |
| `API_KEYS_GUIDE.md` | **How to get all API keys (FREE!)** |
| `IMPLEMENTATION_TODO.md` | **Detailed list of what to build** |
| `ANSWERS.md` | This document - answers your questions |

---

## Cost Breakdown

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| Gemini API | 1M requests | $0 |
| Google OAuth | Unlimited | $0 |
| PostgreSQL (Supabase) | 500 MB | $0 |
| Redis (Upstash) | 10K commands/day | $0 |
| Frontend (Vercel) | Unlimited sites | $0 |
| Backend (Railway) | 500 hours | $0* |

**Total for student project: $0/month** 🎉

*Railway free tier is enough for testing, $5-10/month for production

---

## FAQ

**Q: Will I ever have to pay for Gemini?**
A: Not unless you exceed 1 million requests/month. For a student project with even 100 active users, you'll never hit that limit.

**Q: Is Firebase really not needed?**
A: Correct. Firebase is for when you want Firebase's database/auth/storage. You're using PostgreSQL + JWT, so you only need OAuth credentials from Google Cloud Console.

**Q: Can I use a different database instead of PostgreSQL?**
A: Yes, but PostgreSQL is recommended. SQLAlchemy works with MySQL, SQLite, etc. Supabase (PostgreSQL) has a great free tier.

**Q: What if I want to deploy this later?**
A: Free options:
- Frontend: Vercel, Netlify (both free)
- Backend: Railway ($0-5/month), Render (free tier)
- Database: Supabase (free tier)
- Redis: Upstash (free tier)

**Q: How much Python/React do I need to know?**
A: Intermediate level. If you understand:
- Python: Functions, classes, async/await
- React: Components, hooks, state
- Basic REST API concepts

You're good to go! The code structure is already set up.

---

## Next Steps

1. ✅ Read `API_KEYS_GUIDE.md` and get your keys
2. ✅ Run `docker-compose up -d` to test everything works
3. ✅ Read `IMPLEMENTATION_TODO.md` to understand what to build
4. ✅ Start with authentication endpoints
5. ✅ Build feature by feature, test as you go

**You have a solid foundation! Now it's time to build the features.** 🚀

Good luck!

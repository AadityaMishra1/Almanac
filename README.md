# Almanac - Academic Calendar Assistant

Transform your syllabus PDFs into organized calendar events with AI-powered parsing.

## Features

- 📚 **Course Management**: Create and organize multiple courses with custom colors
- 📄 **PDF Parsing**: Upload syllabus PDFs and extract events automatically using AI
- 📅 **Calendar Views**: Week and month calendar views with FullCalendar
- 📋 **List View**: Alternative list-based event browsing
- ✏️ **Event Management**: Create, edit, and delete events manually
- 🔄 **Google Calendar Sync**: Sync events to Google Calendar with course colors
- 🎨 **Color Coding**: Visual organization by course with customizable colors

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, FullCalendar, Radix UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with Google OAuth
- **AI Parsing**: Groq API (LLaMA 3.1)
- **File Storage**: Vercel Blob
- **PDF Processing**: pdf-parse

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL Database

**Option A: Using Docker (Recommended)**

```bash
docker run --name almanac-postgres \
  -e POSTGRES_USER=almanac \
  -e POSTGRES_PASSWORD=almanac \
  -e POSTGRES_DB=almanac \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Use Vercel Postgres**

1. Go to Vercel Dashboard → Storage → Postgres
2. Create database and copy `DATABASE_URL`

### 3. Configure Environment Variables

Create `.env.local` from `.env.example`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-random-32-char-string>

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>

# Groq API (from https://console.groq.com)
GROQ_API_KEY=<your-api-key>
GROQ_MODEL=llama-3.1-8b-instant

# Database
DATABASE_URL=postgresql://almanac:almanac@localhost:5432/almanac

# Vercel Blob (from Vercel Dashboard → Storage → Blob)
BLOB_READ_WRITE_TOKEN=<your-token>
```

#### Getting Credentials

**Google OAuth:**
1. [Google Cloud Console](https://console.cloud.google.com/) → Create Project
2. Enable Google Calendar API
3. Credentials → Create OAuth 2.0 Client ID
4. Add redirect: `http://localhost:3000/api/auth/callback/google`

**Groq API:** Sign up at [console.groq.com](https://console.groq.com)

**Vercel Blob:** Vercel Dashboard → Storage → Blob → Create Store

### 4. Initialize Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Usage

1. **Sign in** with Google
2. **Create courses** with "Add Class" button
3. **Select a course** → Click "Upload Syllabus"
4. **Upload PDF** and AI extracts events automatically
5. **View events** in calendar or list view
6. **Edit/sync events** by clicking on them

## Project Structure

```
almanac/
├── app/
│   ├── api/              # API routes (courses, events, upload)
│   ├── server-actions/   # Google Calendar sync
│   └── page.tsx          # Main dashboard
├── components/           # React components
├── lib/                  # Utils (Prisma, Auth, PDF parsing, etc.)
└── prisma/              # Database schema
```

## Database Schema

- **User**: Auto-created on Google sign-in
- **Course**: Courses with colors and terms
- **SyllabusUpload**: Tracks uploaded PDFs
- **Event**: Calendar events (PDF or manual)

## Deployment

### Vercel

1. Push to GitHub
2. Import to Vercel
3. Add Vercel Postgres + Blob from Storage tab
4. Set environment variables
5. Deploy!

## Troubleshooting

**Database issues:**
```bash
docker restart almanac-postgres
npx prisma db push
```

**PDF parsing issues:**
- Verify Groq API key is valid
- Ensure PDF is not password-protected
- PDF must contain readable text

## Future Enhancements (Phase 2+)

- 🔔 Push notifications
- 📊 Workload visualization
- 🤖 AI study planning assistant
- 🔄 Auto-update from new syllabi
- 📱 Mobile app
- ✨ Bulk editing
- 🔍 Deduplication

## License

MIT

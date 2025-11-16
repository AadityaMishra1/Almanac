# AI Calendar - Smart Assignment Tracker

An intelligent web application that uses AI to parse course syllabi, extract assignment deadlines, and automatically sync them to Google Calendar. It also monitors Gmail for course-related emails to detect and update deadline changes.

## Features

- **PDF Syllabus Upload**: Upload course syllabi in PDF format
- **AI-Powered Parsing**: Uses Claude API to extract assignment deadlines and details
- **Google Calendar Integration**: OAuth connection to automatically create calendar events
- **Gmail Monitoring**: Monitors course emails for deadline changes
- **Automated Updates**: Detects changes in emails and updates calendar events accordingly
- **Real-time Notifications**: Get notified when assignments are added or deadlines change
- **Background Processing**: Uses Celery for asynchronous task processing

## Tech Stack

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Data fetching and caching
- **Zustand** - State management

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Database (via Supabase)
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations
- **Celery** - Background task processing
- **Redis** - Message broker and cache
\




MIT License

## Support

For issues and questions, please open an issue on GitHub.

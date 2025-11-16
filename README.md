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

### AI & APIs
- **AI Parsing** - Choose from 3 FREE options (see `FREE_AI_OPTIONS.md`):
  - Ollama (local, unlimited) - RECOMMENDED
  - Groq (cloud, 14K requests/day)
  - Simple regex parsing (no AI)
- **Google Calendar API** - Calendar management
- **Gmail API** - Email monitoring

## Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.11+
- **Docker** and Docker Compose (recommended)
- **PostgreSQL** 15+
- **Redis** 7+

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI-calendar
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Choose your AI option** (all FREE!)

   **📖 See `FREE_AI_OPTIONS.md` for detailed comparison**

   Quick setup:
   - **Option 1 (Recommended)**: Ollama - Local, unlimited, no API key
   - **Option 2**: Groq - Cloud, fast, needs free API key
   - **Option 3**: Simple parsing - No AI, just regex

4. **Configure your .env files**

   Edit `backend/.env` with your credentials:
   - AI: Follow setup in `FREE_AI_OPTIONS.md`
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - Get from Google Cloud Console
   - `DATABASE_URL` - Use Supabase or local PostgreSQL
   - `SECRET_KEY` - Generate a secure random string

   **See `API_KEYS_GUIDE.md` for Google OAuth setup!**

5. **Start all services with Docker**
   ```bash
   docker-compose up -d
   ```

6. **Initialize the database**
   ```bash
   docker-compose exec backend python init_db.py
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Manual Setup (Without Docker)

### Backend Setup

1. **Create a virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start PostgreSQL and Redis**
   ```bash
   # Using Docker for databases only
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
   docker run -d -p 6379:6379 redis:7-alpine
   ```

5. **Initialize the database**
   ```bash
   python init_db.py
   ```

6. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

7. **Start the FastAPI server**
   ```bash
   uvicorn main:app --reload
   ```

8. **Start Celery worker (in a new terminal)**
   ```bash
   celery -A tasks.celery_app worker --loglevel=info
   ```

9. **Start Celery beat (in a new terminal)**
   ```bash
   celery -A tasks.celery_app beat --loglevel=info
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local if needed
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## API Keys Setup

### Getting Your FREE API Keys

**📖 For detailed step-by-step instructions with screenshots, see `API_KEYS_GUIDE.md`**

**Quick summary:**

1. **Gemini API (FREE!)**
   - Go to https://makersuite.google.com/app/apikey
   - Click "Get API Key"
   - Copy and paste in `backend/.env`

2. **Google OAuth** (for Calendar & Gmail)
   - Go to https://console.cloud.google.com/
   - Create project → Enable Calendar & Gmail APIs
   - Create OAuth credentials
   - Copy Client ID & Secret to `backend/.env`

**No credit card required, no Firebase needed - everything is FREE!** ✅

## Project Structure

```
AI-calendar/
├── frontend/                # Next.js frontend
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── lib/               # Utilities
│   └── public/            # Static assets
├── backend/               # FastAPI backend
│   ├── alembic/          # Database migrations
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   └── schemas/      # Pydantic schemas
│   ├── core/             # Core configuration
│   ├── models/           # SQLAlchemy models
│   ├── services/         # Business logic
│   ├── tasks/            # Celery tasks
│   └── main.py           # FastAPI app
└── docker-compose.yml    # Docker orchestration
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database Migrations

Create a new migration after modifying models:
```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

## Development Workflow

1. **Start services**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   docker-compose logs -f celery_worker
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

4. **Reset database**
   ```bash
   docker-compose down -v
   docker-compose up -d postgres
   docker-compose exec backend python init_db.py
   ```

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Environment Variables

### Backend (backend/.env)
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key (FREE!)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `REDIS_URL` - Redis connection URL
- `SECRET_KEY` - JWT secret key

### Frontend (frontend/.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Find and kill the process using the port
lsof -ti:8000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

**Database connection errors**
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists

**Celery worker not processing tasks**
- Ensure Redis is running
- Check REDIS_URL in .env
- Verify Celery worker is running

**Google OAuth errors**
- Verify redirect URI matches exactly
- Check that APIs are enabled
- Ensure credentials are correct

## Deployment

### Backend Deployment (e.g., Railway, Render, Fly.io)
1. Set environment variables
2. Run migrations: `alembic upgrade head`
3. Start services: FastAPI, Celery Worker, Celery Beat

### Frontend Deployment (e.g., Vercel, Netlify)
1. Set `NEXT_PUBLIC_API_URL` to production backend URL
2. Deploy Next.js app

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

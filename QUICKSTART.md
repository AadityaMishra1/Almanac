# Quick Start Guide

## Prerequisites
- Docker & Docker Compose installed
- Google Gemini API key (FREE!) from https://makersuite.google.com/app/apikey
- Google Cloud project with Calendar & Gmail APIs enabled

## Setup (5 minutes)

1. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` and add:
   - `GEMINI_API_KEY=your_key_here` (get from https://makersuite.google.com/app/apikey - FREE!)
   - `GOOGLE_CLIENT_ID=your_client_id`
   - `GOOGLE_CLIENT_SECRET=your_client_secret`
   - `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_calendar`
   - `SECRET_KEY=any_random_string_here`

2. **Start everything**
   ```bash
   docker-compose up -d
   ```

3. **Initialize database**
   ```bash
   docker-compose exec backend python init_db.py
   ```

4. **Open the app**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

## What's Running

- **PostgreSQL** (port 5432) - Database
- **Redis** (port 6379) - Message broker
- **FastAPI Backend** (port 8000) - API server
- **Celery Worker** - Background tasks
- **Celery Beat** - Scheduled tasks
- **Next.js Frontend** (port 3000) - Web UI

## Next Steps

1. Visit http://localhost:3000
2. Upload a course syllabus PDF
3. Connect your Google Calendar
4. Enable email monitoring

## Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f celery_worker

# Restart a service
docker-compose restart backend

# Stop everything
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec backend python init_db.py
```

## Development

To work on the code:

```bash
# Frontend changes auto-reload
# Edit files in frontend/

# Backend changes require restart
docker-compose restart backend

# Add Python dependencies
# Edit backend/requirements.txt
docker-compose build backend
docker-compose up -d
```

## Troubleshooting

**Can't connect to database?**
- Check if PostgreSQL container is running: `docker-compose ps`
- View logs: `docker-compose logs postgres`

**Celery not processing tasks?**
- Check if Redis is running: `docker-compose ps`
- View worker logs: `docker-compose logs celery_worker`

**Frontend won't load?**
- View logs: `docker-compose logs frontend`
- Try rebuilding: `docker-compose build frontend && docker-compose up -d`

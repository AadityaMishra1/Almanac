from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import syllabi, calendar, gmail, notifications, assignments, courses
from core.config import settings

app = FastAPI(
    title="AI Calendar API",
    description="Backend API for AI-powered calendar management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(syllabi.router, prefix="/api/v1/syllabi", tags=["syllabi"])
app.include_router(calendar.router, prefix="/api/v1/calendar", tags=["calendar"])
app.include_router(gmail.router, prefix="/api/v1/gmail", tags=["gmail"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(assignments.router, prefix="/api/v1/assignments", tags=["assignments"])
app.include_router(courses.router, prefix="/api/v1/courses", tags=["courses"])

@app.get("/")
async def root():
    return {"message": "AI Calendar API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

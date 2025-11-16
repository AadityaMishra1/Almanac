"""
Database initialization script
Run this to create all tables
"""
from core.database import Base, engine
from models import User, Course, Assignment, CalendarEvent, EmailLog

def init_db():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()

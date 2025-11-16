from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings
import os

# Use psycopg (modern) instead of psycopg2 for PostgreSQL
# Or fall back to SQLite if PostgreSQL is not available
try:
    database_url = settings.DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(database_url)
    # Test connection
    engine.connect().close()
except Exception as e:
    print(f"PostgreSQL not available ({e}), falling back to SQLite")
    # Use SQLite as fallback
    sqlite_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ai_calendar.db")
    database_url = f"sqlite:///{sqlite_path}"
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

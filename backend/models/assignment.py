from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from core.database import Base

class AssignmentType(str, enum.Enum):
    HOMEWORK = "homework"
    EXAM = "exam"
    PROJECT = "project"
    QUIZ = "quiz"
    PRESENTATION = "presentation"
    OTHER = "other"

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text)
    assignment_type = Column(SQLEnum(AssignmentType), default=AssignmentType.HOMEWORK)

    due_date = Column(DateTime, nullable=False)
    original_due_date = Column(DateTime)  # Track if due date changes

    # Tracking
    extracted_from = Column(String)  # "syllabus" or "email"
    source_reference = Column(Text)  # Source text where this was found

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="assignments")
    calendar_events = relationship("CalendarEvent", back_populates="assignment", cascade="all, delete-orphan")

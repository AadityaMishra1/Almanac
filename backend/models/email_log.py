from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from core.database import Base

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Gmail info
    gmail_message_id = Column(String, unique=True, index=True)
    thread_id = Column(String)

    # Email details
    subject = Column(String)
    sender = Column(String)
    body = Column(Text)
    received_at = Column(DateTime)

    # Processing
    is_processed = Column(Boolean, default=False)
    contains_deadline_change = Column(Boolean, default=False)
    detected_changes = Column(Text)  # JSON string of detected changes

    processed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="email_logs")

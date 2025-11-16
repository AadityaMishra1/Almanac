from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class ParsedAssignment(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: datetime
    assignment_type: str = "homework"
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence score for the parsed assignment (0-1)")
    warnings: Optional[List[str]] = Field(None, description="List of warnings about the parsed assignment")

class SyllabusUploadResponse(BaseModel):
    filename: str
    course_name: Optional[str]
    assignments_found: int
    assignments: List[ParsedAssignment]

class SyllabusConfirmRequest(BaseModel):
    course_name: str
    assignments: List[ParsedAssignment]

class CourseCreate(BaseModel):
    name: str
    code: Optional[str] = None
    instructor: Optional[str] = None
    term: Optional[str] = None

class CourseResponse(BaseModel):
    id: str
    name: str
    code: Optional[str]
    instructor: Optional[str]
    term: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

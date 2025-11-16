from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from models.course import Course
from models.user import User
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter()


class CourseCreate(BaseModel):
    name: str
    code: Optional[str] = None
    instructor: Optional[str] = None
    term: Optional[str] = None


class CourseResponse(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    instructor: Optional[str] = None
    term: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=dict)
async def get_courses(db: Session = Depends(get_db)):
    """
    Get all courses for the current user.
    TODO: Replace with actual authenticated user once auth is implemented.
    """
    # TODO: Get user from authentication
    # For now, use the default user
    default_user_email = "default@example.com"
    user = db.query(User).filter(User.email == default_user_email).first()

    if not user:
        # Create default user if it doesn't exist
        user = User(
            email=default_user_email,
            full_name="Default User",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    courses = db.query(Course).filter(Course.user_id == user.id).order_by(Course.created_at.desc()).all()

    return {
        "courses": [
            {
                "id": str(course.id),
                "name": course.name,
                "code": course.code,
                "instructor": course.instructor,
                "term": course.term,
                "created_at": course.created_at.isoformat(),
                "updated_at": course.updated_at.isoformat()
            }
            for course in courses
        ]
    }


@router.post("/", response_model=dict)
async def create_course(
    course_data: CourseCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new course for the current user.
    TODO: Replace with actual authenticated user once auth is implemented.
    """
    if not course_data.name or not course_data.name.strip():
        raise HTTPException(status_code=400, detail="Course name is required")

    # TODO: Get user from authentication
    # For now, use the default user
    default_user_email = "default@example.com"
    user = db.query(User).filter(User.email == default_user_email).first()

    if not user:
        # Create default user if it doesn't exist
        user = User(
            email=default_user_email,
            full_name="Default User",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Check if course with same name already exists for this user
    existing_course = db.query(Course).filter(
        Course.user_id == user.id,
        Course.name == course_data.name.strip()
    ).first()

    if existing_course:
        raise HTTPException(
            status_code=400,
            detail=f"Course with name '{course_data.name}' already exists"
        )

    # Create new course
    course = Course(
        user_id=user.id,
        name=course_data.name.strip(),
        code=course_data.code.strip() if course_data.code else None,
        instructor=course_data.instructor.strip() if course_data.instructor else None,
        term=course_data.term.strip() if course_data.term else None
    )

    db.add(course)
    db.commit()
    db.refresh(course)

    return {
        "status": "success",
        "message": f"Course '{course.name}' created successfully",
        "course": {
            "id": str(course.id),
            "name": course.name,
            "code": course.code,
            "instructor": course.instructor,
            "term": course.term,
            "created_at": course.created_at.isoformat(),
            "updated_at": course.updated_at.isoformat()
        }
    }


@router.delete("/{course_id}")
async def delete_course(
    course_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a course and all associated assignments.
    TODO: Add authentication to ensure user owns this course.
    """
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    # TODO: Get user from authentication and verify course ownership
    # For now, just find the course
    course = db.query(Course).filter(Course.id == course_uuid).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course_name = course.name
    db.delete(course)
    db.commit()

    return {
        "status": "success",
        "message": f"Course '{course_name}' deleted successfully"
    }

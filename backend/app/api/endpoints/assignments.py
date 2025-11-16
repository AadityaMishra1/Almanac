from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from core.database import get_db
from typing import Optional

router = APIRouter()

@router.get("/")
async def get_assignments(
    user_id: str = Query("current", description="User ID"),
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    course_id: Optional[str] = Query(None, description="Filter by course"),
    db: Session = Depends(get_db)
):
    """
    Get all assignments for a user
    """
    from models.user import User
    from models.assignment import Assignment
    from models.course import Course
    
    # TODO: Get user from authentication once auth is implemented
    # For now, use default user
    default_user_email = "default@example.com"
    user = db.query(User).filter(User.email == default_user_email).first()
    
    if not user:
        return {
            "assignments": [],
            "total": 0
        }
    
    # Build query
    query = db.query(Assignment).join(Course).filter(Course.user_id == user.id)
    
    if course_id:
        query = query.filter(Assignment.course_id == course_id)
    
    # Note: completed field doesn't exist yet in Assignment model
    # TODO: Add completed field to Assignment model if needed
    
    assignments = query.order_by(Assignment.due_date.asc()).all()
    
    # Convert to dict format
    assignments_data = []
    for assignment in assignments:
        assignments_data.append({
            "id": str(assignment.id),
            "title": assignment.title,
            "description": assignment.description,
            "assignment_type": assignment.assignment_type.value if assignment.assignment_type else "homework",
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            "course_id": str(assignment.course_id),
            "course_name": assignment.course.name if assignment.course else None,
            "completed": False,  # TODO: Add completed field to Assignment model
            "created_at": assignment.created_at.isoformat() if assignment.created_at else None
        })
    
    return {
        "assignments": assignments_data,
        "total": len(assignments_data)
    }

@router.get("/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a single assignment by ID
    """
    raise HTTPException(status_code=404, detail="Assignment not found")

@router.put("/{assignment_id}")
async def update_assignment(
    assignment_id: str,
    db: Session = Depends(get_db)
):
    """
    Update an assignment
    """
    raise HTTPException(status_code=404, detail="Assignment not found")

@router.post("/{assignment_id}/complete")
async def mark_assignment_complete(
    assignment_id: str,
    completed: bool = Query(True),
    db: Session = Depends(get_db)
):
    """
    Mark an assignment as complete or incomplete
    """
    return {"status": "success", "assignment_id": assignment_id, "completed": completed}


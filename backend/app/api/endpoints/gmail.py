from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from core.database import get_db
from models.user import User
from models.email_log import EmailLog
from models.assignment import Assignment
from models.course import Course
from tasks.email_monitor import check_user_emails
from datetime import datetime
import json

router = APIRouter()

def get_user_from_id(user_id: str, db: Session) -> User:
    """
    Get user from user_id parameter.
    Uses the same default user logic as calendar endpoints.
    """
    if user_id == "current":
        # TODO: Get user from authentication once auth is implemented
        # For now, use default user
        default_user_email = "default@example.com"
        user = db.query(User).filter(User.email == default_user_email).first()
    else:
        # Try to find user by ID
        try:
            import uuid
            user_uuid = uuid.UUID(user_id)
            user = db.query(User).filter(User.id == user_uuid).first()
        except (ValueError, AttributeError):
            user = None
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    return user

@router.get("/status")
async def get_email_monitoring_status(
    user_id: str = Query("current", description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Get email monitoring status for user
    """
    user = get_user_from_id(user_id, db)
    
    has_google_token = user.google_access_token is not None
    is_monitoring_enabled = user.email_monitoring_enabled or False
    
    return {
        "has_google_token": has_google_token,
        "is_monitoring_enabled": is_monitoring_enabled,
        "can_monitor": has_google_token and is_monitoring_enabled
    }

@router.post("/monitor/enable")
async def enable_email_monitoring(
    user_id: str = Query("current", description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Enable email monitoring for deadline changes
    """
    user = get_user_from_id(user_id, db)
    
    if not user.google_access_token:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar not connected. Please connect your calendar first to enable email monitoring."
        )
    
    user.email_monitoring_enabled = True
    db.commit()
    
    return {"status": "success", "message": "Email monitoring enabled"}

@router.post("/monitor/disable")
async def disable_email_monitoring(
    user_id: str = Query("current", description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Disable email monitoring
    """
    user = get_user_from_id(user_id, db)
    
    user.email_monitoring_enabled = False
    db.commit()
    
    return {"status": "success", "message": "Email monitoring disabled"}

@router.get("/recent")
async def get_recent_emails(
    user_id: str = Query("current", description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Get recently processed emails
    """
    user = get_user_from_id(user_id, db)
    
    # Get recent email logs for this user
    email_logs = db.query(EmailLog).filter(
        EmailLog.user_id == user.id,
        EmailLog.is_processed == True
    ).order_by(
        EmailLog.processed_at.desc()
    ).limit(10).all()
    
    emails = []
    for log in email_logs:
        # Count changes detected
        changes_count = 0
        if log.contains_deadline_change and log.detected_changes:
            try:
                import json
                changes = json.loads(log.detected_changes) if isinstance(log.detected_changes, str) else log.detected_changes
                if isinstance(changes, list):
                    changes_count = len(changes)
                elif isinstance(changes, dict):
                    changes_count = 1
            except (json.JSONDecodeError, TypeError):
                changes_count = 1 if log.contains_deadline_change else 0
        
        emails.append({
            "id": str(log.id),
            "subject": log.subject or "",
            "sender": log.sender or "",
            "processed_at": log.processed_at.isoformat() if log.processed_at else "",
            "changes_detected": changes_count
        })
    
    return {"emails": emails}

@router.post("/check")
async def check_for_deadline_changes(
    user_id: str = Query("current", description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Manually trigger check for deadline changes in emails
    """
    user = get_user_from_id(user_id, db)
    
    if not user.google_access_token:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar not connected. Please connect your calendar first."
        )
    
    if not user.email_monitoring_enabled:
        raise HTTPException(
            status_code=400,
            detail="Email monitoring is not enabled. Please enable it first."
        )
    
    # Trigger the Celery task
    task = check_user_emails.delay(str(user.id))
    
    return {
        "status": "success",
        "message": "Email check initiated",
        "task_id": task.id
    }


@router.get("/email/{email_id}")
async def get_email_details(
    email_id: str = Path(..., description="Email log ID"),
    user_id: str = Query("current", description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific email
    """
    user = get_user_from_id(user_id, db)

    try:
        import uuid
        email_uuid = uuid.UUID(email_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid email ID")

    email_log = db.query(EmailLog).filter(
        EmailLog.id == email_uuid,
        EmailLog.user_id == user.id
    ).first()

    if not email_log:
        raise HTTPException(status_code=404, detail="Email not found")

    # Parse detected changes
    changes = []
    if email_log.detected_changes:
        try:
            changes_data = json.loads(email_log.detected_changes) if isinstance(email_log.detected_changes, str) else email_log.detected_changes

            # Handle both list and dict formats
            if isinstance(changes_data, dict):
                # If it's the result object from change handler
                if 'details' in changes_data:
                    changes = changes_data.get('details', [])
                elif 'changes' in changes_data:
                    changes = changes_data.get('changes', [])
                else:
                    changes = [changes_data]
            elif isinstance(changes_data, list):
                changes = changes_data
        except (json.JSONDecodeError, TypeError):
            changes = []

    return {
        "id": str(email_log.id),
        "gmail_message_id": email_log.gmail_message_id,
        "thread_id": email_log.thread_id,
        "subject": email_log.subject or "",
        "sender": email_log.sender or "",
        "body": email_log.body or "",
        "received_at": email_log.received_at.isoformat() if email_log.received_at else "",
        "processed_at": email_log.processed_at.isoformat() if email_log.processed_at else "",
        "contains_deadline_change": email_log.contains_deadline_change or False,
        "detected_changes": changes
    }


@router.get("/related")
async def get_related_emails(
    assignment_id: str = Query(None, description="Filter by assignment ID"),
    course_id: str = Query(None, description="Filter by course ID"),
    search_query: str = Query(None, description="Search query"),
    user_id: str = Query("current", description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Get emails related to a specific assignment or course
    """
    user = get_user_from_id(user_id, db)

    # Start with base query
    query = db.query(EmailLog).filter(
        EmailLog.user_id == user.id,
        EmailLog.is_processed == True
    )

    # Build search criteria
    search_terms = []

    if assignment_id:
        try:
            import uuid
            assignment_uuid = uuid.UUID(assignment_id)
            assignment = db.query(Assignment).filter(Assignment.id == assignment_uuid).first()
            if assignment:
                # Search for assignment title in email
                search_terms.append(assignment.title)
                if assignment.course:
                    search_terms.append(assignment.course.name)
                    search_terms.append(assignment.course.code)
        except (ValueError, AttributeError):
            pass

    if course_id:
        try:
            import uuid
            course_uuid = uuid.UUID(course_id)
            course = db.query(Course).filter(Course.id == course_uuid).first()
            if course:
                search_terms.append(course.name)
                search_terms.append(course.code)
        except (ValueError, AttributeError):
            pass

    if search_query:
        search_terms.append(search_query)

    # Apply search filters
    if search_terms:
        # Search in subject, body, or detected changes
        filters = []
        for term in search_terms:
            filters.append(EmailLog.subject.ilike(f"%{term}%"))
            filters.append(EmailLog.body.ilike(f"%{term}%"))

        from sqlalchemy import or_
        query = query.filter(or_(*filters))

    # Get results
    email_logs = query.order_by(EmailLog.received_at.desc()).limit(50).all()

    emails = []
    for log in email_logs:
        changes_count = 0
        if log.contains_deadline_change and log.detected_changes:
            try:
                changes = json.loads(log.detected_changes) if isinstance(log.detected_changes, str) else log.detected_changes
                if isinstance(changes, list):
                    changes_count = len(changes)
                elif isinstance(changes, dict):
                    if 'details' in changes:
                        changes_count = len(changes.get('details', []))
                    elif 'changes' in changes:
                        changes_count = len(changes.get('changes', []))
                    else:
                        changes_count = 1
            except (json.JSONDecodeError, TypeError):
                changes_count = 1 if log.contains_deadline_change else 0

        emails.append({
            "id": str(log.id),
            "gmail_message_id": log.gmail_message_id,
            "subject": log.subject or "",
            "sender": log.sender or "",
            "received_at": log.received_at.isoformat() if log.received_at else "",
            "processed_at": log.processed_at.isoformat() if log.processed_at else "",
            "changes_detected": changes_count,
            "contains_deadline_change": log.contains_deadline_change or False
        })

    return {
        "emails": emails,
        "count": len(emails),
        "search_terms": search_terms
    }

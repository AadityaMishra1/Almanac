from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db

router = APIRouter()

@router.get("/")
async def get_notifications(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all notifications for user
    """
    # TODO: Fetch notifications
    return {"notifications": []}

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db)
):
    """
    Mark a notification as read
    """
    # TODO: Update notification status
    return {"status": "success"}

@router.get("/unread/count")
async def get_unread_count(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get count of unread notifications
    """
    # TODO: Count unread notifications
    return {"count": 0}

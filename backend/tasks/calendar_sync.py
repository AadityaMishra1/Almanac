from tasks.celery_app import celery_app
from services.google_calendar import GoogleCalendarService
from core.database import SessionLocal
from models import User, Assignment, CalendarEvent
from datetime import datetime, timedelta

@celery_app.task(name='tasks.calendar_sync.sync_assignment_to_calendar')
def sync_assignment_to_calendar(assignment_id: str):
    """
    Sync a single assignment to Google Calendar

    Args:
        assignment_id: UUID of the assignment to sync
    """
    db = SessionLocal()

    try:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()

        if not assignment:
            return {"status": "error", "reason": "assignment not found"}

        user = assignment.course.user

        if not user.google_access_token:
            return {"status": "error", "reason": "no access token"}

        # Create calendar event
        calendar_service = GoogleCalendarService()

        # Check if event already exists
        existing_event = db.query(CalendarEvent).filter(
            CalendarEvent.assignment_id == assignment_id
        ).first()

        # Calculate event times (assignment due date with 2-hour reminder)
        end_time = assignment.due_date
        start_time = end_time - timedelta(hours=2)

        event_data = {
            'title': f"{assignment.course.name}: {assignment.title}",
            'description': assignment.description or f"Due: {assignment.due_date}",
            'start_time': start_time,
            'end_time': end_time
        }

        if existing_event and existing_event.google_event_id:
            # Update existing event
            google_event = calendar_service.update_event(
                user.google_access_token,
                existing_event.google_event_id,
                event_data
            )

            existing_event.title = event_data['title']
            existing_event.start_time = start_time
            existing_event.end_time = end_time
            existing_event.last_synced_at = datetime.utcnow()
            existing_event.is_synced = True

        else:
            # Create new event
            google_event = calendar_service.create_event(
                user.google_access_token,
                event_data
            )

            calendar_event = CalendarEvent(
                user_id=user.id,
                assignment_id=assignment_id,
                google_event_id=google_event['id'],
                calendar_id='primary',
                title=event_data['title'],
                description=event_data['description'],
                start_time=start_time,
                end_time=end_time,
                is_synced=True,
                last_synced_at=datetime.utcnow()
            )
            db.add(calendar_event)

        db.commit()

        return {"status": "success", "event_id": google_event['id']}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

    finally:
        db.close()

@celery_app.task(name='tasks.calendar_sync.sync_all_user_assignments')
def sync_all_user_assignments(user_id: str):
    """
    Sync all assignments for a user to their Google Calendar

    Args:
        user_id: UUID of the user
    """
    db = SessionLocal()

    try:
        assignments = db.query(Assignment).join(Assignment.course).filter(
            Assignment.course.has(user_id=user_id)
        ).all()

        synced_count = 0
        for assignment in assignments:
            result = sync_assignment_to_calendar.delay(str(assignment.id))
            if result:
                synced_count += 1

        return {"status": "success", "assignments_synced": synced_count}

    finally:
        db.close()

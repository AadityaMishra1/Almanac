from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models import Assignment, CalendarEvent, User, Course
from services.google_calendar import GoogleCalendarService
import logging
import json

logger = logging.getLogger(__name__)


class ChangeHandler:
    """
    Service for handling detected changes from email analysis
    """

    def __init__(self, db: Session):
        self.db = db
        self.calendar_service = GoogleCalendarService()

    def apply_changes(self, user_id: str, changes: List[Dict], email_log_id: str = None) -> Dict:
        """
        Apply detected deadline changes to assignments and calendar

        Args:
            user_id: UUID of the user
            changes: List of changes detected from email
            email_log_id: Optional ID of the email log for tracking

        Returns:
            Dict with results of applying changes
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"status": "error", "message": "User not found"}

        results = {
            "status": "success",
            "changes_applied": 0,
            "changes_failed": 0,
            "details": []
        }

        # Parse changes if it's a string
        if isinstance(changes, str):
            try:
                changes = json.loads(changes)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse changes JSON: {changes}")
                return {"status": "error", "message": "Invalid changes format"}

        for change in changes:
            try:
                change_type = change.get('type')

                if change_type == 'deadline_change':
                    result = self._handle_deadline_change(user, change)
                elif change_type == 'new_assignment':
                    result = self._handle_new_assignment(user, change)
                elif change_type == 'cancellation':
                    result = self._handle_cancellation(user, change)
                else:
                    result = {"success": False, "message": f"Unknown change type: {change_type}"}

                if result.get('success'):
                    results['changes_applied'] += 1
                else:
                    results['changes_failed'] += 1

                results['details'].append({
                    "change": change,
                    "result": result
                })

            except Exception as e:
                logger.error(f"Error applying change {change}: {str(e)}")
                results['changes_failed'] += 1
                results['details'].append({
                    "change": change,
                    "result": {"success": False, "message": str(e)}
                })

        self.db.commit()
        return results

    def _handle_deadline_change(self, user: User, change: Dict) -> Dict:
        """
        Handle a deadline change for an existing assignment
        """
        assignment_title = change.get('assignment_title')
        new_date_str = change.get('new_date')
        description = change.get('description', '')

        if not assignment_title or not new_date_str:
            return {"success": False, "message": "Missing required fields"}

        # Parse new date
        try:
            new_date = datetime.fromisoformat(new_date_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return {"success": False, "message": f"Invalid date format: {new_date_str}"}

        # Find the assignment - fuzzy match by title and user's courses
        assignment = self._find_assignment_by_title(user.id, assignment_title)

        if not assignment:
            return {"success": False, "message": f"Assignment not found: {assignment_title}"}

        # Store original due date if not already stored
        if not assignment.original_due_date:
            assignment.original_due_date = assignment.due_date

        # Update the assignment
        old_due_date = assignment.due_date
        assignment.due_date = new_date
        assignment.updated_at = datetime.utcnow()

        # Update calendar event if it exists
        calendar_event = self.db.query(CalendarEvent).filter(
            CalendarEvent.assignment_id == assignment.id,
            CalendarEvent.user_id == user.id
        ).first()

        if calendar_event and calendar_event.google_event_id:
            try:
                # Update Google Calendar event
                self.calendar_service.update_event(
                    access_token=user.google_access_token,
                    event_id=calendar_event.google_event_id,
                    event_data={
                        'start_time': new_date,
                        'end_time': new_date,
                        'description': f"{assignment.description or ''}\n\n⚠️ Deadline changed via email: {description}"
                    },
                    refresh_token=user.google_refresh_token
                )

                # Update local calendar event record
                calendar_event.start_time = new_date
                calendar_event.end_time = new_date
                calendar_event.last_synced_at = datetime.utcnow()
                calendar_event.is_synced = True

                logger.info(f"Updated Google Calendar event for assignment {assignment.id}")
            except Exception as e:
                logger.error(f"Failed to update Google Calendar event: {str(e)}")
                # Continue even if calendar update fails

        return {
            "success": True,
            "message": f"Updated deadline for '{assignment.title}' from {old_due_date} to {new_date}",
            "assignment_id": str(assignment.id)
        }

    def _handle_new_assignment(self, user: User, change: Dict) -> Dict:
        """
        Handle creation of a new assignment detected from email
        """
        assignment_title = change.get('assignment_title')
        due_date_str = change.get('new_date')
        description = change.get('description', '')
        course_name = change.get('course_name')

        if not assignment_title or not due_date_str:
            return {"success": False, "message": "Missing required fields"}

        # Parse due date
        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return {"success": False, "message": f"Invalid date format: {due_date_str}"}

        # Find or use a default course
        course = None
        if course_name:
            course = self._find_course_by_name(user.id, course_name)

        if not course:
            # Get user's first course or return error
            course = self.db.query(Course).filter(Course.user_id == user.id).first()
            if not course:
                return {"success": False, "message": "No course found for user"}

        # Check if assignment already exists
        existing = self._find_assignment_by_title(user.id, assignment_title)
        if existing:
            return {"success": False, "message": f"Assignment already exists: {assignment_title}"}

        # Create new assignment
        from models.assignment import Assignment, AssignmentType

        new_assignment = Assignment(
            course_id=course.id,
            title=assignment_title,
            description=description,
            due_date=due_date,
            assignment_type=AssignmentType.OTHER,
            extracted_from="email",
            source_reference=f"Detected from email analysis"
        )

        self.db.add(new_assignment)
        self.db.flush()  # Get the ID

        # Create calendar event if user has token
        if user.google_access_token:
            try:
                google_event = self.calendar_service.create_event(
                    access_token=user.google_access_token,
                    event_data={
                        'title': f"{course.code}: {assignment_title}",
                        'description': description,
                        'start_time': due_date,
                        'end_time': due_date
                    },
                    refresh_token=user.google_refresh_token
                )

                # Create local calendar event record
                calendar_event = CalendarEvent(
                    user_id=user.id,
                    assignment_id=new_assignment.id,
                    google_event_id=google_event['id'],
                    calendar_id='primary',
                    title=f"{course.code}: {assignment_title}",
                    description=description,
                    start_time=due_date,
                    end_time=due_date,
                    is_synced=True,
                    last_synced_at=datetime.utcnow()
                )
                self.db.add(calendar_event)

            except Exception as e:
                logger.error(f"Failed to create Google Calendar event: {str(e)}")
                # Continue even if calendar creation fails

        return {
            "success": True,
            "message": f"Created new assignment '{assignment_title}' in {course.name}",
            "assignment_id": str(new_assignment.id)
        }

    def _handle_cancellation(self, user: User, change: Dict) -> Dict:
        """
        Handle cancellation of an assignment
        """
        assignment_title = change.get('assignment_title')

        if not assignment_title:
            return {"success": False, "message": "Missing assignment title"}

        # Find the assignment
        assignment = self._find_assignment_by_title(user.id, assignment_title)

        if not assignment:
            return {"success": False, "message": f"Assignment not found: {assignment_title}"}

        # For now, we'll just add a note to the description rather than deleting
        # This is safer and preserves history
        assignment.description = (assignment.description or "") + "\n\n⚠️ CANCELLED via email notification"
        assignment.updated_at = datetime.utcnow()

        # Update calendar event to reflect cancellation
        calendar_event = self.db.query(CalendarEvent).filter(
            CalendarEvent.assignment_id == assignment.id,
            CalendarEvent.user_id == user.id
        ).first()

        if calendar_event and calendar_event.google_event_id:
            try:
                self.calendar_service.update_event(
                    access_token=user.google_access_token,
                    event_id=calendar_event.google_event_id,
                    event_data={
                        'title': f"[CANCELLED] {calendar_event.title}",
                        'description': f"{calendar_event.description}\n\n⚠️ CANCELLED via email notification"
                    },
                    refresh_token=user.google_refresh_token
                )

                calendar_event.title = f"[CANCELLED] {calendar_event.title}"
                calendar_event.last_synced_at = datetime.utcnow()

            except Exception as e:
                logger.error(f"Failed to update Google Calendar event for cancellation: {str(e)}")

        return {
            "success": True,
            "message": f"Marked assignment '{assignment.title}' as cancelled",
            "assignment_id": str(assignment.id)
        }

    def _find_assignment_by_title(self, user_id: str, title: str) -> Optional[Assignment]:
        """
        Find an assignment by fuzzy matching the title
        """
        # First try exact match
        assignment = self.db.query(Assignment).join(Assignment.course).filter(
            Assignment.course.has(user_id=user_id),
            Assignment.title == title
        ).first()

        if assignment:
            return assignment

        # Try case-insensitive match
        assignment = self.db.query(Assignment).join(Assignment.course).filter(
            Assignment.course.has(user_id=user_id),
            Assignment.title.ilike(f"%{title}%")
        ).first()

        return assignment

    def _find_course_by_name(self, user_id: str, course_name: str) -> Optional[Course]:
        """
        Find a course by fuzzy matching the name or code
        """
        # Try exact match on name
        course = self.db.query(Course).filter(
            Course.user_id == user_id,
            Course.name == course_name
        ).first()

        if course:
            return course

        # Try code match
        course = self.db.query(Course).filter(
            Course.user_id == user_id,
            Course.code == course_name
        ).first()

        if course:
            return course

        # Try case-insensitive partial match
        course = self.db.query(Course).filter(
            Course.user_id == user_id,
            Course.name.ilike(f"%{course_name}%")
        ).first()

        return course

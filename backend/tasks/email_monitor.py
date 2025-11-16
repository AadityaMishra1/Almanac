from tasks.celery_app import celery_app
from services.gmail_service import GmailService
from services.ai_parser import AIParser
from services.change_handler import ChangeHandler
from core.database import SessionLocal
from models import User, EmailLog, Assignment
from datetime import datetime, timedelta
import asyncio
import logging

logger = logging.getLogger(__name__)

@celery_app.task(name='tasks.email_monitor.check_user_emails')
def check_user_emails(user_id: str):
    """
    Check a specific user's emails for deadline changes

    Args:
        user_id: UUID of the user to check
    """
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user or not user.email_monitoring_enabled:
            return {"status": "skipped", "reason": "monitoring disabled"}

        if not user.google_access_token:
            return {"status": "error", "reason": "no access token"}

        # Get recent emails
        gmail_service = GmailService()
        messages = gmail_service.get_recent_messages(
            user.google_access_token,
            query="category:primary newer_than:1d",
            refresh_token=user.google_refresh_token
        )
        
        # Update token if it was refreshed
        if hasattr(gmail_service, '_updated_credentials'):
            updated_creds = gmail_service._updated_credentials
            user.google_access_token = updated_creds.token
            if updated_creds.token_expiry:
                user.google_token_expiry = updated_creds.expiry
            db.commit()

        # Filter out already processed emails
        processed_ids = {log.gmail_message_id for log in db.query(EmailLog.gmail_message_id).all()}
        new_messages = [msg for msg in messages if msg['id'] not in processed_ids]

        # Process each new email
        ai_parser = AIParser()
        changes_detected = 0

        for message in new_messages:
            # Get user's assignments for context
            assignments = db.query(Assignment).join(Assignment.course).filter(
                Assignment.course.has(user_id=user_id)
            ).all()

            assignments_data = [
                {
                    "title": a.title,
                    "due_date": a.due_date.isoformat(),
                    "course": a.course.name
                }
                for a in assignments
            ]

            # Detect changes (async function needs to be awaited)
            result = asyncio.run(ai_parser.detect_deadline_changes(
                message['body'],
                message['subject'],
                assignments_data
            ))

            # Parse date - it should be ISO format from GmailService, but handle fallback
            try:
                received_at = datetime.fromisoformat(message['date'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                # Fallback to current time if parsing fails
                received_at = datetime.utcnow()
            
            # Log the email
            email_log = EmailLog(
                user_id=user_id,
                gmail_message_id=message['id'],
                thread_id=message['thread_id'],
                subject=message['subject'],
                sender=message['sender'],
                body=message['body'],
                received_at=received_at,
                is_processed=True,
                contains_deadline_change=result.get('has_changes', False),
                detected_changes=str(result.get('changes', [])),
                processed_at=datetime.utcnow()
            )
            db.add(email_log)

            if result.get('has_changes'):
                changes_detected += 1

                # Apply detected changes
                try:
                    change_handler = ChangeHandler(db)
                    apply_result = change_handler.apply_changes(
                        user_id=user_id,
                        changes=result.get('changes', []),
                        email_log_id=str(email_log.id)
                    )
                    logger.info(f"Applied changes for email {message['id']}: {apply_result}")

                    # Update email log with application results
                    email_log.detected_changes = str(apply_result)
                except Exception as e:
                    logger.error(f"Failed to apply changes for email {message['id']}: {str(e)}")

        db.commit()

        return {
            "status": "success",
            "emails_processed": len(new_messages),
            "changes_detected": changes_detected
        }

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

    finally:
        db.close()

@celery_app.task(name='tasks.email_monitor.check_all_users_emails')
def check_all_users_emails():
    """
    Check emails for all users with monitoring enabled
    """
    db = SessionLocal()

    try:
        users = db.query(User).filter(
            User.email_monitoring_enabled == True,
            User.google_access_token.isnot(None)
        ).all()

        for user in users:
            check_user_emails.delay(str(user.id))

        return {"status": "success", "users_queued": len(users)}

    finally:
        db.close()

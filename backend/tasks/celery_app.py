from celery import Celery
from core.config import settings

celery_app = Celery(
    'ai_calendar',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['tasks.email_monitor', 'tasks.calendar_sync']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
)

# Celery Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    'check-emails-every-15-minutes': {
        'task': 'tasks.email_monitor.check_all_users_emails',
        'schedule': 900.0,  # 15 minutes in seconds
    },
}

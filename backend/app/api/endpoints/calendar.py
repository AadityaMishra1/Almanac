from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from core.database import get_db
from services.google_calendar import GoogleCalendarService
from datetime import datetime

router = APIRouter()

@router.get("/oauth/authorize")
async def authorize_google_calendar():
    """
    Redirect user to Google OAuth consent screen
    """
    calendar_service = GoogleCalendarService()
    auth_url = calendar_service.get_authorization_url()
    return {"auth_url": auth_url}

@router.get("/oauth/callback")
async def oauth_callback(code: str, db: Session = Depends(get_db)):
    """
    Handle OAuth callback from Google
    """
    from models.user import User
    import traceback
    
    try:
        calendar_service = GoogleCalendarService()
        tokens = await calendar_service.exchange_code_for_tokens(code)

        # TODO: Get user from authentication once auth is implemented
        # For now, use default user
        default_user_email = "default@example.com"
        user = db.query(User).filter(User.email == default_user_email).first()
        
        if not user:
            # Create default user if doesn't exist
            user = User(
                email=default_user_email,
                full_name="Default User",
                is_active=True
            )
            db.add(user)
            db.flush()  # Flush to get the user ID
        
        # Save tokens to user
        user.google_access_token = tokens["access_token"]
        user.google_refresh_token = tokens.get("refresh_token")
        user.google_token_expiry = tokens.get("token_expiry")
        
        db.commit()

        # Redirect to frontend dashboard instead of returning JSON
        return RedirectResponse(url="http://localhost:3000/dashboard?calendar_connected=true")
    except Exception as e:
        # Log the error for debugging
        error_msg = str(e)
        traceback.print_exc()
        print(f"OAuth callback error: {error_msg}")
        
        # Redirect to frontend with error message
        error_url = f"http://localhost:3000/dashboard?error={error_msg.replace(' ', '%20')}"
        return RedirectResponse(url=error_url)

@router.post("/sync")
async def sync_assignments_to_calendar(
    user_id: str = Query("current", description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Sync all user's assignments to Google Calendar
    """
    from models.user import User
    from models.assignment import Assignment
    from models.course import Course
    from models.calendar_event import CalendarEvent
    from datetime import timedelta
    from services.google_calendar import GoogleCalendarService
    
    # TODO: Get user from authentication once auth is implemented
    # For now, use default user
    default_user_email = "default@example.com"
    user = db.query(User).filter(User.email == default_user_email).first()
    
    if not user or not user.google_access_token:
        raise HTTPException(
            status_code=400, 
            detail="Google Calendar not connected. Please connect your calendar first."
        )
    
    # Get all assignments for this user
    assignments = db.query(Assignment).join(Course).filter(
        Course.user_id == user.id
    ).all()
    
    calendar_service = GoogleCalendarService()
    events_created = 0
    
    for assignment in assignments:
        try:
            # Check if event already exists
            existing_event = db.query(CalendarEvent).filter(
                CalendarEvent.assignment_id == assignment.id
            ).first()
            
            # Calculate event times (assignment due date with 2-hour reminder)
            end_time = assignment.due_date
            start_time = end_time - timedelta(hours=2)
            
            event_data = {
                'title': f"{assignment.course.name}: {assignment.title}",
                'description': assignment.description or f"Assignment due for {assignment.course.name}",
                'start_time': start_time,
                'end_time': end_time
            }
            
            if existing_event and existing_event.google_event_id:
                # Update existing event
                try:
                    google_event = calendar_service.update_event(
                        user.google_access_token,
                        existing_event.google_event_id,
                        event_data,
                        user.google_refresh_token
                    )
                    existing_event.title = event_data['title']
                    existing_event.start_time = start_time
                    existing_event.end_time = end_time
                    existing_event.last_synced_at = datetime.utcnow()
                    existing_event.is_synced = True
                except Exception as e:
                    # If update fails, try creating new event
                    print(f"Failed to update event {existing_event.google_event_id}: {str(e)}")
                    google_event = calendar_service.create_event(
                        user.google_access_token,
                        event_data,
                        user.google_refresh_token
                    )
                    existing_event.google_event_id = google_event['id']
                    existing_event.start_time = start_time
                    existing_event.end_time = end_time
                    existing_event.last_synced_at = datetime.utcnow()
                    existing_event.is_synced = True
            else:
                # Create new event
                google_event = calendar_service.create_event(
                    user.google_access_token,
                    event_data,
                    refresh_token=user.google_refresh_token
                )
                
                if not existing_event:
                    calendar_event = CalendarEvent(
                        user_id=user.id,
                        assignment_id=assignment.id,
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
                else:
                    existing_event.google_event_id = google_event['id']
                    existing_event.start_time = start_time
                    existing_event.end_time = end_time
                    existing_event.last_synced_at = datetime.utcnow()
                    existing_event.is_synced = True
                
                events_created += 1
            
        except Exception as e:
            print(f"Error syncing assignment {assignment.id}: {str(e)}")
            continue
    
    db.commit()
    
    return {"status": "success", "events_created": events_created}

@router.get("/events")
async def get_calendar_events(
    user_id: str = Query("current", description="User ID"),
    time_min: str = Query(None, description="Start time filter (ISO format)"),
    time_max: str = Query(None, description="End time filter (ISO format)"),
    db: Session = Depends(get_db)
):
    """
    Get all Google Calendar events for user (fetched directly from Google Calendar)
    """
    from models.user import User
    from datetime import datetime
    from services.google_calendar import GoogleCalendarService
    
    # TODO: Get user from authentication once auth is implemented
    # For now, use default user
    default_user_email = "default@example.com"
    user = db.query(User).filter(User.email == default_user_email).first()
    
    if not user or not user.google_access_token:
        return {"events": []}
    
    try:
        calendar_service = GoogleCalendarService()
        
        # Parse time filters if provided
        time_min_dt = None
        time_max_dt = None
        if time_min:
            time_min_dt = datetime.fromisoformat(time_min.replace('Z', '+00:00'))
        if time_max:
            time_max_dt = datetime.fromisoformat(time_max.replace('Z', '+00:00'))
        
        # Fetch events directly from Google Calendar
        google_events = calendar_service.list_events(
            user.google_access_token,
            time_min=time_min_dt,
            time_max=time_max_dt,
            refresh_token=user.google_refresh_token
        )
        
        # Update user's access token if it was refreshed
        if hasattr(calendar_service, '_updated_credentials'):
            updated_creds = calendar_service._updated_credentials
            user.google_access_token = updated_creds.token
            if updated_creds.token_expiry:
                user.google_token_expiry = updated_creds.expiry
            db.commit()
        
        # Transform Google Calendar events to our format
        events_data = []
        for event in google_events:
            # Skip cancelled events
            if event.get('status') == 'cancelled':
                continue
            
            start = event.get('start', {})
            end = event.get('end', {})
            
            # Handle both dateTime and date formats
            start_time = None
            end_time = None
            
            if 'dateTime' in start:
                start_time = datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00'))
            elif 'date' in start:
                start_time = datetime.fromisoformat(start['date'])
            
            if 'dateTime' in end:
                end_time = datetime.fromisoformat(end['dateTime'].replace('Z', '+00:00'))
            elif 'date' in end:
                end_time = datetime.fromisoformat(end['date'])
            
            events_data.append({
                "id": event.get('id'),
                "title": event.get('summary', 'Untitled Event'),
                "description": event.get('description', ''),
                "start_time": start_time.isoformat() if start_time else None,
                "end_time": end_time.isoformat() if end_time else None,
                "location": event.get('location', ''),
                "google_event_id": event.get('id'),
                "is_from_google": True  # Flag to distinguish from synced assignments
            })
        
        return {"events": events_data}
    except Exception as e:
        print(f"Error fetching Google Calendar events: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty list on error rather than failing
        return {"events": []}


@router.get("/unified-events")
async def get_unified_calendar_events(
    user_id: str = Query("current", description="User ID"),
    time_min: str = Query(None, description="Start time filter (ISO format)"),
    time_max: str = Query(None, description="End time filter (ISO format)"),
    db: Session = Depends(get_db)
):
    """
    Get unified calendar view combining assignments and Google Calendar events.
    Properly deduplicates synced assignments to avoid showing them twice.
    """
    from models.user import User
    from models.assignment import Assignment
    from models.course import Course
    from models.calendar_event import CalendarEvent
    from datetime import datetime
    from services.google_calendar import GoogleCalendarService

    # Get user
    default_user_email = "default@example.com"
    user = db.query(User).filter(User.email == default_user_email).first()

    if not user:
        return {"events": []}

    # Parse time filters
    time_min_dt = None
    time_max_dt = None
    if time_min:
        time_min_dt = datetime.fromisoformat(time_min.replace('Z', '+00:00'))
    if time_max:
        time_max_dt = datetime.fromisoformat(time_max.replace('Z', '+00:00'))

    unified_events = []
    synced_google_event_ids = set()

    # 1. Get all assignments from database
    assignments_query = db.query(Assignment).join(Course).filter(
        Course.user_id == user.id
    )

    # Apply time filters to assignments
    if time_min_dt:
        assignments_query = assignments_query.filter(Assignment.due_date >= time_min_dt)
    if time_max_dt:
        assignments_query = assignments_query.filter(Assignment.due_date <= time_max_dt)

    assignments = assignments_query.all()

    # Add assignments to unified list and track synced ones
    for assignment in assignments:
        # Check if this assignment has been synced to calendar
        calendar_event = db.query(CalendarEvent).filter(
            CalendarEvent.assignment_id == assignment.id,
            CalendarEvent.is_synced == True
        ).first()

        is_synced = calendar_event is not None
        if is_synced and calendar_event.google_event_id:
            synced_google_event_ids.add(calendar_event.google_event_id)

        unified_events.append({
            "id": str(assignment.id),
            "type": "assignment",
            "title": assignment.title,
            "description": assignment.description or "",
            "start_time": assignment.due_date.isoformat(),
            "end_time": assignment.due_date.isoformat(),
            "course_name": assignment.course.name if assignment.course else "",
            "course_code": assignment.course.code if assignment.course else "",
            "assignment_type": assignment.assignment_type.value if assignment.assignment_type else "other",
            "is_synced_to_calendar": is_synced,
            "google_event_id": calendar_event.google_event_id if calendar_event else None,
            "source": "database"
        })

    # 2. Get Google Calendar events (only if user has connected calendar)
    if user.google_access_token:
        try:
            calendar_service = GoogleCalendarService()
            google_events = calendar_service.list_events(
                user.google_access_token,
                time_min=time_min_dt,
                time_max=time_max_dt,
                refresh_token=user.google_refresh_token
            )

            # Update token if refreshed
            if hasattr(calendar_service, '_updated_credentials'):
                updated_creds = calendar_service._updated_credentials
                user.google_access_token = updated_creds.token
                if updated_creds.token_expiry:
                    user.google_token_expiry = updated_creds.expiry
                db.commit()

            # Add non-synced Google Calendar events
            for event in google_events:
                # Skip cancelled events
                if event.get('status') == 'cancelled':
                    continue

                event_id = event.get('id')

                # Skip if this event is a synced assignment (deduplication!)
                if event_id in synced_google_event_ids:
                    continue

                start = event.get('start', {})
                end = event.get('end', {})

                start_time = None
                end_time = None

                if 'dateTime' in start:
                    start_time = datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00'))
                elif 'date' in start:
                    start_time = datetime.fromisoformat(start['date'])

                if 'dateTime' in end:
                    end_time = datetime.fromisoformat(end['dateTime'].replace('Z', '+00:00'))
                elif 'date' in end:
                    end_time = datetime.fromisoformat(end['date'])

                unified_events.append({
                    "id": event_id,
                    "type": "calendar_event",
                    "title": event.get('summary', 'Untitled Event'),
                    "description": event.get('description', ''),
                    "start_time": start_time.isoformat() if start_time else None,
                    "end_time": end_time.isoformat() if end_time else None,
                    "location": event.get('location', ''),
                    "google_event_id": event_id,
                    "source": "google_calendar"
                })

        except Exception as e:
            print(f"Error fetching Google Calendar events: {str(e)}")
            # Continue with just assignments if Google Calendar fails

    # Sort by start time
    unified_events.sort(key=lambda x: x['start_time'] or '')

    return {
        "events": unified_events,
        "total_count": len(unified_events),
        "assignments_count": sum(1 for e in unified_events if e['type'] == 'assignment'),
        "calendar_events_count": sum(1 for e in unified_events if e['type'] == 'calendar_event')
    }

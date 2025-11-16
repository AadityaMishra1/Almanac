from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from fastapi import HTTPException
from core.config import settings
from datetime import datetime, timezone
from typing import Dict, List

class GoogleCalendarService:
    """
    Service for interacting with Google Calendar API
    """

    def __init__(self):
        self.scopes = settings.GMAIL_SCOPES

    def get_authorization_url(self) -> str:
        """
        Get Google OAuth authorization URL

        Returns:
            Authorization URL for user to visit
        """
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                }
            },
            scopes=self.scopes,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )

        return authorization_url

    async def exchange_code_for_tokens(self, code: str) -> Dict:
        """
        Exchange authorization code for access tokens

        Args:
            code: Authorization code from OAuth callback

        Returns:
            Dict with access_token, refresh_token, and expiry
        """
        try:
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                    }
                },
                scopes=self.scopes,
                redirect_uri=settings.GOOGLE_REDIRECT_URI
            )

            flow.fetch_token(code=code)
            credentials = flow.credentials

            if not credentials or not credentials.token:
                raise ValueError("Failed to obtain access token from Google")

            return {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,  # May be None if user already authorized
                "token_expiry": credentials.expiry
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange authorization code: {str(e)}"
            )

    def create_event(self, access_token: str, event_data: Dict, refresh_token: str = None) -> Dict:
        """
        Create a calendar event

        Args:
            access_token: User's Google access token
            event_data: Event details (title, start, end, description)
            refresh_token: Optional refresh token for token refresh

        Returns:
            Created event details
        """
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET
        )
        service = build('calendar', 'v3', credentials=credentials)

        # Format datetime properly for Google Calendar API
        def format_datetime(dt):
            if dt.tzinfo is None:
                # Naive datetime - format as UTC
                return dt.isoformat() + 'Z'
            else:
                # Timezone-aware - convert to UTC and format
                utc_dt = dt.astimezone(timezone.utc)
                return utc_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        event = {
            'summary': event_data['title'],
            'description': event_data.get('description', ''),
            'start': {
                'dateTime': format_datetime(event_data['start_time']),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': format_datetime(event_data['end_time']),
                'timeZone': 'UTC',
            },
        }

        created_event = service.events().insert(
            calendarId='primary',
            body=event
        ).execute()

        return created_event

    def update_event(self, access_token: str, event_id: str, event_data: Dict, refresh_token: str = None) -> Dict:
        """
        Update an existing calendar event

        Args:
            access_token: User's Google access token
            event_id: Google Calendar event ID
            event_data: Updated event details
            refresh_token: Optional refresh token for token refresh

        Returns:
            Updated event details
        """
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET
        )
        service = build('calendar', 'v3', credentials=credentials)

        event = service.events().get(
            calendarId='primary',
            eventId=event_id
        ).execute()

        # Format datetime properly for Google Calendar API
        def format_datetime(dt):
            if dt.tzinfo is None:
                # Naive datetime - format as UTC
                return dt.isoformat() + 'Z'
            else:
                # Timezone-aware - convert to UTC and format
                utc_dt = dt.astimezone(timezone.utc)
                return utc_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Update fields
        if 'title' in event_data:
            event['summary'] = event_data['title']
        if 'description' in event_data:
            event['description'] = event_data['description']
        if 'start_time' in event_data:
            event['start']['dateTime'] = format_datetime(event_data['start_time'])
        if 'end_time' in event_data:
            event['end']['dateTime'] = format_datetime(event_data['end_time'])

        updated_event = service.events().update(
            calendarId='primary',
            eventId=event_id,
            body=event
        ).execute()

        return updated_event

    def list_events(self, access_token: str, time_min: datetime = None, time_max: datetime = None, refresh_token: str = None) -> List[Dict]:
        """
        List calendar events

        Args:
            access_token: User's Google access token
            time_min: Optional start time filter
            time_max: Optional end time filter
            refresh_token: Optional refresh token for token refresh

        Returns:
            List of calendar events
        """
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET
        )
        
        # Refresh token if needed
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            # Store updated credentials for potential database update
            self._updated_credentials = credentials
        
        service = build('calendar', 'v3', credentials=credentials)

        params = {'calendarId': 'primary', 'singleEvents': True, 'orderBy': 'startTime', 'maxResults': 2500}

        if time_min:
            # Convert to UTC and format as RFC3339 for Google Calendar API
            if time_min.tzinfo is None:
                # Naive datetime - assume UTC
                params['timeMin'] = time_min.isoformat() + 'Z'
            else:
                # Timezone-aware datetime - convert to UTC
                utc_time_min = time_min.astimezone(timezone.utc)
                params['timeMin'] = utc_time_min.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        if time_max:
            # Convert to UTC and format as RFC3339 for Google Calendar API
            if time_max.tzinfo is None:
                # Naive datetime - assume UTC
                params['timeMax'] = time_max.isoformat() + 'Z'
            else:
                # Timezone-aware datetime - convert to UTC
                utc_time_max = time_max.astimezone(timezone.utc)
                params['timeMax'] = utc_time_max.strftime('%Y-%m-%dT%H:%M:%SZ')

        events_result = service.events().list(**params).execute()
        events = events_result.get('items', [])

        return events

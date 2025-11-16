from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from typing import List, Dict, Optional
from core.config import settings
from email.utils import parsedate_to_datetime
import base64
from datetime import datetime

class GmailService:
    """
    Service for interacting with Gmail API
    """

    def get_recent_messages(self, access_token: str, query: str = "category:primary", max_results: int = 10, refresh_token: Optional[str] = None) -> List[Dict]:
        """
        Get recent Gmail messages

        Args:
            access_token: User's Google access token
            query: Gmail search query
            max_results: Maximum number of messages to return

        Returns:
            List of message data
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
        
        service = build('gmail', 'v1', credentials=credentials)

        # Get message IDs
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=max_results
        ).execute()

        messages = results.get('messages', [])

        # Fetch full message details
        full_messages = []
        for message in messages:
            msg = service.users().messages().get(
                userId='me',
                id=message['id'],
                format='full'
            ).execute()
            full_messages.append(self._parse_message(msg))

        return full_messages

    def _parse_message(self, message: Dict) -> Dict:
        """
        Parse Gmail message into structured format

        Args:
            message: Raw Gmail message object

        Returns:
            Parsed message data
        """
        headers = message['payload']['headers']
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
        sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
        date_header = next((h['value'] for h in headers if h['name'] == 'Date'), '')

        # Parse date - prefer internalDate (Unix timestamp in ms) if available, else parse header
        date_obj = None
        if 'internalDate' in message:
            # Gmail API provides internalDate as Unix timestamp in milliseconds
            date_obj = datetime.fromtimestamp(int(message['internalDate']) / 1000.0)
        elif date_header:
            try:
                date_obj = parsedate_to_datetime(date_header)
            except (ValueError, TypeError):
                date_obj = None
        
        # Format date as ISO string if we have a datetime object, otherwise keep header string
        date_str = date_obj.isoformat() if date_obj else date_header

        # Extract body
        body = ''
        if 'parts' in message['payload']:
            for part in message['payload']['parts']:
                if part['mimeType'] == 'text/plain':
                    if 'data' in part['body']:
                        body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                        break
        elif 'body' in message['payload'] and 'data' in message['payload']['body']:
            body = base64.urlsafe_b64decode(message['payload']['body']['data']).decode('utf-8')

        return {
            'id': message['id'],
            'thread_id': message['threadId'],
            'subject': subject,
            'sender': sender,
            'date': date_str,
            'body': body,
            'snippet': message.get('snippet', '')
        }

    def get_messages_by_query(self, access_token: str, query: str, refresh_token: Optional[str] = None) -> List[Dict]:
        """
        Search Gmail messages by query

        Args:
            access_token: User's Google access token
            query: Gmail search query (e.g., "from:professor@university.edu")
            refresh_token: Optional refresh token for token refresh

        Returns:
            List of matching messages
        """
        return self.get_recent_messages(access_token, query=query, max_results=50, refresh_token=refresh_token)

import re
from datetime import datetime, timedelta
from typing import List, Dict
import dateparser

class AIParser:
    """
    Service for parsing syllabi using rule-based parsing (NO AI NEEDED!)

    Uses regex patterns and date parsing libraries.
    Surprisingly effective for most syllabi!

    Pros:
    - Completely free forever
    - No API needed
    - Very fast
    - No dependencies on external services

    Cons:
    - Less intelligent than AI
    - Might miss some complex deadline descriptions
    - Needs well-formatted syllabi
    """

    def __init__(self):
        # Common assignment keywords
        self.assignment_keywords = [
            r'assignment\s*\d+',
            r'homework\s*\d+',
            r'hw\s*\d+',
            r'quiz\s*\d+',
            r'exam\s*\d+',
            r'midterm',
            r'final',
            r'project\s*\d*',
            r'lab\s*\d+',
            r'presentation',
            r'paper',
            r'essay'
        ]

        # Date patterns
        self.date_patterns = [
            r'\d{1,2}/\d{1,2}/\d{2,4}',  # MM/DD/YYYY or M/D/YY
            r'\d{4}-\d{2}-\d{2}',         # YYYY-MM-DD
            r'\w+ \d{1,2},? \d{4}',       # Month DD, YYYY
            r'\d{1,2} \w+ \d{4}',         # DD Month YYYY
        ]

    async def parse_syllabus(self, syllabus_text: str, course_name: str = None) -> List[Dict]:
        """
        Parse syllabus text and extract assignment information

        Args:
            syllabus_text: Raw text from syllabus
            course_name: Optional course name for context

        Returns:
            List of assignments with titles, dates, and types
        """
        assignments = []
        lines = syllabus_text.split('\n')

        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            # Check if line contains assignment keyword
            assignment_match = None
            for pattern in self.assignment_keywords:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    assignment_match = match
                    break

            if not assignment_match:
                continue

            # Found an assignment, now look for date
            # Check current line and next few lines for dates
            date_found = None
            description = line

            for j in range(i, min(i + 3, len(lines))):
                check_line = lines[j]

                for date_pattern in self.date_patterns:
                    date_match = re.search(date_pattern, check_line)
                    if date_match:
                        date_str = date_match.group()
                        # Parse the date
                        parsed_date = dateparser.parse(date_str)
                        if parsed_date:
                            # If year is in the past, assume next year
                            if parsed_date.year < datetime.now().year:
                                parsed_date = parsed_date.replace(year=datetime.now().year + 1)
                            elif parsed_date.year == datetime.now().year and parsed_date < datetime.now():
                                parsed_date = parsed_date.replace(year=datetime.now().year + 1)

                            # Set time to 23:59:59 if not specified
                            if parsed_date.hour == 0 and parsed_date.minute == 0:
                                parsed_date = parsed_date.replace(hour=23, minute=59, second=59)

                            date_found = parsed_date
                            break

                if date_found:
                    break

            if not date_found:
                continue

            # Determine assignment type
            assignment_type = "other"
            line_lower = line.lower()
            if "exam" in line_lower or "midterm" in line_lower or "final" in line_lower:
                assignment_type = "exam"
            elif "quiz" in line_lower:
                assignment_type = "quiz"
            elif "project" in line_lower:
                assignment_type = "project"
            elif "presentation" in line_lower:
                assignment_type = "presentation"
            elif "homework" in line_lower or "hw" in line_lower or "assignment" in line_lower:
                assignment_type = "homework"

            # Extract title (clean up the line)
            title = assignment_match.group()
            # Capitalize properly
            title = ' '.join(word.capitalize() for word in title.split())

            assignments.append({
                "title": title,
                "description": description[:200] if len(description) > 200 else description,
                "due_date": date_found.strftime("%Y-%m-%d %H:%M:%S"),
                "assignment_type": assignment_type
            })

        return assignments

    async def detect_deadline_changes(self, email_body: str, email_subject: str, existing_assignments: List[Dict]) -> Dict:
        """
        Detect if an email contains deadline changes

        Args:
            email_body: Email body text
            email_subject: Email subject line
            existing_assignments: List of existing assignments to check against

        Returns:
            Dict with detected changes
        """
        changes = []
        text = (email_subject + " " + email_body).lower()

        # Keywords indicating deadline change
        change_keywords = [
            'postponed', 'delayed', 'extended', 'moved', 'rescheduled',
            'new deadline', 'new due date', 'deadline change', 'due date change'
        ]

        has_change_keyword = any(keyword in text for keyword in change_keywords)

        if not has_change_keyword:
            return {"has_changes": False, "changes": []}

        # Look for dates in the email
        dates_found = []
        for date_pattern in self.date_patterns:
            matches = re.finditer(date_pattern, email_body, re.IGNORECASE)
            for match in matches:
                date_str = match.group()
                parsed_date = dateparser.parse(date_str)
                if parsed_date:
                    dates_found.append(parsed_date)

        if not dates_found:
            return {"has_changes": False, "changes": []}

        # Try to match with existing assignments
        for assignment in existing_assignments:
            title_lower = assignment['title'].lower()
            # Simple keyword matching
            keywords = title_lower.split()
            email_mentions_assignment = any(keyword in text for keyword in keywords if len(keyword) > 3)

            if email_mentions_assignment and dates_found:
                # Assume the first date found is the new deadline
                new_date = dates_found[0]
                old_date = assignment.get('due_date')

                changes.append({
                    "type": "deadline_change",
                    "assignment_title": assignment['title'],
                    "old_date": old_date,
                    "new_date": new_date.strftime("%Y-%m-%d %H:%M:%S"),
                    "description": f"Deadline appears to be changed based on email"
                })

        return {
            "has_changes": len(changes) > 0,
            "changes": changes
        }

from groq import Groq
from core.config import settings
from typing import List, Dict
import json

class AIParser:
    """
    Service for parsing syllabi and emails using Groq (FREE & FAST!)

    Groq free tier:
    - 30 requests per minute
    - 14,400 requests per day
    - No credit card required
    - Extremely fast inference (faster than paid APIs!)

    Get free API key: https://console.groq.com/keys
    """

    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "llama-3.1-70b-versatile"  # or "llama-3.1-8b-instant" for faster

    async def parse_syllabus(self, syllabus_text: str, course_name: str = None) -> List[Dict]:
        """
        Parse syllabus text and extract assignment information

        Args:
            syllabus_text: Raw text from syllabus
            course_name: Optional course name for context

        Returns:
            List of assignments with titles, dates, and types
        """
        prompt = f"""You are an expert at parsing course syllabi. Extract all assignments, exams, projects, and deadlines from the following syllabus.

Course: {course_name or "Not specified"}

Syllabus Text:
{syllabus_text}

Please return a JSON array of assignments with the following structure:
[
  {{
    "title": "Assignment title",
    "description": "Brief description if available",
    "due_date": "YYYY-MM-DD HH:MM:SS",
    "assignment_type": "homework|exam|project|quiz|presentation|other"
  }}
]

Rules:
- Extract ALL assignments, homework, exams, projects, quizzes, presentations
- Parse dates carefully - use 2025 as the year if not specified
- If only a date is given (no time), use 23:59:59 as the due time
- If the assignment type is unclear, use "other"
- If no description is available, use null
- Return ONLY valid JSON, no markdown formatting or additional text"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=4096
            )

            response_text = response.choices[0].message.content.strip()

            # Clean response - remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "").strip()

            assignments = json.loads(response_text)
            return assignments

        except Exception as e:
            raise Exception(f"Error parsing syllabus with Groq: {str(e)}")

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
        assignments_context = json.dumps(existing_assignments, indent=2)

        prompt = f"""You are an expert at detecting assignment deadline changes in course-related emails.

Email Subject: {email_subject}

Email Body:
{email_body}

Existing Assignments:
{assignments_context}

Analyze this email and determine if it contains any deadline changes, new assignments, or cancellations.

Return a JSON object with this structure:
{{
  "has_changes": true/false,
  "changes": [
    {{
      "type": "deadline_change|new_assignment|cancellation",
      "assignment_title": "Assignment title",
      "old_date": "YYYY-MM-DD HH:MM:SS or null",
      "new_date": "YYYY-MM-DD HH:MM:SS or null",
      "description": "Brief explanation of the change"
    }}
  ]
}}

Return ONLY valid JSON, no markdown formatting or additional text."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=2048
            )

            response_text = response.choices[0].message.content.strip()

            # Clean response
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "").strip()

            result = json.loads(response_text)
            return result

        except Exception as e:
            raise Exception(f"Error detecting deadline changes with Groq: {str(e)}")

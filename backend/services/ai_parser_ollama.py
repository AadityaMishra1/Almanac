import requests
from typing import List, Dict
import json

class AIParser:
    """
    Service for parsing syllabi and emails using Ollama (LOCAL, FREE!)

    Ollama runs AI models locally on your computer:
    - Completely free forever
    - No API keys needed
    - Unlimited requests
    - Works offline
    - Your data never leaves your computer

    Setup:
    1. Install Ollama: https://ollama.com/download
    2. Run: ollama pull llama3.2
    3. Start: ollama serve (runs in background)
    4. Done!
    """

    def __init__(self):
        self.api_url = "http://localhost:11434/api/generate"
        self.model = "llama3.2"  # or "llama3.2:3b" for faster, "mistral" also good

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
            response = requests.post(
                self.api_url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"  # Forces JSON output
                },
                timeout=120  # 2 minutes timeout for local processing
            )

            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code}")

            result = response.json()
            response_text = result.get("response", "")

            # Clean response - remove markdown code blocks if present
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "").strip()

            assignments = json.loads(response_text)
            return assignments

        except requests.exceptions.ConnectionError:
            raise Exception(
                "Cannot connect to Ollama. Is it running?\n"
                "1. Install: https://ollama.com/download\n"
                "2. Run: ollama pull llama3.2\n"
                "3. Start: ollama serve"
            )
        except Exception as e:
            raise Exception(f"Error parsing syllabus with Ollama: {str(e)}")

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
            response = requests.post(
                self.api_url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                },
                timeout=120
            )

            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code}")

            result = response.json()
            response_text = result.get("response", "")

            # Clean response
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "").strip()

            changes = json.loads(response_text)
            return changes

        except Exception as e:
            raise Exception(f"Error detecting deadline changes with Ollama: {str(e)}")

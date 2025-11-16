import google.generativeai as genai
from core.config import settings
from typing import List, Dict, Optional
import json
import tempfile
import os
import logging
from datetime import datetime
from services.date_utils import DateValidator

logger = logging.getLogger(__name__)


class AIParser:
    """
    Enhanced service for parsing syllabi and emails using Google Gemini API

    Improvements:
    - Few-shot learning with examples
    - Structured output with validation
    - Date confidence scoring
    - Better context awareness
    - Handling of various date formats and ambiguous dates
    - Retry logic with different strategies

    Gemini 1.5 Flash free tier limits:
    - 15 requests per minute
    - 1,500 requests per day
    - 1 million requests per month
    """

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        self.date_validator = DateValidator()

    def _get_enhanced_prompt(self, course_name: Optional[str], table_context: str, has_pdf: bool) -> str:
        """
        Generate enhanced prompt with few-shot examples and detailed instructions

        Args:
            course_name: Optional course name
            table_context: Formatted table data
            has_pdf: Whether we have a PDF file (vs text)

        Returns:
            Enhanced prompt string
        """
        current_year = datetime.now().year
        next_year = current_year + 1

        prompt = f"""You are an EXPERT syllabus parser specializing in extracting assignment deadlines from course syllabi. You have analyzed thousands of syllabi and are highly accurate at identifying dates, assignment types, and handling various formats.

COURSE INFORMATION:
Course Name: {course_name or "Not specified"}
Current Date: {datetime.now().strftime('%Y-%m-%d')}
Academic Year: {current_year}-{next_year}

CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. DATE PARSING (MOST IMPORTANT):
   - Extract dates in EXACTLY this format: YYYY-MM-DD HH:MM:SS
   - If only date is given (no time), use 23:59:59 as default
   - Common date formats you'll encounter:
     * MM/DD/YYYY (e.g., "09/15/2025" → "2025-09-15 23:59:59")
     * Month Day, Year (e.g., "September 15, 2025" → "2025-09-15 23:59:59")
     * Day Month Year (e.g., "15 September 2025" → "2025-09-15 23:59:59")
     * Week-based (e.g., "Week 3" → calculate from semester start, typically early September)
     * Relative (e.g., "Monday of Week 5" → calculate date)

   - If year is missing, use {next_year} if month is Jan-May, else use {current_year}
   - NEVER use dates in the past unless explicitly stated
   - For "Week X" format: assume Week 1 starts in late August/early September

2. ASSIGNMENT TYPE DETECTION:
   Must be one of: homework, exam, project, quiz, presentation, other

   Detection rules:
   - "homework" → HW, Assignment, Problem Set, Exercise
   - "exam" → Exam, Test, Midterm, Final
   - "project" → Project, Paper, Report, Essay
   - "quiz" → Quiz, Pop Quiz
   - "presentation" → Presentation, Talk, Demo
   - "other" → anything else

3. TITLE EXTRACTION:
   - Use the exact title from the syllabus
   - If no specific title, create descriptive one (e.g., "Homework 1", "Midterm Exam")
   - Include assignment numbers (e.g., "Assignment 3" not just "Assignment")

4. DESCRIPTION:
   - Extract any available description, notes, or topics covered
   - If none available, use null (not empty string)
   - Keep it concise (1-2 sentences max)

5. TABLE PARSING:
   - Tables often contain the MOST IMPORTANT date information
   - Look for columns like: Date, Due Date, Assignment, Week, Topic
   - Cross-reference table data with text descriptions
   - Tables may have headers in first row

6. HANDLING AMBIGUITY:
   - If date format is ambiguous (MM/DD vs DD/MM), prefer MM/DD (US format)
   - If assignment type is unclear, use "other"
   - If multiple dates mentioned, use the DUE date (not assigned date)

---

FEW-SHOT EXAMPLES (Learn from these):

EXAMPLE 1 - Simple table format:
Input: "Week 3 - September 15 - Homework 1 Due"
Output:
{{
  "title": "Homework 1",
  "description": "Week 3 assignment",
  "due_date": "{current_year}-09-15 23:59:59",
  "assignment_type": "homework"
}}

EXAMPLE 2 - Multiple format dates:
Input: "Midterm Exam: 10/15/{current_year} at 2:00 PM"
Output:
{{
  "title": "Midterm Exam",
  "description": null,
  "due_date": "{current_year}-10-15 14:00:00",
  "assignment_type": "exam"
}}

EXAMPLE 3 - Week-based with day:
Input: "Final Project - Due Monday, Week 15"
Output:
{{
  "title": "Final Project",
  "description": null,
  "due_date": "{current_year}-12-11 23:59:59",
  "assignment_type": "project"
}}

EXAMPLE 4 - Table row:
Table: "9/20/{current_year} | Assignment 2 | Chapter 3-4"
Output:
{{
  "title": "Assignment 2",
  "description": "Chapter 3-4",
  "due_date": "{current_year}-09-20 23:59:59",
  "assignment_type": "homework"
}}

---

"""

        # Add table context if available
        if table_context:
            prompt += f"""
EXTRACTED TABLES FROM PDF:
{table_context}

IMPORTANT: These tables likely contain the PRIMARY source of assignment dates. Parse them CAREFULLY.
Look for patterns in rows and columns. Headers might be in the first row.

---

"""

        # Add specific instructions based on whether we have PDF or text
        if has_pdf:
            prompt += """
PDF ANALYSIS INSTRUCTIONS:
- This is a PDF document - look at BOTH visual layout AND text content
- Pay special attention to:
  * Tables and charts (often color-coded)
  * Bolded or highlighted dates
  * Section headers and course schedules
  * Calendar views or timeline graphics
- Don't miss assignments in:
  * Header/footer sections
  * Sidebar schedules
  * Embedded tables or charts

"""

        prompt += """
OUTPUT FORMAT:
Return a valid JSON array with this EXACT structure (no markdown, no code blocks):

[
  {
    "title": "Assignment title (string, required)",
    "description": "Brief description (string or null)",
    "due_date": "YYYY-MM-DD HH:MM:SS (string, required, EXACT format)",
    "assignment_type": "one of: homework|exam|project|quiz|presentation|other (string, required)"
  }
]

VALIDATION CHECKLIST (before returning):
✓ All dates in YYYY-MM-DD HH:MM:SS format
✓ All dates are in the future (or very recent past)
✓ All assignment_type values are one of the allowed types
✓ No markdown formatting (no ```json or ``` blocks)
✓ Valid JSON syntax (proper quotes, commas, brackets)
✓ All required fields present (title, due_date, assignment_type)

EXTRACT ALL ASSIGNMENTS NOW:
"""

        return prompt

    async def parse_syllabus_from_pdf(self, pdf_content: bytes, course_name: str = None, tables: Optional[List[Dict]] = None) -> List[Dict]:
        """
        Parse syllabus PDF directly and extract assignment information with enhanced accuracy

        Args:
            pdf_content: Raw PDF file bytes
            course_name: Optional course name for context
            tables: Optional list of extracted tables from PDF

        Returns:
            List of validated assignments with confidence scores
        """
        # Save PDF temporarily for Gemini to read
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(pdf_content)
            tmp_path = tmp_file.name

        try:
            # Upload the PDF file to Gemini
            uploaded_file = genai.upload_file(tmp_path)

            # Format tables for prompt if provided
            table_context = ""
            if tables:
                from services.pdf_parser import PDFParser
                pdf_parser = PDFParser()
                table_context = pdf_parser.format_tables_for_prompt(tables)

            # Generate enhanced prompt
            prompt = self._get_enhanced_prompt(course_name, table_context, has_pdf=True)

            # Generate content with retry logic
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    logger.info(f"Attempting to parse PDF with Gemini (attempt {attempt + 1}/{max_retries})")

                    response = self.model.generate_content(
                        [uploaded_file, prompt],
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.1,  # Low temperature for more consistent output
                        )
                    )

                    # Clean response
                    response_text = self._clean_response(response.text)

                    # Parse JSON
                    assignments = json.loads(response_text)

                    # Validate and enrich assignments
                    validated_assignments = self._validate_and_enrich_assignments(assignments)

                    logger.info(f"Successfully parsed {len(validated_assignments)} assignments from PDF")
                    return validated_assignments

                except json.JSONDecodeError as e:
                    logger.warning(f"JSON parsing failed (attempt {attempt + 1}): {e}")
                    if attempt == max_retries - 1:
                        # Last attempt failed
                        logger.error(f"All parsing attempts failed. Response was: {response_text[:500]}")
                        raise Exception(f"Failed to parse valid JSON from AI response: {str(e)}")
                except Exception as e:
                    logger.warning(f"Parsing attempt {attempt + 1} failed: {e}")
                    if attempt == max_retries - 1:
                        raise

            raise Exception("Failed to parse syllabus after all retries")

        except Exception as e:
            logger.error(f"Error parsing syllabus with Gemini: {str(e)}")
            raise Exception(f"Error parsing syllabus with Gemini: {str(e)}")

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception as e:
                    logger.error(f"Failed to delete temp file: {e}")

    async def parse_syllabus(self, syllabus_text: str, course_name: str = None, tables: Optional[List[Dict]] = None) -> List[Dict]:
        """
        Parse syllabus text and extract assignment information (fallback method)

        Args:
            syllabus_text: Raw text from syllabus
            course_name: Optional course name for context
            tables: Optional list of extracted tables from PDF

        Returns:
            List of validated assignments with confidence scores
        """
        # Format tables for prompt if provided
        table_context = ""
        if tables:
            from services.pdf_parser import PDFParser
            pdf_parser = PDFParser()
            table_context = pdf_parser.format_tables_for_prompt(tables)

        # Generate enhanced prompt
        prompt = self._get_enhanced_prompt(course_name, table_context, has_pdf=False)

        # Add syllabus text
        prompt += f"\n\nSYLLABUS TEXT:\n{syllabus_text}\n"

        try:
            logger.info("Attempting to parse syllabus text with Gemini")

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                )
            )

            # Clean response
            response_text = self._clean_response(response.text)

            # Parse JSON
            assignments = json.loads(response_text)

            # Validate and enrich assignments
            validated_assignments = self._validate_and_enrich_assignments(assignments)

            logger.info(f"Successfully parsed {len(validated_assignments)} assignments from text")
            return validated_assignments

        except Exception as e:
            logger.error(f"Error parsing syllabus text with Gemini: {str(e)}")
            raise Exception(f"Error parsing syllabus with Gemini: {str(e)}")

    def _clean_response(self, response_text: str) -> str:
        """
        Clean AI response to extract valid JSON

        Args:
            response_text: Raw response from AI

        Returns:
            Cleaned JSON string
        """
        response_text = response_text.strip()

        # Remove markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "", 1)
        if response_text.startswith("```"):
            response_text = response_text.replace("```", "", 1)
        if response_text.endswith("```"):
            response_text = response_text.rsplit("```", 1)[0]

        response_text = response_text.strip()

        return response_text

    def _validate_and_enrich_assignments(self, assignments: List[Dict]) -> List[Dict]:
        """
        Validate assignments and add confidence scores, warnings

        Args:
            assignments: Raw assignments from AI

        Returns:
            Validated and enriched assignments
        """
        if not isinstance(assignments, list):
            raise ValueError("Assignments must be a list")

        validated = []

        for idx, assignment in enumerate(assignments):
            try:
                # Validate required fields
                if not isinstance(assignment, dict):
                    logger.warning(f"Assignment {idx} is not a dictionary, skipping")
                    continue

                if 'title' not in assignment or not assignment['title']:
                    logger.warning(f"Assignment {idx} missing title, skipping")
                    continue

                if 'due_date' not in assignment:
                    logger.warning(f"Assignment {idx} missing due_date, skipping")
                    continue

                if 'assignment_type' not in assignment:
                    logger.warning(f"Assignment {idx} missing assignment_type, skipping")
                    continue

                # Validate assignment type
                valid_types = ['homework', 'exam', 'project', 'quiz', 'presentation', 'other']
                if assignment['assignment_type'].lower() not in valid_types:
                    logger.warning(f"Invalid assignment type '{assignment['assignment_type']}', defaulting to 'other'")
                    assignment['assignment_type'] = 'other'

                # Validate and parse date
                due_date = assignment['due_date']
                date_confidence = 0.8  # Default confidence

                if isinstance(due_date, str):
                    # Try to parse the date
                    parse_result = self.date_validator.parse_date(due_date, assignment['title'])

                    if parse_result:
                        parsed_date, date_confidence = parse_result
                        assignment['due_date'] = parsed_date.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        # If parsing failed, log and skip
                        logger.warning(f"Could not parse date '{due_date}' for assignment '{assignment['title']}'")
                        continue

                # Add confidence score (based on date confidence and field completeness)
                field_score = 0.9 if assignment.get('description') else 0.7
                assignment['confidence_score'] = (date_confidence + field_score) / 2

                # Add warnings
                warnings = []

                # Check if date confidence is low
                if date_confidence < 0.7:
                    warnings.append("Low confidence date parsing")

                # Check if description is missing
                if not assignment.get('description'):
                    warnings.append("No description provided")

                # Detect ambiguous dates
                if isinstance(due_date, str):
                    date_warnings = self.date_validator.detect_date_ambiguity(due_date)
                    warnings.extend(date_warnings)

                assignment['warnings'] = warnings if warnings else None

                validated.append(assignment)

            except Exception as e:
                logger.error(f"Error validating assignment {idx}: {e}")
                continue

        # Sort by due date
        try:
            validated.sort(key=lambda x: x['due_date'])
        except:
            pass

        return validated

    async def detect_deadline_changes(self, email_body: str, email_subject: str, existing_assignments: List[Dict]) -> Dict:
        """
        Detect if an email contains deadline changes with enhanced accuracy

        Args:
            email_body: Email body text
            email_subject: Email subject line
            existing_assignments: List of existing assignments to check against

        Returns:
            Dict with detected changes and confidence scores
        """
        assignments_context = json.dumps(existing_assignments, indent=2)

        prompt = f"""You are an expert at detecting assignment deadline changes in course-related emails.

Current Date: {datetime.now().strftime('%Y-%m-%d')}

Email Subject: {email_subject}

Email Body:
{email_body}

Existing Assignments (for reference):
{assignments_context}

TASK: Analyze this email and determine if it contains any deadline changes, new assignments, or cancellations.

DETECTION RULES:
1. Look for keywords: "postponed", "extended", "moved", "rescheduled", "new deadline", "due date changed"
2. Look for new assignments not in the existing list
3. Look for cancellations: "cancelled", "canceled", "no longer required"
4. Extract EXACT dates in YYYY-MM-DD HH:MM:SS format
5. Match assignments to existing ones by title similarity

OUTPUT FORMAT (valid JSON only, no markdown):
{{
  "has_changes": true or false,
  "confidence": 0.0 to 1.0,
  "changes": [
    {{
      "type": "deadline_change" or "new_assignment" or "cancellation",
      "assignment_title": "exact assignment title",
      "old_date": "YYYY-MM-DD HH:MM:SS" or null,
      "new_date": "YYYY-MM-DD HH:MM:SS" or null,
      "description": "brief explanation",
      "confidence": 0.0 to 1.0
    }}
  ]
}}

Return ONLY valid JSON, no markdown formatting or additional text.
"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                )
            )

            # Clean response
            response_text = self._clean_response(response.text)

            # Parse JSON
            result = json.loads(response_text)

            logger.info(f"Detected {len(result.get('changes', []))} deadline changes")
            return result

        except Exception as e:
            logger.error(f"Error detecting deadline changes: {str(e)}")
            raise Exception(f"Error detecting deadline changes with Gemini: {str(e)}")

"""
AI extraction module using Google Gemini 1.5 Flash.
Extracts course assignments and due dates from images/text.
"""

from google import genai
from google.genai import types
from PIL import Image
from typing import List, Dict, Any, Optional
import json
import os
from dotenv import load_dotenv
import logging
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class Assignment(BaseModel):
    """Schema for a single assignment."""
    title: str = Field(description="Name or title of the assignment")
    due_date: str = Field(description="Due date in ISO 8601 format (YYYY-MM-DD)")
    description: Optional[str] = Field(None, description="Additional details about the assignment")
    assignment_type: Optional[str] = Field(None, description="Type: homework, exam, project, quiz, etc.")

    @field_validator('due_date')
    @classmethod
    def validate_date_format(cls, v):
        """Ensure date is in ISO 8601 format."""
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            # If it's a relative date like "Week 5", flag it
            if any(word in v.lower() for word in ['week', 'day', 'month']):
                logger.warning(f"Relative date detected: {v} - needs manual review")
                return v
            raise ValueError(f"Date must be in YYYY-MM-DD format, got: {v}")


class CourseSchedule(BaseModel):
    """Schema for the complete course schedule."""
    course_name: Optional[str] = Field(None, description="Name of the course")
    assignments: List[Assignment] = Field(description="List of all assignments with due dates")


# System prompt for Gemini
EXTRACTION_PROMPT = """You are a syllabus and course calendar parser. Your task is to extract ALL assignments, exams, projects, and due dates from the provided document.

CRITICAL INSTRUCTIONS:
1. Extract EVERY assignment, exam, project, quiz, or deliverable mentioned
2. For dates:
   - ALWAYS use ISO 8601 format: YYYY-MM-DD
   - If you see "Week 5" or relative dates without a specific date, return the string exactly as written (e.g., "Week 5")
   - If you see month/day without year, infer the year from course context or use the current academic year
   - Example: "Due: Sept 15" -> "2024-09-15" (if 2024-2025 academic year)

3. For assignment types, classify as: homework, exam, project, quiz, lab, reading, or other

4. Include description if available (points, chapters, topics, etc.)

5. Return data in this EXACT JSON structure:
{
  "course_name": "string or null",
  "assignments": [
    {
      "title": "Assignment Name",
      "due_date": "YYYY-MM-DD or relative string",
      "description": "Optional details",
      "assignment_type": "homework|exam|project|quiz|lab|reading|other"
    }
  ]
}

IMPORTANT:
- Do NOT skip any assignments
- Do NOT hallucinate dates that aren't in the document
- If unsure about a date format, use the relative string (e.g., "Week 5")
- If no assignments found, return empty assignments array

Now extract all assignments from the provided document:"""


class GeminiExtractor:
    """Client for extracting course schedules using Gemini 1.5 Flash."""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Gemini client.

        Args:
            api_key: Google Gemini API key (optional, reads from env if not provided)

        Raises:
            ValueError: If API key is not provided or found in environment
        """
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')

        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY not found. Please set it in .env file or pass as argument."
            )

        # Initialize the client
        self.client = genai.Client(api_key=self.api_key)

        # Use Gemini 1.5 Flash (free tier)
        self.model_name = 'gemini-1.5-flash'

        logger.info("Gemini client initialized with model: gemini-1.5-flash")

    def extract_from_images(self, images: List[Image.Image]) -> Dict[str, Any]:
        """
        Extract course schedule from a list of images.

        Args:
            images: List of PIL Image objects

        Returns:
            Dictionary containing course_name and assignments list

        Raises:
            Exception: If extraction fails
        """
        try:
            logger.info(f"Extracting schedule from {len(images)} images")

            # Prepare the content parts
            parts = [types.Part.from_text(EXTRACTION_PROMPT)]

            # Add all images to the request
            for idx, img in enumerate(images):
                # Convert PIL Image to bytes
                import io
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format='PNG')
                img_byte_arr = img_byte_arr.getvalue()

                # Add image part
                parts.append(types.Part.from_bytes(
                    data=img_byte_arr,
                    mime_type="image/png"
                ))
                logger.debug(f"Added image {idx + 1} to request")

            # Generate response with JSON mode
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=parts,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )

            # Parse the JSON response
            result = json.loads(response.text)

            # Validate with Pydantic
            schedule = CourseSchedule(**result)

            logger.info(f"Successfully extracted {len(schedule.assignments)} assignments")

            return schedule.model_dump()

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.error(f"Raw response: {response.text if 'response' in locals() else 'N/A'}")
            raise Exception(f"Invalid JSON response from Gemini: {str(e)}")

        except Exception as e:
            logger.error(f"Error during extraction: {str(e)}")
            raise Exception(f"Failed to extract schedule: {str(e)}")

    def extract_from_text(self, text: str) -> Dict[str, Any]:
        """
        Extract course schedule from markdown text (for Excel files).

        Args:
            text: Markdown representation of the schedule

        Returns:
            Dictionary containing course_name and assignments list

        Raises:
            Exception: If extraction fails
        """
        try:
            logger.info(f"Extracting schedule from text ({len(text)} characters)")

            # Combine prompt with text
            content = f"{EXTRACTION_PROMPT}\n\nDocument content:\n{text}"

            # Generate response with JSON mode
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=content,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )

            # Parse the JSON response
            result = json.loads(response.text)

            # Validate with Pydantic
            schedule = CourseSchedule(**result)

            logger.info(f"Successfully extracted {len(schedule.assignments)} assignments")

            return schedule.model_dump()

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.error(f"Raw response: {response.text if 'response' in locals() else 'N/A'}")
            raise Exception(f"Invalid JSON response from Gemini: {str(e)}")

        except Exception as e:
            logger.error(f"Error during extraction: {str(e)}")
            raise Exception(f"Failed to extract schedule: {str(e)}")


def extract_schedule(content: Any, is_text: bool = False) -> Dict[str, Any]:
    """
    Convenience function to extract schedule from content.

    Args:
        content: Either a list of PIL Images or a markdown string
        is_text: True if content is text, False if images

    Returns:
        Dictionary with course schedule

    Raises:
        ValueError: If GEMINI_API_KEY not found
        Exception: If extraction fails
    """
    extractor = GeminiExtractor()

    if is_text:
        return extractor.extract_from_text(content)
    else:
        return extractor.extract_from_images(content)

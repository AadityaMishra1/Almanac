"""
Advanced prompt engineering for syllabus parsing.
Uses chain-of-thought, few-shot learning, and structured instructions.
"""

import logging
from datetime import datetime
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class PromptBuilder:
    """
    Builds optimized prompts for AI syllabus parsing.

    Features:
    - Chain-of-thought reasoning
    - Few-shot examples
    - Structured output instructions
    - Context-aware hints based on document classification
    """

    def build_parsing_prompt(
        self,
        pdf_processing_results: Dict,
        use_structured_output: bool = True
    ) -> str:
        """
        Build comprehensive parsing prompt.

        Args:
            pdf_processing_results: Results from EnhancedPDFProcessor
            use_structured_output: Whether to use structured output format

        Returns:
            Optimized prompt string
        """
        current_year = datetime.now().year
        next_year = current_year + 1

        # Extract key information
        course_name = pdf_processing_results.get('course_name', 'Not specified')
        classification = pdf_processing_results.get('classification', {})
        syllabus_type = classification.get('syllabus_type')
        semester_info = classification.get('semester_info', {})
        parsing_hints = classification.get('parsing_hints', [])

        # Build prompt sections
        prompt_parts = []

        # Section 1: Role and expertise
        prompt_parts.append(self._get_role_section())

        # Section 2: Context information
        prompt_parts.append(self._get_context_section(
            course_name, current_year, next_year, syllabus_type, semester_info
        ))

        # Section 3: Step-by-step instructions
        prompt_parts.append(self._get_instructions_section(syllabus_type, parsing_hints))

        # Section 4: Few-shot examples
        prompt_parts.append(self._get_examples_section(current_year))

        # Section 5: Output format
        if use_structured_output:
            prompt_parts.append(self._get_structured_output_section())
        else:
            prompt_parts.append(self._get_json_output_section())

        # Section 6: Validation checklist
        prompt_parts.append(self._get_validation_section())

        return "\n\n".join(prompt_parts)

    def _get_role_section(self) -> str:
        """System role and expertise"""
        return """You are an EXPERT syllabus information extractor with a PhD in Educational Technology. You have analyzed over 10,000 course syllabi from universities worldwide and achieve 98% accuracy in extracting assignment information.

Your specialized skills:
- Extracting EXACT date strings as they appear in documents (without formatting or converting)
- Understanding academic calendar patterns (semesters, quarters, trimesters)
- Identifying semester names and date ranges from syllabus headers
- Distinguishing assignment types from minimal context
- Cross-referencing information from tables, text, and calendars

CRITICAL: Your job is to EXTRACT information, not FORMAT it. Provide raw date strings exactly as written."""

    def _get_context_section(
        self,
        course_name: str,
        current_year: int,
        next_year: int,
        syllabus_type: any,
        semester_info: Dict
    ) -> str:
        """Context and document information"""
        context = f"""DOCUMENT CONTEXT:
Course Name: {course_name}
Current Date: {datetime.now().strftime('%Y-%m-%d')}
Academic Year: {current_year}-{next_year}"""

        if syllabus_type:
            context += f"\nDocument Type: {syllabus_type.value if hasattr(syllabus_type, 'value') else str(syllabus_type)}"

        if semester_info:
            context += f"\nSemester Info: {semester_info}"

        return context

    def _get_instructions_section(
        self,
        syllabus_type: any,
        parsing_hints: List[str]
    ) -> str:
        """Step-by-step parsing instructions"""
        instructions = """EXTRACTION INSTRUCTIONS - Follow these steps:

STEP 1: IDENTIFY SEMESTER CONTEXT (CRITICAL!)
- Look for semester name in the header/title (e.g., "Fall 2025", "Spring 2026", "Summer Session 2025")
- Find semester start date (e.g., "Classes begin: August 25, 2025")
- Find semester end date (e.g., "Final exams end: December 15, 2025")
- Note the academic year if mentioned (e.g., "Academic Year 2025-2026")
- This context is ESSENTIAL for accurate date parsing later

STEP 2: DETECT DATE FORMAT USED
- Observe the primary date format in the document
- Common formats: MM/DD/YYYY, Month DD YYYY, DD/MM/YYYY, Week X, etc.
- Note this in document_analysis.date_format_detected
- DO NOT convert dates - just identify the format

STEP 3: EXTRACT RAW DATE STRINGS
For each assignment date:
- Copy the EXACT date string as it appears in the document
- Examples:
  ✓ "Sep 15" (correct - exact string)
  ✓ "10/15/2025" (correct - exact string)
  ✓ "Week 3 Monday" (correct - exact string)
  ✗ "2025-09-15 23:59:59" (WRONG - you formatted it!)
  ✗ "September 15, 2025" (WRONG - document says "Sep 15")

- Include time if explicitly stated (e.g., "Sep 15 at 11:59 PM")
- If date spans multiple cells/areas, combine logically

STEP 4: MATCH DATES TO ASSIGNMENTS
- Look for assignment titles/descriptions near dates
- Use table row relationships (date column → assignment column)
- Extract assignment numbers from titles ("Assignment 1", "Assignment 2")
- Handle merged cells and spanning rows

STEP 5: CLASSIFY ASSIGNMENT TYPES
Keywords to watch for:
- homework: "HW", "Assignment", "Problem Set", "Exercise", "Homework"
- exam: "Exam", "Test", "Midterm", "Final"
- project: "Project", "Paper", "Report", "Essay", "Research"
- quiz: "Quiz", "Pop Quiz", "Short Quiz"
- presentation: "Presentation", "Talk", "Demo", "Poster Session"
- other: Default for unclear cases

STEP 6: PROVIDE METADATA
Rate your confidence (0-1) based on:
- Type certainty: Clear keywords vs ambiguous
- Source quality: From table vs buried in text
- Note the exact location in the document

REMEMBER: Extract dates AS-IS. Python will handle normalization and year inference."""

        if parsing_hints:
            instructions += "\n\nDOCUMENT-SPECIFIC HINTS:\n"
            for hint in parsing_hints:
                instructions += f"- {hint}\n"

        return instructions

    def _get_examples_section(self, current_year: int) -> str:
        """Few-shot learning examples"""
        return f"""FEW-SHOT EXAMPLES (Learn from these):

EXAMPLE 1 - Table Row with Raw Date:
Document text: "Week 3 | Sep 15 | Homework 1: Chapters 1-3 | Submit online"
Document header: "CS 101 - Fall 2025"

Your extraction:
{{
  "title": "Homework 1",
  "description": "Chapters 1-3 - Submit online",
  "raw_date_string": "Sep 15",  ← EXACT string from document
  "assignment_type": "homework",
  "confidence_metadata": {{
    "type_confidence": 0.95,
    "source_location": "Table 1, Row 3, Week 3",
    "reasoning": "Clear homework keyword, explicit date in table"
  }}
}}

Note: You did NOT convert "Sep 15" to "2025-09-15 23:59:59". Python will do that using the semester context.

EXAMPLE 2 - Full Date Format:
Document text: "Midterm Exam: October 15, 2025 at 2:00 PM"
Document header: "Math 201 - Fall Semester 2025"

Your extraction:
{{
  "title": "Midterm Exam",
  "description": null,
  "raw_date_string": "October 15, 2025 at 2:00 PM",  ← EXACT string, including time
  "assignment_type": "exam",
  "confidence_metadata": {{
    "type_confidence": 0.98,
    "source_location": "Page 2, Course Schedule section",
    "reasoning": "Explicit exam keyword, complete date with time"
  }}
}}

EXAMPLE 3 - Week-based Date:
Document text: "Final Project - Due Week 16 (Monday)"
Document header: "Spring 2026 Semester - Classes start Jan 20, 2026"

Your extraction:
{{
  "title": "Final Project",
  "description": null,
  "raw_date_string": "Week 16 (Monday)",  ← EXACT string from document
  "assignment_type": "project",
  "confidence_metadata": {{
    "type_confidence": 0.9,
    "source_location": "Page 1, Assignment List",
    "reasoning": "Clear project keyword, week-based date will be calculated using semester start"
  }}
}}

EXAMPLE 4 - Semester Detection:
Document header: "Biology 101 - Fall Semester 2025"
Document body: "Classes begin: August 25, 2025" and "Final exams: December 13-15, 2025"

Your document_analysis:
{{
  "semester_name": "Fall 2025",
  "semester_start_raw": "August 25, 2025",
  "semester_end_raw": "December 15, 2025",
  "academic_year": "2025-2026",
  "parsing_confidence": 0.9,
  "date_format_detected": "Month DD, YYYY"
}}

KEY PRINCIPLE: Extract, don't transform. Let Python handle the complex date math."""

    def _get_structured_output_section(self) -> str:
        """Instructions for structured output (Gemini 2.0 with schema)"""
        return """OUTPUT FORMAT:
Your response will be automatically validated against a JSON schema.
The schema enforces:
- Raw date strings (extract as-is, do NOT format)
- Valid assignment types (homework|exam|project|quiz|presentation|other)
- Required fields (title, raw_date_string, assignment_type)
- Semester detection (semester_name, semester_start_raw, semester_end_raw)
- Confidence scores (0-1)

Simply extract the information and the structure will be enforced automatically."""

    def _get_json_output_section(self) -> str:
        """Instructions for manual JSON output (fallback models)"""
        return """OUTPUT FORMAT:
Return a valid JSON object with this EXACT structure:

{
  "assignments": [
    {
      "title": "string",
      "description": "string or null",
      "raw_date_string": "EXACT date string from document (e.g., 'Sep 15', '10/15/2025', 'Week 3')",
      "assignment_type": "homework|exam|project|quiz|presentation|other",
      "confidence_metadata": {
        "type_confidence": 0.0-1.0,
        "source_location": "string",
        "reasoning": "string"
      }
    }
  ],
  "document_analysis": {
    "semester_name": "string (e.g., 'Fall 2025', 'Spring 2026') or null",
    "semester_start_raw": "raw date string from document or null",
    "semester_end_raw": "raw date string from document or null",
    "academic_year": "string (e.g., '2025-2026') or null",
    "parsing_confidence": 0.0-1.0,
    "date_format_detected": "string (e.g., 'MM/DD/YYYY', 'Month DD')"
  }
}

CRITICAL:
- Return ONLY valid JSON. No markdown, no code blocks, no explanatory text.
- Extract raw_date_string EXACTLY as it appears. DO NOT format or convert dates."""

    def _get_validation_section(self) -> str:
        """Final validation checklist"""
        return """VALIDATION CHECKLIST (verify before responding):
✓ All raw_date_string values are EXACT strings from the document (not formatted!)
✓ Assignment types are valid enums (homework|exam|project|quiz|presentation|other)
✓ Confidence scores between 0 and 1
✓ No duplicate assignments
✓ Semester information extracted (semester_name, start/end dates if available)
✓ Document analysis section completed
✓ Valid JSON syntax (if not using structured output)

BEGIN EXTRACTION NOW. Be thorough, accurate, and remember: EXTRACT, don't FORMAT!"""

    def build_table_context(self, normalized_tables: List[Dict]) -> str:
        """Build formatted table context"""
        if not normalized_tables:
            return ""

        context = "\n\nEXTRACTED AND NORMALIZED TABLES:\n"

        from services.pdf_processing.table_normalizer import TableNormalizer
        normalizer = TableNormalizer()

        context += normalizer.format_for_ai_prompt(normalized_tables)

        context += "\n\nIMPORTANT: These normalized tables are your PRIMARY source. "
        context += "The semantic column mappings (date=, assignment=, etc.) help you understand the structure."

        return context

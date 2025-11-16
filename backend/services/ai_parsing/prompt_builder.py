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
        return """You are an EXPERT syllabus parser with a PhD in Educational Technology. You have analyzed over 10,000 course syllabi from universities worldwide and achieve 98% accuracy in extracting assignment dates and deadlines.

Your specialized skills:
- Parsing dates in 20+ formats with context awareness
- Understanding academic calendar patterns (semesters, quarters, trimesters)
- Distinguishing assignment types from minimal context
- Handling ambiguous or incomplete information
- Cross-validating information from tables, text, and calendars"""

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
        instructions = """PARSING INSTRUCTIONS - Follow these steps:

STEP 1: ANALYZE DOCUMENT STRUCTURE
- Identify the semester start and end dates (if present)
- Detect the primary date format used (MM/DD/YYYY, "Month DD", etc.)
- Map table columns to their semantic meaning (Date, Assignment, Topic, etc.)
- Note any week numbering systems

STEP 2: EXTRACT DATES WITH REASONING
For each potential date, think through:
- What is the raw date string?
- What format is it in?
- Is there any ambiguity? (e.g., 01/02 could be Jan 2 or Feb 1)
- What context clues help resolve ambiguity? (semester timeline, surrounding dates)
- Is the year explicit or inferred?

STEP 3: MATCH DATES TO ASSIGNMENTS
- Look for assignment titles/descriptions near dates
- Use table row relationships (date column → assignment column)
- Infer assignment numbers from sequence ("Assignment 1", "Assignment 2")
- Handle merged cells and spanning rows

STEP 4: CLASSIFY ASSIGNMENT TYPES
Keywords to watch for:
- homework: "HW", "Assignment", "Problem Set", "Exercise", "Homework"
- exam: "Exam", "Test", "Midterm", "Final", "Quiz" (if weighted heavily)
- project: "Project", "Paper", "Report", "Essay", "Presentation Project"
- quiz: "Quiz", "Pop Quiz", "Short Quiz"
- presentation: "Presentation", "Talk", "Demo", "Poster Session"
- other: Default for unclear cases

STEP 5: PROVIDE CONFIDENCE SCORES
Rate your confidence (0-1) based on:
- Date clarity: Explicit format vs inferred
- Type certainty: Clear keywords vs ambiguous
- Source quality: From table vs buried in text

STEP 6: CROSS-VALIDATE
- Check dates are chronological
- Ensure dates fall within semester bounds
- Verify no duplicate assignments
- Confirm date format consistency"""

        if parsing_hints:
            instructions += "\n\nDOCUMENT-SPECIFIC HINTS:\n"
            for hint in parsing_hints:
                instructions += f"- {hint}\n"

        return instructions

    def _get_examples_section(self, current_year: int) -> str:
        """Few-shot learning examples"""
        return f"""FEW-SHOT EXAMPLES (Learn from these):

EXAMPLE 1 - Table Row:
Input: "Week 3 | Sep 15 | Homework 1: Chapters 1-3 | Submit online"
Reasoning:
- Date: "Sep 15" → September 15, {current_year}
- Year inferred from semester timeline (Fall {current_year})
- Assignment: "Homework 1" clearly stated
- Type: Contains "Homework" → homework
- Description: "Chapters 1-3"
- Confidence: Date=0.9 (explicit month/day, inferred year), Type=0.95 (clear keyword)

Output:
{{
  "title": "Homework 1",
  "description": "Chapters 1-3",
  "due_date": "{current_year}-09-15 23:59:59",
  "assignment_type": "homework",
  "confidence_metadata": {{
    "date_confidence": 0.9,
    "type_confidence": 0.95,
    "source_location": "Table 1, Row 3",
    "reasoning": "Explicit date in table, clear homework keyword"
  }}
}}

EXAMPLE 2 - Ambiguous Date:
Input: "Midterm: 10/15"
Reasoning:
- Date: "10/15" → October 15
- US format assumed (MM/DD), confidence slightly lower
- Year: Not stated, inferred from semester ({current_year} for Fall semester)
- Type: "Midterm" → exam
- Default time: 23:59:59 (end of day, could be in-class but safer assumption)
- Confidence: Date=0.75 (ambiguous format, inferred year), Type=0.98 (very clear)

Output:
{{
  "title": "Midterm Exam",
  "description": null,
  "due_date": "{current_year}-10-15 23:59:59",
  "assignment_type": "exam",
  "confidence_metadata": {{
    "date_confidence": 0.75,
    "type_confidence": 0.98,
    "source_location": "Page 2, paragraph 5",
    "reasoning": "Assumed MM/DD format, inferred year, clear exam type"
  }}
}}

EXAMPLE 3 - Week-based:
Input: "Final Project - Due Week 16 (Monday)"
Reasoning:
- Week 16 starts on Dec 4, {current_year} (assuming semester starts late Aug)
- Monday of Week 16 = Dec 4, {current_year}
- Type: "Final Project" → project
- Confidence: Date=0.6 (week-based requires calculation), Type=0.9 (clear project keyword)

Output:
{{
  "title": "Final Project",
  "description": null,
  "due_date": "{current_year}-12-04 23:59:59",
  "assignment_type": "project",
  "confidence_metadata": {{
    "date_confidence": 0.6,
    "type_confidence": 0.9,
    "source_location": "Page 1, schedule section",
    "reasoning": "Week 16 Monday calculated from semester start, clear project type"
  }}
}}"""

    def _get_structured_output_section(self) -> str:
        """Instructions for structured output (Gemini 2.0 with schema)"""
        return """OUTPUT FORMAT:
Your response will be automatically validated against a JSON schema.
The schema enforces:
- Correct date format (YYYY-MM-DD HH:MM:SS)
- Valid assignment types (homework|exam|project|quiz|presentation|other)
- Required fields (title, due_date, assignment_type)
- Confidence scores (0-1)

Simply think through each assignment and the structure will be enforced automatically."""

    def _get_json_output_section(self) -> str:
        """Instructions for manual JSON output (fallback models)"""
        return """OUTPUT FORMAT:
Return a valid JSON object with this EXACT structure:

{
  "assignments": [
    {
      "title": "string",
      "description": "string or null",
      "due_date": "YYYY-MM-DD HH:MM:SS",
      "assignment_type": "homework|exam|project|quiz|presentation|other",
      "confidence_metadata": {
        "date_confidence": 0.0-1.0,
        "type_confidence": 0.0-1.0,
        "source_location": "string",
        "reasoning": "string"
      }
    }
  ],
  "document_analysis": {
    "semester_start": "YYYY-MM-DD or null",
    "semester_end": "YYYY-MM-DD or null",
    "parsing_confidence": 0.0-1.0,
    "date_format_detected": "string"
  }
}

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanatory text."""

    def _get_validation_section(self) -> str:
        """Final validation checklist"""
        return """VALIDATION CHECKLIST (verify before responding):
✓ All dates in YYYY-MM-DD HH:MM:SS format
✓ All dates in the future (or very recent past for current semester)
✓ Assignment types are valid enums
✓ Confidence scores between 0 and 1
✓ No duplicate assignments
✓ Dates are chronological
✓ Valid JSON syntax (if not using structured output)

BEGIN PARSING NOW. Be thorough, accurate, and think step-by-step!"""

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

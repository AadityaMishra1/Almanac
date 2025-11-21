"""
JSON schema definitions for structured AI output.
Ensures consistent, validated responses from AI models.
"""

# Assignment parsing schema for structured output
# CRITICAL: This schema uses RAW date strings, not formatted dates
# Python DateIntelligence will normalize dates in post-processing
ASSIGNMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "assignments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Assignment title (e.g., 'Homework 1', 'Midterm Exam')"
                    },
                    "description": {
                        "type": ["string", "null"],
                        "description": "Brief description of the assignment"
                    },
                    "raw_date_string": {
                        "type": "string",
                        "description": "EXACT date string as it appears in the document (e.g., 'Sep 15', '10/15/2025', 'Week 3 Monday'). DO NOT format or normalize - provide the raw string."
                    },
                    "assignment_type": {
                        "type": "string",
                        "enum": ["homework", "exam", "project", "quiz", "presentation", "other"],
                        "description": "Type of assignment"
                    },
                    "confidence_metadata": {
                        "type": "object",
                        "properties": {
                            "type_confidence": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1,
                                "description": "Confidence in assignment type classification (0-1)"
                            },
                            "source_location": {
                                "type": "string",
                                "description": "Where in document this was found (e.g., 'Table 1 Row 3', 'Page 2 paragraph 4')"
                            },
                            "reasoning": {
                                "type": "string",
                                "description": "Brief explanation of extraction logic"
                            }
                        },
                        "required": ["type_confidence"]
                    }
                },
                "required": ["title", "raw_date_string", "assignment_type"]
            }
        },
        "document_analysis": {
            "type": "object",
            "properties": {
                "semester_name": {
                    "type": ["string", "null"],
                    "description": "Detected semester name (e.g., 'Fall 2025', 'Spring 2026', 'Summer 2025')"
                },
                "semester_start_raw": {
                    "type": ["string", "null"],
                    "description": "Raw semester start date string from document (e.g., 'August 25, 2025')"
                },
                "semester_end_raw": {
                    "type": ["string", "null"],
                    "description": "Raw semester end date string from document (e.g., 'December 15, 2025')"
                },
                "academic_year": {
                    "type": ["string", "null"],
                    "description": "Academic year (e.g., '2025-2026')"
                },
                "parsing_confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "description": "Overall confidence in parsing accuracy"
                },
                "date_format_detected": {
                    "type": "string",
                    "description": "Primary date format used in document (e.g., 'MM/DD/YYYY', 'Month DD, YYYY')"
                }
            },
            "required": ["parsing_confidence"]
        }
    },
    "required": ["assignments", "document_analysis"]
}


# Simplified schema for Groq (may not support complex nested schemas)
# Also uses raw date strings for consistency
ASSIGNMENT_SCHEMA_SIMPLE = {
    "type": "object",
    "properties": {
        "assignments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": ["string", "null"]},
                    "raw_date_string": {"type": "string"},
                    "assignment_type": {
                        "type": "string",
                        "enum": ["homework", "exam", "project", "quiz", "presentation", "other"]
                    }
                },
                "required": ["title", "raw_date_string", "assignment_type"]
            }
        },
        "document_analysis": {
            "type": "object",
            "properties": {
                "semester_name": {"type": ["string", "null"]},
                "semester_start_raw": {"type": ["string", "null"]},
                "semester_end_raw": {"type": ["string", "null"]},
                "parsing_confidence": {"type": "number"}
            }
        }
    },
    "required": ["assignments"]
}

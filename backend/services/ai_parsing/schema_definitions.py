"""
JSON schema definitions for structured AI output.
Ensures consistent, validated responses from AI models.
"""

# Assignment parsing schema for structured output
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
                    "due_date": {
                        "type": "string",
                        "pattern": "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$",
                        "description": "Due date in YYYY-MM-DD HH:MM:SS format"
                    },
                    "assignment_type": {
                        "type": "string",
                        "enum": ["homework", "exam", "project", "quiz", "presentation", "other"],
                        "description": "Type of assignment"
                    },
                    "confidence_metadata": {
                        "type": "object",
                        "properties": {
                            "date_confidence": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1,
                                "description": "Confidence in date parsing (0-1)"
                            },
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
                                "description": "Brief explanation of parsing logic"
                            }
                        },
                        "required": ["date_confidence", "type_confidence"]
                    }
                },
                "required": ["title", "due_date", "assignment_type"]
            }
        },
        "document_analysis": {
            "type": "object",
            "properties": {
                "semester_start": {
                    "type": ["string", "null"],
                    "description": "Detected semester start date (YYYY-MM-DD)"
                },
                "semester_end": {
                    "type": ["string", "null"],
                    "description": "Detected semester end date (YYYY-MM-DD)"
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
    "required": ["assignments"]
}


# Simplified schema for Groq (may not support complex nested schemas)
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
                    "due_date": {"type": "string"},
                    "assignment_type": {
                        "type": "string",
                        "enum": ["homework", "exam", "project", "quiz", "presentation", "other"]
                    }
                },
                "required": ["title", "due_date", "assignment_type"]
            }
        }
    },
    "required": ["assignments"]
}

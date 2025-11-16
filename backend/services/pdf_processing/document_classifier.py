"""
Document classifier to detect syllabus structure and format.
Helps optimize parsing strategy based on document type.
"""

import logging
from typing import Dict, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class SyllabusType(Enum):
    """Types of syllabus formats"""
    TABLE_BASED = "table_based"  # Primarily uses tables for schedule
    CALENDAR_GRID = "calendar_grid"  # Visual calendar layout
    LIST_BASED = "list_based"  # Text list format
    HYBRID = "hybrid"  # Mix of formats
    UNKNOWN = "unknown"


class DocumentClassifier:
    """
    Classifies syllabus documents to optimize parsing strategy.
    Analyzes structure, layout, and content patterns.
    """

    def classify_document(
        self,
        text: str,
        tables: List[Dict],
        metadata: Dict,
        structure_analysis: Dict
    ) -> Dict[str, any]:
        """
        Classify syllabus document type and characteristics.

        Args:
            text: Extracted text content
            tables: Extracted tables
            metadata: PDF metadata
            structure_analysis: PDF structure analysis

        Returns:
            Classification results with confidence scores
        """
        classification = {
            "syllabus_type": SyllabusType.UNKNOWN,
            "confidence": 0.0,
            "characteristics": {},
            "parsing_hints": []
        }

        # Analyze tables
        has_substantial_tables = len(tables) > 0 and any(
            t.get('rows', 0) > 3 for t in tables
        )

        # Analyze text patterns
        text_lower = text.lower()

        # Keywords for different formats
        table_keywords = ['week', 'date', 'topic', 'assignment', 'due']
        calendar_keywords = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        list_keywords = ['assignment 1', 'homework 1', 'exam 1', 'project 1']

        table_score = sum(1 for kw in table_keywords if kw in text_lower)
        calendar_score = sum(1 for kw in calendar_keywords if kw in text_lower)
        list_score = sum(1 for kw in list_keywords if kw in text_lower)

        # Detect date patterns
        date_patterns = self._count_date_patterns(text)

        # Classification logic
        if has_substantial_tables and table_score >= 3:
            # Check if it's a calendar grid
            if calendar_score >= 3:
                classification["syllabus_type"] = SyllabusType.CALENDAR_GRID
                classification["confidence"] = 0.85
                classification["parsing_hints"].append("Focus on table cell dates with day names")
            else:
                classification["syllabus_type"] = SyllabusType.TABLE_BASED
                classification["confidence"] = 0.9
                classification["parsing_hints"].append("Extract dates from table rows/columns")

        elif list_score >= 2 and date_patterns['total'] > 5:
            classification["syllabus_type"] = SyllabusType.LIST_BASED
            classification["confidence"] = 0.8
            classification["parsing_hints"].append("Parse sequential assignment list with dates")

        elif table_score > 0 and list_score > 0:
            classification["syllabus_type"] = SyllabusType.HYBRID
            classification["confidence"] = 0.7
            classification["parsing_hints"].append("Combine table and list parsing")

        else:
            classification["syllabus_type"] = SyllabusType.UNKNOWN
            classification["confidence"] = 0.5
            classification["parsing_hints"].append("Use general-purpose parsing")

        # Add characteristics
        classification["characteristics"] = {
            "num_tables": len(tables),
            "num_pages": metadata.get('num_pages', 0),
            "is_scanned": metadata.get('is_scanned', False),
            "text_density": structure_analysis.get('text_density', 0),
            "date_patterns": date_patterns,
            "has_calendar_layout": calendar_score >= 3,
            "table_quality_scores": [t.get('quality_score', 0) for t in tables]
        }

        # Detect semester dates
        semester_info = self._detect_semester_info(text)
        if semester_info:
            classification["semester_info"] = semester_info
            classification["parsing_hints"].append("Use detected semester dates for context")

        logger.info(
            f"Document classified as: {classification['syllabus_type'].value} "
            f"(confidence: {classification['confidence']:.2f})"
        )

        return classification

    def _count_date_patterns(self, text: str) -> Dict[str, int]:
        """Count different date pattern occurrences"""
        import re

        patterns = {
            'slash_dates': r'\d{1,2}/\d{1,2}/\d{2,4}',  # MM/DD/YYYY
            'month_day_year': r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}',
            'week_numbers': r'Week\s+\d+',
            'day_names': r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)',
        }

        counts = {}
        for pattern_name, pattern in patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            counts[pattern_name] = len(matches)

        counts['total'] = sum(counts.values())

        return counts

    def _detect_semester_info(self, text: str) -> Optional[Dict]:
        """
        Detect semester start/end dates and academic year.

        Returns:
            Dict with semester info or None
        """
        import re
        from datetime import datetime

        # Look for semester dates
        semester_patterns = [
            r'semester:\s*([A-Za-z]+\s+\d{1,2})\s*-\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})',
            r'(fall|spring|summer|winter)\s+(\d{4})',
            r'classes begin:\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})',
            r'classes end:\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})'
        ]

        semester_info = {}

        for pattern in semester_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                logger.debug(f"Found semester info: {matches}")
                # Basic extraction - could be enhanced
                if len(matches[0]) == 2:
                    semester_info['semester'] = matches[0][0]
                    semester_info['year'] = matches[0][1]
                break

        return semester_info if semester_info else None

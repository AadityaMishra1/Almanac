"""
Date validation and normalization utilities for syllabus parsing

This module provides robust date parsing, validation, and normalization
to handle various date formats commonly found in syllabi.
"""

from datetime import datetime, timedelta
from dateutil import parser as dateutil_parser
from typing import Optional, Tuple, List
import re
import logging

logger = logging.getLogger(__name__)


class DateValidator:
    """
    Validates and normalizes dates extracted from syllabi
    """

    def __init__(self, current_date: Optional[datetime] = None, academic_year_start: Optional[datetime] = None):
        """
        Initialize date validator

        Args:
            current_date: Current date for reference (default: today)
            academic_year_start: Start of academic year (default: August of current year)
        """
        self.current_date = current_date or datetime.now()

        # Default academic year: August to May
        if academic_year_start is None:
            year = self.current_date.year
            # If we're past August, academic year started this year
            # Otherwise, it started last year
            if self.current_date.month >= 8:
                self.academic_year_start = datetime(year, 8, 1)
                self.academic_year_end = datetime(year + 1, 5, 31, 23, 59, 59)
            else:
                self.academic_year_start = datetime(year - 1, 8, 1)
                self.academic_year_end = datetime(year, 5, 31, 23, 59, 59)
        else:
            self.academic_year_start = academic_year_start
            self.academic_year_end = academic_year_start.replace(year=academic_year_start.year + 1, month=5, day=31)

        logger.info(f"Date validator initialized: academic year {self.academic_year_start.date()} to {self.academic_year_end.date()}")

    def parse_date(self, date_string: str, context: Optional[str] = None) -> Optional[Tuple[datetime, float]]:
        """
        Parse a date string with multiple strategies and return confidence score

        Args:
            date_string: Date string to parse
            context: Optional context (e.g., assignment title) for better parsing

        Returns:
            Tuple of (parsed datetime, confidence score 0-1) or None if parsing failed
        """
        if not date_string or not isinstance(date_string, str):
            return None

        date_string = date_string.strip()
        if not date_string:
            return None

        # Try different parsing strategies
        strategies = [
            self._parse_iso_format,
            self._parse_common_formats,
            self._parse_relative_dates,
            self._parse_week_based,
            self._parse_flexible,
        ]

        for strategy in strategies:
            try:
                result = strategy(date_string, context)
                if result:
                    parsed_date, confidence = result

                    # Validate the parsed date
                    if self._is_valid_date(parsed_date):
                        logger.info(f"Parsed '{date_string}' as {parsed_date} (confidence: {confidence:.2f}) using {strategy.__name__}")
                        return (parsed_date, confidence)
                    else:
                        logger.warning(f"Parsed date {parsed_date} is outside valid range")

            except Exception as e:
                logger.debug(f"Strategy {strategy.__name__} failed for '{date_string}': {e}")
                continue

        logger.warning(f"Failed to parse date: '{date_string}'")
        return None

    def _parse_iso_format(self, date_string: str, context: Optional[str] = None) -> Optional[Tuple[datetime, float]]:
        """Parse ISO format dates (YYYY-MM-DD, YYYY-MM-DD HH:MM:SS)"""
        # ISO 8601 patterns
        iso_patterns = [
            r'^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$',  # YYYY-MM-DD HH:MM:SS
            r'^\d{4}-\d{2}-\d{2}$',  # YYYY-MM-DD
        ]

        for pattern in iso_patterns:
            if re.match(pattern, date_string):
                try:
                    parsed = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
                    return (parsed, 0.95)  # High confidence for ISO format
                except:
                    pass

        return None

    def _parse_common_formats(self, date_string: str, context: Optional[str] = None) -> Optional[Tuple[datetime, float]]:
        """Parse common date formats (MM/DD/YYYY, DD/MM/YYYY, Month DD, YYYY, etc.)"""
        # Common patterns with regex
        patterns = [
            # MM/DD/YYYY or M/D/YYYY
            (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', '%m/%d/%Y', 0.85),
            # DD/MM/YYYY or D/M/YYYY (European)
            (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', '%d/%m/%Y', 0.80),
            # Month DD, YYYY (e.g., "January 15, 2025")
            (r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})', '%B %d, %Y', 0.90),
            # Mon DD, YYYY (e.g., "Jan 15, 2025")
            (r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})', '%b %d, %Y', 0.88),
            # DD Month YYYY (e.g., "15 January 2025")
            (r'(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})', '%d %B %Y', 0.88),
        ]

        for pattern, format_str, confidence in patterns:
            match = re.search(pattern, date_string, re.IGNORECASE)
            if match:
                try:
                    # For some patterns, we need to reconstruct the string
                    if '%B' in format_str or '%b' in format_str:
                        parsed = datetime.strptime(match.group(0), format_str)
                    else:
                        parsed = datetime.strptime(match.group(0), format_str)

                    # Set default time to 23:59:59 if not specified
                    if parsed.hour == 0 and parsed.minute == 0 and parsed.second == 0:
                        parsed = parsed.replace(hour=23, minute=59, second=59)

                    return (parsed, confidence)
                except:
                    continue

        return None

    def _parse_relative_dates(self, date_string: str, context: Optional[str] = None) -> Optional[Tuple[datetime, float]]:
        """Parse relative dates (e.g., 'next Monday', 'in 2 weeks')"""
        date_string_lower = date_string.lower()

        # "next Monday", "this Friday", etc.
        weekday_pattern = r'(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)'
        match = re.search(weekday_pattern, date_string_lower)
        if match:
            modifier, weekday_name = match.groups()
            weekday_map = {
                'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                'friday': 4, 'saturday': 5, 'sunday': 6
            }
            target_weekday = weekday_map[weekday_name]
            current_weekday = self.current_date.weekday()

            # Calculate days until target weekday
            days_ahead = target_weekday - current_weekday
            if days_ahead <= 0 or modifier == 'next':
                days_ahead += 7

            target_date = self.current_date + timedelta(days=days_ahead)
            target_date = target_date.replace(hour=23, minute=59, second=59)
            return (target_date, 0.70)  # Medium confidence

        # "in X days/weeks"
        relative_pattern = r'in\s+(\d+)\s+(day|week|month)s?'
        match = re.search(relative_pattern, date_string_lower)
        if match:
            amount, unit = match.groups()
            amount = int(amount)

            if unit == 'day':
                target_date = self.current_date + timedelta(days=amount)
            elif unit == 'week':
                target_date = self.current_date + timedelta(weeks=amount)
            elif unit == 'month':
                target_date = self.current_date + timedelta(days=amount * 30)  # Approximate

            target_date = target_date.replace(hour=23, minute=59, second=59)
            return (target_date, 0.65)

        return None

    def _parse_week_based(self, date_string: str, context: Optional[str] = None) -> Optional[Tuple[datetime, float]]:
        """Parse week-based dates (e.g., 'Week 3', 'Monday of Week 5')"""
        date_string_lower = date_string.lower()

        # "Week X" or "Week X, Day"
        week_pattern = r'week\s+(\d+)(?:\s*,?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday))?'
        match = re.search(week_pattern, date_string_lower)

        if match:
            week_num = int(match.group(1))
            weekday_name = match.group(2)

            # Calculate date based on academic year start
            days_offset = (week_num - 1) * 7

            if weekday_name:
                weekday_map = {
                    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                    'friday': 4, 'saturday': 5, 'sunday': 6
                }
                # Add days to get to the specific weekday
                target_weekday = weekday_map[weekday_name]
                start_weekday = self.academic_year_start.weekday()
                weekday_offset = (target_weekday - start_weekday) % 7
                days_offset += weekday_offset

            target_date = self.academic_year_start + timedelta(days=days_offset)
            target_date = target_date.replace(hour=23, minute=59, second=59)

            return (target_date, 0.75)  # Reasonably confident

        return None

    def _parse_flexible(self, date_string: str, context: Optional[str] = None) -> Optional[Tuple[datetime, float]]:
        """Try flexible parsing using dateutil as last resort"""
        try:
            # Use dateutil's parser as fallback
            parsed = dateutil_parser.parse(date_string, fuzzy=True, default=self.current_date)

            # If year wasn't in string, dateutil might use current year
            # For syllabi, we want future dates in the academic year
            if parsed < self.current_date:
                # Try next year
                parsed = parsed.replace(year=parsed.year + 1)

            # Set default time
            if parsed.hour == 0 and parsed.minute == 0 and parsed.second == 0:
                parsed = parsed.replace(hour=23, minute=59, second=59)

            return (parsed, 0.60)  # Lower confidence for fuzzy parsing

        except:
            return None

    def _is_valid_date(self, date: datetime) -> bool:
        """
        Check if a date is valid for a syllabus assignment

        Args:
            date: Date to validate

        Returns:
            True if valid, False otherwise
        """
        # Date should be in the future (or very recent past, within 1 week)
        min_date = self.current_date - timedelta(days=7)

        # Date should be within academic year or next academic year
        max_date = self.academic_year_end + timedelta(days=365)

        if min_date <= date <= max_date:
            return True

        logger.debug(f"Date {date} outside valid range ({min_date} to {max_date})")
        return False

    def validate_assignment_dates(self, assignments: List[dict]) -> List[dict]:
        """
        Validate and enrich assignment dates with warnings

        Args:
            assignments: List of assignment dictionaries with 'due_date' field

        Returns:
            List of assignments with added 'date_warning' and 'date_confidence' fields
        """
        validated = []

        for assignment in assignments:
            validated_assignment = assignment.copy()

            # Parse the due date
            due_date_str = assignment.get('due_date')

            if not due_date_str:
                validated_assignment['date_warning'] = "No due date provided"
                validated_assignment['date_confidence'] = 0.0
                validated.append(validated_assignment)
                continue

            # If already a datetime object, validate it
            if isinstance(due_date_str, datetime):
                if self._is_valid_date(due_date_str):
                    validated_assignment['date_confidence'] = 0.90
                    validated_assignment['date_warning'] = None
                else:
                    validated_assignment['date_warning'] = "Date is outside expected academic year"
                    validated_assignment['date_confidence'] = 0.50

                validated.append(validated_assignment)
                continue

            # Parse string date
            parse_result = self.parse_date(due_date_str, assignment.get('title'))

            if parse_result:
                parsed_date, confidence = parse_result
                validated_assignment['due_date'] = parsed_date
                validated_assignment['date_confidence'] = confidence

                # Add warnings for low confidence or edge cases
                warnings = []
                if confidence < 0.7:
                    warnings.append("Low confidence date parse")

                if parsed_date < self.current_date:
                    warnings.append("Date is in the past")

                if parsed_date > self.academic_year_end:
                    warnings.append("Date is beyond current academic year")

                validated_assignment['date_warning'] = "; ".join(warnings) if warnings else None

            else:
                validated_assignment['date_warning'] = f"Could not parse date: {due_date_str}"
                validated_assignment['date_confidence'] = 0.0

            validated.append(validated_assignment)

        return validated

    def detect_date_ambiguity(self, date_string: str) -> List[str]:
        """
        Detect potential ambiguities in date parsing

        Args:
            date_string: Date string to analyze

        Returns:
            List of ambiguity warnings
        """
        warnings = []

        # Check for MM/DD vs DD/MM ambiguity
        if re.match(r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$', date_string):
            parts = re.split(r'[/-]', date_string)
            first = int(parts[0])
            second = int(parts[1])

            if 1 <= first <= 12 and 1 <= second <= 12:
                warnings.append("Ambiguous date format (MM/DD vs DD/MM)")

        # Check for missing year
        if not re.search(r'\d{4}', date_string):
            warnings.append("No year specified - using academic year")

        # Check for vague descriptions
        vague_terms = ['soon', 'later', 'tbd', 'tba', 'to be announced', 'to be determined']
        if any(term in date_string.lower() for term in vague_terms):
            warnings.append("Vague date description")

        return warnings

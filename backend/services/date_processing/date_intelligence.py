"""
Advanced date intelligence with fuzzy matching and academic calendar support.
Handles ambiguous dates, multiple formats, and contextual inference.
"""

import logging
from typing import Optional, Tuple, List
from datetime import datetime, timedelta
import re

# Advanced date parsing
import dateparser

logger = logging.getLogger(__name__)


class DateIntelligence:
    """
    Advanced date parsing with context awareness.

    Features:
    - 25+ date formats
    - Fuzzy matching ("next Monday", "Week 3")
    - Academic calendar inference
    - Ambiguity detection and resolution
    - Confidence scoring
    """

    def __init__(self):
        # Configure dateparser settings
        self.dateparser_settings = {
            'PREFER_DATES_FROM': 'future',  # Prefer future dates for syllabi
            'RELATIVE_BASE': datetime.now(),
            'RETURN_AS_TIMEZONE_AWARE': False,
            'STRICT_PARSING': False  # Allow fuzzy matching
        }

    def parse_date(
        self,
        date_str: str,
        context: Optional[dict] = None
    ) -> Tuple[Optional[datetime], float]:
        """
        Parse date string with confidence score.

        Args:
            date_str: Date string to parse
            context: Optional context (semester_start, semester_end, etc.)

        Returns:
            Tuple of (parsed_datetime, confidence_score)
            Returns (None, 0.0) if parsing fails
        """
        if not date_str or not isinstance(date_str, str):
            return None, 0.0

        date_str = str(date_str).strip()

        # Try multiple parsing strategies, return first that succeeds
        strategies = [
            self._parse_explicit_format,
            self._parse_with_dateparser,
            self._parse_week_based,
            self._parse_relative,
            self._parse_fuzzy
        ]

        for strategy in strategies:
            try:
                result = strategy(date_str, context)
                if result[0]:  # If parsed successfully
                    logger.debug(f"Parsed '{date_str}' → {result[0]} (confidence: {result[1]:.2f})")
                    return result
            except Exception as e:
                logger.debug(f"Strategy {strategy.__name__} failed for '{date_str}': {str(e)}")
                continue

        logger.warning(f"Could not parse date: '{date_str}'")
        return None, 0.0

    def _parse_explicit_format(
        self,
        date_str: str,
        context: Optional[dict]
    ) -> Tuple[Optional[datetime], float]:
        """
        Parse explicit formats (highest confidence).

        Formats:
        - YYYY-MM-DD HH:MM:SS
        - YYYY-MM-DD
        - MM/DD/YYYY
        - DD/MM/YYYY
        """
        # ISO format (highest confidence)
        iso_pattern = r'^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$'
        match = re.match(iso_pattern, date_str)
        if match:
            groups = match.groups()
            year, month, day = groups[0:3]
            hour, minute, second = groups[3:6]

            if hour is None:
                hour, minute, second = '23', '59', '59'  # Default end of day

            dt = datetime(
                int(year), int(month), int(day),
                int(hour), int(minute), int(second)
            )
            return dt, 0.98  # Very high confidence

        # MM/DD/YYYY or DD/MM/YYYY
        slash_pattern = r'(\d{1,2})/(\d{1,2})/(\d{4})'
        match = re.search(slash_pattern, date_str)
        if match:
            val1, val2, year = match.groups()
            val1, val2, year = int(val1), int(val2), int(year)

            # Determine if MM/DD or DD/MM
            if val1 > 12:
                # Must be DD/MM
                day, month = val1, val2
                confidence = 0.85
            elif val2 > 12:
                # Must be MM/DD
                month, day = val1, val2
                confidence = 0.85
            else:
                # Ambiguous - assume MM/DD (US format) but lower confidence
                month, day = val1, val2
                confidence = 0.75

            dt = datetime(year, month, day, 23, 59, 59)
            return dt, confidence

        # Month DD, YYYY
        month_day_year_pattern = r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})'
        match = re.search(month_day_year_pattern, date_str, re.IGNORECASE)
        if match:
            month_str, day, year = match.groups()

            month_map = {
                'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
                'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
                'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
            }

            month = month_map.get(month_str[:3].lower())
            if month:
                dt = datetime(int(year), month, int(day), 23, 59, 59)
                return dt, 0.90

        return None, 0.0

    def _parse_with_dateparser(
        self,
        date_str: str,
        context: Optional[dict]
    ) -> Tuple[Optional[datetime], float]:
        """
        Parse using dateparser library (handles many formats).
        """
        parsed = dateparser.parse(date_str, settings=self.dateparser_settings)

        if parsed:
            # Add time if not present
            if parsed.hour == 0 and parsed.minute == 0 and parsed.second == 0:
                parsed = parsed.replace(hour=23, minute=59, second=59)

            # Confidence based on how explicit the format was
            confidence = 0.80  # Dateparser is good but not perfect

            # CRITICAL: Fix year based on semester context if year was not explicit
            if not re.search(r'\d{4}', date_str) and context:
                parsed = self._fix_year_with_semester_context(parsed, context)
                confidence = 0.70  # Lower confidence when inferring year

            return parsed, confidence

        return None, 0.0

    def _parse_week_based(
        self,
        date_str: str,
        context: Optional[dict]
    ) -> Tuple[Optional[datetime], float]:
        """
        Parse week-based dates (e.g., "Week 3", "Week 10 Monday").

        Requires semester_start in context for accurate calculation.
        """
        # Pattern: "Week X" or "Week X Day"
        week_pattern = r'[Ww]eek\s+(\d+)(?:\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))?'
        match = re.search(week_pattern, date_str, re.IGNORECASE)

        if not match:
            return None, 0.0

        week_num = int(match.group(1))
        day_name = match.group(2)

        # Get semester start date from context
        semester_start = None
        if context and 'semester_start' in context:
            semester_start = context['semester_start']
            if isinstance(semester_start, str):
                semester_start, _ = self._parse_explicit_format(semester_start, None)

        # Default semester start if not provided (late August)
        if not semester_start:
            current_year = datetime.now().year
            # Assume fall semester starts late August
            semester_start = datetime(current_year, 8, 25)
            confidence = 0.50  # Low confidence without explicit semester start
        else:
            confidence = 0.75  # Higher confidence with known semester start

        # Calculate date
        days_offset = (week_num - 1) * 7

        if day_name:
            # Map day name to offset
            day_map = {
                'monday': 0, 'tuesday': 1, 'wednesday': 2,
                'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6
            }
            day_offset = day_map.get(day_name.lower(), 0)

            # Find the weekday
            start_weekday = semester_start.weekday()
            target_weekday = day_offset

            # Calculate days to target weekday
            days_to_target = (target_weekday - start_weekday) % 7

            calculated_date = semester_start + timedelta(days=days_offset + days_to_target)
        else:
            # Default to Friday of that week
            calculated_date = semester_start + timedelta(days=days_offset + 4)

        # Set time to end of day
        calculated_date = calculated_date.replace(hour=23, minute=59, second=59)

        return calculated_date, confidence

    def _parse_relative(
        self,
        date_str: str,
        context: Optional[dict]
    ) -> Tuple[Optional[datetime], float]:
        """
        Parse relative dates (e.g., "next Monday", "in 2 weeks").
        """
        # dateparser handles these well
        parsed = dateparser.parse(date_str, settings=self.dateparser_settings)

        if parsed:
            # Set to end of day
            parsed = parsed.replace(hour=23, minute=59, second=59)
            return parsed, 0.65  # Moderate confidence for relative dates

        return None, 0.0

    def _parse_fuzzy(
        self,
        date_str: str,
        context: Optional[dict]
    ) -> Tuple[Optional[datetime], float]:
        """
        Fuzzy parsing for malformed dates (last resort).
        """
        # Try to extract anything that looks like a date
        # Month and day at minimum
        patterns = [
            r'(\d{1,2})[/-](\d{1,2})',  # MM/DD or DD/MM (no year)
            r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})',  # Month DD
        ]

        for pattern in patterns:
            match = re.search(pattern, date_str, re.IGNORECASE)
            if match:
                # Infer year from context or current year
                current_year = datetime.now().year
                current_month = datetime.now().month

                if len(match.groups()) == 2:
                    # Try to build a date
                    try:
                        if match.group(1).isalpha():
                            # Month name
                            month_map = {
                                'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
                                'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
                                'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
                            }
                            month = month_map.get(match.group(1)[:3].lower())
                            day = int(match.group(2))

                            # Infer year
                            if month and month < current_month:
                                year = current_year + 1  # Likely next year
                            else:
                                year = current_year

                            dt = datetime(year, month, day, 23, 59, 59)
                            return dt, 0.40  # Low confidence, fuzzy match

                    except Exception as e:
                        logger.debug(f"Fuzzy parse failed: {str(e)}")

        return None, 0.0

    def _fix_year_with_semester_context(self, parsed_date: datetime, context: dict) -> datetime:
        """
        Fix the year of a parsed date using semester context.

        This is CRITICAL for dates like "Sep 15" where the year is ambiguous.
        We check if the date falls within the semester bounds, and adjust if needed.

        Args:
            parsed_date: Date parsed by dateparser (may have wrong year)
            context: Semester context with semester_start and semester_end

        Returns:
            Date with corrected year
        """
        if not context or ('semester_start' not in context and 'semester_end' not in context):
            return parsed_date

        semester_start = context.get('semester_start')
        semester_end = context.get('semester_end')

        if not semester_start or not semester_end:
            return parsed_date

        # Preserve the month/day/time, try different years
        month = parsed_date.month
        day = parsed_date.day
        hour = parsed_date.hour
        minute = parsed_date.minute
        second = parsed_date.second

        # Try the semester year first
        semester_year = semester_start.year

        # Also try adjacent years
        candidate_years = [
            semester_year,
            semester_year + 1,
            semester_year - 1
        ]

        for year in candidate_years:
            try:
                candidate_date = datetime(year, month, day, hour, minute, second)

                # Check if this falls within semester bounds
                if semester_start <= candidate_date <= semester_end:
                    logger.debug(f"Fixed year: {parsed_date.date()} → {candidate_date.date()} (within semester bounds)")
                    return candidate_date
            except ValueError:
                # Invalid date (e.g., Feb 30)
                continue

        # If no year fits within bounds, use the semester year
        # This handles edge cases where the date might be slightly outside bounds
        try:
            fixed_date = datetime(semester_year, month, day, hour, minute, second)
            logger.debug(f"Fixed year to semester year: {parsed_date.date()} → {fixed_date.date()}")
            return fixed_date
        except ValueError:
            # Fallback: return original if all else fails
            return parsed_date

    def detect_ambiguity(self, date_str: str) -> List[str]:
        """
        Detect ambiguities in date string.

        Returns:
            List of warnings about ambiguities
        """
        warnings = []

        # Check for MM/DD vs DD/MM ambiguity
        slash_pattern = r'(\d{1,2})/(\d{1,2})/(\d{4})'
        match = re.search(slash_pattern, date_str)
        if match:
            val1, val2, year = match.groups()
            val1, val2 = int(val1), int(val2)

            if val1 <= 12 and val2 <= 12 and val1 != val2:
                warnings.append(f"Ambiguous date format: '{date_str}' could be MM/DD or DD/MM. Assuming MM/DD (US format).")

        # Check for missing year
        if not re.search(r'\d{4}', date_str):
            warnings.append(f"Missing year in '{date_str}', inferred from context")

        # Check for relative dates
        if any(word in date_str.lower() for word in ['next', 'after', 'before', 'week']):
            warnings.append(f"Relative date '{date_str}' calculated from current date or semester timeline")

        return warnings

    def normalize_to_iso(self, dt: datetime) -> str:
        """
        Normalize datetime to ISO format string.

        Args:
            dt: datetime object

        Returns:
            String in "YYYY-MM-DD HH:MM:SS" format
        """
        return dt.strftime('%Y-%m-%d %H:%M:%S')

    def validate_date(self, dt: datetime, context: Optional[dict] = None) -> Tuple[bool, List[str]]:
        """
        Validate parsed date for sanity.

        Args:
            dt: Parsed datetime
            context: Optional context for validation

        Returns:
            Tuple of (is_valid, warnings)
        """
        warnings = []
        is_valid = True

        # Check if date is too far in the past
        if dt < datetime.now() - timedelta(days=90):
            warnings.append(f"Date {dt.date()} is more than 90 days in the past")
            is_valid = False

        # Check if date is too far in the future (more than 2 years)
        if dt > datetime.now() + timedelta(days=730):
            warnings.append(f"Date {dt.date()} is more than 2 years in the future")
            is_valid = False

        # Check against semester bounds if provided
        if context:
            if 'semester_start' in context and context['semester_start']:
                semester_start = context['semester_start']
                if isinstance(semester_start, str):
                    semester_start, _ = self._parse_explicit_format(semester_start, None)

                if semester_start and dt < semester_start:
                    warnings.append(f"Date {dt.date()} is before semester start {semester_start.date()}")

            if 'semester_end' in context and context['semester_end']:
                semester_end = context['semester_end']
                if isinstance(semester_end, str):
                    semester_end, _ = self._parse_explicit_format(semester_end, None)

                if semester_end and dt > semester_end:
                    warnings.append(f"Date {dt.date()} is after semester end {semester_end.date()}")

        return is_valid, warnings

"""
Multi-level validation for parsed assignments.
Ensures data quality and catches AI parsing errors.
"""

import logging
from typing import List, Dict, Tuple
from datetime import datetime, timedelta

from services.date_processing.date_intelligence import DateIntelligence

logger = logging.getLogger(__name__)


class AssignmentValidator:
    """
    Validates parsed assignments for quality and correctness.

    Validation levels:
    1. Schema validation (required fields, types)
    2. Data sanity (dates in range, valid types)
    3. Cross-validation (chronological order, no duplicates)
    4. Confidence thresholds
    """

    def __init__(self):
        self.date_intelligence = DateIntelligence()

        # Valid assignment types
        self.valid_types = ['homework', 'exam', 'project', 'quiz', 'presentation', 'other']

    def validate_assignments(
        self,
        assignments: List[Dict],
        context: Dict = None
    ) -> Tuple[List[Dict], List[Dict], List[str]]:
        """
        Validate list of assignments.

        Args:
            assignments: Raw assignments from AI
            context: Optional context (semester info, etc.)

        Returns:
            Tuple of (valid_assignments, invalid_assignments, global_warnings)
        """
        logger.info(f"Validating {len(assignments)} assignments")

        valid = []
        invalid = []
        global_warnings = []

        for idx, assignment in enumerate(assignments):
            is_valid, warnings = self._validate_single_assignment(assignment, context)

            if is_valid:
                # Add warnings to assignment
                if warnings:
                    if 'warnings' not in assignment or not assignment['warnings']:
                        assignment['warnings'] = warnings
                    else:
                        assignment['warnings'].extend(warnings)

                valid.append(assignment)
            else:
                logger.warning(f"Assignment {idx} invalid: {assignment.get('title', 'unknown')}")
                invalid.append({
                    'assignment': assignment,
                    'errors': warnings
                })

        # Cross-validation
        if len(valid) > 1:
            cross_warnings = self._cross_validate(valid)
            global_warnings.extend(cross_warnings)

        logger.info(
            f"Validation complete: {len(valid)} valid, {len(invalid)} invalid, "
            f"{len(global_warnings)} global warnings"
        )

        return valid, invalid, global_warnings

    def _validate_single_assignment(
        self,
        assignment: Dict,
        context: Dict = None
    ) -> Tuple[bool, List[str]]:
        """
        Validate a single assignment.

        Returns:
            Tuple of (is_valid, warnings)
        """
        warnings = []

        # Level 1: Schema validation
        required_fields = ['title', 'due_date', 'assignment_type']

        for field in required_fields:
            if field not in assignment or not assignment[field]:
                warnings.append(f"Missing required field: {field}")
                return False, warnings

        # Level 2: Data type validation
        if not isinstance(assignment['title'], str):
            warnings.append("Title must be a string")
            return False, warnings

        if not isinstance(assignment['due_date'], str):
            warnings.append("Due date must be a string")
            return False, warnings

        if assignment['assignment_type'].lower() not in self.valid_types:
            warnings.append(f"Invalid assignment type: {assignment['assignment_type']}")
            return False, warnings

        # Level 3: Date validation
        try:
            # Parse date
            due_date = datetime.strptime(assignment['due_date'], '%Y-%m-%d %H:%M:%S')

            # Validate date
            is_valid_date, date_warnings = self.date_intelligence.validate_date(due_date, context)

            if not is_valid_date:
                warnings.extend(date_warnings)
                return False, warnings

            if date_warnings:
                warnings.extend(date_warnings)

        except ValueError as e:
            warnings.append(f"Invalid date format: {assignment['due_date']}")
            return False, warnings

        # Level 4: Confidence threshold
        if 'confidence_metadata' in assignment:
            metadata = assignment['confidence_metadata']

            # Check date confidence
            date_confidence = metadata.get('date_confidence', 1.0)
            if date_confidence < 0.3:
                warnings.append(f"Very low date confidence: {date_confidence:.2f}")
                # Don't invalidate, but warn

            # Check type confidence
            type_confidence = metadata.get('type_confidence', 1.0)
            if type_confidence < 0.3:
                warnings.append(f"Very low type confidence: {type_confidence:.2f}")

        # Level 5: Content validation
        title_length = len(assignment['title'].strip())
        if title_length < 3:
            warnings.append(f"Title too short: '{assignment['title']}'")
            return False, warnings

        if title_length > 200:
            warnings.append(f"Title too long (truncating): {title_length} chars")
            assignment['title'] = assignment['title'][:200]

        return True, warnings

    def _cross_validate(self, assignments: List[Dict]) -> List[str]:
        """
        Cross-validate assignments for consistency.

        Returns:
            List of warnings
        """
        warnings = []

        # Check chronological order
        dates = []
        for assignment in assignments:
            try:
                due_date = datetime.strptime(assignment['due_date'], '%Y-%m-%d %H:%M:%S')
                dates.append((assignment['title'], due_date))
            except:
                continue

        # Sort and check for issues
        dates.sort(key=lambda x: x[1])

        # Check for duplicates
        seen_titles = {}
        for title, due_date in dates:
            title_lower = title.lower().strip()

            if title_lower in seen_titles:
                prev_date = seen_titles[title_lower]
                if due_date == prev_date:
                    warnings.append(f"Duplicate assignment: '{title}' on {due_date.date()}")
                else:
                    # Same title, different date - might be rescheduled or two parts
                    warnings.append(
                        f"Assignment '{title}' appears twice with different dates: "
                        f"{prev_date.date()} and {due_date.date()}"
                    )
            else:
                seen_titles[title_lower] = due_date

        # Check for unrealistic clustering
        if len(dates) > 1:
            for i in range(len(dates) - 1):
                date1 = dates[i][1]
                date2 = dates[i+1][1]

                # Check if same day
                if date1.date() == date2.date():
                    warnings.append(
                        f"Multiple assignments on same day ({date1.date()}): "
                        f"'{dates[i][0]}' and '{dates[i+1][0]}'"
                    )

        return warnings

    def calculate_overall_confidence(self, assignments: List[Dict]) -> float:
        """
        Calculate overall parsing confidence.

        Args:
            assignments: Validated assignments

        Returns:
            Overall confidence score (0-1)
        """
        if not assignments:
            return 0.0

        confidences = []

        for assignment in assignments:
            if 'confidence_metadata' in assignment:
                metadata = assignment['confidence_metadata']
                date_conf = metadata.get('date_confidence', 0.8)
                type_conf = metadata.get('type_confidence', 0.8)

                # Average of date and type confidence
                avg_conf = (date_conf + type_conf) / 2
                confidences.append(avg_conf)
            else:
                # No confidence metadata, assume moderate confidence
                confidences.append(0.7)

        # Overall confidence is average of all
        overall = sum(confidences) / len(confidences)

        return overall

    def enrich_assignments(self, assignments: List[Dict]) -> List[Dict]:
        """
        Enrich assignments with additional computed fields.

        Args:
            assignments: Validated assignments

        Returns:
            Enriched assignments
        """
        for assignment in assignments:
            # Add computed fields
            try:
                due_date = datetime.strptime(assignment['due_date'], '%Y-%m-%d %H:%M:%S')

                # Days until due
                assignment['days_until_due'] = (due_date - datetime.now()).days

                # Is upcoming (within 7 days)
                assignment['is_upcoming'] = 0 <= assignment['days_until_due'] <= 7

                # Is overdue
                assignment['is_overdue'] = assignment['days_until_due'] < 0

            except:
                pass

            # Normalize assignment type to lowercase
            assignment['assignment_type'] = assignment['assignment_type'].lower()

        return assignments

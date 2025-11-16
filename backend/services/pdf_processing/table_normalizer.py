"""
Table normalization and semantic understanding.
Converts raw tables into structured, AI-friendly format.
"""

import logging
from typing import List, Dict, Optional, Tuple
import re

logger = logging.getLogger(__name__)


class TableNormalizer:
    """
    Normalizes extracted tables for better AI parsing.
    - Detects and standardizes headers
    - Maps columns to semantic meaning
    - Handles merged cells and empty values
    """

    def __init__(self):
        # Common column headers and their semantic meanings
        self.header_mappings = {
            'date': ['date', 'due date', 'deadline', 'when', 'day'],
            'week': ['week', 'wk', 'week #', 'week number'],
            'assignment': ['assignment', 'task', 'deliverable', 'work', 'homework', 'hw'],
            'topic': ['topic', 'subject', 'chapter', 'reading', 'material', 'content'],
            'type': ['type', 'category', 'kind'],
            'description': ['description', 'details', 'notes', 'info'],
        }

    def normalize_tables(self, tables: List[Dict]) -> List[Dict]:
        """
        Normalize all tables for consistent structure.

        Args:
            tables: Raw tables from PDF extraction

        Returns:
            Normalized tables with semantic column mappings
        """
        normalized = []

        for table in tables:
            try:
                normalized_table = self._normalize_single_table(table)
                if normalized_table:
                    normalized.append(normalized_table)
            except Exception as e:
                logger.warning(f"Error normalizing table: {str(e)}")
                # Keep original table as fallback
                normalized.append(table)

        logger.info(f"Normalized {len(normalized)} tables")
        return normalized

    def _normalize_single_table(self, table: Dict) -> Dict:
        """
        Normalize a single table.

        Args:
            table: Raw table dict with 'data', 'rows', 'cols', etc.

        Returns:
            Normalized table with semantic information
        """
        data = table.get('data', [])
        if not data or len(data) == 0:
            return table

        # Detect headers (usually first row)
        header_row, data_rows = self._detect_headers(data)

        # Map headers to semantic meanings
        column_mapping = self._map_columns_to_semantics(header_row)

        # Clean and normalize cell values
        normalized_data = []
        for row in data_rows:
            normalized_row = self._normalize_row(row, column_mapping)
            if normalized_row and any(normalized_row.values()):  # Skip empty rows
                normalized_data.append(normalized_row)

        # Create normalized table structure
        normalized_table = {
            **table,  # Keep original metadata
            'normalized_data': normalized_data,
            'column_mapping': column_mapping,
            'headers': header_row,
            'has_date_column': 'date' in column_mapping.values(),
            'has_assignment_column': 'assignment' in column_mapping.values(),
        }

        return normalized_table

    def _detect_headers(self, data: List[List]) -> Tuple[List[str], List[List]]:
        """
        Detect header row (usually first row with text).

        Returns:
            Tuple of (header_row, data_rows)
        """
        if not data:
            return [], []

        # Assume first row is header
        header_row = [str(cell).strip() if cell else '' for cell in data[0]]

        # Check if first row looks like a header (contains keywords)
        header_keywords = ['date', 'week', 'assignment', 'topic', 'due']
        header_score = sum(
            1 for cell in header_row
            if any(kw in cell.lower() for kw in header_keywords)
        )

        if header_score >= 1:
            # First row is likely header
            return header_row, data[1:]
        else:
            # No clear header, create generic column names
            generic_headers = [f"Column {i+1}" for i in range(len(data[0]))]
            return generic_headers, data

    def _map_columns_to_semantics(self, header_row: List[str]) -> Dict[int, str]:
        """
        Map column indices to semantic meanings.

        Args:
            header_row: List of header cell values

        Returns:
            Dict mapping column index to semantic meaning
        """
        mapping = {}

        for col_idx, header_cell in enumerate(header_row):
            header_lower = header_cell.lower().strip()

            # Try to match to semantic category
            for semantic, keywords in self.header_mappings.items():
                if any(kw in header_lower for kw in keywords):
                    mapping[col_idx] = semantic
                    break

            # If no match, use generic name
            if col_idx not in mapping:
                mapping[col_idx] = f"col_{col_idx}"

        logger.debug(f"Column mapping: {mapping}")
        return mapping

    def _normalize_row(
        self,
        row: List,
        column_mapping: Dict[int, str]
    ) -> Dict[str, str]:
        """
        Normalize a single row using column mapping.

        Args:
            row: Raw row data
            column_mapping: Column index to semantic meaning

        Returns:
            Dict with semantic keys
        """
        normalized = {}

        for col_idx, cell_value in enumerate(row):
            semantic_key = column_mapping.get(col_idx, f"col_{col_idx}")

            # Clean cell value
            cleaned_value = self._clean_cell_value(cell_value)

            normalized[semantic_key] = cleaned_value

        return normalized

    def _clean_cell_value(self, value: any) -> str:
        """Clean and standardize cell value"""
        if value is None:
            return ""

        # Convert to string
        str_value = str(value).strip()

        # Remove multiple whitespaces
        str_value = re.sub(r'\s+', ' ', str_value)

        # Remove common artifacts
        str_value = str_value.replace('\n', ' ').replace('\r', '')

        return str_value

    def format_for_ai_prompt(self, normalized_tables: List[Dict]) -> str:
        """
        Format normalized tables for AI prompt.

        Args:
            normalized_tables: List of normalized tables

        Returns:
            Formatted string for AI prompt
        """
        if not normalized_tables:
            return ""

        formatted_parts = []

        for idx, table in enumerate(normalized_tables, 1):
            normalized_data = table.get('normalized_data', [])
            if not normalized_data:
                continue

            formatted_parts.append(f"\n=== TABLE {idx} (Normalized) ===")
            formatted_parts.append(f"Page: {table.get('page', 'unknown')}")
            formatted_parts.append(f"Quality: {table.get('quality_score', 0):.2f}")

            # Add semantic information
            if table.get('has_date_column'):
                formatted_parts.append("✓ Contains DATE column")
            if table.get('has_assignment_column'):
                formatted_parts.append("✓ Contains ASSIGNMENT column")

            formatted_parts.append("\nData (key: value format):")

            # Format rows
            for row_idx, row_data in enumerate(normalized_data[:20], 1):  # Limit to 20 rows
                row_str = f"Row {row_idx}: " + " | ".join(
                    f"{k}={v}" for k, v in row_data.items() if v
                )
                formatted_parts.append(row_str)

            if len(normalized_data) > 20:
                formatted_parts.append(f"... and {len(normalized_data) - 20} more rows")

        return "\n".join(formatted_parts)

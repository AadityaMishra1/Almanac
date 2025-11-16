import PyPDF2
import pdfplumber
import camelot
from pdfminer.high_level import extract_text as pdfminer_extract_text
from pdfminer.layout import LAParams
from pdf2image import convert_from_bytes
from io import BytesIO
from typing import List, Dict, Optional, Tuple
import logging
import tempfile
import os
import re

logger = logging.getLogger(__name__)

class PDFParser:
    """
    Enhanced service for extracting text, tables, and images from PDF files.
    Handles color-coded calendar charts, complex table structures, and scanned PDFs.

    Improvements:
    - Multi-layered text extraction (PyPDF2, pdfplumber, pdfminer.six)
    - OCR support for scanned PDFs (via pytesseract)
    - Enhanced table extraction with quality scoring
    - Metadata extraction (creation date, author, etc.)
    - Page structure analysis
    - Better handling of different PDF formats
    """

    def __init__(self):
        self.ocr_available = self._check_ocr_availability()

    def _check_ocr_availability(self) -> bool:
        """Check if Tesseract OCR is available on the system"""
        try:
            import pytesseract
            # Try to get version to verify installation
            pytesseract.get_tesseract_version()
            logger.info("Tesseract OCR is available")
            return True
        except Exception as e:
            logger.warning(f"Tesseract OCR not available: {str(e)}")
            return False

    def extract_metadata(self, pdf_content: bytes) -> Dict:
        """
        Extract PDF metadata for better context understanding

        Args:
            pdf_content: PDF file content as bytes

        Returns:
            Dictionary containing metadata
        """
        metadata = {
            'num_pages': 0,
            'author': None,
            'creator': None,
            'creation_date': None,
            'title': None,
            'is_encrypted': False,
            'is_scanned': False
        }

        try:
            pdf_file = BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            metadata['num_pages'] = len(pdf_reader.pages)
            metadata['is_encrypted'] = pdf_reader.is_encrypted

            # Extract metadata
            if pdf_reader.metadata:
                metadata['author'] = pdf_reader.metadata.get('/Author', None)
                metadata['creator'] = pdf_reader.metadata.get('/Creator', None)
                metadata['creation_date'] = pdf_reader.metadata.get('/CreationDate', None)
                metadata['title'] = pdf_reader.metadata.get('/Title', None)

            # Detect if PDF is scanned (has very little extractable text)
            if metadata['num_pages'] > 0:
                first_page_text = pdf_reader.pages[0].extract_text()
                # If first page has less than 50 characters, likely scanned
                if len(first_page_text.strip()) < 50:
                    metadata['is_scanned'] = True

            logger.info(f"Extracted metadata: {metadata['num_pages']} pages, scanned: {metadata['is_scanned']}")

        except Exception as e:
            logger.error(f"Error extracting metadata: {str(e)}")

        return metadata

    def extract_text(self, pdf_content: bytes) -> str:
        """
        Extract text content from PDF bytes using multiple methods for robustness

        Strategy:
        1. Try PyPDF2 (fast, good for most PDFs)
        2. Try pdfminer.six (better layout analysis)
        3. Try pdfplumber (good for structured text)
        4. If scanned PDF detected and OCR available, use OCR

        Args:
            pdf_content: PDF file content as bytes

        Returns:
            Extracted text as string
        """
        text = ""
        metadata = self.extract_metadata(pdf_content)

        # Method 1: PyPDF2 (fast and reliable for most cases)
        try:
            pdf_file = BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"

            logger.info(f"PyPDF2 extracted {len(text)} characters")

        except Exception as e:
            logger.warning(f"PyPDF2 text extraction failed: {str(e)}")

        # If PyPDF2 didn't extract much text, try pdfminer.six
        if len(text.strip()) < 100:
            try:
                # pdfminer.six with optimized layout parameters
                laparams = LAParams(
                    line_margin=0.5,
                    word_margin=0.1,
                    char_margin=2.0,
                    boxes_flow=0.5,
                    detect_vertical=True,
                    all_texts=True
                )

                pdf_file = BytesIO(pdf_content)
                pdfminer_text = pdfminer_extract_text(pdf_file, laparams=laparams)

                if len(pdfminer_text.strip()) > len(text.strip()):
                    text = pdfminer_text
                    logger.info(f"pdfminer.six extracted {len(text)} characters (better)")

            except Exception as e:
                logger.warning(f"pdfminer.six text extraction failed: {str(e)}")

        # If still not much text, try pdfplumber
        if len(text.strip()) < 100:
            try:
                pdf_file = BytesIO(pdf_content)
                pdfplumber_text = ""

                with pdfplumber.open(pdf_file) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            pdfplumber_text += page_text + "\n"

                if len(pdfplumber_text.strip()) > len(text.strip()):
                    text = pdfplumber_text
                    logger.info(f"pdfplumber extracted {len(text)} characters (better)")

            except Exception as e:
                logger.warning(f"pdfplumber text extraction failed: {str(e)}")

        # If scanned PDF and OCR available, use OCR
        if metadata.get('is_scanned', False) and self.ocr_available and len(text.strip()) < 100:
            try:
                ocr_text = self._extract_text_with_ocr(pdf_content)
                if len(ocr_text.strip()) > len(text.strip()):
                    text = ocr_text
                    logger.info(f"OCR extracted {len(text)} characters from scanned PDF")
            except Exception as e:
                logger.warning(f"OCR text extraction failed: {str(e)}")

        return text.strip()

    def _extract_text_with_ocr(self, pdf_content: bytes) -> str:
        """
        Extract text from scanned PDF using OCR

        Args:
            pdf_content: PDF file content as bytes

        Returns:
            OCR-extracted text
        """
        try:
            import pytesseract

            # Convert PDF to images
            images = convert_from_bytes(pdf_content, dpi=300)

            text = ""
            for i, image in enumerate(images):
                logger.info(f"Running OCR on page {i + 1}/{len(images)}")
                page_text = pytesseract.image_to_string(image, lang='eng')
                text += page_text + f"\n--- Page {i + 1} ---\n"

            return text

        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            return ""

    def extract_tables(self, pdf_content: bytes) -> List[Dict]:
        """
        Extract tables from PDF using multiple methods for better accuracy.
        Crucial for parsing calendar charts and schedule tables.

        Improvements:
        - Try multiple extraction methods
        - Score table quality
        - Deduplicate similar tables
        - Better error handling

        Args:
            pdf_content: PDF file content as bytes

        Returns:
            List of dictionaries containing table data with page numbers and quality scores
        """
        tables = []
        pdf_file = BytesIO(pdf_content)

        # Method 1: pdfplumber (best for most cases, handles text-based tables well)
        try:
            with pdfplumber.open(pdf_file) as pdf:
                for page_num, page in enumerate(pdf.pages, start=1):
                    page_tables = page.extract_tables()
                    if page_tables:
                        for table_idx, table in enumerate(page_tables):
                            if table and len(table) > 0:
                                # Score table quality
                                quality_score = self._score_table_quality(table, 'pdfplumber')

                                # Convert table to a more structured format
                                table_data = {
                                    'page': page_num,
                                    'data': table,
                                    'method': 'pdfplumber',
                                    'rows': len(table),
                                    'cols': len(table[0]) if table else 0,
                                    'quality_score': quality_score
                                }
                                tables.append(table_data)
                                logger.info(f"Extracted table {table_idx + 1} from page {page_num} using pdfplumber (quality: {quality_score:.2f})")
        except Exception as e:
            logger.warning(f"pdfplumber table extraction failed: {str(e)}")

        # Method 2: camelot lattice (better for complex tables with borders)
        temp_pdf_path = None
        try:
            # Create temporary file for camelot
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(pdf_content)
                temp_pdf_path = tmp_file.name

            camelot_tables = camelot.read_pdf(temp_pdf_path, pages='all', flavor='lattice')

            for table in camelot_tables:
                if table.df is not None and not table.df.empty:
                    # Score table quality
                    quality_score = self._score_table_quality(table.df.values.tolist(), 'camelot')

                    # Combine camelot accuracy with our quality score
                    combined_score = (quality_score + (table.accuracy / 100)) / 2 if hasattr(table, 'accuracy') else quality_score

                    table_data = {
                        'page': table.page,
                        'data': table.df.values.tolist(),
                        'headers': table.df.columns.tolist(),
                        'method': 'camelot-lattice',
                        'rows': len(table.df),
                        'cols': len(table.df.columns),
                        'accuracy': table.accuracy if hasattr(table, 'accuracy') else None,
                        'quality_score': combined_score
                    }
                    tables.append(table_data)
                    logger.info(f"Extracted table from page {table.page} using camelot-lattice (accuracy: {table_data.get('accuracy', 'N/A')}, quality: {combined_score:.2f})")
        except Exception as e:
            logger.warning(f"camelot-lattice table extraction failed: {str(e)}")
        finally:
            if temp_pdf_path and os.path.exists(temp_pdf_path):
                try:
                    os.unlink(temp_pdf_path)
                except Exception as e:
                    logger.error(f"Failed to delete temp file {temp_pdf_path}: {e}")

        # Method 3: camelot stream (for tables without borders)
        if len(tables) < 3:  # Only try if we haven't found many tables yet
            temp_pdf_path_stream = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                    tmp_file.write(pdf_content)
                    temp_pdf_path_stream = tmp_file.name

                camelot_tables = camelot.read_pdf(temp_pdf_path_stream, pages='all', flavor='stream')

                for table in camelot_tables:
                    if table.df is not None and not table.df.empty:
                        quality_score = self._score_table_quality(table.df.values.tolist(), 'camelot')

                        table_data = {
                            'page': table.page,
                            'data': table.df.values.tolist(),
                            'headers': table.df.columns.tolist(),
                            'method': 'camelot-stream',
                            'rows': len(table.df),
                            'cols': len(table.df.columns),
                            'quality_score': quality_score
                        }
                        tables.append(table_data)
                        logger.info(f"Extracted table from page {table.page} using camelot-stream (quality: {quality_score:.2f})")
            except Exception as e:
                logger.warning(f"camelot-stream table extraction failed: {str(e)}")
            finally:
                if temp_pdf_path_stream and os.path.exists(temp_pdf_path_stream):
                    try:
                        os.unlink(temp_pdf_path_stream)
                    except Exception as e:
                        logger.error(f"Failed to delete temp file {temp_pdf_path_stream}: {e}")

        # Deduplicate similar tables
        tables = self._deduplicate_tables(tables)

        logger.info(f"Total unique tables extracted: {len(tables)}")
        return tables

    def _score_table_quality(self, table_data: List, method: str) -> float:
        """
        Score the quality of an extracted table

        Args:
            table_data: Table data as list of lists
            method: Extraction method used

        Returns:
            Quality score between 0 and 1
        """
        if not table_data or len(table_data) == 0:
            return 0.0

        score = 0.5  # Base score

        # More rows = likely more useful
        if len(table_data) > 5:
            score += 0.1
        if len(table_data) > 10:
            score += 0.1

        # Check for empty cells (lower score if too many)
        total_cells = sum(len(row) for row in table_data)
        empty_cells = sum(1 for row in table_data for cell in row if not str(cell).strip())
        if total_cells > 0:
            empty_ratio = empty_cells / total_cells
            score -= empty_ratio * 0.3

        # Check for date-like content (higher score for syllabus parsing)
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',  # MM/DD/YYYY or DD/MM/YYYY
            r'\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',  # DD Mon
            r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)',  # Day names
            r'Week\s+\d+',  # Week numbers
        ]

        date_cells = 0
        for row in table_data:
            for cell in row:
                cell_str = str(cell)
                if any(re.search(pattern, cell_str, re.IGNORECASE) for pattern in date_patterns):
                    date_cells += 1

        if total_cells > 0 and date_cells > 0:
            date_ratio = date_cells / total_cells
            score += min(date_ratio * 0.3, 0.3)  # Bonus for date content

        return min(max(score, 0.0), 1.0)  # Clamp between 0 and 1

    def _deduplicate_tables(self, tables: List[Dict]) -> List[Dict]:
        """
        Remove duplicate tables that were extracted by multiple methods

        Args:
            tables: List of table dictionaries

        Returns:
            Deduplicated list of tables
        """
        if len(tables) <= 1:
            return tables

        unique_tables = []

        for table in tables:
            is_duplicate = False

            for existing in unique_tables:
                # Check if tables are from same page with similar dimensions
                if (table['page'] == existing['page'] and
                    abs(table['rows'] - existing['rows']) <= 1 and
                    abs(table['cols'] - existing['cols']) <= 1):

                    # Keep the one with higher quality score
                    if table['quality_score'] > existing['quality_score']:
                        unique_tables.remove(existing)
                        unique_tables.append(table)

                    is_duplicate = True
                    break

            if not is_duplicate:
                unique_tables.append(table)

        # Sort by quality score (descending)
        unique_tables.sort(key=lambda x: x['quality_score'], reverse=True)

        return unique_tables

    def format_tables_for_prompt(self, tables: List[Dict]) -> str:
        """
        Format extracted tables into a readable string for AI prompts

        Args:
            tables: List of table dictionaries

        Returns:
            Formatted string representation of tables
        """
        if not tables:
            return ""

        formatted = []

        # Only include high-quality tables (score > 0.4)
        quality_tables = [t for t in tables if t.get('quality_score', 0) > 0.4]

        if not quality_tables:
            quality_tables = tables[:3]  # At least show top 3 if all are low quality

        for idx, table in enumerate(quality_tables[:5], start=1):  # Limit to top 5 tables
            formatted.append(f"\n=== TABLE {idx} (Page {table['page']}, Method: {table['method']}, Quality: {table.get('quality_score', 0):.2f}) ===")

            # Add headers if available
            if 'headers' in table and table['headers']:
                formatted.append("HEADERS: " + " | ".join(str(h) for h in table['headers']))

            # Format table data
            if table['method'].startswith('pdfplumber'):
                # pdfplumber returns list of lists
                for row_idx, row in enumerate(table['data'][:30]):  # Limit to first 30 rows
                    formatted.append(" | ".join(str(cell) if cell else "" for cell in row))
            else:
                # camelot returns list of lists
                for row_idx, row in enumerate(table['data'][:30]):  # Limit to first 30 rows
                    formatted.append(" | ".join(str(val) if val else "" for val in row))

            if len(table['data']) > 30:
                formatted.append(f"... ({len(table['data']) - 30} more rows)")

        return "\n".join(formatted)

    def extract_images(self, pdf_content: bytes) -> List[Dict]:
        """
        Extract images from PDF that might be calendar charts or visual schedules.

        Args:
            pdf_content: PDF file content as bytes

        Returns:
            List of dictionaries containing image data
        """
        images = []
        try:
            pdf_file = BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            for page_num, page in enumerate(pdf_reader.pages, start=1):
                if '/XObject' in page.get('/Resources', {}):
                    xObject = page['/Resources']['/XObject'].get_object()

                    for obj in xObject:
                        if xObject[obj]['/Subtype'] == '/Image':
                            # Extract image data
                            size = (xObject[obj].get('/Width', 0), xObject[obj].get('/Height', 0))
                            if size[0] > 100 and size[1] > 100:  # Filter small images
                                images.append({
                                    'page': page_num,
                                    'width': size[0],
                                    'height': size[1],
                                    'type': xObject[obj].get('/Filter', 'Unknown')
                                })
        except Exception as e:
            logger.warning(f"Image extraction failed: {str(e)}")

        logger.info(f"Total images extracted: {len(images)}")
        return images

    def analyze_pdf_structure(self, pdf_content: bytes) -> Dict:
        """
        Analyze PDF structure to provide context for better parsing

        Args:
            pdf_content: PDF file content as bytes

        Returns:
            Dictionary with structural analysis
        """
        analysis = {
            'has_tables': False,
            'has_images': False,
            'has_multiple_columns': False,
            'text_density': 0.0,
            'likely_calendar': False,
            'likely_schedule': False
        }

        try:
            # Get metadata
            metadata = self.extract_metadata(pdf_content)

            # Extract tables
            tables = self.extract_tables(pdf_content)
            analysis['has_tables'] = len(tables) > 0

            # Extract images
            images = self.extract_images(pdf_content)
            analysis['has_images'] = len(images) > 0

            # Extract text
            text = self.extract_text(pdf_content)

            # Calculate text density
            if metadata['num_pages'] > 0:
                analysis['text_density'] = len(text) / metadata['num_pages']

            # Detect calendar/schedule patterns
            calendar_keywords = ['week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
                               'due date', 'deadline', 'assignment', 'exam', 'quiz', 'project']

            text_lower = text.lower()
            keyword_count = sum(1 for kw in calendar_keywords if kw in text_lower)

            analysis['likely_calendar'] = keyword_count > 5 or (analysis['has_tables'] and keyword_count > 2)
            analysis['likely_schedule'] = analysis['has_tables'] and keyword_count > 3

            logger.info(f"PDF structure analysis: {analysis}")

        except Exception as e:
            logger.error(f"Error analyzing PDF structure: {str(e)}")

        return analysis

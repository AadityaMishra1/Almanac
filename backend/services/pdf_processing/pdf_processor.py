"""
Enhanced PDF processor that orchestrates multi-method extraction,
document classification, and table normalization.
"""

import logging
from typing import Dict, List, Optional, Tuple
from io import BytesIO

# Import existing PDF parsing libraries
import PyPDF2
import pdfplumber
import camelot
from pdfminer.high_level import extract_text as pdfminer_extract_text
from pdfminer.layout import LAParams

# Import our new components
from .document_classifier import DocumentClassifier, SyllabusType
from .table_normalizer import TableNormalizer

logger = logging.getLogger(__name__)


class EnhancedPDFProcessor:
    """
    Enhanced PDF processor with intelligent document analysis.

    Improvements over basic PDFParser:
    - Document type classification
    - Table normalization with semantic understanding
    - Better OCR handling
    - Structured output for AI consumption
    """

    def __init__(self):
        self.classifier = DocumentClassifier()
        self.table_normalizer = TableNormalizer()
        self.ocr_available = self._check_ocr_availability()

    def _check_ocr_availability(self) -> bool:
        """Check if Tesseract OCR is available"""
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            return True
        except:
            logger.warning("Tesseract OCR not available")
            return False

    async def process_pdf(
        self,
        pdf_content: bytes,
        course_name: Optional[str] = None
    ) -> Dict:
        """
        Comprehensive PDF processing pipeline.

        Args:
            pdf_content: Raw PDF bytes
            course_name: Optional course name for context

        Returns:
            Complete processing results with all extracted data
        """
        logger.info("Starting enhanced PDF processing")

        # Stage 1: Extract metadata
        metadata = self._extract_metadata(pdf_content)
        logger.info(f"Metadata: {metadata['num_pages']} pages, scanned: {metadata['is_scanned']}")

        # Stage 2: Extract text (multi-method)
        text = self._extract_text_multi_method(pdf_content, metadata)
        logger.info(f"Extracted {len(text)} characters of text")

        # Stage 3: Extract tables (multi-method with quality scoring)
        raw_tables = self._extract_tables_multi_method(pdf_content)
        logger.info(f"Extracted {len(raw_tables)} raw tables")

        # Stage 4: Normalize tables
        normalized_tables = self.table_normalizer.normalize_tables(raw_tables)

        # Stage 5: Analyze PDF structure
        structure_analysis = self._analyze_structure(text, normalized_tables, metadata)

        # Stage 6: Classify document
        classification = self.classifier.classify_document(
            text, normalized_tables, metadata, structure_analysis
        )

        # Compile results
        results = {
            "metadata": metadata,
            "text": text,
            "raw_tables": raw_tables,
            "normalized_tables": normalized_tables,
            "structure_analysis": structure_analysis,
            "classification": classification,
            "course_name": course_name,
        }

        logger.info(
            f"PDF processing complete. Type: {classification['syllabus_type'].value}, "
            f"Confidence: {classification['confidence']:.2f}"
        )

        return results

    def _extract_metadata(self, pdf_content: bytes) -> Dict:
        """Extract PDF metadata"""
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

            if pdf_reader.metadata:
                metadata['author'] = pdf_reader.metadata.get('/Author', None)
                metadata['creator'] = pdf_reader.metadata.get('/Creator', None)
                metadata['creation_date'] = pdf_reader.metadata.get('/CreationDate', None)
                metadata['title'] = pdf_reader.metadata.get('/Title', None)

            # Detect scanned PDFs
            if metadata['num_pages'] > 0:
                first_page_text = pdf_reader.pages[0].extract_text()
                if len(first_page_text.strip()) < 50:
                    metadata['is_scanned'] = True

        except Exception as e:
            logger.error(f"Error extracting metadata: {str(e)}")

        return metadata

    def _extract_text_multi_method(
        self,
        pdf_content: bytes,
        metadata: Dict
    ) -> str:
        """
        Extract text using multiple methods, choose best result.

        Methods (in order):
        1. PyPDF2 (fast)
        2. pdfminer.six (better layout)
        3. pdfplumber (structured)
        4. OCR (if scanned)
        """
        text = ""

        # Method 1: PyPDF2
        try:
            pdf_file = BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = "\n".join(page.extract_text() for page in pdf_reader.pages)
        except Exception as e:
            logger.warning(f"PyPDF2 extraction failed: {str(e)}")

        # Method 2: pdfminer.six (if PyPDF2 didn't get much)
        if len(text.strip()) < 100:
            try:
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
            except Exception as e:
                logger.warning(f"pdfminer extraction failed: {str(e)}")

        # Method 3: pdfplumber
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
            except Exception as e:
                logger.warning(f"pdfplumber extraction failed: {str(e)}")

        # Method 4: OCR for scanned PDFs
        if metadata.get('is_scanned', False) and self.ocr_available and len(text.strip()) < 100:
            try:
                ocr_text = self._extract_text_with_ocr(pdf_content)
                if len(ocr_text.strip()) > len(text.strip()):
                    text = ocr_text
            except Exception as e:
                logger.warning(f"OCR extraction failed: {str(e)}")

        return text.strip()

    def _extract_text_with_ocr(self, pdf_content: bytes) -> str:
        """Extract text using OCR"""
        try:
            import pytesseract
            from pdf2image import convert_from_bytes

            images = convert_from_bytes(pdf_content, dpi=300)
            text = ""

            for i, image in enumerate(images):
                page_text = pytesseract.image_to_string(image, lang='eng')
                text += page_text + f"\n--- Page {i + 1} ---\n"

            return text
        except Exception as e:
            logger.error(f"OCR failed: {str(e)}")
            return ""

    def _extract_tables_multi_method(self, pdf_content: bytes) -> List[Dict]:
        """
        Extract tables using multiple methods, deduplicate and score quality.

        Methods:
        1. pdfplumber (best for text-based tables)
        2. camelot-lattice (bordered tables)
        3. camelot-stream (borderless tables)
        """
        import tempfile
        import os

        tables = []
        pdf_file = BytesIO(pdf_content)

        # Method 1: pdfplumber
        try:
            with pdfplumber.open(pdf_file) as pdf:
                for page_num, page in enumerate(pdf.pages, start=1):
                    page_tables = page.extract_tables()
                    if page_tables:
                        for table in page_tables:
                            if table and len(table) > 0:
                                quality_score = self._score_table_quality(table)
                                tables.append({
                                    'page': page_num,
                                    'data': table,
                                    'method': 'pdfplumber',
                                    'rows': len(table),
                                    'cols': len(table[0]) if table else 0,
                                    'quality_score': quality_score
                                })
        except Exception as e:
            logger.warning(f"pdfplumber table extraction failed: {str(e)}")

        # Method 2 & 3: Camelot (requires temp file)
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                tmp.write(pdf_content)
                temp_path = tmp.name

            # Lattice mode
            try:
                camelot_tables = camelot.read_pdf(temp_path, pages='all', flavor='lattice')
                for table in camelot_tables:
                    if table.df is not None and not table.df.empty:
                        quality_score = self._score_table_quality(table.df.values.tolist())
                        combined_score = (quality_score + (table.accuracy / 100)) / 2 if hasattr(table, 'accuracy') else quality_score

                        tables.append({
                            'page': table.page,
                            'data': table.df.values.tolist(),
                            'headers': table.df.columns.tolist(),
                            'method': 'camelot-lattice',
                            'rows': len(table.df),
                            'cols': len(table.df.columns),
                            'accuracy': table.accuracy if hasattr(table, 'accuracy') else None,
                            'quality_score': combined_score
                        })
            except Exception as e:
                logger.warning(f"Camelot lattice failed: {str(e)}")

            # Stream mode (if few tables found)
            if len(tables) < 3:
                try:
                    camelot_tables = camelot.read_pdf(temp_path, pages='all', flavor='stream')
                    for table in camelot_tables:
                        if table.df is not None and not table.df.empty:
                            quality_score = self._score_table_quality(table.df.values.tolist())
                            tables.append({
                                'page': table.page,
                                'data': table.df.values.tolist(),
                                'headers': table.df.columns.tolist(),
                                'method': 'camelot-stream',
                                'rows': len(table.df),
                                'cols': len(table.df.columns),
                                'quality_score': quality_score
                            })
                except Exception as e:
                    logger.warning(f"Camelot stream failed: {str(e)}")

        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except:
                    pass

        # Deduplicate tables
        tables = self._deduplicate_tables(tables)

        return tables

    def _score_table_quality(self, table_data: List) -> float:
        """Score table quality (0-1)"""
        if not table_data or len(table_data) == 0:
            return 0.0

        score = 0.5

        # More rows = better
        if len(table_data) > 5:
            score += 0.1
        if len(table_data) > 10:
            score += 0.1

        # Check empty cells ratio
        total_cells = sum(len(row) for row in table_data)
        empty_cells = sum(1 for row in table_data for cell in row if not str(cell).strip())
        if total_cells > 0:
            empty_ratio = empty_cells / total_cells
            score -= empty_ratio * 0.3

        # Check for date content
        import re
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            r'\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',
            r'Week\s+\d+',
        ]

        date_cells = 0
        for row in table_data:
            for cell in row:
                cell_str = str(cell)
                if any(re.search(p, cell_str, re.IGNORECASE) for p in date_patterns):
                    date_cells += 1

        if total_cells > 0 and date_cells > 0:
            date_ratio = date_cells / total_cells
            score += min(date_ratio * 0.3, 0.3)

        return min(max(score, 0.0), 1.0)

    def _deduplicate_tables(self, tables: List[Dict]) -> List[Dict]:
        """Remove duplicate tables from different methods"""
        if len(tables) <= 1:
            return tables

        unique_tables = []

        for table in tables:
            is_duplicate = False

            for existing in unique_tables:
                # Same page, similar dimensions
                if (table['page'] == existing['page'] and
                    abs(table['rows'] - existing['rows']) <= 1 and
                    abs(table['cols'] - existing['cols']) <= 1):

                    # Keep higher quality
                    if table['quality_score'] > existing['quality_score']:
                        unique_tables.remove(existing)
                        unique_tables.append(table)

                    is_duplicate = True
                    break

            if not is_duplicate:
                unique_tables.append(table)

        # Sort by quality
        unique_tables.sort(key=lambda x: x['quality_score'], reverse=True)

        return unique_tables

    def _analyze_structure(
        self,
        text: str,
        tables: List[Dict],
        metadata: Dict
    ) -> Dict:
        """Analyze PDF structure for parsing hints"""
        analysis = {
            'has_tables': len(tables) > 0,
            'has_high_quality_tables': any(t.get('quality_score', 0) > 0.7 for t in tables),
            'text_density': len(text) / max(metadata['num_pages'], 1),
            'likely_syllabus': False,
        }

        # Check for syllabus keywords
        syllabus_keywords = ['syllabus', 'course', 'assignment', 'exam', 'homework', 'due date']
        text_lower = text.lower()
        keyword_count = sum(1 for kw in syllabus_keywords if kw in text_lower)

        analysis['likely_syllabus'] = keyword_count >= 3

        return analysis

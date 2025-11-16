"""
Multi-model AI parser with intelligent fallback strategy.
Tries multiple AI models in sequence for maximum reliability.
"""

import logging
import json
import tempfile
import os
from typing import Dict, List, Optional, Tuple
import asyncio

# AI Model clients
import google.generativeai as genai
from groq import Groq

# Our components
from core.config import settings
from .prompt_builder import PromptBuilder
from .schema_definitions import ASSIGNMENT_SCHEMA, ASSIGNMENT_SCHEMA_SIMPLE
from services.infrastructure.retry_handler import RetryHandler, CircuitBreaker, MultiModelRetryStrategy
from services.infrastructure.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class MultiModelParser:
    """
    Intelligent multi-model parser with fallback strategy.

    Model Priority:
    1. Gemini 2.0 Flash (best free tier, vision support, structured output)
    2. Groq + Llama 3.2 Vision (ultra-fast, good for simple syllabi)
    3. Rule-based parsing (regex + heuristics fallback)
    """

    def __init__(self):
        # Initialize AI clients
        self._init_gemini()
        self._init_groq()

        # Initialize supporting components
        self.prompt_builder = PromptBuilder()
        self.rate_limiter = RateLimiter()

        # Circuit breakers for each model
        self.gemini_circuit = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            name="gemini"
        )

        self.groq_circuit = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            name="groq"
        )

        # Retry handlers
        self.retry_handler = RetryHandler(max_retries=3)

    def _init_gemini(self):
        """Initialize Gemini client"""
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            # Use Gemini 2.0 Flash (latest, best for document understanding)
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
            self.gemini_available = True
            logger.info("Gemini 2.0 Flash initialized")
        except Exception as e:
            logger.warning(f"Gemini initialization failed: {str(e)}")
            self.gemini_available = False

    def _init_groq(self):
        """Initialize Groq client"""
        try:
            groq_api_key = getattr(settings, 'GROQ_API_KEY', None)
            if groq_api_key:
                self.groq_client = Groq(api_key=groq_api_key)
                self.groq_available = True
                logger.info("Groq client initialized")
            else:
                self.groq_available = False
                logger.info("Groq API key not configured")
        except Exception as e:
            logger.warning(f"Groq initialization failed: {str(e)}")
            self.groq_available = False

    async def parse_syllabus(
        self,
        pdf_content: bytes,
        pdf_processing_results: Dict
    ) -> Tuple[List[Dict], str]:
        """
        Parse syllabus using multi-model strategy with fallback.

        Args:
            pdf_content: Raw PDF bytes
            pdf_processing_results: Results from EnhancedPDFProcessor

        Returns:
            Tuple of (parsed_assignments, model_used)

        Raises:
            Exception: If all models fail
        """
        logger.info("Starting multi-model syllabus parsing")

        # Build fallback strategy
        models = []

        # Model 1: Gemini 2.0 Flash with structured output
        if self.gemini_available:
            models.append({
                'name': 'gemini-2.0-flash',
                'func': self._parse_with_gemini_structured,
                'circuit_breaker': self.gemini_circuit
            })

        # Model 2: Groq + Llama Vision
        if self.groq_available:
            models.append({
                'name': 'groq-llama-vision',
                'func': self._parse_with_groq,
                'circuit_breaker': self.groq_circuit
            })

        # Model 3: Gemini fallback (without structured output)
        if self.gemini_available:
            models.append({
                'name': 'gemini-fallback',
                'func': self._parse_with_gemini_json,
                'circuit_breaker': None  # No circuit breaker for fallback
            })

        # Model 4: Rule-based parsing (always available)
        models.append({
            'name': 'rule-based',
            'func': self._parse_rule_based,
            'circuit_breaker': None
        })

        # Execute with fallback
        strategy = MultiModelRetryStrategy(models)

        try:
            result, model_used = await strategy.execute_with_fallback(
                pdf_content,
                pdf_processing_results
            )

            logger.info(f"Successfully parsed with model: {model_used}")
            return result, model_used

        except Exception as e:
            logger.error(f"All parsing models failed: {str(e)}")
            raise Exception(f"Failed to parse syllabus with any available model: {str(e)}")

    async def _parse_with_gemini_structured(
        self,
        pdf_content: bytes,
        pdf_processing_results: Dict
    ) -> List[Dict]:
        """
        Parse with Gemini 2.0 Flash using structured output (best method).
        """
        logger.info("Attempting Gemini 2.0 Flash with structured output")

        # Rate limiting
        await self.rate_limiter.acquire_gemini(timeout=30.0)

        # Save PDF temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(pdf_content)
            tmp_path = tmp_file.name

        try:
            # Upload PDF to Gemini
            uploaded_file = genai.upload_file(tmp_path)

            # Build prompt
            prompt = self.prompt_builder.build_parsing_prompt(
                pdf_processing_results,
                use_structured_output=True
            )

            # Add table context
            normalized_tables = pdf_processing_results.get('normalized_tables', [])
            if normalized_tables:
                table_context = self.prompt_builder.build_table_context(normalized_tables)
                prompt += table_context

            # Add text content
            text = pdf_processing_results.get('text', '')
            if text:
                # Limit text to avoid token limits (keep first 10000 chars)
                prompt += f"\n\nDOCUMENT TEXT:\n{text[:10000]}"
                if len(text) > 10000:
                    prompt += "\n... (text truncated)"

            # Generate with structured output
            response = self.gemini_model.generate_content(
                [uploaded_file, prompt],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,  # Low temperature for consistency
                    response_mime_type="application/json",
                    response_schema=ASSIGNMENT_SCHEMA
                )
            )

            # Parse response (already JSON)
            result = json.loads(response.text)

            assignments = result.get('assignments', [])
            logger.info(f"Gemini structured output: {len(assignments)} assignments")

            return assignments

        except Exception as e:
            logger.error(f"Gemini structured output failed: {str(e)}")
            raise

        finally:
            # Cleanup
            if os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except:
                    pass

    async def _parse_with_gemini_json(
        self,
        pdf_content: bytes,
        pdf_processing_results: Dict
    ) -> List[Dict]:
        """
        Parse with Gemini using manual JSON output (fallback).
        """
        logger.info("Attempting Gemini with manual JSON output")

        # Rate limiting
        await self.rate_limiter.acquire_gemini(timeout=30.0)

        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(pdf_content)
            tmp_path = tmp_file.name

        try:
            uploaded_file = genai.upload_file(tmp_path)

            # Build prompt
            prompt = self.prompt_builder.build_parsing_prompt(
                pdf_processing_results,
                use_structured_output=False  # Manual JSON
            )

            # Add table context
            normalized_tables = pdf_processing_results.get('normalized_tables', [])
            if normalized_tables:
                table_context = self.prompt_builder.build_table_context(normalized_tables)
                prompt += table_context

            # Add text
            text = pdf_processing_results.get('text', '')
            if text:
                prompt += f"\n\nDOCUMENT TEXT:\n{text[:10000]}"

            # Generate
            response = self.gemini_model.generate_content(
                [uploaded_file, prompt],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1
                )
            )

            # Parse response
            response_text = self._clean_json_response(response.text)
            result = json.loads(response_text)

            assignments = result.get('assignments', [])
            logger.info(f"Gemini JSON output: {len(assignments)} assignments")

            return assignments

        finally:
            if os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except:
                    pass

    async def _parse_with_groq(
        self,
        pdf_content: bytes,
        pdf_processing_results: Dict
    ) -> List[Dict]:
        """
        Parse with Groq + Llama 3.2 Vision (ultra-fast).

        Note: Groq is best for simpler syllabi. For complex tables,
        we rely on our table normalization to help it.
        """
        logger.info("Attempting Groq + Llama 3.2 Vision")

        # Rate limiting
        await self.rate_limiter.acquire_groq(timeout=30.0)

        # Build simplified prompt (Groq may not support complex schemas)
        prompt = self.prompt_builder.build_parsing_prompt(
            pdf_processing_results,
            use_structured_output=False
        )

        # For Groq, we rely heavily on extracted text and normalized tables
        # since it may not handle PDF vision as well as Gemini

        text = pdf_processing_results.get('text', '')
        normalized_tables = pdf_processing_results.get('normalized_tables', [])

        # Build context from text and tables
        context = "SYLLABUS CONTENT:\n\n"

        if normalized_tables:
            table_context = self.prompt_builder.build_table_context(normalized_tables)
            context += table_context + "\n\n"

        if text:
            context += f"TEXT CONTENT:\n{text[:8000]}\n"  # Limit for Groq

        full_prompt = prompt + "\n\n" + context

        try:
            # Use Llama 3.2 90B Vision (best Groq vision model)
            response = self.groq_client.chat.completions.create(
                model="llama-3.2-90b-vision-preview",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert syllabus parser. Return ONLY valid JSON, no markdown."
                    },
                    {
                        "role": "user",
                        "content": full_prompt
                    }
                ],
                temperature=0.1,
                max_tokens=4000
            )

            # Parse response
            response_text = self._clean_json_response(response.choices[0].message.content)
            result = json.loads(response_text)

            assignments = result.get('assignments', [])
            logger.info(f"Groq output: {len(assignments)} assignments")

            return assignments

        except Exception as e:
            logger.error(f"Groq parsing failed: {str(e)}")
            raise

    async def _parse_rule_based(
        self,
        pdf_content: bytes,
        pdf_processing_results: Dict
    ) -> List[Dict]:
        """
        Rule-based fallback parsing using regex and heuristics.
        Last resort when AI models fail.
        """
        logger.warning("Falling back to rule-based parsing")

        import re
        from datetime import datetime

        assignments = []

        # Extract from normalized tables
        normalized_tables = pdf_processing_results.get('normalized_tables', [])

        for table in normalized_tables:
            normalized_data = table.get('normalized_data', [])

            for row in normalized_data:
                # Look for date and assignment columns
                date_value = row.get('date', '')
                assignment_value = row.get('assignment', '')

                if date_value and assignment_value:
                    # Try to parse date
                    parsed_date = self._parse_date_simple(date_value)

                    if parsed_date:
                        # Determine type
                        assignment_type = self._classify_assignment_type(assignment_value)

                        assignments.append({
                            'title': assignment_value,
                            'description': row.get('topic', row.get('description')),
                            'due_date': parsed_date,
                            'assignment_type': assignment_type,
                            'confidence_metadata': {
                                'date_confidence': 0.5,
                                'type_confidence': 0.5,
                                'source_location': f"Table {table.get('page', 'unknown')}",
                                'reasoning': "Rule-based extraction (fallback)"
                            }
                        })

        if not assignments:
            # Try text extraction as last resort
            text = pdf_processing_results.get('text', '')
            assignments = self._extract_from_text(text)

        logger.info(f"Rule-based parsing extracted {len(assignments)} assignments")
        return assignments

    def _parse_date_simple(self, date_str: str) -> Optional[str]:
        """Simple date parsing for rule-based fallback"""
        import re
        from datetime import datetime

        date_str = str(date_str).strip()

        # Try MM/DD/YYYY
        match = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', date_str)
        if match:
            month, day, year = match.groups()
            return f"{year}-{month.zfill(2)}-{day.zfill(2)} 23:59:59"

        # Try Month DD, YYYY
        match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})', date_str, re.IGNORECASE)
        if match:
            month_str, day, year = match.groups()
            month_map = {
                'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
            }
            month = month_map.get(month_str[:3].lower(), '01')
            return f"{year}-{month}-{day.zfill(2)} 23:59:59"

        return None

    def _classify_assignment_type(self, text: str) -> str:
        """Simple assignment type classification"""
        text_lower = text.lower()

        if any(kw in text_lower for kw in ['homework', 'hw', 'assignment', 'problem set']):
            return 'homework'
        elif any(kw in text_lower for kw in ['exam', 'test', 'midterm', 'final']):
            return 'exam'
        elif any(kw in text_lower for kw in ['project', 'paper', 'report']):
            return 'project'
        elif any(kw in text_lower for kw in ['quiz']):
            return 'quiz'
        elif any(kw in text_lower for kw in ['presentation', 'talk']):
            return 'presentation'
        else:
            return 'other'

    def _extract_from_text(self, text: str) -> List[Dict]:
        """Extract assignments from plain text (very basic)"""
        # This is a minimal implementation for when all else fails
        # In practice, this should be more sophisticated
        return []

    def _clean_json_response(self, response_text: str) -> str:
        """Clean AI response to extract valid JSON"""
        response_text = response_text.strip()

        # Remove markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "", 1)
        if response_text.startswith("```"):
            response_text = response_text.replace("```", "", 1)
        if response_text.endswith("```"):
            response_text = response_text.rsplit("```", 1)[0]

        return response_text.strip()

    def get_model_status(self) -> Dict:
        """Get status of all models and rate limiters"""
        return {
            "gemini": {
                "available": self.gemini_available,
                "circuit_breaker": self.gemini_circuit.get_state(),
                "rate_limit": self.rate_limiter.get_status()["gemini"]
            },
            "groq": {
                "available": self.groq_available,
                "circuit_breaker": self.groq_circuit.get_state(),
                "rate_limit": self.rate_limiter.get_status()["groq"]
            }
        }

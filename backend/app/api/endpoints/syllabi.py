"""
Enhanced syllabus parsing endpoints using the new multi-model architecture.
This replaces the old syllabi.py with enterprise-grade parsing.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from app.schemas.syllabus import SyllabusUploadResponse, ParsedAssignment, SyllabusConfirmRequest
from models.course import Course
from models.assignment import Assignment, AssignmentType
from models.user import User
from datetime import datetime
from typing import List
import logging

# Import our new enhanced services
from services.pdf_processing.pdf_processor import EnhancedPDFProcessor
from services.ai_parsing.multi_model_parser import MultiModelParser
from services.validation.assignment_validator import AssignmentValidator
from services.infrastructure.cache_manager import CacheManager

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services (singleton pattern)
pdf_processor = EnhancedPDFProcessor()
ai_parser = MultiModelParser()
validator = AssignmentValidator()
cache_manager = CacheManager()


@router.post("/upload", response_model=SyllabusUploadResponse)
async def upload_syllabus(
    file: UploadFile = File(...),
    course_name: str = None,
    db: Session = Depends(get_db)
):
    """
    Enhanced syllabus upload with multi-model AI parsing.

    Improvements:
    - Multi-model fallback (Gemini 2.0 → Groq → Rule-based)
    - Document classification and structure analysis
    - Table normalization for better accuracy
    - Advanced date parsing (25+ formats)
    - Multi-level validation with confidence scoring
    - Intelligent caching

    Endpoint name kept the same for frontend compatibility.
    """
    try:
        # ============================================
        # Stage 1: Security Validation
        # ============================================
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        pdf_content = await file.read(MAX_FILE_SIZE + 1)

        if len(pdf_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large (maximum 10MB allowed)")

        if not pdf_content.startswith(b'%PDF'):
            raise HTTPException(status_code=400, detail="Invalid PDF file format")

        logger.info(f"Processing PDF: {file.filename} ({len(pdf_content)} bytes)")

        # ============================================
        # Stage 2: Cache Check
        # ============================================
        cached_result = await cache_manager.get_parsed_assignments(pdf_content, course_name)

        if cached_result:
            logger.info(f"Cache HIT - returning cached results")
            return {
                "filename": file.filename,
                "course_name": course_name,
                "assignments_found": len(cached_result.get('assignments', [])),
                "assignments": cached_result.get('assignments', []),
                "metadata": {
                    "cached": True,
                    **cached_result.get('metadata', {})
                }
            }

        # ============================================
        # Stage 3: Enhanced PDF Processing
        # ============================================
        logger.info("Stage 3: Processing PDF with enhanced processor")
        pdf_processing_results = await pdf_processor.process_pdf(pdf_content, course_name)

        classification = pdf_processing_results.get('classification', {})
        logger.info(
            f"Document classified as: {classification.get('syllabus_type')} "
            f"(confidence: {classification.get('confidence', 0):.2f})"
        )

        # ============================================
        # Stage 4: Multi-Model AI Parsing
        # ============================================
        logger.info("Stage 4: Parsing with multi-model AI system")

        try:
            assignments, model_used = await ai_parser.parse_syllabus(
                pdf_content,
                pdf_processing_results
            )

            logger.info(f"Successfully parsed with model: {model_used}")
            logger.info(f"Extracted {len(assignments)} raw assignments")

        except Exception as e:
            logger.error(f"All AI models failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse syllabus with all available models: {str(e)}"
            )

        # ============================================
        # Stage 5: Multi-Level Validation
        # ============================================
        logger.info("Stage 5: Validating assignments")

        # Build context for validation
        validation_context = {}
        semester_info = classification.get('semester_info', {})
        if semester_info:
            validation_context = {
                'semester_start': semester_info.get('start_date'),
                'semester_end': semester_info.get('end_date')
            }

        valid_assignments, invalid_assignments, global_warnings = validator.validate_assignments(
            assignments,
            validation_context
        )

        logger.info(
            f"Validation: {len(valid_assignments)} valid, {len(invalid_assignments)} invalid"
        )

        if invalid_assignments:
            logger.warning(f"Invalid assignments: {invalid_assignments}")

        # ============================================
        # Stage 6: Enrichment
        # ============================================
        logger.info("Stage 6: Enriching assignments")

        enriched_assignments = validator.enrich_assignments(valid_assignments)

        overall_confidence = validator.calculate_overall_confidence(enriched_assignments)

        # ============================================
        # Stage 7: Cache Results
        # ============================================
        cache_data = {
            'assignments': enriched_assignments,
            'metadata': {
                'model_used': model_used,
                'overall_confidence': overall_confidence,
                'document_type': str(classification.get('syllabus_type')),
                'num_tables': len(pdf_processing_results.get('normalized_tables', [])),
                'num_pages': pdf_processing_results.get('metadata', {}).get('num_pages', 0)
            }
        }

        await cache_manager.set_parsed_assignments(
            pdf_content,
            cache_data,
            course_name,
            ttl_minutes=15
        )

        # ============================================
        # Stage 8: Return Response
        # ============================================
        return {
            "filename": file.filename,
            "course_name": course_name,
            "assignments_found": len(enriched_assignments),
            "assignments": enriched_assignments,
            "metadata": {
                "cached": False,
                "model_used": model_used,
                "overall_confidence": overall_confidence,
                "document_type": str(classification.get('syllabus_type')),
                "parsing_hints": classification.get('parsing_hints', []),
                "global_warnings": global_warnings,
                "invalid_count": len(invalid_assignments)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing syllabus: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing syllabus: {str(e)}"
        )


@router.post("/confirm")
async def confirm_syllabus_upload(
    request: SyllabusConfirmRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm and save parsed assignments to database.

    Endpoint name kept the same for frontend compatibility.
    """
    try:
        if not request.course_name or not request.course_name.strip():
            raise HTTPException(status_code=400, detail="Course name is required")

        if not request.assignments or len(request.assignments) == 0:
            raise HTTPException(status_code=400, detail="No assignments to save")

        # Validate all assignments have titles
        for assignment in request.assignments:
            if not assignment.title or not assignment.title.strip():
                raise HTTPException(status_code=400, detail="All assignments must have a title")

        # TODO: Get user from authentication once auth is implemented
        default_user_email = "default@example.com"
        user = db.query(User).filter(User.email == default_user_email).first()

        if not user:
            user = User(
                email=default_user_email,
                full_name="Default User",
                is_active=True
            )
            db.add(user)
            db.flush()

        # Get or create course
        course = db.query(Course).filter(
            Course.user_id == user.id,
            Course.name == request.course_name.strip()
        ).first()

        if not course:
            course = Course(
                user_id=user.id,
                name=request.course_name.strip()
            )
            db.add(course)
            db.flush()

        # Save assignments
        assignments_saved = 0
        for idx, assignment_data in enumerate(request.assignments):
            try:
                logger.info(f"Saving assignment {idx + 1}: {assignment_data.title}")

                # Check for duplicates
                existing = db.query(Assignment).filter(
                    Assignment.course_id == course.id,
                    Assignment.title == assignment_data.title.strip(),
                    Assignment.due_date == assignment_data.due_date
                ).first()

                if not existing:
                    # Map assignment type
                    assignment_type_map = {
                        "homework": AssignmentType.HOMEWORK,
                        "exam": AssignmentType.EXAM,
                        "project": AssignmentType.PROJECT,
                        "quiz": AssignmentType.QUIZ,
                        "presentation": AssignmentType.PRESENTATION,
                        "other": AssignmentType.OTHER
                    }

                    assignment_type = assignment_type_map.get(
                        assignment_data.assignment_type.lower(),
                        AssignmentType.HOMEWORK
                    )

                    # Handle due_date (ensure it's datetime)
                    due_date = assignment_data.due_date
                    if isinstance(due_date, str):
                        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                    elif due_date.tzinfo is not None:
                        due_date = due_date.replace(tzinfo=None)

                    assignment = Assignment(
                        course_id=course.id,
                        title=assignment_data.title.strip(),
                        description=assignment_data.description,
                        assignment_type=assignment_type,
                        due_date=due_date,
                        original_due_date=due_date,
                        extracted_from="syllabus"
                    )
                    db.add(assignment)
                    assignments_saved += 1

            except Exception as e:
                logger.error(f"Error saving assignment {idx + 1}: {str(e)}", exc_info=True)
                raise

        db.commit()

        logger.info(f"Successfully saved {assignments_saved} assignments")

        return {
            "status": "success",
            "message": f"Saved {assignments_saved} assignment(s) for {request.course_name}",
            "assignments_saved": assignments_saved,
            "course_id": str(course.id)
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error confirming upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error saving assignments: {str(e)}")


@router.get("/status")
async def get_parsing_status():
    """
    Get status of all parsing models and infrastructure.
    Useful for debugging and monitoring.
    """
    try:
        model_status = ai_parser.get_model_status()
        cache_stats = cache_manager.get_cache_stats()

        return {
            "status": "operational",
            "models": model_status,
            "cache": cache_stats,
            "features": {
                "multi_model_fallback": True,
                "document_classification": True,
                "table_normalization": True,
                "advanced_date_parsing": True,
                "caching": cache_stats.get('available', False)
            }
        }
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        return {
            "status": "degraded",
            "error": str(e)
        }

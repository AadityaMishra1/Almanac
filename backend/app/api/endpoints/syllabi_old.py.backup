from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from app.schemas.syllabus import SyllabusUploadResponse, ParsedAssignment, SyllabusConfirmRequest
from services.pdf_parser import PDFParser
from services.ai_parser import AIParser
from models.course import Course
from models.assignment import Assignment, AssignmentType
from models.user import User
from datetime import datetime
from typing import List

router = APIRouter()

@router.post("/upload", response_model=SyllabusUploadResponse)
async def upload_syllabus(
    file: UploadFile = File(...),
    course_name: str = None,
    db: Session = Depends(get_db)
):
    """
    Upload a course syllabus PDF and extract assignments using enhanced AI parsing.
    Uses multi-layered approach: table extraction + visual AI parsing for better accuracy
    with color-coded calendar charts and complex schedules.
    """
    # Security validation: file extension check
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Security validation: file size limit (10MB max)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    pdf_content = await file.read(MAX_FILE_SIZE + 1)

    if len(pdf_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (maximum 10MB allowed)")

    # Security validation: verify it's actually a PDF by checking magic bytes
    if not pdf_content.startswith(b'%PDF'):
        raise HTTPException(status_code=400, detail="Invalid PDF file format")

    # Enhanced parsing pipeline
    pdf_parser = PDFParser()
    ai_parser = AIParser()
    
    # Step 1: Extract tables from PDF (crucial for calendar charts)
    tables = []
    try:
        tables = pdf_parser.extract_tables(pdf_content)
        print(f"Extracted {len(tables)} table(s) from PDF")
    except Exception as e:
        print(f"Table extraction failed (non-critical): {str(e)}")
        # Continue without tables - AI can still parse visually
    
    # Step 2: Try enhanced AI parsing with table context
    assignments = []
    try:
        # Use Gemini AI to extract assignments directly from PDF with table context
        assignments = await ai_parser.parse_syllabus_from_pdf(
            pdf_content, 
            course_name,
            tables=tables if tables else None
        )
        print(f"Successfully parsed {len(assignments)} assignment(s) using enhanced AI parsing")
    except Exception as e:
        print(f"Enhanced AI parsing failed, trying fallback: {str(e)}")
        # Fallback: extract text first, then parse with table context
        try:
            syllabus_text = pdf_parser.extract_text(pdf_content)
            assignments = await ai_parser.parse_syllabus(
                syllabus_text, 
                course_name,
                tables=tables if tables else None
            )
            print(f"Successfully parsed {len(assignments)} assignment(s) using text extraction + table context")
        except Exception as fallback_error:
            print(f"Fallback parsing also failed: {str(fallback_error)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to parse syllabus: {str(fallback_error)}"
            )

    return {
        "filename": file.filename,
        "course_name": course_name,
        "assignments_found": len(assignments),
        "assignments": assignments
    }

@router.post("/confirm")
async def confirm_syllabus_upload(
    request: SyllabusConfirmRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm and save parsed assignments to database
    """
    try:
        if not request.course_name or not request.course_name.strip():
            raise HTTPException(status_code=400, detail="Course name is required")
        
        if not request.assignments or len(request.assignments) == 0:
            raise HTTPException(status_code=400, detail="No assignments to save")
        
        # Pydantic already validates assignment structure, but check for empty titles
        for assignment in request.assignments:
            if not assignment.title or not assignment.title.strip():
                raise HTTPException(status_code=400, detail="All assignments must have a title")
        
        # TODO: Get user from authentication once auth is implemented
        # For now, create or get a default user
        default_user_email = "default@example.com"
        user = db.query(User).filter(User.email == default_user_email).first()
        
        if not user:
            # Create default user
            user = User(
                email=default_user_email,
                full_name="Default User",
                is_active=True
            )
            db.add(user)
            db.flush()  # Get user.id without committing
        
        # Check if course already exists for this user
        course = db.query(Course).filter(
            Course.user_id == user.id,
            Course.name == request.course_name.strip()
        ).first()
        
        if not course:
            # Create new course
            course = Course(
                user_id=user.id,
                name=request.course_name.strip()
            )
            db.add(course)
            db.flush()  # Get course.id without committing
        
        # Save assignments
        assignments_saved = 0
        for idx, assignment_data in enumerate(request.assignments):
            try:
                print(f"Processing assignment {idx + 1}/{len(request.assignments)}: {assignment_data.title}")
                # Check if assignment already exists (avoid duplicates)
                existing = db.query(Assignment).filter(
                    Assignment.course_id == course.id,
                    Assignment.title == assignment_data.title.strip(),
                    Assignment.due_date == assignment_data.due_date
                ).first()
                
                if not existing:
                    # Map assignment_type string to Enum
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
                    
                    # Ensure due_date is a datetime object
                    due_date = assignment_data.due_date
                    if isinstance(due_date, str):
                        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                    elif due_date.tzinfo is not None:
                        # Convert timezone-aware datetime to naive datetime for database
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
                print(f"Error processing assignment {idx + 1} ({assignment_data.title}): {str(e)}")
                import traceback
                traceback.print_exc()
                raise
        
        db.commit()
        
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
        import traceback
        error_details = traceback.format_exc()
        print(f"Error saving assignments: {str(e)}")
        print(f"Traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error saving assignments: {str(e)}")

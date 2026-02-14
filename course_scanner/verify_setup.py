#!/usr/bin/env python3
"""
Verify that all modules and dependencies are correctly set up.
"""

import sys

def verify_setup():
    """Verify all imports and basic functionality."""
    print("🔍 Verifying Course Calendar Extractor Setup")
    print("=" * 50)

    errors = []

    # Test 1: Import converter
    print("\n1. Testing converter module...")
    try:
        from converter import pdf_to_images, excel_to_markdown, load_image, images_to_base64
        print("   ✅ Converter imports successful")
    except Exception as e:
        print(f"   ❌ Converter import failed: {e}")
        errors.append(("converter", str(e)))

    # Test 2: Import extractor
    print("\n2. Testing extractor module...")
    try:
        from extractor import GeminiExtractor, extract_schedule, Assignment, CourseSchedule
        print("   ✅ Extractor imports successful")
    except Exception as e:
        print(f"   ❌ Extractor import failed: {e}")
        errors.append(("extractor", str(e)))

    # Test 3: Check PyMuPDF
    print("\n3. Testing PyMuPDF (fitz)...")
    try:
        import fitz
        print(f"   ✅ PyMuPDF version: {fitz.version}")
    except Exception as e:
        print(f"   ❌ PyMuPDF failed: {e}")
        errors.append(("pymupdf", str(e)))

    # Test 4: Check PIL/Pillow
    print("\n4. Testing Pillow (PIL)...")
    try:
        from PIL import Image
        print(f"   ✅ Pillow version: {Image.__version__}")
    except Exception as e:
        print(f"   ❌ Pillow failed: {e}")
        errors.append(("pillow", str(e)))

    # Test 5: Check Google Gen AI
    print("\n5. Testing Google Generative AI...")
    try:
        from google import genai
        print("   ✅ Google Generative AI (google-genai) imported")
    except Exception as e:
        print(f"   ❌ Google Gen AI failed: {e}")
        errors.append(("google-genai", str(e)))

    # Test 6: Check Pydantic
    print("\n6. Testing Pydantic...")
    try:
        from pydantic import BaseModel, Field
        print("   ✅ Pydantic imported")
    except Exception as e:
        print(f"   ❌ Pydantic failed: {e}")
        errors.append(("pydantic", str(e)))

    # Test 7: Check Rich
    print("\n7. Testing Rich...")
    try:
        from rich.console import Console
        from rich.table import Table
        console = Console()
        print("   ✅ Rich imported and Console created")
    except Exception as e:
        print(f"   ❌ Rich failed: {e}")
        errors.append(("rich", str(e)))

    # Test 8: Check pandas
    print("\n8. Testing Pandas...")
    try:
        import pandas as pd
        print(f"   ✅ Pandas version: {pd.__version__}")
    except Exception as e:
        print(f"   ❌ Pandas failed: {e}")
        errors.append(("pandas", str(e)))

    # Test 9: Check .env
    print("\n9. Checking environment configuration...")
    try:
        from dotenv import load_dotenv
        import os
        load_dotenv()

        if os.getenv('GEMINI_API_KEY'):
            print("   ✅ GEMINI_API_KEY found in environment")
        else:
            print("   ⚠️  GEMINI_API_KEY not set (required for running extractions)")
            print("      Copy .env.example to .env and add your API key")
    except Exception as e:
        print(f"   ❌ Environment check failed: {e}")
        errors.append(("env", str(e)))

    # Test 10: Verify Pydantic models
    print("\n10. Testing Pydantic models...")
    try:
        from extractor import Assignment, CourseSchedule

        # Test valid assignment
        test_assignment = Assignment(
            title="Test Assignment",
            due_date="2024-09-15",
            description="Test description",
            assignment_type="homework"
        )
        print("   ✅ Assignment model validation works")

        # Test course schedule
        test_schedule = CourseSchedule(
            course_name="Test Course",
            assignments=[test_assignment]
        )
        print("   ✅ CourseSchedule model validation works")

    except Exception as e:
        print(f"   ❌ Pydantic model test failed: {e}")
        errors.append(("models", str(e)))

    # Summary
    print("\n" + "=" * 50)
    if not errors:
        print("✅ All checks passed! Setup is complete.")
        print("\nNext steps:")
        print("1. Copy .env.example to .env (if not done)")
        print("2. Add your GEMINI_API_KEY to .env")
        print("3. Run: python main.py path/to/syllabus.pdf")
        return True
    else:
        print(f"❌ {len(errors)} errors found:")
        for module, error in errors:
            print(f"   - {module}: {error}")
        return False

if __name__ == '__main__':
    success = verify_setup()
    sys.exit(0 if success else 1)

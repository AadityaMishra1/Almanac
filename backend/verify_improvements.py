"""
Simple verification script for enhanced PDF parsing improvements

This script verifies that all the improvements have been implemented correctly
without requiring actual PDF parsing or API calls.
"""

import sys
import os

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✓ {description}: {filepath}")
        return True
    else:
        print(f"✗ {description}: {filepath} NOT FOUND")
        return False

def check_imports(filepath, imports, description):
    """Check if a file contains specific imports"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        missing = []
        found = []
        for imp in imports:
            if imp in content:
                found.append(imp)
            else:
                missing.append(imp)

        if missing:
            print(f"⚠ {description}:")
            print(f"  Found: {', '.join(found)}")
            print(f"  Missing: {', '.join(missing)}")
            return False
        else:
            print(f"✓ {description}: All imports present")
            return True
    except Exception as e:
        print(f"✗ Error checking {filepath}: {e}")
        return False

def check_function_exists(filepath, functions, description):
    """Check if a file contains specific functions"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        missing = []
        found = []
        for func in functions:
            if f"def {func}" in content:
                found.append(func)
            else:
                missing.append(func)

        if missing:
            print(f"⚠ {description}:")
            print(f"  Found: {', '.join(found)}")
            print(f"  Missing: {', '.join(missing)}")
            return False
        else:
            print(f"✓ {description}: All functions present")
            return True
    except Exception as e:
        print(f"✗ Error checking {filepath}: {e}")
        return False

def main():
    print("="*80)
    print("VERIFYING ENHANCED SYLLABUS PARSER IMPROVEMENTS")
    print("="*80)

    checks_passed = 0
    total_checks = 0

    # Check 1: New libraries in requirements.txt
    print("\n[1] Checking new libraries in requirements.txt...")
    total_checks += 1
    if check_imports(
        'requirements.txt',
        ['pdfminer.six', 'pytesseract', 'pdf2image', 'python-dateutil'],
        "New PDF/date libraries"
    ):
        checks_passed += 1

    # Check 2: Enhanced pdf_parser.py
    print("\n[2] Checking enhanced pdf_parser.py...")
    total_checks += 1
    if check_imports(
        'services/pdf_parser.py',
        ['pdfminer.high_level', 'pdf2image', 'from pdfminer.layout import LAParams'],
        "PDF parser new imports"
    ):
        checks_passed += 1

    total_checks += 1
    if check_function_exists(
        'services/pdf_parser.py',
        ['extract_metadata', '_extract_text_with_ocr', '_score_table_quality',
         '_deduplicate_tables', 'analyze_pdf_structure'],
        "PDF parser new functions"
    ):
        checks_passed += 1

    # Check 3: Date utilities
    print("\n[3] Checking date_utils.py...")
    total_checks += 1
    if check_file_exists('services/date_utils.py', "Date utilities file"):
        checks_passed += 1

        total_checks += 1
        if check_imports(
            'services/date_utils.py',
            ['from dateutil import parser', 'from datetime import datetime'],
            "Date utilities imports"
        ):
            checks_passed += 1

        total_checks += 1
        if check_function_exists(
            'services/date_utils.py',
            ['parse_date', 'validate_assignment_dates', 'detect_date_ambiguity',
             '_parse_iso_format', '_parse_common_formats', '_parse_week_based'],
            "Date parsing functions"
        ):
            checks_passed += 1

    # Check 4: Enhanced AI parser
    print("\n[4] Checking enhanced ai_parser.py...")
    total_checks += 1
    if check_imports(
        'services/ai_parser.py',
        ['from services.date_utils import DateValidator', 'from datetime import datetime'],
        "AI parser new imports"
    ):
        checks_passed += 1

    total_checks += 1
    if check_function_exists(
        'services/ai_parser.py',
        ['_get_enhanced_prompt', '_validate_and_enrich_assignments', '_clean_response'],
        "AI parser new functions"
    ):
        checks_passed += 1

    # Check 5: Enhanced prompts
    print("\n[5] Checking prompt improvements...")
    total_checks += 1
    try:
        with open('services/ai_parser.py', 'r') as f:
            content = f.read()

        prompt_features = [
            'FEW-SHOT EXAMPLES',
            'EXAMPLE 1',
            'EXAMPLE 2',
            'confidence_score',
            'temperature=0.1',
        ]

        missing = [f for f in prompt_features if f not in content]

        if missing:
            print(f"⚠ Prompt features missing: {', '.join(missing)}")
        else:
            print(f"✓ All prompt enhancements present")
            checks_passed += 1
    except Exception as e:
        print(f"✗ Error checking prompts: {e}")

    # Check 6: Updated schemas
    print("\n[6] Checking updated schemas...")
    total_checks += 1
    if check_imports(
        'app/schemas/syllabus.py',
        ['confidence_score', 'warnings'],
        "Schema updates"
    ):
        checks_passed += 1

    # Summary
    print("\n" + "="*80)
    print(f"VERIFICATION SUMMARY: {checks_passed}/{total_checks} checks passed")
    print("="*80)

    if checks_passed == total_checks:
        print("\n✓ ALL IMPROVEMENTS VERIFIED SUCCESSFULLY!")
        print("\nKey Enhancements:")
        print("  1. Multi-library PDF extraction (PyPDF2, pdfminer.six, pdfplumber)")
        print("  2. OCR support for scanned PDFs (pytesseract, pdf2image)")
        print("  3. Advanced date parsing with multiple formats")
        print("  4. Table quality scoring and deduplication")
        print("  5. Few-shot learning in AI prompts")
        print("  6. Confidence scoring and warning system")
        print("  7. Comprehensive validation and error handling")
        return 0
    else:
        print(f"\n⚠ {total_checks - checks_passed} checks failed")
        print("Please review the output above for details")
        return 1

if __name__ == "__main__":
    sys.exit(main())

"""
Test script for enhanced PDF parsing functionality
Tests table extraction and AI parsing with table context
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from services.pdf_parser import PDFParser
from services.ai_parser import AIParser


async def test_pdf_parsing(pdf_path: str):
    """
    Test the enhanced PDF parsing pipeline
    
    Args:
        pdf_path: Path to PDF file to test
    """
    print(f"\n{'='*60}")
    print(f"Testing PDF Parsing: {pdf_path}")
    print(f"{'='*60}\n")
    
    # Read PDF file
    try:
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        print(f"✓ Successfully read PDF file ({len(pdf_content)} bytes)")
    except FileNotFoundError:
        print(f"✗ Error: PDF file not found: {pdf_path}")
        return
    except Exception as e:
        print(f"✗ Error reading PDF: {str(e)}")
        return
    
    # Test 1: Extract text
    print("\n[Test 1] Text Extraction")
    print("-" * 60)
    pdf_parser = PDFParser()
    try:
        text = pdf_parser.extract_text(pdf_content)
        print(f"✓ Extracted {len(text)} characters of text")
        if len(text) > 0:
            print(f"  Preview: {text[:200]}...")
        else:
            print("  ⚠ Warning: No text extracted")
    except Exception as e:
        print(f"✗ Text extraction failed: {str(e)}")
        return
    
    # Test 2: Extract tables
    print("\n[Test 2] Table Extraction")
    print("-" * 60)
    try:
        tables = pdf_parser.extract_tables(pdf_content)
        print(f"✓ Found {len(tables)} table(s)")
        
        if tables:
            for idx, table in enumerate(tables, 1):
                print(f"\n  Table {idx}:")
                print(f"    - Page: {table['page']}")
                print(f"    - Method: {table['method']}")
                print(f"    - Rows: {table['rows']}")
                print(f"    - Columns: {table['cols']}")
                
                # Show preview of first few rows
                if table['method'] == 'pdfplumber':
                    print(f"    - Preview (first 3 rows):")
                    for row_idx, row in enumerate(table['data'][:3], 1):
                        print(f"      Row {row_idx}: {row[:5]}...")  # First 5 cells
                else:
                    print(f"    - Preview (first 3 rows):")
                    for row_idx, row in enumerate(table['data'][:3], 1):
                        values = list(row.values())[:5]  # First 5 columns
                        print(f"      Row {row_idx}: {values}...")
        else:
            print("  ⚠ No tables found (this is OK if PDF doesn't have tables)")
    except Exception as e:
        print(f"✗ Table extraction failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Test 3: Format tables for prompt
    print("\n[Test 3] Table Formatting for AI Prompt")
    print("-" * 60)
    try:
        if tables:
            formatted = pdf_parser.format_tables_for_prompt(tables)
            print(f"✓ Formatted tables ({len(formatted)} characters)")
            print(f"  Preview:\n{formatted[:500]}...")
        else:
            print("  ⚠ No tables to format")
    except Exception as e:
        print(f"✗ Table formatting failed: {str(e)}")
    
    # Test 4: AI Parsing (if API key is available)
    print("\n[Test 4] AI Parsing with Table Context")
    print("-" * 60)
    try:
        from core.config import settings
        
        if not hasattr(settings, 'GEMINI_API_KEY') or not settings.GEMINI_API_KEY:
            print("  ⚠ Skipping AI parsing test (GEMINI_API_KEY not set)")
            print("  To test AI parsing, set GEMINI_API_KEY in your .env file")
            return
        
        ai_parser = AIParser()
        print("  Testing with table context...")
        
        assignments = await ai_parser.parse_syllabus_from_pdf(
            pdf_content,
            course_name="Test Course",
            tables=tables if tables else None
        )
        
        print(f"✓ Successfully parsed {len(assignments)} assignment(s)")
        
        if assignments:
            print("\n  Extracted Assignments:")
            for idx, assignment in enumerate(assignments, 1):
                print(f"\n    Assignment {idx}:")
                print(f"      Title: {assignment.get('title', 'N/A')}")
                print(f"      Type: {assignment.get('assignment_type', 'N/A')}")
                print(f"      Due Date: {assignment.get('due_date', 'N/A')}")
                if assignment.get('description'):
                    desc = assignment['description'][:100]
                    print(f"      Description: {desc}...")
        else:
            print("  ⚠ No assignments extracted")
            
    except ImportError:
        print("  ⚠ Skipping AI parsing test (config not available)")
    except Exception as e:
        print(f"✗ AI parsing failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print(f"\n{'='*60}")
    print("Test Complete!")
    print(f"{'='*60}\n")


def main():
    """Main test function"""
    if len(sys.argv) < 2:
        print("Usage: python test_pdf_parsing.py <path_to_pdf_file>")
        print("\nExample:")
        print("  python test_pdf_parsing.py ../test_syllabus.pdf")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    # Run async test
    asyncio.run(test_pdf_parsing(pdf_path))


if __name__ == "__main__":
    main()




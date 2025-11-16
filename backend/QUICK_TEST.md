# Quick Test Guide - Enhanced PDF Parsing

## Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd backend
./install_and_test.sh
```

Or manually:
```bash
pip install -r requirements.txt
```

**Note:** You may need to install Ghostscript first:
- macOS: `brew install ghostscript`
- Linux: `sudo apt-get install ghostscript`

### Step 2: Test with a PDF

```bash
python3 test_pdf_parsing.py <path_to_pdf_file>
```

**Example:**
```bash
python3 test_pdf_parsing.py ../sample_syllabus.pdf
```

### Step 3: Check Results

The test will show:
- ✅ Text extraction status
- ✅ Table extraction (how many tables found)
- ✅ Table formatting preview
- ✅ AI parsing results (if GEMINI_API_KEY is set)

## What Gets Tested

1. **Text Extraction** - Basic PDF text reading
2. **Table Extraction** - Using pdfplumber + camelot
3. **Table Formatting** - How tables are formatted for AI
4. **AI Parsing** - Full pipeline with table context

## Expected Output

```
============================================================
Testing PDF Parsing: sample_syllabus.pdf
============================================================

✓ Successfully read PDF file (123456 bytes)

[Test 1] Text Extraction
------------------------------------------------------------
✓ Extracted 5000 characters of text
  Preview: Course Syllabus CS 101 Introduction to Computer Science...

[Test 2] Table Extraction
------------------------------------------------------------
✓ Found 2 table(s)

  Table 1:
    - Page: 1
    - Method: pdfplumber
    - Rows: 15
    - Columns: 4

[Test 3] Table Formatting for AI Prompt
------------------------------------------------------------
✓ Formatted tables (1500 characters)

[Test 4] AI Parsing with Table Context
------------------------------------------------------------
✓ Successfully parsed 12 assignment(s)

  Extracted Assignments:
    Assignment 1:
      Title: Homework 1
      Type: homework
      Due Date: 2025-01-15 23:59:59
```

## Troubleshooting

**"ModuleNotFoundError"** → Run `pip install -r requirements.txt`

**"ghostscript not found"** → Install Ghostscript (see Step 1)

**"GEMINI_API_KEY not set"** → Optional, but needed for full AI parsing test

## Next Steps

Once testing passes:
1. Test with a real syllabus containing calendar charts
2. Verify the API endpoint works
3. Move to frontend editing functionality




# Testing Guide for Enhanced PDF Parsing

This guide will help you test the enhanced PDF parsing functionality that handles color-coded calendar charts and complex table structures.

## Prerequisites

### 1. Install Dependencies

First, install the new PDF parsing dependencies:

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install System Dependencies (for camelot-py)

**macOS:**
```bash
brew install ghostscript
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ghostscript
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install ghostscript
```

**Windows:**
Download and install from [Ghostscript website](https://www.ghostscript.com/download/gsdnld.html)

### 3. Verify Environment Variables

Make sure your `.env` file has:
- `GEMINI_API_KEY` - For AI parsing (optional for basic table extraction tests)

## Testing Methods

### Method 1: Direct Python Script Test (Recommended for Initial Testing)

This tests the PDF parsing components directly without needing the full API server.

```bash
cd backend
python test_pdf_parsing.py <path_to_pdf_file>
```

**Example:**
```bash
python test_pdf_parsing.py ../sample_syllabus.pdf
```

This will test:
1. ✅ Text extraction
2. ✅ Table extraction (pdfplumber + camelot)
3. ✅ Table formatting for AI prompts
4. ✅ AI parsing with table context (if API key is set)

### Method 2: API Endpoint Test

Test via the FastAPI endpoint (requires server to be running).

#### Start the Backend Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

#### Test with curl

```bash
curl -X POST "http://localhost:8000/api/v1/syllabi/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/syllabus.pdf" \
  -F "course_name=Test Course"
```

#### Test with Python requests

```python
import requests

url = "http://localhost:8000/api/v1/syllabi/upload"
files = {"file": open("syllabus.pdf", "rb")}
data = {"course_name": "Test Course"}

response = requests.post(url, files=files, data=data)
print(response.json())
```

### Method 3: Frontend Integration Test

1. Start the backend server:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to the upload page and upload a PDF syllabus

## What to Look For

### Successful Table Extraction

You should see output like:
```
[Test 2] Table Extraction
------------------------------------------------------------
✓ Found 2 table(s)

  Table 1:
    - Page: 1
    - Method: pdfplumber
    - Rows: 15
    - Columns: 4
    - Preview (first 3 rows):
      Row 1: ['Date', 'Assignment', 'Type', 'Due Date']...
```

### Successful AI Parsing

You should see:
```
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

### Issue: "ModuleNotFoundError: No module named 'pdfplumber'"

**Solution:** Install dependencies:
```bash
pip install -r requirements.txt
```

### Issue: "camelot-py installation fails" or "ghostscript not found"

**Solution:** Install Ghostscript (see Prerequisites section above)

### Issue: "Table extraction returns empty list"

**Possible causes:**
- PDF doesn't contain tables (this is OK - not all PDFs have tables)
- PDF is image-based (scanned) - may need OCR
- Tables are in a format that's hard to extract

**Solution:** The AI parser can still work with visual PDF parsing even without extracted tables.

### Issue: "GEMINI_API_KEY not set"

**Solution:** 
- This is optional for table extraction tests
- Set `GEMINI_API_KEY` in your `.env` file to test full AI parsing
- Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Issue: "Import errors" or "Circular import"

**Solution:** Make sure you're running from the backend directory:
```bash
cd backend
python test_pdf_parsing.py <pdf_file>
```

## Expected Improvements

With the enhanced parsing, you should see:

1. **Better table extraction** - Multiple methods (pdfplumber + camelot) increase success rate
2. **Better calendar chart handling** - AI receives table context to understand schedules
3. **More accurate date parsing** - Enhanced prompts handle multiple date formats
4. **Better assignment type detection** - AI can identify types from color-coded charts

## Next Steps

After verifying the backend works:
1. Test with a real syllabus containing calendar charts
2. Verify extracted assignments are accurate
3. Move to frontend editing functionality




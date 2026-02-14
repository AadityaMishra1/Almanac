# Course Calendar Extractor

A Python CLI tool that extracts assignments and due dates from syllabus documents (PDF, Excel, Images) using Google Gemini 1.5 Flash.

## Features

- 📄 **PDF Support**: Converts PDF pages to high-resolution images
- 📊 **Excel Support**: Parses spreadsheets and CSV files
- 🖼️ **Image Support**: Directly processes JPG, PNG, and other image formats
- 🤖 **AI-Powered**: Uses Google Gemini 1.5 Flash (Free Tier) for intelligent extraction
- ✅ **Validation**: ISO 8601 date validation with Pydantic
- 🎨 **Pretty Output**: Rich terminal UI with tables and colors

## Installation

### 1. Set up virtual environment

```bash
cd course_scanner
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure API Key

1. Get your Google Gemini API key from: https://makersuite.google.com/app/apikey
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Add your API key to `.env`:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

## Usage

### Basic usage

```bash
python main.py path/to/syllabus.pdf
```

### Save to JSON file

```bash
python main.py syllabus.pdf --output results.json
```

### Verbose logging

```bash
python main.py syllabus.pdf --verbose
```

### Supported file types

- **PDF**: `.pdf`
- **Excel**: `.xlsx`, `.xls`, `.csv`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.gif`, `.tiff`

## Output Format

The tool extracts assignments in the following JSON structure:

```json
{
  "course_name": "CS 101 - Introduction to Programming",
  "assignments": [
    {
      "title": "Homework 1",
      "due_date": "2024-09-15",
      "description": "Chapters 1-3, 50 points",
      "assignment_type": "homework"
    },
    {
      "title": "Midterm Exam",
      "due_date": "2024-10-15",
      "description": "Covers weeks 1-7",
      "assignment_type": "exam"
    }
  ]
}
```

### Assignment Types

- `homework`
- `exam`
- `project`
- `quiz`
- `lab`
- `reading`
- `other`

## How It Works

1. **File Ingestion**: Converts PDFs to images (300 DPI) or Excel to markdown
2. **AI Extraction**: Sends content to Gemini 1.5 Flash with structured JSON schema
3. **Validation**: Validates dates (ISO 8601) and structure with Pydantic
4. **Display**: Shows results in a pretty terminal table or saves to JSON

## Cost

This tool uses **Google Gemini 1.5 Flash** which is part of Google's free tier. No paid OCR services required.

## Error Handling

- ⚠️ Relative dates (e.g., "Week 5") are flagged for manual review
- ❌ Missing API key shows clear error message
- ❌ Unsupported file types are rejected with helpful message

## Architecture

```
course_scanner/
├── converter.py    # PDF/Excel to images/text conversion
├── extractor.py    # Gemini AI client and extraction logic
├── main.py         # CLI entrypoint
├── requirements.txt
├── .env.example
└── README.md
```

## Troubleshooting

### "GEMINI_API_KEY not found"

Make sure you've created a `.env` file with your API key:
```bash
cp .env.example .env
# Edit .env and add your key
```

### "Failed to convert PDF"

Ensure PyMuPDF is installed correctly:
```bash
pip install --upgrade pymupdf
```

### Low quality extraction

The tool uses 300 DPI for PDF conversion. This should work well for most documents. If extraction quality is poor, check:
- The original PDF is not corrupted
- The text is readable (not heavily stylized)
- The document is in English (Gemini supports multiple languages but English works best)

## Development

Run with verbose logging for debugging:
```bash
python main.py syllabus.pdf --verbose
```

## License

MIT License - See project root for details

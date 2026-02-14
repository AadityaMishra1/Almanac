# Quick Start Guide

## Setup (One Time)

1. **Navigate to the directory**
   ```bash
   cd course_scanner
   ```

2. **Activate virtual environment**
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Verify setup**
   ```bash
   python verify_setup.py
   ```

4. **Configure API Key**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

   Get your free API key from: https://makersuite.google.com/app/apikey

## Usage

### Basic Usage

Extract assignments from a syllabus PDF:
```bash
python main.py path/to/syllabus.pdf
```

### Save to JSON

```bash
python main.py syllabus.pdf --output results.json
```

### Verbose Mode (for debugging)

```bash
python main.py syllabus.pdf --verbose
```

### Process Different File Types

```bash
# PDF files
python main.py course_calendar.pdf

# Excel files
python main.py schedule.xlsx

# Image files
python main.py syllabus_screenshot.jpg
```

## Example Output

Running the tool displays a formatted table in your terminal:

```
Course Calendar Extractor
Powered by Google Gemini 1.5 Flash

📄 File type: PDF
📂 File: CS101_Syllabus.pdf

✅ Extraction complete!

                     📚 Extracted Assignments
┏━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━━━━━━━━┓
┃ Title           ┃ Due Date   ┃ Type    ┃ Description      ┃
┡━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━━━━━━━━━━┩
│ Homework 1      │ 2024-09-15 │ homework│ Chapters 1-3     │
│ Midterm Exam    │ 2024-10-15 │ exam    │ Covers weeks 1-7 │
│ Final Project   │ 2024-12-10 │ project │ Team project     │
└─────────────────┴────────────┴─────────┴──────────────────┘

Total assignments extracted: 3
```

## Testing Converter Only

To test just the PDF to image conversion:

```bash
python test_converter.py path/to/test.pdf
```

## Troubleshooting

### "GEMINI_API_KEY not found"

Make sure you've created a `.env` file:
```bash
cp .env.example .env
# Edit .env and add: GEMINI_API_KEY=your_actual_key
```

### "File not found"

Provide the full path to your file:
```bash
python main.py /full/path/to/syllabus.pdf
```

### Low Quality Results

- Make sure the PDF is readable (not a scanned image with poor quality)
- Try using `--verbose` to see detailed logs
- Check that the document is primarily in English

## Deactivating Virtual Environment

When done:
```bash
deactivate
```

## Cost

This tool uses **Google Gemini 1.5 Flash** which is free tier. No charges for normal usage.

## Support

For issues or questions, see the main project documentation.

# Project Spec: Syllabus & Course Calendar Extractor

## 1. Goal
Build a Python-based CLI tool that accepts a file (PDF, Excel, Image) and outputs a strictly formatted list of course assignments and due dates in JSON format.

## 2. Core Constraints
- **Cost:** Must use **Gemini 1.5 Flash** (Free Tier) for intelligence.
- **Privacy:** Processing must happen via API; no local training.
- **No Paid OCR:** Do not use Azure Document Intelligence or Textract. Use visual multimodal capabilities of Gemini.

## 3. Architecture & Tech Stack

### A. File Ingestion Layer
* **Library:** `pymupdf` (fitz) for PDFs. `pandas` for Excel.
* **Logic:**
    * **PDFs:** Convert each page into a high-res JPEG image (300 DPI). Do not try to parse text manually.
    * **Excel/CSV:** Convert content to a Markdown string representation.
    * **Images:** Pass directly.

### B. The Intelligence Layer (Gemini 1.5 Flash)
* **Library:** `google-genai` (Official Google Gen AI SDK).
* **Workflow:**
    1.  User supplies API Key via `.env` file (`GEMINI_API_KEY`).
    2.  Script bundles the images (or text) into a single request.
    3.  Send to Gemini 1.5 Flash with a schema-enforced prompt (using `response_schema` if available, or strict JSON instruction).

### C. The Normalization Layer
* **Library:** Standard Python `datetime` and `pydantic`.
* **Logic:**
    * Validate that all dates are ISO 8601 (`YYYY-MM-DD`).
    * If Gemini returns a "relative" string (e.g., "Week 5"), this layer flags it for manual review.

## 4. Implementation Steps (for the Agent)

### Step 1: Environment Setup
* Create `requirements.txt`: `google-genai`, `pymupdf`, `pandas`, `openpyxl`, `python-dotenv`, `pydantic`, `rich` (for pretty CLI output).
* Create `.env.example`.

### Step 2: The Image Converter (`converter.py`)
* Function `pdf_to_images(pdf_path)`: Returns a list of base64 encoded strings or PIL images.
* Function `excel_to_markdown(excel_path)`: Reads all sheets and converts to a text representation.

### Step 3: The AI Client (`extractor.py`)
* Initialize Gemini Client.
* Define the System Prompt (include instructions for handling "Week 1" relative dates).
* Function `extract_schedule(content_list)`: Sends data to Gemini and returns JSON.

### Step 4: The CLI Entrypoint (`main.py`)
* Use `argparse` to accept a file path.
* Detect file type.
* Route to converter -> Route to Extractor -> Print result to console using `rich` table.

## 5. Success Criteria
* Input: A 5-page PDF syllabus.
* Output: A JSON printed to terminal with correct dates.
* Error Handling: If file is unreadable or API key is missing, fail gracefully with a clear message.
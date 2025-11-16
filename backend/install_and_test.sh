#!/bin/bash

# Installation and Testing Script for Enhanced PDF Parsing
# This script installs dependencies and helps test the new PDF parsing features

set -e

echo "=========================================="
echo "Enhanced PDF Parsing - Installation & Test"
echo "=========================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "requirements.txt" ]; then
    echo "Error: Please run this script from the backend directory"
    exit 1
fi

# Step 1: Check Python version
echo "[1/5] Checking Python version..."
python3 --version
echo "✓ Python found"
echo ""

# Step 2: Check for Ghostscript (required for camelot)
echo "[2/5] Checking for Ghostscript..."
if command -v gs &> /dev/null; then
    echo "✓ Ghostscript found: $(gs --version)"
else
    echo "⚠ Ghostscript not found"
    echo "  Please install Ghostscript:"
    echo "    macOS: brew install ghostscript"
    echo "    Linux: sudo apt-get install ghostscript"
    echo "    Windows: Download from https://www.ghostscript.com/download/gsdnld.html"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 3: Install Python dependencies
echo "[3/5] Installing Python dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Step 4: Verify installations
echo "[4/5] Verifying installations..."
python3 -c "import pdfplumber; print('✓ pdfplumber')" || echo "✗ pdfplumber failed"
python3 -c "import camelot; print('✓ camelot-py')" || echo "✗ camelot-py failed (may need Ghostscript)"
python3 -c "import PyPDF2; print('✓ PyPDF2')" || echo "✗ PyPDF2 failed"
python3 -c "from PIL import Image; print('✓ Pillow')" || echo "✗ Pillow failed"
echo ""

# Step 5: Test script
echo "[5/5] Testing PDF parsing components..."
echo ""
echo "To test with a PDF file, run:"
echo "  python3 test_pdf_parsing.py <path_to_pdf_file>"
echo ""
echo "Example:"
echo "  python3 test_pdf_parsing.py ../sample_syllabus.pdf"
echo ""

# Check if a PDF file is provided as argument
if [ -n "$1" ] && [ -f "$1" ]; then
    echo "Running test with provided PDF: $1"
    echo ""
    python3 test_pdf_parsing.py "$1"
else
    echo "No PDF file provided. To test, run:"
    echo "  python3 test_pdf_parsing.py <path_to_pdf_file>"
fi

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="




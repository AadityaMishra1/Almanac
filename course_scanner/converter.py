"""
File converter module for Course Calendar Extractor.
Handles conversion of PDFs to images and Excel to markdown.
"""

import fitz  # PyMuPDF
import pandas as pd
from PIL import Image
import io
import base64
from typing import List, Union
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def pdf_to_images(pdf_path: str, dpi: int = 300) -> List[Image.Image]:
    """
    Convert a PDF file to a list of PIL Image objects.

    Args:
        pdf_path: Path to the PDF file
        dpi: Resolution for image conversion (default 300 DPI for high quality)

    Returns:
        List of PIL Image objects, one per page

    Raises:
        FileNotFoundError: If PDF file doesn't exist
        Exception: If PDF conversion fails
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    images = []

    try:
        # Open the PDF
        pdf_document = fitz.open(str(pdf_path))

        # Convert DPI to zoom factor (default 72 DPI in fitz)
        zoom = dpi / 72
        matrix = fitz.Matrix(zoom, zoom)

        logger.info(f"Converting PDF with {len(pdf_document)} pages at {dpi} DPI")

        # Process each page
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]

            # Render page to pixmap (image)
            pix = page.get_pixmap(matrix=matrix)

            # Convert to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))

            images.append(img)
            logger.debug(f"Converted page {page_num + 1}/{len(pdf_document)}")

        pdf_document.close()
        logger.info(f"Successfully converted {len(images)} pages")

    except Exception as e:
        logger.error(f"Error converting PDF to images: {str(e)}")
        raise Exception(f"Failed to convert PDF: {str(e)}")

    return images


def images_to_base64(images: List[Image.Image]) -> List[str]:
    """
    Convert PIL Images to base64 encoded strings.

    Args:
        images: List of PIL Image objects

    Returns:
        List of base64 encoded image strings
    """
    base64_images = []

    for idx, img in enumerate(images):
        # Convert to RGB if necessary (remove alpha channel)
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')

        # Save to bytes buffer
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=95)
        buffer.seek(0)

        # Encode to base64
        img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        base64_images.append(img_base64)

        logger.debug(f"Converted image {idx + 1} to base64")

    return base64_images


def excel_to_markdown(excel_path: str) -> str:
    """
    Convert Excel file to markdown representation.

    Args:
        excel_path: Path to the Excel file

    Returns:
        Markdown string representation of all sheets

    Raises:
        FileNotFoundError: If Excel file doesn't exist
        Exception: If Excel conversion fails
    """
    excel_path = Path(excel_path)
    if not excel_path.exists():
        raise FileNotFoundError(f"Excel file not found: {excel_path}")

    try:
        # Read all sheets
        excel_file = pd.ExcelFile(excel_path)
        markdown_output = []

        logger.info(f"Converting Excel file with {len(excel_file.sheet_names)} sheets")

        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(excel_file, sheet_name=sheet_name)

            # Add sheet header
            markdown_output.append(f"## Sheet: {sheet_name}\n")

            # Convert DataFrame to markdown
            markdown_table = df.to_markdown(index=False)
            markdown_output.append(markdown_table)
            markdown_output.append("\n")

            logger.debug(f"Converted sheet: {sheet_name}")

        result = "\n".join(markdown_output)
        logger.info(f"Successfully converted Excel to markdown ({len(result)} characters)")

        return result

    except Exception as e:
        logger.error(f"Error converting Excel to markdown: {str(e)}")
        raise Exception(f"Failed to convert Excel: {str(e)}")


def load_image(image_path: str) -> Image.Image:
    """
    Load an image file to PIL Image.

    Args:
        image_path: Path to the image file

    Returns:
        PIL Image object

    Raises:
        FileNotFoundError: If image file doesn't exist
        Exception: If image loading fails
    """
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image file not found: {image_path}")

    try:
        img = Image.open(image_path)
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')

        logger.info(f"Successfully loaded image: {image_path.name}")
        return img

    except Exception as e:
        logger.error(f"Error loading image: {str(e)}")
        raise Exception(f"Failed to load image: {str(e)}")

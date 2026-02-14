#!/usr/bin/env python3
"""
Quick test to verify PDF to image conversion works.
"""

import sys
from pathlib import Path
from converter import pdf_to_images, images_to_base64

def test_converter():
    """Test the PDF to image converter."""
    print("Testing PDF to Image Converter")
    print("-" * 50)

    # Check if test PDF exists
    test_pdf = Path("test_sample.pdf")

    if not test_pdf.exists():
        print("⚠️  No test PDF found. Please provide a PDF file as argument:")
        print("   python test_converter.py path/to/file.pdf")
        return False

    try:
        # Convert PDF to images
        print(f"📄 Converting: {test_pdf}")
        images = pdf_to_images(str(test_pdf))

        print(f"✅ Successfully converted PDF to {len(images)} images")

        # Show image details
        for idx, img in enumerate(images):
            print(f"   Page {idx + 1}: {img.size[0]}x{img.size[1]} pixels, mode={img.mode}")

        # Test base64 conversion
        print("\n🔄 Testing base64 encoding...")
        base64_images = images_to_base64(images)
        print(f"✅ Encoded {len(base64_images)} images to base64")

        # Show sample of first base64 string
        if base64_images:
            sample = base64_images[0][:100]
            print(f"   Sample (first 100 chars): {sample}...")
            print(f"   Total length: {len(base64_images[0])} characters")

        print("\n✅ All converter tests passed!")
        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Use provided PDF
        import shutil
        test_pdf = Path(sys.argv[1])
        if test_pdf.exists():
            # Copy to test location
            shutil.copy(test_pdf, "test_sample.pdf")
        else:
            print(f"❌ File not found: {test_pdf}")
            sys.exit(1)

    success = test_converter()
    sys.exit(0 if success else 1)

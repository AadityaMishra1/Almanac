/**
 * OCR extraction pipeline for scanned/image-based PDFs
 * Uses pdf.js to render pages + Tesseract.js for text recognition
 */

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";
import { createCanvas } from "canvas";

export async function extractTextViaOCR(buffer: Buffer): Promise<string> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    // Load PDF document
    const pdf = await getDocument({ data: buffer }).promise;
    const pageCount = pdf.numPages;

    // Initialize Tesseract worker
    worker = await createWorker("eng");

    const pageTexts: string[] = [];

    // Process pages SEQUENTIALLY to avoid memory issues
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Render at 2x scale for better OCR quality
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      // Render PDF page to canvas
      await page.render({
        canvasContext: context as any,
        viewport,
        canvas: canvas as any,
      }).promise;

      // Extract text via OCR
      const {
        data: { text },
      } = await worker.recognize(canvas.toBuffer("image/png"));
      pageTexts.push(text);

      // Clear canvas reference for garbage collection
      (canvas as any) = null;
    }

    // Join page texts with double newline separator
    return pageTexts.join("\n\n").trim();
  } finally {
    // Always terminate worker even on error
    if (worker) {
      await worker.terminate();
    }
  }
}

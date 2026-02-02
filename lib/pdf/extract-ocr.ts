/**
 * OCR extraction pipeline for scanned/image-based PDFs
 * Uses pdf.js to render pages + Tesseract.js for text recognition
 */

import { createWorker } from "tesseract.js";
import { createCanvas, Canvas } from "canvas";

export async function extractTextViaOCR(buffer: Buffer): Promise<string> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    // Dynamic import of pdfjs-dist to avoid server-side initialization issues
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // Configure for Node.js environment - disable worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    // Load PDF document
    const pdf = await pdfjsLib.getDocument({
      data: buffer,
      useSystemFonts: true,
      isEvalSupported: false,
    } as any).promise;
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
      } as any).promise;

      // Extract text via OCR
      const {
        data: { text },
      } = await worker.recognize((canvas as Canvas).toBuffer("image/png"));
      pageTexts.push(text);

      // Clear canvas for GC
      canvas.width = 0;
      canvas.height = 0;
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

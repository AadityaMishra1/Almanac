/**
 * Unified PDF extraction interface
 * Automatically detects PDF type and routes to appropriate extraction method
 */

import { detectPdfType } from "./detect-pdf-type";
import { extractTextFromPdf } from "./extract-text";
import { extractTextViaOCR } from "./extract-ocr";
import { extractTables } from "./extract-tables";

export interface ExtractionResult {
  text: string;
  tables: string;
  metadata: {
    method: "text" | "ocr";
    pageCount: number;
    hasTableData: boolean;
  };
}

export async function extractPdfContent(
  buffer: Buffer
): Promise<ExtractionResult> {
  // Detect PDF type
  const pdfType = await detectPdfType(buffer);

  // Get page count for metadata
  const pdfParseModule = await import("pdf-parse/lib/pdf-parse");
  const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
  const data = await pdfParse(buffer);
  const pageCount = data.numpages || 1;

  // Route to appropriate extraction method
  let text: string;
  let actualMethod: "text" | "ocr" = pdfType === "text" ? "text" : "ocr";

  if (pdfType === "text") {
    text = await extractTextFromPdf(buffer);
  } else {
    // Scanned PDF detected - attempt OCR with fallback to text extraction
    try {
      text = await extractTextViaOCR(buffer);
    } catch (ocrError) {
      console.error("OCR extraction failed, falling back to text extraction:", ocrError);
      // Fallback to text extraction if OCR fails
      // This handles pdfjs-dist initialization issues in server environments
      text = await extractTextFromPdf(buffer);
      actualMethod = "text"; // Mark as text since OCR failed
    }
  }

  // Extract table data from the original buffer
  const tables = await extractTables(buffer);

  return {
    text,
    tables,
    metadata: {
      method: actualMethod,
      pageCount,
      hasTableData: tables.length > 0,
    },
  };
}

// Re-export individual functions for advanced usage
export { detectPdfType } from "./detect-pdf-type";
export { extractTextFromPdf } from "./extract-text";
export { extractTextViaOCR } from "./extract-ocr";
export { extractTables } from "./extract-tables";

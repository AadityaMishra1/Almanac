/**
 * PDF type detection using text density heuristic
 * Determines if PDF is text-based (fast path) or scanned/image-based (OCR required)
 */

export async function detectPdfType(
  buffer: Buffer
): Promise<"text" | "scanned"> {
  // Import the internal parser to avoid pdf-parse's debug test file loader in Next.js
  const pdfParseModule = await import("pdf-parse/lib/pdf-parse");
  const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;

  const data = await pdfParse(buffer);
  const text = String(data.text ?? "").trim();
  const pageCount = data.numpages || 1;

  // Character density heuristic: < 100 chars/page suggests scanned PDF
  const charsPerPage = text.length / pageCount;

  // Word density check: should have at least 50 words per page
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
  const wordsPerPage = wordCount / pageCount;

  // If either check fails, treat as scanned PDF requiring OCR
  if (charsPerPage < 100 || wordsPerPage < 50) {
    return "scanned";
  }

  return "text";
}

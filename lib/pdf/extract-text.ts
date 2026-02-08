/**
 * Text extraction from text-based PDFs using pdf-parse
 * Fast path for PDFs with selectable text content
 */

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Received an empty file. Please upload a valid PDF.");
  }

  // Import the internal parser to avoid pdf-parse's debug test file loader in Next.js
  const pdfParseModule = await import("pdf-parse/lib/pdf-parse");
  const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;

  const data = await pdfParse(buffer);
  return String(data.text ?? "").trim();
}

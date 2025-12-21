export async function parseSyllabusPdfToText(buffer: Buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error("Received an empty file. Please upload a valid PDF.");
  }

  const pdfParseModule = await import("pdf-parse/lib/pdf-parse");
  const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;

  // Importing the internal parser avoids pdf-parse's debug test file loader in Next.js.
  const data = await pdfParse(buffer);
  return String(data.text ?? "").trim();
}

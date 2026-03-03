/**
 * Multi-format document text extraction.
 * Supports PDF, DOCX, and TXT files.
 */

export type SupportedFileType = "pdf" | "docx" | "txt";

export const SUPPORTED_MIME_TYPES: Record<string, SupportedFileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

const EXTENSION_MAP: Record<string, SupportedFileType> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt",
};

/**
 * Detect file type from MIME type or file extension.
 */
export function detectFileType(
  mimeType: string,
  fileName: string,
): SupportedFileType | null {
  // Try MIME type first
  const fromMime = SUPPORTED_MIME_TYPES[mimeType];
  if (fromMime) return fromMime;

  // Fall back to extension
  const ext = fileName.toLowerCase().match(/\.\w+$/)?.[0];
  if (ext) return EXTENSION_MAP[ext] ?? null;

  return null;
}

/**
 * Validate file magic bytes match the declared type.
 * PDF: starts with %PDF-
 * DOCX: starts with PK (ZIP archive)
 * TXT: no validation needed
 */
export function validateMagicBytes(
  buffer: Buffer,
  fileType: SupportedFileType,
): boolean {
  if (fileType === "txt") return true;

  if (fileType === "pdf") {
    const header = buffer.toString("latin1", 0, 5);
    return header.startsWith("%PDF-");
  }

  if (fileType === "docx") {
    // DOCX is a ZIP file — starts with PK\x03\x04
    return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  }

  return false;
}

/**
 * Extract plain text from a document buffer.
 * Routes to the appropriate parser based on file type.
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  fileType: SupportedFileType,
): Promise<string> {
  switch (fileType) {
    case "pdf": {
      const { parseSyllabusPdfToText } = await import("@/lib/pdf");
      return parseSyllabusPdfToText(buffer);
    }
    case "docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      if (!text) {
        throw new Error("Could not extract text from DOCX file. The document may be empty or image-only.");
      }
      return text;
    }
    case "txt": {
      const text = buffer.toString("utf-8").trim();
      if (!text) {
        throw new Error("The text file is empty.");
      }
      return text;
    }
  }
}

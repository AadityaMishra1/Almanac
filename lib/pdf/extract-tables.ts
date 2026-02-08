/**
 * Table extraction from PDFs using heuristic detection
 * Detects table-like structures and formats for LLM readability
 */

export async function extractTables(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) {
    return '';
  }

  try {
    // Import pdf-parse using the same internal import pattern as extract-text.ts
    const pdfParseModule = await import("pdf-parse/lib/pdf-parse");
    const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;

    const data = await pdfParse(buffer);
    const text = String(data.text ?? "").trim();

    if (!text) {
      return '';
    }

    // Detect and format table-like structures
    return detectAndFormatTables(text);
  } catch (error) {
    console.error('Table extraction failed:', error);
    return '';
  }
}

/**
 * Detect table-like structures using heuristics and format for LLM
 */
function detectAndFormatTables(text: string): string {
  const lines = text.split('\n');
  const tables: string[] = [];
  let currentTable: string[] = [];
  let inTable = false;

  for (const line of lines) {
    if (isTableRow(line)) {
      // Start or continue table
      if (!inTable) {
        inTable = true;
        currentTable = [];
      }
      currentTable.push(formatTableRow(line));
    } else {
      // End of table (if we were in one)
      if (inTable && currentTable.length > 0) {
        tables.push(currentTable.join('\n'));
        currentTable = [];
      }
      inTable = false;
    }
  }

  // Capture final table if we ended while in one
  if (inTable && currentTable.length > 0) {
    tables.push(currentTable.join('\n'));
  }

  return tables.join('\n\n');
}

/**
 * Detect if a line is likely part of a table
 */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();

  // Skip empty lines
  if (!trimmed) {
    return false;
  }

  // Count tab characters - tables often use tabs for alignment
  const tabCount = (line.match(/\t/g) || []).length;
  if (tabCount >= 3) {
    return true;
  }

  // Count pipe characters - common in markdown-style tables
  const pipeCount = (line.match(/\|/g) || []).length;
  if (pipeCount >= 3) {
    return true;
  }

  // Count sequences of 4+ spaces - indicates column alignment
  const multiSpaceMatches = line.match(/\s{4,}/g) || [];
  if (multiSpaceMatches.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Format a table row for LLM readability
 * Convert tabs/multi-spaces to pipes for consistent formatting
 */
function formatTableRow(line: string): string {
  // First, normalize tabs to spaces
  let normalized = line.replace(/\t/g, '  ');

  // Split by pipe characters if present
  if (normalized.includes('|')) {
    const cells = normalized.split('|').map(cell => cell.trim()).filter(cell => cell);
    return `| ${cells.join(' | ')} |`;
  }

  // Split by 4+ consecutive spaces (column alignment)
  const cells = normalized.split(/\s{4,}/).map(cell => cell.trim()).filter(cell => cell);
  if (cells.length > 1) {
    return `| ${cells.join(' | ')} |`;
  }

  // Fallback: return as-is with pipe wrapper
  return `| ${normalized.trim()} |`;
}

/**
 * Content-level validation for uploaded ".xlsx" files.
 *
 * A real xlsx is an OOXML package — i.e. a ZIP archive — so its first bytes are
 * the ZIP magic "PK\x03\x04". A filename ending in `.xlsx` proves nothing: a
 * renamed CSV/PDF, a legacy binary .xls, or a placeholder stub all sail past a
 * name check and then blow up deep inside ExcelJS with the cryptic
 * "Can't find end of central directory : is this a zip file ?".
 *
 * These helpers turn that into an early, human-readable rejection, used both at
 * upload time (so bad files are never persisted as a run) and in inspectXlsx
 * (so any pre-existing bad run fails clearly instead of crashing the page).
 */

/** Thrown when a buffer that should be an xlsx workbook isn't a valid one. */
export class InvalidXlsxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidXlsxError";
  }
}

/**
 * Returns a human-readable reason the buffer is NOT a valid xlsx, or `null`
 * when it looks like a genuine OOXML (zip) workbook.
 */
export function xlsxRejectionReason(buf: Buffer): string | null {
  if (!buf || buf.length < 4) {
    return "The file is empty or too small to be an Excel workbook.";
  }

  // ZIP magic — every OOXML file begins with "PK" (0x50 0x4B).
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const third = buf[2];
    const fourth = buf[3];
    const looksLikeZip =
      (third === 0x03 && fourth === 0x04) || // standard local-file header
      (third === 0x05 && fourth === 0x06) || // empty archive
      (third === 0x07 && fourth === 0x08); // spanned archive
    if (looksLikeZip) return null;
    return "The file looks like a damaged or truncated Excel workbook. Please re-export it and upload again.";
  }

  // Legacy .xls (OLE2 compound document) — a common, recognisable mismatch.
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    return "This is a legacy .xls file. Please re-save it as .xlsx (Excel Workbook) and upload again.";
  }

  return "This file is not a valid .xlsx workbook — it may be a placeholder, a CSV/PDF, or a file renamed to .xlsx. Please upload the real Excel workbook.";
}

/** Throws {@link InvalidXlsxError} when the buffer isn't a valid xlsx. */
export function assertXlsxBuffer(buf: Buffer): void {
  const reason = xlsxRejectionReason(buf);
  if (reason) throw new InvalidXlsxError(reason);
}

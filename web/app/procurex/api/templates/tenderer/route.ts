import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/templates/tenderer
 *
 * Generates a Tenderer-list XLSX template on the fly and streams it back
 * as a download. Columns are exactly the set advertised in the Step 3 UI:
 *
 *     Company name | Trade name | Contact | Email | City | Country
 *
 * The first sheet is the data sheet (`Tenderers`). The second sheet is a
 * read-only "Instructions" sheet — the agent uploading this can read it
 * if confused. Two example rows are pre-populated so the format is
 * unambiguous; the QS deletes them before upload.
 *
 * Auth — endpoint is intentionally PUBLIC because the file contains no
 * project data. It's a static-shape template.
 */
export async function GET(): Promise<NextResponse> {
  const wb = XLSX.utils.book_new()

  // --- Sheet 1: Tenderers (data sheet) ---
  const HEADERS = ["Company name", "Trade name", "Contact", "Email", "City", "Country"]
  const SAMPLE_ROWS: string[][] = [
    [
      "ACME Construction LLC",
      "ACME Build",
      "Khalid Al Mansoori",
      "khalid@acme-construction.ae",
      "Dubai",
      "United Arab Emirates",
    ],
    [
      "Skyline Contracting Pvt Ltd",
      "Skyline",
      "Priya Ramaswamy",
      "priya@skyline.in",
      "Mumbai",
      "India",
    ],
  ]
  const dataAoA: (string | number | null)[][] = [HEADERS, ...SAMPLE_ROWS]
  const dataSheet = XLSX.utils.aoa_to_sheet(dataAoA)

  // Set column widths so the file looks tidy when opened.
  dataSheet["!cols"] = [
    { wch: 32 }, // Company name
    { wch: 22 }, // Trade name
    { wch: 28 }, // Contact
    { wch: 34 }, // Email
    { wch: 18 }, // City
    { wch: 22 }, // Country
  ]

  // Freeze header row.
  dataSheet["!freeze"] = { xSplit: 0, ySplit: 1 } as never
  // SheetJS uses `!views`. Set the active pane after row 1.
  ;(dataSheet as Record<string, unknown>)["!views"] = [
    { state: "frozen", topLeftCell: "A2", ySplit: 1 },
  ]

  XLSX.utils.book_append_sheet(wb, dataSheet, "Tenderers")

  // --- Sheet 2: Instructions ---
  const INSTRUCTIONS: (string | null)[][] = [
    ["Tenderer Excel template — instructions"],
    [],
    ["• Required columns:  Company name, Contact, Email"],
    [
      "• Optional columns:  Trade name, City, Country",
    ],
    [
      "• One bidder per row. Two sample rows are pre-filled in the 'Tenderers' sheet — delete them before upload.",
    ],
    ["• Emails must be unique within this project and follow standard format (user@domain.tld)."],
    ["• Company names are case-insensitive and de-duplicated within your workspace."],
    ["• Trade name is a short / alternate form (e.g. parent group vs trading entity)."],
    [],
    ["After upload you'll see a preview of every row with status pills:"],
    ["    ✓ Ready to add"],
    ["    ⚠ Duplicate company (already in this project) — skipped"],
    ["    ⚠ Missing required field — fix the spreadsheet and re-upload"],
    ["    ⚠ Invalid email format — fix the spreadsheet and re-upload"],
    [],
    [
      "Each successful row creates a tenderer with code T1, T2, … and adds the company to your workspace directory.",
    ],
  ]
  const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS)
  instructionsSheet["!cols"] = [{ wch: 110 }]
  XLSX.utils.book_append_sheet(wb, instructionsSheet, "Instructions")

  // Serialise. XLSX.write returns a Buffer in node; NextResponse wants
  // BodyInit, so wrap as a Blob (works under both web-stream and
  // node-stream BodyInit definitions).
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
  const body = new Blob([new Uint8Array(buf)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition":
        'attachment; filename="tenderer-template.xlsx"',
      "cache-control": "public, max-age=300", // file rarely changes; 5 min is fine
      "content-length": String(buf.length),
    },
  })
}

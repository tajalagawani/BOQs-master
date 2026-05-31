import * as XLSX from "xlsx"

import { z } from "zod"

const rowSchema = z.object({
  companyName: z.string().min(1).max(200),
  tradeName: z.string().max(200).optional(),
  contactName: z.string().min(1).max(200),
  contactEmail: z
    .string()
    .email()
    .transform((s) => s.trim().toLowerCase()),
  contactPhone: z.string().max(40).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  trade: z.string().max(120).optional(),
})

export type ParsedCompanyRow = z.infer<typeof rowSchema>

export interface ParseResult {
  rows: ParsedCompanyRow[]
  errors: { rowIndex: number; message: string }[]
}

const HEADER_MAP: Record<string, keyof ParsedCompanyRow> = {
  "company name": "companyName",
  company: "companyName",
  "trade name": "tradeName",
  "contact name": "contactName",
  contact: "contactName",
  "contact email": "contactEmail",
  email: "contactEmail",
  "contact phone": "contactPhone",
  phone: "contactPhone",
  city: "city",
  country: "country",
  trade: "trade",
  category: "trade",
}

function normaliseHeader(h: string): keyof ParsedCompanyRow | null {
  return HEADER_MAP[h.trim().toLowerCase()] ?? null
}

export function parseCompaniesWorkbook(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return { rows: [], errors: [{ rowIndex: 0, message: "Workbook has no sheets" }] }

  const sheet = wb.Sheets[sheetName]!
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  })

  const rows: ParsedCompanyRow[] = []
  const errors: ParseResult["errors"] = []

  json.forEach((rawRow, i) => {
    const normalised: Partial<Record<keyof ParsedCompanyRow, string>> = {}
    for (const [key, value] of Object.entries(rawRow)) {
      const field = normaliseHeader(key)
      if (!field) continue
      const str = String(value ?? "").trim()
      if (str) normalised[field] = str
    }

    const parsed = rowSchema.safeParse(normalised)
    if (parsed.success) {
      rows.push(parsed.data)
    } else {
      errors.push({
        rowIndex: i + 2, // header is row 1
        message: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      })
    }
  })

  return { rows, errors }
}

const TEMPLATE_HEADERS = [
  "Company name",
  "Trade name",
  "Contact name",
  "Contact email",
  "Contact phone",
  "City",
  "Country",
  "Trade",
]

const TEMPLATE_EXAMPLES = [
  [
    "Orion Property Group",
    "Orion",
    "Sarah Chen",
    "sarah@orion.example",
    "+971 50 123 4567",
    "Dubai",
    "United Arab Emirates",
    "Main contractor",
  ],
  [
    "Stratus Infrastructure Group",
    "Stratus",
    "Marco Levy",
    "marco@stratus.example",
    "+971 50 234 5678",
    "Abu Dhabi",
    "United Arab Emirates",
    "Civil",
  ],
]

/** Returns an .xlsx buffer for the tenderer-import template. */
export function buildCompaniesTemplate(): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES])
  XLSX.utils.book_append_sheet(wb, ws, "Tenderers")
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
}

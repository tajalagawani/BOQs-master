// Canonical result schema shared by the Python engine output, the /boq page, and
// the /agent page. Mirrors engine/run.py's JSON shape.

export type Pomi = {
  section: string;
  sub_section: string;
  l1_code: string;
  l1_name: string;
  l2_code: string;
  l2_name: string;
  l3_code: string;
  l3_name: string;
  code: string;
  pomi_desc: string;
  nrm_code: string;
  nrm_desc: string;
  method: string;
  confidence: number;
  engine: string;
  needs_review: boolean;
  rationale: string;
};

export type BOQItemRow = {
  sheet: string;
  row: number;
  ref: string;
  description: string;
  spec?: string;
  full_description: string;
  quantity: number | null;
  unit: string;
  rate: number | null;
  amount: number | null;
  section_context: string;
  sheet_title?: string;
  pomi: Pomi;
};

export type BillRecon = {
  bill: string;
  extracted: number;
  declared: number | null;
  delta: number | null;
  pct: number | null;
  status: "ok" | "mismatch" | "no-declared";
};

export type Reconciliation = {
  tolerance: number;
  overall: "PASS" | "PARTIAL" | "FAIL";
  extracted_total: number;
  declared_total: number | null;
  bills: BillRecon[];
};

export type BOQResult = {
  file: string;
  summary: {
    items: number;
    mapped: number;
    needs_review: number;
    engine: string;
    by_section: Record<string, number>;
    total_amount: number;
  };
  reconciliation?: Reconciliation;
  sheets: Array<{
    name: string;
    header_row: number | null;
    column_map: Record<string, number>;
    item_count: number;
    skipped_rows: number;
  }>;
  items: BOQItemRow[];
  upload?: { name: string; size: number; engine_forced_offline?: boolean };
};

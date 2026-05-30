/**
 * Demo project list shown on the BOQs Management landing.
 * Replace with real storage when the project data layer ships.
 */

export interface BoqProject {
  id: string;
  name: string;
  location: string;
  totalAmount: number;     // in ₹
  items: number;
  sections: number;
  trades: number;
  version: string;
  status: "Active" | "Draft" | "Archived";
  updatedAt: string;       // ISO-ish
  updatedRelative: string; // human "1h ago"
  thumbnail?: string;
  /**
   * Optional path to a POMI-coded result xlsx (relative to repo root).
   * When set, the workspace at /boqs/[id] loads sections + items from
   * the file. When absent, the workspace falls back to demo data.
   */
  sourceFile?: string;
}

export const demoProjects: BoqProject[] = [
  {
    id: "skyline-tower",
    name: "Skyline Tower",
    location: "Mumbai, India",
    totalAmount: 1285_45_672,
    items: 812,
    sections: 96,
    trades: 24,
    version: "v2.1",
    status: "Active",
    updatedAt: "2026-05-29T14:30:00Z",
    updatedRelative: "1 hour ago",
  },
  {
    id: "pearl-bay-t4",
    name: "Pearl Bay T4",
    location: "Dubai, UAE",
    totalAmount: 89_45_00_000,
    items: 1247,
    sections: 132,
    trades: 31,
    version: "v1.4",
    status: "Active",
    updatedAt: "2026-05-28T09:00:00Z",
    updatedRelative: "1 day ago",
  },
  {
    id: "citywalk-5-11",
    name: "Citywalk Plot 5.11",
    location: "Dubai, UAE",
    totalAmount: 172_78_57_443,
    items: 4451,
    sections: 32,
    trades: 18,
    version: "v3.2",
    status: "Active",
    updatedAt: "2026-05-15T12:00:00Z",
    updatedRelative: "2 weeks ago",
    sourceFile: "Data/Citywalk Plot 5.11 Main Works Contract BOQ (1)_POMI_Coded.xlsx",
  },
];

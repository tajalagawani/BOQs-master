/**
 * Demo BOQ data used to render the BOQs Management screen until the
 * editable-BOQ data layer ships. Numbers match the screenshot.
 */

export interface BoqSection {
  code: string;
  name: string;
  itemCount: number;
}

export interface BoqItem {
  code: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  version: string;
  trade: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  revisions: { version: string; updatedAt: string; by: string; note: string; current?: boolean }[];
  approval: {
    status: "Approved" | "Pending" | "Rejected";
    onTrack: boolean;
    by: string;
    role: string;
    at: string;
  };
}

export const demoSections: BoqSection[] = [
  { code: "01", name: "General Requirements", itemCount: 24 },
  { code: "02", name: "Siteworks", itemCount: 32 },
  { code: "03", name: "Concrete", itemCount: 58 },
  { code: "04", name: "Masonry", itemCount: 27 },
  { code: "05", name: "Metals", itemCount: 41 },
  { code: "06", name: "Carpentry", itemCount: 33 },
  { code: "07", name: "Finishes", itemCount: 60 },
  { code: "08", name: "MEP", itemCount: 76 },
  { code: "09", name: "External Works", itemCount: 29 },
];

export const demoItems: BoqItem[] = [
  {
    code: "01.01.001",
    description: "Mobilization and demobilization",
    unit: "LS",
    quantity: 1,
    rate: 450000,
    amount: 450000,
    version: "v2.1",
    trade: "General Requirements",
    lastUpdatedAt: "May 16, 2024  10:24 AM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [
      {
        version: "v2.1",
        updatedAt: "May 16, 2024 10:24 AM",
        by: "Arjun Mehta",
        note: "Rate updated as per latest vendor quote.",
        current: true,
      },
      {
        version: "v2.0",
        updatedAt: "May 10, 2024 03:15 PM",
        by: "Arjun Mehta",
        note: "Initial version.",
      },
    ],
    approval: {
      status: "Approved",
      onTrack: true,
      by: "Neha Sharma",
      role: "Commercial Manager",
      at: "May 16, 2024 11:02 AM",
    },
  },
  {
    code: "01.01.002",
    description: "Site establishment and temporary facilities",
    unit: "LS",
    quantity: 1,
    rate: 325000,
    amount: 325000,
    version: "v2.1",
    trade: "General Requirements",
    lastUpdatedAt: "May 14, 2024  03:45 PM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [
      { version: "v2.1", updatedAt: "May 14, 2024 03:45 PM", by: "Arjun Mehta", note: "Updated.", current: true },
    ],
    approval: { status: "Approved", onTrack: true, by: "Neha Sharma", role: "Commercial Manager", at: "May 15, 2024 09:10 AM" },
  },
  {
    code: "01.01.003",
    description: "Project signboard",
    unit: "EA",
    quantity: 2,
    rate: 6500,
    amount: 13000,
    version: "v2.0",
    trade: "General Requirements",
    lastUpdatedAt: "May 08, 2024  11:20 AM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [
      { version: "v2.0", updatedAt: "May 08, 2024 11:20 AM", by: "Arjun Mehta", note: "Initial version.", current: true },
    ],
    approval: { status: "Approved", onTrack: true, by: "Neha Sharma", role: "Commercial Manager", at: "May 09, 2024 10:30 AM" },
  },
  {
    code: "01.01.004",
    description: "Construction insurance",
    unit: "LS",
    quantity: 1,
    rate: 175000,
    amount: 175000,
    version: "v2.1",
    trade: "General Requirements",
    lastUpdatedAt: "May 12, 2024  02:00 PM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [{ version: "v2.1", updatedAt: "May 12, 2024 02:00 PM", by: "Arjun Mehta", note: "Updated insurer.", current: true }],
    approval: { status: "Approved", onTrack: true, by: "Neha Sharma", role: "Commercial Manager", at: "May 13, 2024 09:00 AM" },
  },
  {
    code: "01.01.005",
    description: "Performance bond",
    unit: "LS",
    quantity: 1,
    rate: 230000,
    amount: 230000,
    version: "v2.0",
    trade: "General Requirements",
    lastUpdatedAt: "May 05, 2024  10:15 AM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [{ version: "v2.0", updatedAt: "May 05, 2024 10:15 AM", by: "Arjun Mehta", note: "Initial.", current: true }],
    approval: { status: "Approved", onTrack: true, by: "Neha Sharma", role: "Commercial Manager", at: "May 06, 2024 09:00 AM" },
  },
  {
    code: "01.01.006",
    description: "Quality control and testing",
    unit: "LS",
    quantity: 1,
    rate: 120000,
    amount: 120000,
    version: "v2.1",
    trade: "General Requirements",
    lastUpdatedAt: "May 13, 2024  04:30 PM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [{ version: "v2.1", updatedAt: "May 13, 2024 04:30 PM", by: "Arjun Mehta", note: "Revised scope.", current: true }],
    approval: { status: "Approved", onTrack: true, by: "Neha Sharma", role: "Commercial Manager", at: "May 14, 2024 09:00 AM" },
  },
  {
    code: "01.01.007",
    description: "As-built documentation",
    unit: "LS",
    quantity: 1,
    rate: 85000,
    amount: 85000,
    version: "v2.0",
    trade: "General Requirements",
    lastUpdatedAt: "May 04, 2024  03:00 PM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [{ version: "v2.0", updatedAt: "May 04, 2024 03:00 PM", by: "Arjun Mehta", note: "Initial.", current: true }],
    approval: { status: "Approved", onTrack: true, by: "Neha Sharma", role: "Commercial Manager", at: "May 05, 2024 09:00 AM" },
  },
  {
    code: "01.01.008",
    description: "Safety management",
    unit: "LS",
    quantity: 1,
    rate: 95000,
    amount: 95000,
    version: "v2.1",
    trade: "General Requirements",
    lastUpdatedAt: "May 15, 2024  10:00 AM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [{ version: "v2.1", updatedAt: "May 15, 2024 10:00 AM", by: "Arjun Mehta", note: "Updated.", current: true }],
    approval: { status: "Approved", onTrack: true, by: "Neha Sharma", role: "Commercial Manager", at: "May 16, 2024 09:00 AM" },
  },
  {
    code: "01.01.009",
    description: "Environmental management",
    unit: "LS",
    quantity: 1,
    rate: 70000,
    amount: 70000,
    version: "v2.0",
    trade: "General Requirements",
    lastUpdatedAt: "May 03, 2024  02:30 PM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [{ version: "v2.0", updatedAt: "May 03, 2024 02:30 PM", by: "Arjun Mehta", note: "Initial.", current: true }],
    approval: { status: "Approved", onTrack: true, by: "Neha Sharma", role: "Commercial Manager", at: "May 04, 2024 09:00 AM" },
  },
  {
    code: "01.01.010",
    description: "Permits and approvals",
    unit: "LS",
    quantity: 1,
    rate: 60000,
    amount: 60000,
    version: "v2.1",
    trade: "General Requirements",
    lastUpdatedAt: "May 11, 2024  11:45 AM",
    lastUpdatedBy: "Arjun Mehta",
    revisions: [{ version: "v2.1", updatedAt: "May 11, 2024 11:45 AM", by: "Arjun Mehta", note: "Added new permit category.", current: true }],
    approval: { status: "Approved", onTrack: true, by: "Neha Sharma", role: "Commercial Manager", at: "May 12, 2024 09:00 AM" },
  },
];

export const demoTotals = {
  amount: 1285_45_672,        // ₹ 12,85,45,672  — Indian-grouped Lakh format
  items: 812,
  sections: 96,
  trades: 24,
  currentVersion: "v2.1",
};

/** Format a number in Indian (Lakh/Crore) grouping, no decimals. */
export function fmtINR(n: number, withCurrency = true): string {
  if (n == null || isNaN(n)) return "";
  const negative = n < 0;
  const abs = Math.abs(n);
  const [intPart, decPart] = abs.toFixed(2).split(".");
  // Indian grouping: 3 then 2,2,2…
  let result = "";
  if (intPart.length <= 3) result = intPart;
  else {
    const lastThree = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    result = `${restGrouped},${lastThree}`;
  }
  const formatted = decPart === "00" ? result + ".00" : `${result}.${decPart}`;
  return withCurrency
    ? `${negative ? "-" : ""}₹ ${formatted}`
    : `${negative ? "-" : ""}${formatted}`;
}

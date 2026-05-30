/**
 * Application Constants
 * Static configuration values that don't need to be in the database
 */

// Currency Options
export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const currencies: CurrencyOption[] = [
  { code: "SAR", name: "Saudi Riyal", symbol: "SR" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham", symbol: "AED" },
];

// Default phase options (can be overridden by configuration)
export const defaultPhases = [
  "Phase 1",
  "Phase 2",
  "Phase 3",
  "Phase 4",
  "Phase 5",
];

// Status options for masterplans
export const masterplanStatuses = [
  "Modelling",
  "Planning",
  "Active",
  "On Hold",
  "Completed",
  "Archived",
] as const;

export type MasterplanStatusType = (typeof masterplanStatuses)[number];

// Parametric Tree Structure (UI navigation)
export interface ParametricTreeNode {
  id: string;
  label: string;
  type: "root" | "parameter" | "option";
  children?: ParametricTreeNode[];
}

export const parametricTree: ParametricTreeNode = {
  id: "root",
  label: "Parameters",
  type: "root",
  children: [
    {
      id: "param-facade-treatment",
      label: "Facade Treatment",
      type: "parameter",
      children: [
        { id: "opt-facade-low", label: "Low", type: "option" },
        { id: "opt-facade-high", label: "High", type: "option" },
      ],
    },
    {
      id: "param-glazing-percentage",
      label: "Glazing Percentage",
      type: "parameter",
      children: [
        { id: "opt-glazing-low", label: "Low", type: "option" },
        { id: "opt-glazing-medium", label: "Medium", type: "option" },
        { id: "opt-glazing-high", label: "High", type: "option" },
      ],
    },
  ],
};

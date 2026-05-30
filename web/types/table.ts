// Table Configuration Types

export type ColumnAlign = "left" | "center" | "right";
export type ColumnFormat = "text" | "number" | "percentage" | "currency" | "date" | "custom";

export interface ColumnGroup {
  label: string;
  colSpan: number;
  noBorder?: boolean;
}

export interface ColumnConfig {
  key: string;
  label: string;
  align?: ColumnAlign;
  format?: ColumnFormat;
  width?: string;
  groupEnd?: boolean; // Mark end of group with border
  sticky?: "left" | "right";
  className?: string;
  // For custom rendering
  render?: "badge" | "actions";
  defaultValue?: string;
  highlighted?: boolean; // Light mint background for calculated/output columns
}

export interface TableConfig {
  id: string;
  caption: string;
  columnGroups?: ColumnGroup[];
  columns: ColumnConfig[];
  features?: {
    zebra?: boolean;
    stickyHeader?: boolean;
    stickyActions?: boolean;
    showDragHint?: boolean;
    emptyMessage?: string;
  };
  footer?: {
    label: string;
    totalKey: string;
  };
}

// Re-export for convenience
export type { BuildingAsset, CarParkingAsset, AdditionalAsset, PublicRealmAsset, InfrastructureConfig, OtherCostsConfig } from "./masterplan";

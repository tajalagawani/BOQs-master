/**
 * Types shared between server-only matrix parser and client components.
 * Must NOT import "server-only" or anything that does.
 */

export type MatrixStatus = "green" | "yellow" | "orange" | "red" | "unknown";

export interface MatrixRow {
  kpi: string;
  component: string;
  subComponent: string;
  phase: number;
  status: MatrixStatus;
  statusLabel: string;
  evidence: string;
  evidencePaths: string[];
}

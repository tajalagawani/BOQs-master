/**
 * 10X Suite — ioProcure report shell.
 * The Step-6 report frame: a floating panel carrying the meta band, the AI
 * provenance note, the section nav, then the ordered report sections (each of
 * which self-reflows via its own container query).
 */
import type { ReactNode } from "react";
import { SuitePanel } from "./SuitePanel";
import { SuiteAINote } from "./procurex";
import { MetaBand, SectionNav } from "./procurex-report";

export function ProcurexReportShell({
  meta,
  aiNote,
  nav,
  children,
}: {
  meta?: { k: ReactNode; v: ReactNode }[];
  aiNote?: ReactNode;
  nav?: { no?: ReactNode; label: ReactNode; href: string }[];
  children: ReactNode;
}) {
  return (
    <SuitePanel first>
      {meta && meta.length > 0 && <MetaBand items={meta} />}
      {aiNote && <SuiteAINote>{aiNote}</SuiteAINote>}
      {nav && nav.length > 0 && <SectionNav links={nav} />}
      {children}
    </SuitePanel>
  );
}

/**
 * 10X Suite design system — public entry point.
 * Import from "@/components/suite" anywhere in the app to adopt the navy/launcher
 * look. Tokens live in app/globals.css (suite-* Tailwind colours + .suite helpers).
 */
export { SuiteHome } from "./SuiteHome";
export { SuiteTopNav } from "./SuiteTopNav";
export { SuiteTabs } from "./SuiteTabs";
export { AppLauncherCard } from "./AppLauncherCard";
export { AppThumb } from "./AppThumb";
export { ChatFab } from "./ChatFab";
export { SuiteHero, SuiteProjectPill } from "./SuiteHero";
export { SuiteInnerShell, SuiteInnerHeader } from "./SuiteInnerShell";
export { SuiteSidebar } from "./SuiteSidebar";
export type { SuiteNavItem, SuiteNavSection } from "./SuiteSidebar";
export { SuiteSteps } from "./SuiteSteps";
export { SuiteNavMenu } from "./SuiteNavMenu";
export { ProcurexWizardShell, PROCUREX_STEPS } from "./ProcurexWizardShell";
export {
  SuiteTotals,
  SuiteDocStrip,
  SuiteBand,
  SuiteAINote,
  SuiteConfidence,
  SuiteMatchTag,
  SuiteMiss,
  SuiteDeviationRow,
  RosterWho,
  MiniStat,
} from "./procurex";
export type { SuiteTotalBox, SuiteDoc, DocState, MiniStatPart } from "./procurex";
export { SuitePanel, SecBar, SuiteTiles, SuiteTable } from "./SuitePanel";
export type { SuiteTileData } from "./SuitePanel";
export { SuiteCard, SuiteCardGrid } from "./SuiteCard";
export type { SuiteCardTone, SuiteCardMeta, SuiteCardStat } from "./SuiteCard";
export {
  SuiteRails,
  Waffle,
  SuiteChip,
  CodeBadge,
  SuiteButton,
} from "./primitives";
export type {
  SuiteApp,
  SuiteStat,
  SuiteTabItem,
  SuiteAccent,
  SuitePreview,
  SuiteTone,
} from "./types";

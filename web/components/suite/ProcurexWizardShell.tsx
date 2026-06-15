"use client";

/**
 * 10X Suite — ioProcure wizard shell.
 * The persistent tender-workspace frame from procurex-step3-10x-style.html:
 * navy topnav (ioProcure / {project}) → navy hero with the project pill + the
 * 6-step rail → white panels floating up over the hero. Reused by every project
 * route; the active step is set by `step` (0-based).
 */
import type { ReactNode } from "react";
import { SuiteRails } from "./primitives";
import { SuiteTopNav } from "./SuiteTopNav";
import { SuiteSteps } from "./SuiteSteps";
import { SuiteProjectPill } from "./SuiteHero";
import { ChatFab } from "./ChatFab";

export const PROCUREX_STEPS = [
  "Project & Contract",
  "Tender Documents",
  "Tenderers",
  "Analysis Config",
  "Tender Review",
  "Report & PTC",
];

export function ProcurexWizardShell({
  project,
  step,
  steps = PROCUREX_STEPS,
  title,
  subtitle,
  actions,
  heroControls,
  onStep,
  children,
}: {
  /** Project pill: bold name + mono meta (e.g. "AED · Configured"). */
  project?: { name: ReactNode; meta?: ReactNode };
  /** 0-based active step index. */
  step: number;
  /** Step labels — defaults to the reference set; pass the product's own. */
  steps?: string[];
  title: ReactNode;
  subtitle?: ReactNode;
  /** Optional hero actions (e.g. "View imported BoQ"), beside the project pill. */
  actions?: ReactNode;
  /** Rich hero control cluster (segment/round/export), e.g. Step 6 report. */
  heroControls?: ReactNode;
  /** Optional step click (e.g. navigate to a completed step's route). */
  onStep?: (index: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="suite flex h-full flex-col bg-suite-page">
      <SuiteRails />

      <SuiteTopNav
        crumb={
          <span className="flex items-center gap-2 text-[12.5px] text-[#9aa6bd]">
            <span className="font-semibold text-[#cdd6e6]">ioProcure</span>
            {project?.name && (
              <>
                <span className="opacity-50">/</span>
                <span className="truncate">{project.name}</span>
              </>
            )}
          </span>
        }
        notifications={1}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Navy hero + step rail */}
        <div className="suite-hero px-6 pb-[86px] pt-6">
          <div className="mx-auto max-w-[1220px]">
            <div className="mb-[22px] flex flex-col items-start justify-between gap-4 @container @lg:flex-row @lg:items-end">
              <div className="min-w-0">
                <h1 className="text-[27px] font-semibold tracking-[-0.01em] text-white">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 max-w-[540px] text-[13px] text-[#aeb8cc]">
                    {subtitle}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2.5 @lg:justify-end">
                {project && (
                  <SuiteProjectPill label={project.name} meta={project.meta} accent="amber" />
                )}
                {actions}
                {heroControls}
              </div>
            </div>
            <SuiteSteps steps={steps} current={step} onSelect={onStep} />
          </div>
        </div>

        {/* White panels float up over the hero (SuitePanel `first` → -58px). */}
        <div className="pb-10">{children}</div>
      </div>

      <ChatFab />
    </div>
  );
}

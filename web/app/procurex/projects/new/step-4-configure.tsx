"use client"

import { Fragment, useEffect, useRef, useState, useTransition } from "react"
import { Settings, Info, Check, AlertTriangle } from "lucide-react"

import {
  getStep4Config,
  saveStep4Config,
  type Step4Config,
  type Step4ConfigBundle,
} from "@/modules/procurex/configurations/actions"

// ────────────────────────────────────────────────────────────────────────
// UI key ↔ enum value maps (server uses analysis_config enums)
// ────────────────────────────────────────────────────────────────────────

const PTC_BASELINE_KEY_TO_ENUM: Record<
  string,
  { kind: Step4Config["baselineKind"] }
> = {
  "lowest-three": { kind: "avg_lowest_three" },
  median: { kind: "median" },
  "average-all": { kind: "average" },
  "pte-internal": { kind: "reference" },
}
const PTC_ENUM_TO_KEY: Partial<Record<Step4Config["baselineKind"], string>> = {
  avg_lowest_three: "lowest-three",
  median: "median",
  average: "average-all",
  reference: "pte-internal",
}

const TENDER_BASELINE_KEY_TO_ENUM: Record<
  string,
  { kind: Step4Config["baselineKind"] }
> = {
  pte: { kind: "reference" },
  "lowest-three-tenderers": { kind: "avg_lowest_three" },
  median: { kind: "median" },
  "average-all": { kind: "average" },
}
const TENDER_ENUM_TO_KEY: Partial<Record<Step4Config["baselineKind"], string>> = {
  reference: "pte",
  avg_lowest_three: "lowest-three-tenderers",
  median: "median",
  average: "average-all",
}

const UNPRICED_KEY_TO_ENUM: Record<string, Step4Config["unpricedStrategy"]> = {
  "list-only": "list_only",
  "lowest-three": "avg_lowest_three",
  "normalise-others": "normalise_avg",
  "normalise-pte": "normalise_pte",
}
const UNPRICED_ENUM_TO_KEY: Record<Step4Config["unpricedStrategy"], string> = {
  list_only: "list-only",
  avg_lowest_three: "lowest-three",
  normalise_avg: "normalise-others",
  normalise_pte: "normalise-pte",
}

const SUB_STEPS = [
  "High-Rate Analysis",
  "Variance Thresholds\n(High/low)",
  "Unpriced Items",
  "Summary",
]

type ReportTab = "ptc" | "tender"

interface BaselineOption {
  key: string
  title: string
  description: string
  example: string
  recommended?: boolean
}

const PTC_BASELINE_OPTIONS: BaselineOption[] = [
  {
    key: "lowest-three",
    title: "Average of Lowest Three",
    description:
      "Compare against the average of the three lowest rates submitted for each item. Best when you want a fair market reference without using PTE.",
    example:
      "Example: If 5 bidders quote 100, 1005, 120, 135, then baseline is 108.3",
    recommended: true,
  },
  {
    key: "median",
    title: "Median of Tenderer Rates",
    description:
      "Use the middle rate once all tenderer rates are sorted. Best when there may be unusually high/low outliers.",
    example: "Example: For rates 100, 120, 140, then baseline is 120",
  },
  {
    key: "average-all",
    title: "Average of All Tenderers",
    description:
      "Compare each tenderer against the average rate from all tenderers for each item. Note that this may be influenced by outliers.",
    example: "Example: If 3 bidders quote 100, 120, 140, then baseline is 120",
  },
  {
    key: "pte-internal",
    title: "Pre-Tender Estimate (PTE) - Internal only",
    description:
      "Compare all tenderers against your QS internal cost estimate. Not recommended for tenderer-facing outputs. Use for internal review or employer report instead.",
    example: "Example: Use your QS estimate as the comparison baseline",
  },
]

const TENDER_BASELINE_OPTIONS: BaselineOption[] = [
  {
    key: "pte",
    title: "Pre-Tender Estimate (PTE)",
    description:
      "Compare all tenderers against your QS internal cost estimate. Not recommended for tenderer-facing outputs. Use for internal review or employer report instead.",
    example: "Example: Use your QS estimate as the comparison baseline",
    recommended: true,
  },
  {
    key: "lowest-three-tenderers",
    title: "Average of Lowest Three Tenderers",
    description:
      "Compare against the average of the three lowest rates submitted for each item. Best when you want a fair market reference without using PTE.",
    example:
      "Example: If 5 bidders quote 100, 1005, 120, 135, then baseline is 108.3",
  },
  {
    key: "median",
    title: "Median of Tenderer Rates",
    description:
      "Use the middle rate once all tenderer rates are sorted. Best when there may be unusually high/low outliers.",
    example: "Example: For rates 100, 120, 140, then baseline is 120",
  },
  {
    key: "average-all",
    title: "Average of All Tenderers",
    description:
      "Compare each tenderer against the average rate from all tenderers for each item. Note that this may be influenced by outliers.",
    example: "Example: If 3 bidders quote 100, 120, 140, then baseline is 120",
  },
]

function SubStepper({
  current,
  onChange,
}: {
  current: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-start gap-0">
      {SUB_STEPS.map((label, idx) => {
        const n = idx + 1
        const active = n === current
        const done = n < current
        return (
          <Fragment key={label}>
            <button
              type="button"
              onClick={() => onChange(n)}
              className="flex flex-col items-center gap-[8px] shrink-0 group"
            >
              <div
                className={`size-[24px] rounded-full flex items-center justify-center border ${
                  active
                    ? "bg-[#142845] border-[#142845]"
                    : done
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-white border-[#d9d9d9] group-hover:border-[#142845]"
                }`}
              >
                {done ? (
                  <Check className="size-[12px] text-white" strokeWidth={3} />
                ) : (
                  <span
                    className={`font-medium text-[12px] leading-[18px] ${
                      active ? "text-white" : "text-[#142845]"
                    }`}
                    style={{ fontFamily: "Roboto, sans-serif" }}
                  >
                    {n}
                  </span>
                )}
              </div>
              <p
                className={`text-[#142845] text-[12px] text-center whitespace-pre-line ${
                  active ? "font-medium" : "font-normal"
                }`}
              >
                {label}
              </p>
            </button>
            {idx < SUB_STEPS.length - 1 && (
              <div
                className={`h-[2px] rounded-[16px] w-[80px] mt-[11px] mx-[12px] shrink-0 ${
                  done ? "bg-emerald-500" : "bg-[#d9d9d9]"
                }`}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

function PillTabs({
  active,
  onChange,
}: {
  active: ReportTab
  onChange: (t: ReportTab) => void
}) {
  return (
    <div className="bg-[#d9d9d9] flex h-[32px] items-start p-[4px] rounded-[50px] w-fit">
      {[
        { key: "ptc" as const, label: "PTC Report" },
        { key: "tender" as const, label: "Tender Report" },
      ].map((t) => {
        const selected = active === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex h-full items-center justify-center px-[16px] py-[8px] rounded-[500px] whitespace-nowrap text-[12px] leading-[16px] ${
              selected
                ? "bg-white font-medium text-black drop-shadow-[0_6px_8.5px_rgba(0,0,0,0.08)]"
                : "font-normal text-[#262626]"
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function BaselineRadioCard({
  option,
  selected,
  onSelect,
  disabled,
  disabledReason,
}: {
  option: BaselineOption
  selected: boolean
  onSelect: () => void
  disabled?: boolean
  disabledReason?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex flex-col gap-[12px] items-start p-[20px] rounded-[16px] w-full text-left border transition-colors ${
        disabled
          ? "bg-[#f5f5f7] border-[#e9e9e9] opacity-60 cursor-not-allowed"
          : selected
            ? "bg-[#e2edf7] border-[#b9d2eb]"
            : "bg-white border-[#e9e9e9] hover:border-[#b9d2eb]"
      }`}
    >
      <div className="flex gap-[12px] items-center">
        <span
          className={`size-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
            selected
              ? "border-[#142845] bg-[#142845]"
              : "border-[#c4c4c4] bg-white"
          }`}
        >
          {selected && (
            <Check className="size-[10px] text-white" strokeWidth={3} />
          )}
        </span>
        <span className="font-semibold text-[#141414] text-[14px] leading-[20px]">
          {option.title}
        </span>
        {option.recommended && (
          <span className="bg-[#0b0b0c] flex items-center justify-center px-[10px] py-[3px] rounded-[8px]">
            <span className="font-medium text-white text-[12px] leading-[16px]">
              Recommended
            </span>
          </span>
        )}
      </div>
      <p className="font-normal text-[#555] text-[12px] leading-[18px] pl-[30px]">
        {option.description}
      </p>
      <div className="bg-[#f5f5f5] flex items-center px-[12px] py-[6px] rounded-[8px] ml-[30px]">
        <p className="font-normal text-[#262626] text-[12px] leading-[16px]">
          <span className="font-semibold">Example: </span>
          {option.example.replace(/^Example: /, "")}
        </p>
      </div>
    </button>
  )
}

export function Step4Configure({
  projectId,
  subStep,
  onSubStepChange,
  reportTab,
  onReportTabChange,
}: {
  projectId: string
  subStep: number
  onSubStepChange: (n: number) => void
  reportTab: ReportTab
  onReportTabChange: (t: ReportTab) => void
}) {
  const setReportTab = onReportTabChange

  // ── Server-backed state ──
  const [bundle, setBundle] = useState<Step4ConfigBundle | null>(null)
  const [loading, setLoading] = useState(Boolean(projectId))
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  // Snapshot of last-saved bundle — used for dirty comparison.
  const savedRef = useRef<Step4ConfigBundle | null>(null)

  // Initial load
  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const b = await getStep4Config(projectId)
        if (cancelled) return
        setBundle(b)
        savedRef.current = b
        setLastSavedAt(b.lastSavedAt)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load config")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Convenience writers — mutate the local bundle and flip dirty.
  function patchPtc(p: Partial<Step4Config>) {
    if (!bundle) return
    setBundle({ ...bundle, ptc: { ...bundle.ptc, ...p } })
    setDirty(true)
  }
  function patchTender(p: Partial<Step4Config>) {
    if (!bundle) return
    setBundle({ ...bundle, tender: { ...bundle.tender, ...p } })
    setDirty(true)
  }
  function patchPtcSections(field: string, on: boolean) {
    if (!bundle) return
    patchPtc({
      sectionsEnabled: { ...bundle.ptc.sectionsEnabled, [field]: on },
    })
  }
  function patchTenderSections(field: string, on: boolean) {
    if (!bundle) return
    patchTender({
      sectionsEnabled: { ...bundle.tender.sectionsEnabled, [field]: on },
    })
  }

  function handleSave() {
    if (!bundle || !projectId) return
    setError(null)
    setSaving(true)
    startTransition(async () => {
      const res = await saveStep4Config({
        projectId,
        ptc: bundle.ptc,
        tender: bundle.tender,
      })
      setSaving(false)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setDirty(false)
      setLastSavedAt(res.lastSavedAt)
      savedRef.current = bundle
    })
  }

  // Loading / empty rails
  if (loading) {
    return (
      <div className="bg-white flex flex-col items-center justify-center p-[80px] rounded-[16px] w-[1360px] mx-auto">
        <p className="text-[#555] text-[14px]">Loading configuration…</p>
      </div>
    )
  }
  if (!bundle) {
    return (
      <div className="bg-white flex flex-col items-center justify-center p-[80px] rounded-[16px] w-[1360px] mx-auto">
        <p className="text-[#555] text-[14px]">
          Save Step 1 first so we can attach the configuration to a project.
        </p>
      </div>
    )
  }

  // UI-key views derived from the enum bundle
  const ptcKey =
    PTC_ENUM_TO_KEY[bundle.ptc.baselineKind] ?? "lowest-three"
  const tenderKey =
    TENDER_ENUM_TO_KEY[bundle.tender.baselineKind] ?? "pte"

  return (
    <div className="bg-white flex flex-col gap-[32px] p-[40px] rounded-[16px] w-[1360px] mx-auto">
      <div className="flex items-start justify-between gap-[40px]">
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-center gap-[8px]">
            <Settings className="size-[24px] text-black" />
            <h2 className="font-semibold text-black text-[18px] leading-[24px]">
              Configure Outputs
            </h2>
            <SavedPill
              dirty={dirty}
              saving={saving}
              lastSavedAt={lastSavedAt}
              locked={bundle.isLocked}
            />
          </div>
          <div className="text-[#555] text-[12px] leading-[18px]">
            <p>Choose separate settings for:</p>
            <ul className="list-disc pl-[20px] space-y-[2px]">
              <li>PTC (Tenderer facing): what we send to tenderers</li>
              <li>
                Tender Report (Employer facing): what we report to the
                client/employer
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-end gap-[8px]">
          <SubStepper current={subStep} onChange={onSubStepChange} />
          <button
            type="button"
            disabled={!dirty || saving || bundle.isLocked}
            onClick={handleSave}
            className={`flex items-center justify-center px-[16px] h-[32px] rounded-[16px] text-[12px] font-medium transition-colors ${
              !dirty || saving || bundle.isLocked
                ? "bg-[#f5f5f7] text-[#a3a3a3] cursor-not-allowed border border-[#e9e9e9]"
                : "bg-[#142845] text-white hover:bg-[#0a1426]"
            }`}
          >
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-[12px] rounded-[8px] px-[12px] py-[8px] flex gap-[8px] items-start">
          <AlertTriangle className="size-[14px] mt-[1px] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {bundle.isLocked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[12px] rounded-[8px] px-[12px] py-[8px]">
          Round has been signed off — settings are read-only until it's unlocked.
        </div>
      )}

      <PillTabs active={reportTab} onChange={setReportTab} />

      {subStep === 1 && reportTab === "ptc" && (
        <BaselineSection
          title="1. PTC Baseline"
          subtitle={
            <>
              Select what Procurex will compare each tenderers{" "}
              <span className="font-semibold">unit rates</span> against to
              flag high items in the PTC to the tenderer.
            </>
          }
          options={PTC_BASELINE_OPTIONS}
          selected={ptcKey}
          onSelect={(k) => {
            const target = PTC_BASELINE_KEY_TO_ENUM[k]?.kind
            if (!target) return
            if (target === "reference" && !bundle.pteAvailable) {
              setError(
                "No PTE has been uploaded. Upload a Pre-Tender Estimate in Step 2 (Optional documents) before choosing this baseline.",
              )
              return
            }
            patchPtc({ baselineKind: target })
          }}
          pteAvailable={bundle.pteAvailable}
          pteDisabledKey="pte-internal"
          disabled={bundle.isLocked}
        />
      )}

      {subStep === 1 && reportTab === "tender" && (
        <BaselineSection
          title="1. Tender Report Baseline"
          subtitle={
            <>
              Select what Procurex will compare each tenderers{" "}
              <span className="font-semibold">unit rates</span> against for
              reporting (high/low signals and analytics).
            </>
          }
          options={TENDER_BASELINE_OPTIONS}
          selected={tenderKey}
          onSelect={(k) => {
            const target = TENDER_BASELINE_KEY_TO_ENUM[k]?.kind
            if (!target) return
            if (target === "reference" && !bundle.pteAvailable) {
              setError(
                "No PTE has been uploaded. Upload a Pre-Tender Estimate in Step 2 (Optional documents) before choosing this baseline.",
              )
              return
            }
            patchTender({ baselineKind: target })
          }}
          pteAvailable={bundle.pteAvailable}
          pteDisabledKey="pte"
          disabled={bundle.isLocked}
          banner={
            <>
              This baseline affects employer-facing reporting only, it does{" "}
              <span className="font-semibold">not</span> change what is sent to
              tenderers in PTCs unless set in the PTC tab.
            </>
          }
        />
      )}

      {subStep === 2 && (
        <VarianceThresholds
          reportTab={reportTab}
          ptc={bundle.ptc}
          tender={bundle.tender}
          onPatchPtc={patchPtc}
          onPatchTender={patchTender}
          disabled={bundle.isLocked}
        />
      )}

      {subStep === 3 && reportTab === "ptc" && (
        <div className="flex flex-col gap-[8px]">
          <h3 className="font-semibold text-[#141414] text-[16px] leading-[24px]">
            3. Unpriced items in PTC
          </h3>
          <p className="font-normal text-[#555] text-[12px] leading-[18px]">
            Procurex will list unpriced items for the bidder and request they
            price them.
          </p>
          <p className="font-normal text-[#555] text-[12px] leading-[18px] mt-[8px]">
            Normalisation is <span className="font-semibold">not</span> shown
            to tenderers.
          </p>
        </div>
      )}

      {subStep === 3 && reportTab === "tender" && (
        <TenderUnpricedItems
          config={bundle.tender}
          onPatch={patchTender}
          pteAvailable={bundle.pteAvailable}
          disabled={bundle.isLocked}
        />
      )}

      {subStep === 4 && reportTab === "ptc" && (
        <PTCSummary
          sections={bundle.ptc.sectionsEnabled}
          onChange={patchPtcSections}
          disabled={bundle.isLocked}
        />
      )}

      {subStep === 4 && reportTab === "tender" && (
        <TenderSummary
          sections={bundle.tender.sectionsEnabled}
          onChange={patchTenderSections}
          disabled={bundle.isLocked}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Header saved-state pill
// ────────────────────────────────────────────────────────────────────────

function SavedPill({
  dirty,
  saving,
  lastSavedAt,
  locked,
}: {
  dirty: boolean
  saving: boolean
  lastSavedAt: Date | null
  locked: boolean
}) {
  if (locked)
    return (
      <span className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-full px-[10px] py-[2px]">
        Locked
      </span>
    )
  if (saving)
    return (
      <span className="bg-blue-50 border border-blue-200 text-blue-800 text-[11px] rounded-full px-[10px] py-[2px]">
        Saving…
      </span>
    )
  if (dirty)
    return (
      <span className="bg-yellow-50 border border-yellow-200 text-yellow-900 text-[11px] rounded-full px-[10px] py-[2px]">
        Unsaved changes
      </span>
    )
  if (lastSavedAt)
    return (
      <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-full px-[10px] py-[2px]">
        Saved {timeAgo(lastSavedAt)}
      </span>
    )
  return null
}

function timeAgo(d: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return d.toLocaleDateString()
}

interface SummaryRow {
  key: string
  title: string
  description: React.ReactNode
  control: "toggle" | "checkbox"
}

const PTC_SUMMARY_ROWS: SummaryRow[] = [
  {
    key: "high-rate-appendix",
    title: "High-Rate Appendix",
    description: (
      <>
        Show <span className="font-semibold">% above baseline</span> for each
        flagged item.
      </>
    ),
    control: "toggle",
  },
  {
    key: "low-rate-appendix",
    title: "Low-Rate Appendix",
    description: (
      <>
        Show <span className="font-semibold">% above baseline</span> for each
        flagged item.
      </>
    ),
    control: "toggle",
  },
  {
    key: "unpriced-items",
    title: "Unpriced Items",
    description:
      "Include list. Please provide an individual price for each item listed.",
    control: "toggle",
  },
  {
    key: "excluded",
    title: "Excluded / By client / By others",
    description:
      "Include a separate list. Note: Requires QS review before issuing.",
    control: "toggle",
  },
  {
    key: "completion-checker",
    title: "Completion checker",
    description: "Block PTC generation until QS Review is complete.",
    control: "checkbox",
  },
]

function CheckboxControl({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`size-[20px] rounded-[6px] flex items-center justify-center shrink-0 ${
        checked
          ? "bg-[#141414] border border-[#141414]"
          : "bg-white border border-[#c4c4c4]"
      }`}
    >
      {checked && <Check className="size-[12px] text-white" strokeWidth={3} />}
    </button>
  )
}

function SummaryRowCard({
  row,
  on,
  onChange,
}: {
  row: SummaryRow
  on: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div
      className={`flex items-start gap-[16px] p-[16px] rounded-[12px] border transition-colors ${
        on
          ? "bg-[#e2edf7] border-[#b9d2eb]"
          : "bg-white border-[#e9e9e9]"
      }`}
    >
      {row.control === "toggle" ? (
        <ToggleSwitch on={on} onChange={onChange} />
      ) : (
        <CheckboxControl checked={on} onChange={onChange} />
      )}
      <div className="flex flex-col gap-[2px]">
        <p className="font-semibold text-[#141414] text-[14px] leading-[20px]">
          {row.title}
        </p>
        <p className="font-normal text-[#555] text-[12px] leading-[18px]">
          {row.description}
        </p>
      </div>
    </div>
  )
}

// Mapping between UI-row keys and the canonical sectionsEnabled field names
// (camelCase) so the persistor stores a clean shape.
const PTC_ROW_KEY_TO_FIELD: Record<string, string> = {
  "high-rate-appendix": "highRateAppendix",
  "low-rate-appendix": "lowRateAppendix",
  "unpriced-items": "unpricedItems",
  excluded: "excluded",
  "completion-checker": "completionChecker",
}

function PTCSummary({
  sections,
  onChange,
  disabled,
}: {
  sections: Record<string, boolean>
  onChange: (field: string, on: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[8px]">
        <h3 className="font-semibold text-[#141414] text-[16px] leading-[24px]">
          4. PTC Summary (Tenderer facing)
        </h3>
        <p className="font-normal text-[#555] text-[12px] leading-[18px]">
          Choose what Procurex includes in the bidder’s PTC pack. Keep
          language generic and avoid revealing internal estimates.
        </p>
      </div>

      <div className="flex flex-col gap-[12px]">
        {PTC_SUMMARY_ROWS.map((row) => {
          const field = PTC_ROW_KEY_TO_FIELD[row.key] ?? row.key
          return (
            <SummaryRowCard
              key={row.key}
              row={row}
              on={Boolean(sections[field])}
              onChange={(next) => !disabled && onChange(field, next)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ───────────────────────── Tender Summary (new) ─────────────────────────

const TENDER_SUMMARY_ROWS: SummaryRow[] = [
  {
    key: "highRateAppendix",
    title: "High-Rate Appendix",
    description: (
      <>
        Show every flagged high item with{" "}
        <span className="font-semibold">% from baseline</span>.
      </>
    ),
    control: "toggle",
  },
  {
    key: "lowRateAppendix",
    title: "Low-Rate Appendix",
    description: (
      <>
        Show every flagged low item with{" "}
        <span className="font-semibold">% below baseline</span>.
      </>
    ),
    control: "toggle",
  },
  {
    key: "unpricedItems",
    title: "Unpriced Items list",
    description:
      "Items left without a rate. Includes the normalisation strategy chosen in sub-step 3.",
    control: "toggle",
  },
  {
    key: "normalisedTotals",
    title: "Normalised Totals",
    description:
      "Show tender sums adjusted for unpriced items so totals are comparable like-for-like.",
    control: "toggle",
  },
  {
    key: "arithmeticalAdjustments",
    title: "Arithmetical Adjustments",
    description:
      "Items where amount ≠ qty × rate. Honours the ITT Clause 18.2 policy from Step 2.",
    control: "toggle",
  },
  {
    key: "rankingTable",
    title: "Ranking Table",
    description:
      "Tender sums ranked low → high with deltas from the lowest bidder and PTE.",
    control: "toggle",
  },
  {
    key: "qsSignOffRequired",
    title: "QS sign-off required",
    description:
      "Block Tender Report generation until a QS has signed off the round in Step 5.",
    control: "checkbox",
  },
]

function TenderSummary({
  sections,
  onChange,
  disabled,
}: {
  sections: Record<string, boolean>
  onChange: (field: string, on: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[8px]">
        <h3 className="font-semibold text-[#141414] text-[16px] leading-[24px]">
          4. Tender Report Summary (Employer facing)
        </h3>
        <p className="font-normal text-[#555] text-[12px] leading-[18px]">
          Choose what Procurex includes in the employer report. This is the
          internal document — PTE comparisons, normalised totals, and ranking
          tables are visible here but NOT sent to tenderers.
        </p>
      </div>

      <div className="flex flex-col gap-[12px]">
        {TENDER_SUMMARY_ROWS.map((row) => (
          <SummaryRowCard
            key={row.key}
            row={row}
            on={Boolean(sections[row.key])}
            onChange={(next) => !disabled && onChange(row.key, next)}
          />
        ))}
      </div>
    </div>
  )
}

function BaselineSection({
  title,
  subtitle,
  options,
  selected,
  onSelect,
  banner,
  pteAvailable,
  pteDisabledKey,
  disabled,
}: {
  title: string
  subtitle: React.ReactNode
  options: BaselineOption[]
  selected: string
  onSelect: (key: string) => void
  banner?: React.ReactNode
  pteAvailable?: boolean
  pteDisabledKey?: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-start justify-between gap-[24px]">
        <div className="flex flex-col gap-[8px] max-w-[700px]">
          <div className="flex items-center gap-[6px]">
            <h3 className="font-semibold text-[#141414] text-[16px] leading-[24px]">
              {title}
            </h3>
            <Info className="size-[14px] text-[#555]" />
          </div>
          <p className="font-normal text-[#555] text-[12px] leading-[18px]">
            {subtitle}
          </p>
        </div>
        {banner && (
          <div className="bg-[#e2edf7] border border-[#b9d2eb] flex gap-[8px] items-start px-[16px] py-[12px] rounded-[12px] max-w-[420px]">
            <Info className="size-[14px] text-[#142845] shrink-0 mt-[2px]" />
            <p className="font-normal text-[#262626] text-[12px] leading-[18px]">
              {banner}
            </p>
          </div>
        )}
      </div>

      <p className="font-semibold text-[#141414] text-[12px] leading-[16px]">
        Options
      </p>

      <div className="flex flex-col gap-[12px]">
        {options.map((option) => {
          const isPteOption = option.key === pteDisabledKey
          const isDisabled =
            disabled || (isPteOption && pteAvailable === false)
          return (
            <BaselineRadioCard
              key={option.key}
              option={option}
              selected={selected === option.key}
              onSelect={() => !isDisabled && onSelect(option.key)}
              disabled={isDisabled}
              disabledReason={
                isPteOption && pteAvailable === false
                  ? "Upload a PTE in Step 2 (Optional documents) before choosing this baseline."
                  : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}

function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex items-center p-[4px] rounded-[13px] shadow-[0_4px_8px_0_rgba(0,0,0,0.1)] w-[48px] h-[26px] transition-colors ${
        on ? "bg-[#2a69b9] justify-end" : "bg-[#c4c4c4] justify-start"
      }`}
    >
      <span className="bg-white rounded-full size-[18px] block" />
    </button>
  )
}

function ThresholdColumn({
  title,
  inputLabel,
  on,
  setOn,
  value,
  setValue,
  helperBefore,
  helperBold,
  helperAfter,
  titleNote,
}: {
  title: string
  inputLabel: string
  on: boolean
  setOn: (v: boolean) => void
  value: string
  setValue: (v: string) => void
  helperBefore: string
  helperBold: string
  helperAfter: string
  titleNote?: string
}) {
  return (
    <div className="flex flex-col gap-[16px] flex-1">
      <div className="flex items-center gap-[8px] flex-wrap">
        <p className="font-semibold text-[#141414] text-[14px] leading-[24px]">
          {title}
        </p>
        {titleNote && (
          <>
            <Info className="size-[12px] text-[#555]" />
            <span className="font-normal text-[#555] text-[12px] leading-[16px]">
              {titleNote}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-[8px]">
        <ToggleSwitch on={on} onChange={setOn} />
        <span className="font-medium text-[#141414] text-[14px] leading-[20px]">
          {on ? "ON" : "OFF"}
        </span>
      </div>
      <div className="flex flex-col gap-[6px]">
        <p
          className={`font-normal text-[12px] leading-[16px] ${
            on ? "text-[#434343]" : "text-[#a3a3a3]"
          }`}
        >
          {inputLabel}
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!on}
          className={`bg-white border h-[40px] rounded-[8px] px-[12px] text-[14px] focus:outline-none focus:border-[#142845] w-[200px] ${
            on
              ? "border-[#d9d9d9] text-[#262626]"
              : "border-[#e9e9e9] text-[#a3a3a3]"
          }`}
          style={{ fontFamily: "Inter, sans-serif" }}
        />
        <p
          className={`font-normal text-[12px] leading-[16px] max-w-[260px] ${
            on ? "text-[#555]" : "text-[#a3a3a3]"
          }`}
        >
          {helperBefore}
          <span className="font-semibold">{helperBold}</span>
          {helperAfter}
        </p>
      </div>
    </div>
  )
}

interface UnpricedOption {
  key: string
  title: string
  description: string
  recommended?: boolean
}

const TENDER_UNPRICED_OPTIONS: UnpricedOption[] = [
  {
    key: "list-only",
    title: "List only",
    description:
      "Show unpriced items but do not adjust tender totals. Use PTC to request pricing.",
    recommended: true,
  },
  {
    key: "lowest-three",
    title: "Average of Lowest Three Tenderers",
    description:
      "Compare against the average of the three lowest rates submitted for each item.",
  },
  {
    key: "normalise-others",
    title: "Normalise using average of other tenderers",
    description:
      'Estimate missing rates using the average of other tenderers’ rates for the same item. This produces a "normalised tender total" for fair comparison.',
  },
  {
    key: "normalise-pte",
    title: "Normalise using PTE",
    description:
      'Estimate missing rates using the QS pre-tender estimate. This produces a "normalised tender total" for fair comparison.',
  },
]

function UnpricedRadioCard({
  option,
  selected,
  onSelect,
}: {
  option: UnpricedOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-[8px] items-start p-[20px] rounded-[16px] w-full text-left border transition-colors ${
        selected
          ? "bg-[#e2edf7] border-[#b9d2eb]"
          : "bg-white border-[#e9e9e9] hover:border-[#b9d2eb]"
      }`}
    >
      <div className="flex gap-[12px] items-center">
        <span
          className={`size-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
            selected
              ? "border-[#142845] bg-[#142845]"
              : "border-[#c4c4c4] bg-white"
          }`}
        >
          {selected && (
            <Check className="size-[10px] text-white" strokeWidth={3} />
          )}
        </span>
        <span className="font-semibold text-[#141414] text-[14px] leading-[20px]">
          {option.title}
        </span>
        {option.recommended && (
          <span className="bg-[#0b0b0c] flex items-center justify-center px-[10px] py-[3px] rounded-[8px]">
            <span className="font-medium text-white text-[12px] leading-[16px]">
              Recommended for early review
            </span>
          </span>
        )}
      </div>
      <p className="font-normal text-[#555] text-[12px] leading-[18px] pl-[30px]">
        {option.description}
      </p>
    </button>
  )
}

function TenderUnpricedItems({
  config,
  onPatch,
  pteAvailable,
  disabled,
}: {
  config: Step4Config
  onPatch: (p: Partial<Step4Config>) => void
  pteAvailable: boolean
  disabled?: boolean
}) {
  const selected = UNPRICED_ENUM_TO_KEY[config.unpricedStrategy] ?? "list-only"
  const qcOn = config.unpricedQualityCheckEnabled
  const warnPct = config.unpricedQualityCheckPct
  const setSelected = (k: string) => {
    if (disabled) return
    const enumVal = UNPRICED_KEY_TO_ENUM[k]
    if (!enumVal) return
    if (enumVal === "normalise_pte" && !pteAvailable) return
    onPatch({ unpricedStrategy: enumVal })
  }
  const setQcOn = (v: boolean) =>
    !disabled && onPatch({ unpricedQualityCheckEnabled: v })
  const setWarnPct = (v: string) =>
    !disabled && onPatch({ unpricedQualityCheckPct: v })

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[8px]">
        <h3 className="font-semibold text-[#141414] text-[16px] leading-[24px]">
          3. How to handle unpriced items
        </h3>
        <p className="font-normal text-[#555] text-[12px] leading-[18px]">
          Choose how to treat items where a tenderer did not provide a unit
          rate. This affects employer-facing comparison and reporting.
        </p>
      </div>

      <div className="flex flex-col gap-[12px]">
        {TENDER_UNPRICED_OPTIONS.map((option) => (
          <UnpricedRadioCard
            key={option.key}
            option={option}
            selected={selected === option.key}
            onSelect={() => setSelected(option.key)}
          />
        ))}
      </div>

      <div className="bg-white border border-[#e9e9e9] flex flex-col gap-[12px] p-[20px] rounded-[16px] mt-[8px]">
        <div className="flex items-center gap-[8px]">
          <h4 className="font-semibold text-[#141414] text-[14px] leading-[20px]">
            Quality check
          </h4>
          <span className="bg-[#0b0b0c] flex items-center justify-center px-[10px] py-[3px] rounded-[8px]">
            <span className="font-medium text-white text-[12px] leading-[16px]">
              Recommended for early review
            </span>
          </span>
        </div>
        <p className="font-normal text-[#555] text-[12px] leading-[18px]">
          This quality check will flag items for QS review if their price
          exceeds a set threshold (e.g. +20%) from the PTE. Items will be
          added to a QS review list before report generation.
        </p>
        <div className="flex items-center gap-[8px]">
          <ToggleSwitch on={qcOn} onChange={setQcOn} />
          <span className="font-medium text-[#141414] text-[14px] leading-[20px]">
            {qcOn ? "ON" : "OFF"}
          </span>
        </div>
        <div className="flex flex-col gap-[6px]">
          <p
            className={`font-normal text-[12px] leading-[16px] ${
              qcOn ? "text-[#434343]" : "text-[#a3a3a3]"
            }`}
          >
            Warn if difference % from the{" "}
            <span className="font-semibold">PTE</span>
          </p>
          <div
            className={`bg-white border h-[40px] rounded-[8px] flex items-center px-[12px] w-[200px] ${
              qcOn ? "border-[#d9d9d9]" : "border-[#e9e9e9]"
            }`}
          >
            <input
              type="text"
              value={warnPct}
              onChange={(e) => setWarnPct(e.target.value)}
              disabled={!qcOn}
              className={`flex-1 bg-transparent text-[14px] focus:outline-none ${
                qcOn ? "text-[#262626]" : "text-[#a3a3a3]"
              }`}
              style={{ fontFamily: "Inter, sans-serif" }}
            />
            <span
              className={`text-[14px] ${
                qcOn ? "text-[#262626]" : "text-[#a3a3a3]"
              }`}
            >
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function VarianceThresholds({
  reportTab,
  ptc,
  tender,
  onPatchPtc,
  onPatchTender,
  disabled,
}: {
  reportTab: ReportTab
  ptc: Step4Config
  tender: Step4Config
  onPatchPtc: (p: Partial<Step4Config>) => void
  onPatchTender: (p: Partial<Step4Config>) => void
  disabled?: boolean
}) {
  const cfg = reportTab === "ptc" ? ptc : tender
  const patch = reportTab === "ptc" ? onPatchPtc : onPatchTender
  const highOn = cfg.highThresholdEnabled
  const highValue = cfg.highThresholdPct
  const lowOn = cfg.lowThresholdEnabled
  const lowValue = cfg.lowThresholdPct
  const setHighOn = (v: boolean) =>
    !disabled && patch({ highThresholdEnabled: v })
  const setHighValue = (v: string) =>
    !disabled && patch({ highThresholdPct: v })
  const setLowOn = (v: boolean) => !disabled && patch({ lowThresholdEnabled: v })
  const setLowValue = (v: string) => !disabled && patch({ lowThresholdPct: v })

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center gap-[6px]">
          <h3 className="font-semibold text-[#141414] text-[16px] leading-[24px]">
            2. Set Rate Variance Thresholds
          </h3>
          <Info className="size-[14px] text-[#555]" />
        </div>
        <p className="font-normal text-[#555] text-[12px] leading-[18px]">
          Define when a rate is flagged as{" "}
          <span className="font-semibold">High</span> or{" "}
          <span className="font-semibold">Low</span> compared to your selected
          baseline.
        </p>
      </div>

      <div className="bg-[#e2edf7] border border-[#b9d2eb] flex gap-[40px] p-[24px] rounded-[16px]">
        <ThresholdColumn
          title="High Rate Threshold"
          inputLabel="High Rate Threshold (%)"
          on={highOn}
          setOn={setHighOn}
          value={highValue}
          setValue={setHighValue}
          helperBefore={"Flag items where the bidder’s rate is "}
          helperBold={`${highValue}% or more above`}
          helperAfter=" the baseline"
        />
        <ThresholdColumn
          title="Low Rate Threshold"
          inputLabel="Low Rate Threshold (%)"
          on={lowOn}
          setOn={setLowOn}
          value={lowValue}
          setValue={setLowValue}
          helperBefore={"Flag items where the bidder’s rate is "}
          helperBold={`${lowValue}% or more below`}
          helperAfter=" the baseline"
          titleNote={
            reportTab === "ptc"
              ? "Typically used in the tender report, not the PTC."
              : undefined
          }
        />
      </div>
    </div>
  )
}

export const STEP_4_SUB_STEP_COUNT = SUB_STEPS.length
export type Step4ReportTab = ReportTab

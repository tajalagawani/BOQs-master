"use client"

import { useEffect, useRef, useState, useTransition } from "react"

import { TendererSubmissionReviewModal } from "@/components/procurex/docs/tenderer-submission-review-modal"
import { uploadFileLocally } from "@/components/procurex/docs/upload-client"
import { requestDocumentUpload } from "@/modules/documents/actions"
import { discardTendererUpload } from "@/modules/procurex/tenderers/submission-actions"
import {
  UserPlus,
  CloudUpload,
  Download,
  Trash2,
  Pencil,
  Send,
  CircleCheck,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react"

import {
  CodeBadge,
  MiniStat,
  RosterWho,
  SecBar,
  SuiteAINote,
  SuiteBand,
  SuiteButton,
  SuiteChip,
  SuiteDocStrip,
  SuiteMiss,
  SuitePanel,
  SuiteTable,
  SuiteTiles,
  SuiteTotals,
  type MiniStatPart,
  type SuiteDoc,
} from "@/components/suite"

import {
  addTenderer as addTendererAction,
  getTenderersForProject,
  markQsUpload as markQsUploadAction,
  removeTenderer as removeTendererAction,
  type TendererRow,
} from "@/modules/procurex/tenderers/actions"

interface Tenderer {
  id: string                  // server-issued for committed rows; client-issued (`draft-…`) for the unsaved card
  code: string
  companyName: string
  contactEmail: string
  contactName: string
  country: string | null
  city: string | null
  invited: boolean            // true iff status ∈ {invited, opened, submitted} OR qs_upload
  qsUpload: boolean
  status: TendererRow["status"] | "draft"
  submittedAt: Date | null
  isDraft: boolean
  /** Latest PTC document for this tenderer (if any) — drives the
   *  initial ptcStage of the DocumentUploadPanel so a refresh restores
   *  whatever state the user left it in. */
  ptcSlot: TendererRow["bidderDocs"]["boq-priceset"] | null
  /** Latest cover-letter + form-of-tender slots — drive the intake docstrip. */
  coverSlot: TendererRow["bidderDocs"]["cover-letter"] | null
  fotSlot: TendererRow["bidderDocs"]["fot"] | null
}

type Tab = "excel" | "manual"

let draftCounter = 0
function makeDraft(): Tenderer {
  draftCounter++
  return {
    id: `draft-${draftCounter}`,
    code: "",                  // server picks the next free Tk on save
    companyName: "",
    contactEmail: "",
    contactName: "",
    country: null,
    city: null,
    invited: false,
    qsUpload: false,
    status: "draft",
    submittedAt: null,
    isDraft: true,
    ptcSlot: null,
    coverSlot: null,
    fotSlot: null,
  }
}

function fromServer(t: TendererRow): Tenderer {
  return {
    id: t.id,
    code: t.code,
    companyName: t.company.name,
    contactEmail: t.contactEmail,
    contactName: t.contactName,
    country: t.company.country,
    city: t.company.city,
    invited:
      t.qsUpload ||
      t.status === "invited" ||
      t.status === "opened" ||
      t.status === "submitted",
    qsUpload: t.qsUpload,
    status: t.status,
    submittedAt: t.submittedAt,
    isDraft: false,
    ptcSlot: t.bidderDocs["boq-priceset"],
    coverSlot: t.bidderDocs["cover-letter"],
    fotSlot: t.bidderDocs.fot,
  }
}

// ── small presentational / formatting helpers ─────────────────────────────
function fmtMoney(cents: string | number): string {
  return (Number(cents) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
function fmtInt(n: number): string {
  return n.toLocaleString()
}
function fmtDay(d: Date | null): string {
  if (!d) return "—"
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
}
/** Maps a tenderer status to the roster status chip tone + label. */
function statusChip(t: Tenderer): { tone: "good" | "warn" | "neut"; label: string } {
  switch (t.status) {
    case "submitted":
      return { tone: "good", label: "Submitted" }
    case "opened":
      return { tone: "warn", label: t.qsUpload ? "QS upload" : "Opened" }
    case "invited":
      return { tone: "neut", label: "Invited" }
    case "pending":
      return { tone: "neut", label: "Pending" }
    case "draft":
      return { tone: "neut", label: "Draft" }
    default:
      return { tone: "neut", label: String(t.status) }
  }
}

function PillTabs({
  active,
  onChange,
}: {
  active: Tab
  onChange: (t: Tab) => void
}) {
  return (
    <div className="bg-[#d9d9d9] flex h-[32px] items-start p-[4px] rounded-[50px]">
      {[
        { key: "excel" as const, label: "Upload Excel list" },
        { key: "manual" as const, label: "Manual entry" },
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

function ExcelUploadPanel() {
  return (
    <div className="flex flex-col items-center justify-center w-[480px] mx-auto">
      <div className="flex flex-col gap-[16px] items-start w-full">
        <div className="flex flex-col gap-[8px] items-start">
          <div className="relative flex flex-col h-[128px] items-start w-[480px]">
            <div className="flex flex-1 flex-col gap-[16px] items-center justify-center w-full relative">
              <div className="absolute inset-0 bg-[rgba(226,237,247,0.5)] border border-[#b9d2eb] border-dashed rounded-[8px]" />
              <CloudUpload className="size-[24px] text-[#142845] relative" />
              <p className="font-light text-black text-[12px] leading-[16px] text-center relative">
                Upload Tender Excel List
              </p>
            </div>
          </div>
          <p className="font-normal text-[#656565] text-[12px] leading-[16px] w-[480px]">
            The excel should have the columns: Company name, Trade name,
            Contact, Email, City, Country.
          </p>
        </div>
        <div className="flex items-start w-full">
          <a
            href="/procurex/api/templates/tenderer"
            download="tenderer-template.xlsx"
            className="border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px] hover:bg-[#f5f5f7]"
          >
            <Download className="size-[16px] text-[#142845]" />
            <span className="font-normal text-[#142845] text-[12px] leading-[16px] whitespace-nowrap">
              Download Excel Template
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}

function FormField({
  label,
  required,
  placeholder,
  value,
  onChange,
}: {
  label: string
  required?: boolean
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  const filled = value !== ""
  return (
    <div className="flex flex-col gap-[4px] items-start w-[256px]">
      <p className="font-normal text-[#434343] text-[12px] leading-[16px] whitespace-nowrap">
        {required && <span className="text-[#c32a4f]">* </span>}
        {label}
      </p>
      <div
        className={`bg-white border flex h-[44px] items-center justify-between px-[16px] rounded-[8px] w-full ${
          filled ? "border-[#142845]" : "border-[#d9d9d9]"
        }`}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent text-[14px] leading-[24px] focus:outline-none placeholder:italic placeholder:text-[#555] ${
            filled ? "not-italic text-[#262626]" : "italic text-[#555]"
          }`}
          style={{ fontFamily: "Inter, sans-serif" }}
        />
        {filled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-[8px] flex items-center justify-center"
            aria-label={`Clear ${label}`}
          >
            <X className="size-[16px] text-[#555]" />
          </button>
        )}
      </div>
    </div>
  )
}

function DocumentUploadRow({
  label,
  buttonLabel,
  accept,
  onPick,
  onPrimaryClick,
  onDiscard,
  status,
  statusTone,
  disabled,
}: {
  label: string
  buttonLabel: string
  accept?: string
  /** Called when the user picks a NEW file from the picker. */
  onPick?: (file: File) => void
  /** Called when the primary button is clicked WITHOUT the file picker
   *  (e.g. "Review" button on a row that's already uploaded). When set,
   *  this takes precedence over opening the file picker. */
  onPrimaryClick?: () => void
  /** When set, a small trash button appears next to the primary action
   *  that lets the user discard the current upload and start over. */
  onDiscard?: () => void
  status?: string | null
  statusTone?: "neutral" | "good" | "warn"
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const toneClass =
    statusTone === "good"
      ? "text-emerald-700"
      : statusTone === "warn"
        ? "text-amber-700"
        : "text-[#666]"
  return (
    <div className="flex items-center gap-[16px]">
      <div className="bg-[#e2edf7] flex flex-1 min-h-[40px] items-center px-[16px] py-[6px] rounded-[8px]">
        <div className="flex flex-col gap-[2px] min-w-0 w-full">
          <span className="font-medium text-[#142845] text-[12px] leading-[16px]">
            {label}
          </span>
          {status && (
            <span
              className={`text-[10px] leading-[13px] line-clamp-2 break-words ${toneClass}`}
              title={status}
            >
              {status}
            </span>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? ".pdf,.xlsx"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick?.(file)
          e.target.value = ""
        }}
      />
      <div className="flex items-center gap-[6px] shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (onPrimaryClick) onPrimaryClick()
            else inputRef.current?.click()
          }}
          className="border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CloudUpload className="size-[14px] text-[#142845]" />
          <span className="font-normal text-[#142845] text-[12px] leading-[16px] whitespace-nowrap">
            {buttonLabel}
          </span>
        </button>
        {onDiscard && (
          <button
            type="button"
            onClick={onDiscard}
            title="Discard upload — pick a different file"
            className="size-[32px] rounded-full border border-[#e0e0e0] flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-[#888] hover:text-red-600"
            aria-label="Discard upload"
          >
            <Trash2 className="size-[14px]" />
          </button>
        )}
      </div>
    </div>
  )
}

type PtcStage =
  | { kind: "idle" }
  | { kind: "uploading"; filename: string; percent: number }
  | { kind: "error"; message: string }
  | { kind: "ready-to-review"; documentId: string; filename: string }
  | {
      kind: "applied"
      documentId: string
      filename: string
      matched: number
      unpriced: number
      tenderSumCents: string
    }

function initialPtcStage(slot: Tenderer["ptcSlot"]): PtcStage {
  if (!slot) return { kind: "idle" }
  if (slot.appliedSubmission) {
    return {
      kind: "applied",
      documentId: slot.documentId,
      filename: slot.filename,
      matched: slot.appliedSubmission.pricedItems + slot.appliedSubmission.unpricedItems,
      unpriced: slot.appliedSubmission.unpricedItems,
      tenderSumCents: slot.appliedSubmission.tenderSumCents,
    }
  }
  return {
    kind: "ready-to-review",
    documentId: slot.documentId,
    filename: slot.filename,
  }
}

function DocumentUploadPanel({
  workspaceId,
  projectId,
  tendererId,
  tendererName,
  initialPtcSlot,
}: {
  workspaceId: string
  projectId: string
  tendererId: string
  tendererName: string
  initialPtcSlot: Tenderer["ptcSlot"]
}) {
  const [open, setOpen] = useState(true)
  const [ptcStage, setPtcStage] = useState<PtcStage>(() =>
    initialPtcStage(initialPtcSlot),
  )
  const [reviewOpen, setReviewOpen] = useState(false)

  async function uploadPtc(file: File) {
    setPtcStage({ kind: "uploading", filename: file.name, percent: 0 })
    try {
      const handle = await requestDocumentUpload({
        workspaceId,
        projectId,
        targetKind: "tenderer",
        targetId: tendererId,
        scope: "bidder_submission",
        category: "Priced BOQ",
        filename: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
      })
      await uploadFileLocally({
        documentId: handle.documentId,
        file,
        onProgress: (p) =>
          setPtcStage({ kind: "uploading", filename: file.name, percent: p }),
      })
      setPtcStage({
        kind: "ready-to-review",
        documentId: handle.documentId,
        filename: file.name,
      })
      setReviewOpen(true)
    } catch (err) {
      setPtcStage({
        kind: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      })
    }
  }

  const ptcStatus =
    ptcStage.kind === "uploading"
      ? `${ptcStage.filename} · ${ptcStage.percent}%`
      : ptcStage.kind === "ready-to-review"
        ? `${ptcStage.filename} · ready to review`
        : ptcStage.kind === "applied"
          ? `✓ ${ptcStage.matched} matched · ${ptcStage.unpriced} unpriced · AED ${(
              Number(ptcStage.tenderSumCents) / 100
            ).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : ptcStage.kind === "error"
            ? `Error: ${ptcStage.message}`
            : null

  return (
    <div className="bg-white border border-[#e9e9e9] flex flex-col gap-[16px] items-start p-[16px] rounded-[16px] w-[400px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <span className="font-semibold text-[#141414] text-[14px] leading-[20px]">
          Document Upload
        </span>
        {open ? (
          <ChevronUp className="size-[16px] text-[#142845]" />
        ) : (
          <ChevronDown className="size-[16px] text-[#142845]" />
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-[12px] w-full">
          <DocumentUploadRow
            label="PTC / Pricing schedule"
            buttonLabel={
              ptcStage.kind === "ready-to-review"
                ? "Review"
                : ptcStage.kind === "applied"
                  ? "Re-upload"
                  : "Upload PTC"
            }
            accept=".xlsx"
            // When already uploaded (ready-to-review), the primary
            // button opens the review modal instead of the picker.
            onPrimaryClick={
              ptcStage.kind === "ready-to-review"
                ? () => setReviewOpen(true)
                : undefined
            }
            // When ready to review, the picker (called via onPick) also
            // means "swap to a different file" — discard the current
            // one, then upload the new pick.
            onPick={(file) => {
              if (ptcStage.kind === "ready-to-review") {
                const oldId = ptcStage.documentId
                setReviewOpen(false)
                setPtcStage({
                  kind: "uploading",
                  filename: file.name,
                  percent: 0,
                })
                void discardTendererUpload(oldId).catch(() => {})
                void uploadPtc(file)
              } else {
                void uploadPtc(file)
              }
            }}
            onDiscard={
              ptcStage.kind === "ready-to-review"
                ? async () => {
                    const id = ptcStage.documentId
                    setReviewOpen(false)
                    setPtcStage({ kind: "idle" })
                    try {
                      await discardTendererUpload(id)
                    } catch {
                      /* best-effort */
                    }
                  }
                : undefined
            }
            status={ptcStatus}
            statusTone={
              ptcStage.kind === "applied"
                ? "good"
                : ptcStage.kind === "ready-to-review"
                  ? "warn"
                  : ptcStage.kind === "error"
                    ? "warn"
                    : "neutral"
            }
            disabled={ptcStage.kind === "uploading"}
          />
          <DocumentUploadRow
            label="Cover Letter"
            buttonLabel="Upload Cover Letter"
            accept=".pdf"
          />
          <DocumentUploadRow
            label="Form of Tender (FOT)"
            buttonLabel="Upload FOT"
            accept=".pdf"
          />
        </div>
      )}
      {reviewOpen && ptcStage.kind === "ready-to-review" && (
        <TendererSubmissionReviewModal
          documentId={ptcStage.documentId}
          tendererId={tendererId}
          tendererName={tendererName}
          onClose={() => setReviewOpen(false)}
          onApplied={(summary) => {
            const cur = ptcStage
            const documentId =
              cur.kind === "ready-to-review" ? cur.documentId : ""
            const filename =
              cur.kind === "ready-to-review" ? cur.filename : ""
            setReviewOpen(false)
            setPtcStage({
              kind: "applied",
              documentId,
              filename,
              matched: summary.matched,
              unpriced: summary.unpriced,
              tenderSumCents: summary.tenderSumCents,
            })
          }}
        />
      )}
    </div>
  )
}

function TendererCard({
  tenderer,
  workspaceId,
  projectId,
  onUpdate,
  onDelete,
  onInvite,
  onQSUpload,
  onResendInvite,
}: {
  tenderer: Tenderer
  workspaceId: string
  projectId: string
  onUpdate: (patch: Partial<Tenderer>) => void
  onDelete: () => void
  onInvite: () => void
  onQSUpload: () => void
  onResendInvite: () => void
}) {
  const canInvite =
    tenderer.companyName.trim() !== "" &&
    tenderer.contactEmail.trim() !== "" &&
    tenderer.contactName.trim() !== ""

  return (
    <div className="bg-[#f5f5f7] flex flex-col gap-[24px] p-[24px] rounded-[16px] w-full">
      <div className="flex items-start justify-between">
        <div className="bg-[#142845] flex items-center justify-center px-[12px] py-[6px] rounded-[8px]">
          <span
            className="font-medium text-white text-[12px] leading-[16px]"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            {tenderer.code || "New"}
          </span>
        </div>
        {tenderer.invited && (
          <div className="flex gap-[8px] items-center">
            <button
              type="button"
              onClick={onDelete}
              className="border border-[#d9d9d9] flex gap-[6px] h-[32px] items-center justify-center px-[12px] py-[8px] rounded-[16px] bg-white"
            >
              <Trash2 className="size-[14px] text-[#262626]" />
              <span className="font-normal text-[#262626] text-[12px] leading-[16px]">
                Delete
              </span>
            </button>
            <button
              type="button"
              className="border border-[#d9d9d9] flex gap-[6px] h-[32px] items-center justify-center px-[12px] py-[8px] rounded-[16px] bg-white"
            >
              <Pencil className="size-[14px] text-[#262626]" />
              <span className="font-normal text-[#262626] text-[12px] leading-[16px]">
                Edit
              </span>
            </button>
            <button
              type="button"
              onClick={onResendInvite}
              className="border border-[#d9d9d9] flex gap-[6px] h-[32px] items-center justify-center px-[12px] py-[8px] rounded-[16px] bg-white"
            >
              <Send className="size-[14px] text-[#262626]" />
              <span className="font-normal text-[#262626] text-[12px] leading-[16px]">
                Re-send invite
              </span>
            </button>
            <div className="bg-emerald-50 border border-emerald-200 flex gap-[6px] h-[32px] items-center justify-center px-[12px] py-[8px] rounded-[16px]">
              <CircleCheck className="size-[14px] text-emerald-500 fill-emerald-500 stroke-white" />
              <span className="font-medium text-emerald-700 text-[12px] leading-[16px]">
                Invite sent
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-[24px]">
        <div className="flex flex-col gap-[16px]">
          <FormField
            label="Company name"
            required
            placeholder=""
            value={tenderer.companyName}
            onChange={(v) => onUpdate({ companyName: v })}
          />
          <FormField
            label="Contact email"
            required
            placeholder="Enter placeholder text here"
            value={tenderer.contactEmail}
            onChange={(v) => onUpdate({ contactEmail: v })}
          />
          <FormField
            label={tenderer.invited ? "Contact Name" : "Contact name"}
            required
            placeholder="Enter contact name"
            value={tenderer.contactName}
            onChange={(v) => onUpdate({ contactName: v })}
          />
        </div>

        {tenderer.invited ? (
          <DocumentUploadPanel
            workspaceId={workspaceId}
            projectId={projectId}
            tendererId={tenderer.id}
            tendererName={tenderer.companyName || tenderer.code}
            initialPtcSlot={tenderer.ptcSlot}
          />
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {!tenderer.invited && (
        <div className="flex gap-[12px] items-center justify-end">
          <button
            type="button"
            disabled={!canInvite}
            onClick={onInvite}
            className={`border flex gap-[6px] h-[36px] items-center justify-center px-[16px] py-[8px] rounded-[16px] ${
              canInvite
                ? "border-[#142845] bg-white text-[#142845] cursor-pointer"
                : "border-[#d9d9d9] bg-[#f5f5f7] text-[#a3a3a3] cursor-not-allowed"
            }`}
          >
            <Send className="size-[14px]" />
            <span className="font-normal text-[12px] leading-[16px]">
              Invite tenderer to upload
            </span>
          </button>
          <button
            type="button"
            disabled={!canInvite}
            onClick={onQSUpload}
            className={`border flex gap-[6px] h-[36px] items-center justify-center px-[16px] py-[8px] rounded-[16px] ${
              canInvite
                ? "border-[#142845] bg-white text-[#142845] cursor-pointer"
                : "border-[#d9d9d9] bg-[#f5f5f7] text-[#a3a3a3] cursor-not-allowed"
            }`}
          >
            <Send className="size-[14px]" />
            <span className="font-normal text-[12px] leading-[16px]">
              QS to upload
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Submission intake — the per-tenderer detail panel ───────────────────────
   Renders the selected tenderer's document strip, the applied priced-BOQ
   totals/tiles (bound to its real appliedSubmission), and the existing
   DocumentUploadPanel (PTC upload → review → apply flow, preserved). */
function SubmissionIntake({
  tenderer,
  workspaceId,
  projectId,
}: {
  tenderer: Tenderer
  workspaceId: string
  projectId: string
}) {
  const ptc = tenderer.ptcSlot
  const applied = ptc?.appliedSubmission ?? null
  const priced = applied?.pricedItems ?? null
  const unpriced = applied?.unpricedItems ?? null
  const matched = applied ? applied.pricedItems + applied.unpricedItems : null

  // Document strip — bound to the three real bidder-return slots.
  const docState = (
    slot: Tenderer["ptcSlot"] | Tenderer["coverSlot"] | Tenderer["fotSlot"],
    appliedSlot = false,
  ): SuiteDoc["state"] => {
    if (!slot) return "off"
    if (appliedSlot && ptc?.appliedSubmission) return "on"
    return "rev"
  }
  const docs: SuiteDoc[] = [
    {
      code: "BOQ",
      label: ptc
        ? ptc.appliedSubmission
          ? "Priced BOQ — parsed"
          : "Priced BOQ — review"
        : "Priced BOQ — not provided",
      state: docState(ptc, true),
    },
    {
      code: "FOT",
      label: tenderer.fotSlot
        ? "Form of Tender — extracted · review"
        : "Form of Tender — not provided",
      state: docState(tenderer.fotSlot),
    },
    {
      code: "CL",
      label: tenderer.coverSlot
        ? "Cover letter — extracted · review"
        : "Cover letter — not provided",
      state: docState(tenderer.coverSlot),
    },
  ]

  return (
    <SuitePanel>
      <SecBar title="Submission intake" count="round: Initial" />

      {/* intake-head */}
      <div className="mb-3.5 flex items-center gap-3">
        <CodeBadge>{tenderer.code}</CodeBadge>
        <span className="text-[15px] font-semibold text-suite-ink">
          {tenderer.companyName || tenderer.code}
        </span>
        <span className="text-[12px] text-suite-ink-3">
          {ptc
            ? "document received · re-parsed / extracted server-side"
            : "no documents received yet"}
        </span>
        <span className="flex-1" />
      </div>

      <SuiteDocStrip docs={docs} />

      {/* PRICED BOQ band */}
      <SuiteBand
        code="BOQ"
        title="Priced Bill of Quantities"
        file={ptc?.filename}
        status={
          ptc ? (
            applied ? (
              <SuiteChip tone="good">Parsed</SuiteChip>
            ) : (
              <SuiteChip tone="warn">Ready to review</SuiteChip>
            )
          ) : (
            <SuiteChip tone="neut">Awaiting upload</SuiteChip>
          )
        }
      />

      {applied ? (
        <>
          <SuiteTotals
            items={[
              {
                k: "Tender sum",
                v: fmtMoney(applied.tenderSumCents),
                vs: "sum of priced amounts",
              },
              {
                k: "Matched items",
                v: fmtInt(matched ?? 0),
                vs: `${fmtInt(priced ?? 0)} priced · ${fmtInt(unpriced ?? 0)} unpriced`,
              },
              {
                k: "Unpriced items",
                v: fmtInt(unpriced ?? 0),
                vs: "treatment set in Analysis Config",
                vsTone: (unpriced ?? 0) > 0 ? "dn" : "flat",
              },
            ]}
          />
          <SuiteTiles
            cols={4}
            items={[
              { k: "Priced", v: fmtInt(priced ?? 0), dot: "bg-suite-green" },
              { k: "Unpriced", v: fmtInt(unpriced ?? 0), dot: "bg-suite-amber" },
              { k: "Matched", v: fmtInt(matched ?? 0), dot: "bg-suite-blue" },
              {
                k: "Source",
                v: <span className="text-[11px] font-semibold text-suite-ink-3">{ptc?.filename ?? "—"}</span>,
              },
            ]}
          />
        </>
      ) : (
        <SuiteAINote>
          {ptc ? (
            <>
              <b>Awaiting review.</b> The priced BOQ has been uploaded — open it
              from the roster (Review) to parse and apply the tender sum,
              matched items and unpriced items.
            </>
          ) : (
            <>
              <b>No priced BOQ yet.</b> Upload the tenderer&apos;s priced BOQ
              below to extract the tender sum, matched items and unpriced items.
            </>
          )}
        </SuiteAINote>
      )}

      {/* Document upload — preserves the full PTC upload → review → apply flow. */}
      {tenderer.invited ? (
        <div className="mt-4">
          <DocumentUploadPanel
            workspaceId={workspaceId}
            projectId={projectId}
            tendererId={tenderer.id}
            tendererName={tenderer.companyName || tenderer.code}
            initialPtcSlot={tenderer.ptcSlot}
          />
        </div>
      ) : (
        <div className="mt-4 text-[12px] text-suite-ink-3">
          Invite this tenderer (or flag it for QS upload) to intake their return
          documents.
        </div>
      )}
    </SuitePanel>
  )
}

export function Step3Tenderer({
  workspaceId,
  projectId,
  count,
  onCountChange,
}: {
  workspaceId: string
  projectId: string
  count: number
  onCountChange: (n: number) => void
}) {
  const [tab, setTab] = useState<Tab>("excel")
  const [tenderers, setTenderers] = useState<Tenderer[]>([])
  const [draft, setDraft] = useState<Tenderer | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(projectId))
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [_isPending, startTransition] = useTransition()

  // Initial load — pulls all tenderers (with company + invite + bidder docs) in one round-trip.
  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const rows = await getTenderersForProject(projectId)
        if (cancelled) return
        const mapped = rows.map(fromServer)
        setTenderers(mapped)
        // If at least one tenderer already exists, default to the list view.
        if (mapped.length > 0) setTab("manual")
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tenderers")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const tendererCount = tenderers.length
  useEffect(() => {
    onCountChange(tendererCount)
  }, [tendererCount, onCountChange])

  // Keep the intake selection valid — default to the first tenderer, and drop
  // a selection that points at a removed row.
  useEffect(() => {
    if (tenderers.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }
    if (!selectedId || !tenderers.some((t) => t.id === selectedId)) {
      setSelectedId(tenderers[0]!.id)
    }
  }, [tenderers, selectedId])

  const switchToManual = () => {
    setTab("manual")
    if (!draft && tenderers.length === 0) {
      setDraft(makeDraft())
    }
  }

  const handleAdd = () => {
    if (tab !== "manual") {
      switchToManual()
      return
    }
    if (!draft) {
      setDraft(makeDraft())
    }
  }

  // Commit a draft to the DB — either Invite (status→pending now, email later)
  // or QS-upload mode (status→opened, skip email).
  const commitDraft = (mode: "invite" | "qs") => {
    if (!draft || !projectId) return
    const companyName = draft.companyName.trim()
    const contactName = draft.contactName.trim()
    const contactEmail = draft.contactEmail.trim()
    if (!companyName || !contactName || !contactEmail) return

    setError(null)
    startTransition(async () => {
      const res = await addTendererAction({
        projectId,
        companyName,
        contactName,
        contactEmail,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      // For QS mode, flip the row to qs_upload immediately.
      if (mode === "qs") {
        await markQsUploadAction(res.tendererId)
      }
      // Re-fetch — cheap, one round-trip, and avoids drift.
      const rows = await getTenderersForProject(projectId)
      setTenderers(rows.map(fromServer))
      setDraft(null)
    })
  }

  const updateDraft = (patch: Partial<Tenderer>) => {
    if (!draft) return
    setDraft({ ...draft, ...patch })
  }

  const updateTenderer = (id: string, patch: Partial<Tenderer>) => {
    // Optimistic local edit only — invited rows already have committed details.
    setTenderers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    )
  }

  const deleteTenderer = (id: string) => {
    // Optimistic — drop locally, then soft-delete server-side.
    const prev = tenderers
    setTenderers((p) => p.filter((t) => t.id !== id))
    startTransition(async () => {
      const res = await removeTendererAction(id)
      if (!res.ok) {
        setError(res.error ?? "Failed to remove tenderer")
        setTenderers(prev) // rollback
      }
    })
  }

  const showAdd = tab === "excel" && tendererCount === 0
  const addLabel = showAdd ? "Add" : "Add another tenderer"

  const invitedCount = tenderers.filter((t) => t.invited).length
  const submittedCount = tenderers.filter((t) => t.status === "submitted").length
  const selected = tenderers.find((t) => t.id === selectedId) ?? null

  return (
    <div className="flex flex-col">
      {/* ── ROSTER ─────────────────────────────────────────────────────────── */}
      <SuitePanel first>
        <SecBar
          title="Tenderer roster"
          count={
            tendererCount > 0
              ? `${invitedCount} invited · ${submittedCount} submitted`
              : "no tenderers yet"
          }
          actions={
            <>
              <SuiteButton
                onClick={handleAdd}
                {...(tab === "manual" && draft !== null
                  ? { className: "opacity-50 pointer-events-none" }
                  : {})}
              >
                <UserPlus className="size-3.5" />
                {addLabel}
              </SuiteButton>
            </>
          }
        />

        <p className="mb-4 max-w-[680px] text-[12px] text-suite-ink-3">
          Add the companies invited to this tender. Here you will find all their
          tender return documents like PTC, Form of Tender and Cover Letter.
        </p>

        <div className="mb-4">
          <PillTabs active={tab} onChange={setTab} />
        </div>

        {error && (
          <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-6 text-[12px] text-suite-ink-3">
            Loading tenderers…
          </div>
        )}

        {!loading && tab === "excel" && tendererCount === 0 && (
          <ExcelUploadPanel />
        )}

        {!loading && tendererCount > 0 && (
          <SuiteTable>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Tenderer</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "10%" }}>Submitted</th>
                  <th>Intake</th>
                  <th className="r" style={{ width: "16%" }}>
                    Tender sum
                  </th>
                  <th className="r" style={{ width: "13%" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenderers.map((t) => {
                  const sc = statusChip(t)
                  const applied = t.ptcSlot?.appliedSubmission ?? null
                  const matched = applied
                    ? applied.pricedItems + applied.unpricedItems
                    : null
                  const isSel = t.id === selectedId
                  const intakeParts: MiniStatPart[] | null = applied
                    ? [
                        { n: fmtInt(matched ?? 0), label: "matched" },
                        { n: fmtInt(applied.pricedItems), label: "priced" },
                        {
                          n: fmtInt(applied.unpricedItems),
                          label: "unpriced",
                          tone: applied.unpricedItems > 0 ? "warn" : undefined,
                        },
                      ]
                    : null
                  // Has an uploaded-but-not-yet-applied priced BOQ?
                  const awaitingReview = Boolean(t.ptcSlot) && !applied
                  return (
                    <tr
                      key={t.id}
                      className={isSel ? "bg-suite-blue-soft" : undefined}
                    >
                      <td>
                        <RosterWho
                          code={t.code}
                          name={t.companyName || "—"}
                          meta={
                            [t.country, t.city].filter(Boolean).join(" · ") ||
                            undefined
                          }
                        />
                      </td>
                      <td>
                        <SuiteChip tone={sc.tone}>{sc.label}</SuiteChip>
                      </td>
                      <td
                        className="suite-num"
                        style={{ color: "var(--color-suite-ink-2)", fontSize: 11.5 }}
                      >
                        {fmtDay(t.submittedAt)}
                      </td>
                      <td>
                        {intakeParts ? (
                          <MiniStat parts={intakeParts} />
                        ) : awaitingReview ? (
                          <SuiteMiss>Uploaded · awaiting review</SuiteMiss>
                        ) : t.invited ? (
                          <SuiteMiss>Awaiting submission</SuiteMiss>
                        ) : (
                          <SuiteMiss>Not invited</SuiteMiss>
                        )}
                      </td>
                      <td className="r">
                        {applied ? (
                          <span className="suite-num text-[13.5px] font-semibold text-suite-ink">
                            {fmtMoney(applied.tenderSumCents)}
                          </span>
                        ) : (
                          <span className="text-suite-ink-4">—</span>
                        )}
                      </td>
                      <td className="r">
                        <div className="flex justify-end">
                          <SuiteButton
                            size="sm"
                            variant={isSel ? "dark" : "default"}
                            onClick={() => setSelectedId(t.id)}
                          >
                            {isSel
                              ? "Reviewing"
                              : t.invited
                                ? "Review"
                                : "Open"}
                          </SuiteButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </SuiteTable>
        )}

        {!loading && tendererCount === 0 && tab === "manual" && (
          <div className="py-2 text-[12px] text-suite-ink-3">
            No tenderers yet — add one below.
          </div>
        )}
      </SuitePanel>

      {/* ── EDITOR — manual entry / draft cards (full invite + QS-upload flow) ── */}
      {!loading && (tab === "manual" || tendererCount > 0) && (
        <SuitePanel>
          <SecBar
            title="Tenderer"
            count={`${tendererCount} tenderer${tendererCount === 1 ? "" : "s"}`}
          />
          <div className="flex flex-col gap-[16px] w-full">
            {tenderers.map((t) => (
              <TendererCard
                key={t.id}
                tenderer={t}
                workspaceId={workspaceId}
                projectId={projectId}
                onUpdate={(patch) => updateTenderer(t.id, patch)}
                onDelete={() => deleteTenderer(t.id)}
                onInvite={() => {
                  // TODO Phase D — magic-link email send
                  setError("Invite emails are not wired yet (Phase D).")
                }}
                onQSUpload={() => {
                  // Convert an already-invited row to QS-upload? Not yet —
                  // this button only fires on the draft card below.
                }}
                onResendInvite={() => {
                  setError("Re-send invite is not wired yet (Phase D).")
                }}
              />
            ))}
            {draft && (
              <TendererCard
                tenderer={draft}
                workspaceId={workspaceId}
                projectId={projectId}
                onUpdate={updateDraft}
                onDelete={() => setDraft(null)}
                onInvite={() => commitDraft("invite")}
                onQSUpload={() => commitDraft("qs")}
                onResendInvite={() => {}}
              />
            )}
          </div>
        </SuitePanel>
      )}

      {/* ── SUBMISSION INTAKE — selected tenderer's documents + parsed totals ── */}
      {!loading && selected && (
        <SubmissionIntake
          tenderer={selected}
          workspaceId={workspaceId}
          projectId={projectId}
        />
      )}
    </div>
  )
}

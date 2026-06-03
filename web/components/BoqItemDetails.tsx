"use client";

import { X, Copy, ClipboardCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { fmtINR } from "@/lib/demoBoq";

export interface BoqDetailItem {
  code: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  version?: string;
  trade?: string;
  sheetName?: string;
  pomiCode?: string;
  ref?: string;
  measurement?: string;
  pomiSection?: string;
  pomiSubSection?: string;
  nrm?: string;
  nrmDescription?: string;
  stage?: string;
  confidence?: number;
  flag?: string;
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
  revisions?: { version: string; updatedAt: string; by: string; note: string; current?: boolean }[];
  approval?: {
    status: "Approved" | "Pending" | "Rejected";
    onTrack: boolean;
    by: string;
    role: string;
    at: string;
  };
}

const STAGE_COLOR: Record<string, string> = {
  Rule:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  Fuzzy: "bg-amber-100 text-amber-800 border-amber-200",
  AI:    "bg-blue-100 text-blue-800 border-blue-200",
};

interface Props {
  item: BoqDetailItem | null;
  onClose: () => void;
}

export function BoqItemDetails({ item, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  if (!item) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <aside className="w-[300px] shrink-0 bg-white border border-zinc-200 rounded-xl flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
        <span className="text-sm font-semibold text-zinc-900">Item Details</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="size-7 inline-flex items-center justify-center rounded-md hover:bg-zinc-100"
        >
          <X className="size-4 text-zinc-500" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        <Field label="Item Code">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-900 font-mono">{item.code}</span>
            <button
              type="button"
              onClick={copy}
              className="size-6 inline-flex items-center justify-center rounded hover:bg-zinc-100"
              aria-label="Copy"
            >
              {copied ? (
                <ClipboardCheck className="size-3.5 text-emerald-600" strokeWidth={2} />
              ) : (
                <Copy className="size-3.5 text-zinc-500" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </Field>

        <Field label="Description">
          <span className="text-sm text-zinc-900 leading-snug">{item.description}</span>
        </Field>

        {(item.pomiSection || item.trade) && (
          <Field label="POMI Section">
            <span className="text-sm text-zinc-900">{item.pomiSection || item.trade}</span>
          </Field>
        )}

        {item.pomiSubSection && (
          <Field label="POMI Sub Section">
            <span className="text-sm text-zinc-900">{item.pomiSubSection}</span>
          </Field>
        )}

        {(item.nrm || item.nrmDescription) && (
          <Field label="NRM">
            <div className="text-sm text-zinc-900">
              {item.nrm}
              {item.nrmDescription ? (
                <span className="text-zinc-500"> · {item.nrmDescription}</span>
              ) : null}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Unit">
            <span className="text-sm text-zinc-900">{item.unit || "—"}</span>
          </Field>
          <Field label="Quantity">
            <span className="text-sm text-zinc-900 tabular-nums">
              {item.quantity
                ? item.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })
                : "—"}
            </span>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Rate (₹)">
            <span className="text-sm text-zinc-900 tabular-nums">
              {item.rate ? fmtINR(item.rate, false) : "—"}
            </span>
          </Field>
          <Field label="Amount (₹)">
            <span className="text-base font-semibold text-zinc-900 tabular-nums">
              {item.amount ? fmtINR(item.amount, false) : "—"}
            </span>
          </Field>
        </div>

        {(item.stage || item.confidence) && (
          <div className="border-t border-zinc-100 pt-4">
            <div className="text-xs font-semibold text-zinc-900 mb-2.5">
              Coding Confidence
            </div>
            <div className="flex items-center gap-3">
              {item.stage && (
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
                    STAGE_COLOR[item.stage] ?? "bg-zinc-100 text-zinc-700 border-zinc-200",
                  )}
                >
                  {item.stage}
                </span>
              )}
              {item.confidence ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full",
                        item.confidence >= 70
                          ? "bg-emerald-500"
                          : item.confidence >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500",
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, item.confidence))}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-600 tabular-nums">
                    {Math.round(item.confidence)}%
                  </span>
                </div>
              ) : null}
              {item.flag === "⚠" && (
                <AlertTriangle className="size-4 text-amber-600" strokeWidth={2} />
              )}
            </div>
          </div>
        )}

        {item.version && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Version">
              <span className="text-sm text-zinc-900">{item.version}</span>
            </Field>
            {item.lastUpdatedAt && (
              <Field label="Last Updated">
                <div className="text-xs text-zinc-900 leading-tight">{item.lastUpdatedAt}</div>
                {item.lastUpdatedBy && (
                  <div className="text-[11px] text-zinc-500">by {item.lastUpdatedBy}</div>
                )}
              </Field>
            )}
          </div>
        )}

        {item.revisions && item.revisions.length > 0 && (
          <div className="border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-zinc-900">Revision Notes</span>
              <button type="button" className="text-[11px] text-zinc-500 hover:text-zinc-900">
                View all
              </button>
            </div>
            <ul className="space-y-3">
              {item.revisions.map((r, i) => (
                <li key={i}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-900">{r.version}</span>
                    {r.current && (
                      <span className="text-[10px] font-medium text-zinc-700 bg-zinc-100 rounded-md px-1.5 py-0.5">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {r.updatedAt} · by {r.by}
                  </div>
                  <div className="text-[11px] text-zinc-700 mt-1">{r.note}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.approval && (
          <div className="border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-zinc-900">Approval Status</span>
              {item.approval.onTrack && (
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5">
                  On Track
                </span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2
                className={cn(
                  "size-4 mt-0.5",
                  item.approval.status === "Approved" ? "text-emerald-600" : "text-zinc-400",
                )}
                strokeWidth={2}
              />
              <div className="leading-tight">
                <div className="text-xs font-medium text-zinc-900">{item.approval.status}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{item.approval.at}</div>
                <div className="text-[11px] text-zinc-500">
                  by {item.approval.by} ({item.approval.role})
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-zinc-500 mb-0.5">
        {label}
      </div>
      {children}
    </div>
  );
}

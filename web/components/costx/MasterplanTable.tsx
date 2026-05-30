"use client";

import Link from "next/link";
import { Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { formatNumber, formatDate } from "@/utils/formatters";
import { cn } from "@/lib/cn";
import type { MasterplanEstimate } from "@/types/masterplan";

interface Props {
  estimates: MasterplanEstimate[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function MasterplanTable({
  estimates,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: Props) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-20">
        <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
          <th className="text-left font-medium px-4 py-2.5 min-w-[320px]">
            <span className="inline-flex items-center gap-1">
              Masterplan Estimate
              <ArrowUpDown className="size-3" strokeWidth={1.75} />
            </span>
          </th>
          <th className="text-right font-medium px-4 py-2.5">
            Initial Budget
          </th>
          <th className="text-right font-medium px-4 py-2.5">
            Gross Land Area&nbsp;(m²)
          </th>
          <th className="text-center font-medium px-4 py-2.5">Team</th>
          <th className="text-right font-medium px-4 py-2.5">Target FAR</th>
          <th className="text-center font-medium px-4 py-2.5">Status</th>
          <th className="text-center font-medium px-4 py-2.5">Base Date</th>
          <th className="w-[100px] px-4 py-2.5" />
        </tr>
      </thead>
      <tbody>
        {estimates.map((estimate, index) => (
          <tr
            key={estimate.id}
            className={cn(
              "hover:bg-zinc-50",
              index !== estimates.length - 1 && "border-b border-zinc-100",
            )}
          >
            <td className="px-4 py-3 align-middle">
              <div className="flex flex-col gap-0.5 min-h-[40px] justify-center">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/costx/${estimate.id}`}
                    className="text-zinc-900 font-medium hover:underline"
                  >
                    {estimate.name}
                  </Link>
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-600 rounded">
                    {estimate.currency}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-zinc-900 text-white rounded">
                    {estimate.numberOfPhases}{" "}
                    {estimate.numberOfPhases === 1 ? "Phase" : "Phases"}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 line-clamp-1 h-4">
                  {estimate.description || " "}
                </span>
              </div>
            </td>

            <td className="px-4 py-3 text-right tabular-nums">
              {formatNumber(estimate.initialBudget)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatNumber(estimate.grossLandArea)}
            </td>

            <td className="px-4 py-3">
              <div className="flex justify-center -space-x-1.5">
                {/* Development Manager — primary avatar */}
                {estimate.developmentManager && (
                  <Avatar
                    label={initials(estimate.developmentManager)}
                    title={`${estimate.developmentManager} (Manager)`}
                    tone="primary"
                    z={10}
                  />
                )}
                {/* Team members */}
                {estimate.members?.slice(0, 3).map((member, idx) => (
                  <Avatar
                    key={member.id}
                    label={initials(member.name)}
                    title={`${member.name} (${member.role})`}
                    tone="muted"
                    z={9 - idx}
                  />
                ))}
                {estimate.members && estimate.members.length > 3 && (
                  <Avatar
                    label={`+${estimate.members.length - 3}`}
                    title={`${estimate.members.length - 3} more members`}
                    tone="ghost"
                  />
                )}
              </div>
            </td>

            <td className="px-4 py-3 text-right tabular-nums">
              {estimate.targetFAR?.toFixed(3) || "—"}
            </td>

            <td className="px-4 py-3 text-center">
              <StatusPill status={estimate.status} />
            </td>

            <td className="px-4 py-3 text-center text-zinc-700">
              {formatDate(estimate.baseDate)}
            </td>

            <td className="px-4 py-3">
              <div className="flex items-center justify-center gap-1">
                {canEdit && (
                  <IconButton
                    label="Edit"
                    onClick={() => onEdit?.(estimate.id)}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                )}
                {canDelete && (
                  <IconButton
                    label="Delete"
                    variant="danger"
                    onClick={() => onDelete?.(estimate.id)}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </IconButton>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function initials(s: string): string {
  return s
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({
  label,
  title,
  tone,
  z,
}: {
  label: string;
  title: string;
  tone: "primary" | "muted" | "ghost";
  z?: number;
}) {
  return (
    <div
      title={title}
      style={{ zIndex: z }}
      className={cn(
        "size-7 rounded-full inline-flex items-center justify-center text-[10.5px] font-medium border-2 border-white",
        tone === "primary" && "bg-zinc-900 text-white",
        tone === "muted" && "bg-zinc-400 text-white",
        tone === "ghost" && "bg-zinc-200 text-zinc-600",
      )}
    >
      {label}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const c =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "DRAFT"
        ? "bg-zinc-100 text-zinc-700 border-zinc-200"
        : status === "ARCHIVED"
          ? "bg-zinc-100 text-zinc-500 border-zinc-200"
          : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span
      className={cn(
        "text-[10px] font-medium rounded-md px-1.5 py-0.5 border tracking-wide",
        c,
      )}
    >
      {status}
    </span>
  );
}

function IconButton({
  children,
  onClick,
  label,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "size-7 inline-flex items-center justify-center rounded-md transition-colors",
        variant === "danger"
          ? "text-zinc-500 hover:bg-rose-50 hover:text-rose-700"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
      )}
    >
      {children}
    </button>
  );
}

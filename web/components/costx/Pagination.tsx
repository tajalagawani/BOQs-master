"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  currentPage: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
}

function pageWindow(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, 5];
  if (current >= total - 2)
    return [total - 4, total - 3, total - 2, total - 1, total];
  return [current - 2, current - 1, current, current + 1, current + 2];
}

export default function Pagination({
  currentPage,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(totalRecords, currentPage * pageSize);

  return (
    <div className="border-t border-zinc-200 px-4 py-2.5 flex items-center justify-between text-[11px] text-zinc-600 shrink-0">
      <div>
        Showing {start} – {end} of {totalRecords}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 px-2 bg-white border border-zinc-200 rounded text-xs"
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-0.5">
          <PageBtn disabled={currentPage === 1} onClick={() => onPageChange(1)}>
            <ChevronsLeft className="size-3.5" />
          </PageBtn>
          <PageBtn
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="size-3.5" />
          </PageBtn>
          {pageWindow(currentPage, totalPages).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "size-7 inline-flex items-center justify-center rounded text-xs",
                p === currentPage
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100",
              )}
            >
              {p}
            </button>
          ))}
          <PageBtn
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="size-3.5" />
          </PageBtn>
          <PageBtn
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
          >
            <ChevronsRight className="size-3.5" />
          </PageBtn>
        </div>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="size-7 inline-flex items-center justify-center rounded hover:bg-zinc-100 disabled:text-zinc-300 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

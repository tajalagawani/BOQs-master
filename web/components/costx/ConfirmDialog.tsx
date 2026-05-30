"use client";

import { useEffect } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md">
        <div className="flex items-start gap-3 px-5 pt-5">
          <div
            className={cn(
              "size-9 rounded-full inline-flex items-center justify-center shrink-0",
              variant === "danger"
                ? "bg-rose-100 text-rose-700"
                : "bg-zinc-100 text-zinc-700",
            )}
          >
            <AlertTriangle className="size-4" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-zinc-900">{title}</div>
            <div className="text-sm text-zinc-500 mt-1">{description}</div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="size-8 inline-flex items-center justify-center rounded-md hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9 px-4 rounded-xl bg-white border border-zinc-200 hover:border-zinc-400 text-sm font-medium text-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "h-9 px-4 rounded-xl text-sm font-medium inline-flex items-center gap-2 text-white",
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-zinc-900 hover:bg-zinc-800",
              loading && "opacity-70 cursor-not-allowed",
            )}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

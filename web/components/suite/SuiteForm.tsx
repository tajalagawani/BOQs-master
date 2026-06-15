/**
 * 10X Suite — form atoms.
 * Suite-token styled inputs for the ioProcure setup/config steps (the refs don't
 * cover forms). Field-cell-agnostic: they fill their container and the parent
 * grid handles responsiveness.
 */
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const FIELD =
  "w-full rounded-lg border border-suite-line bg-white px-3 text-[13px] text-suite-ink outline-none transition-colors placeholder:text-suite-ink-4 focus:border-suite-navy focus:ring-2 focus:ring-suite-navy/10 disabled:opacity-50";

export function SuiteInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, "h-9", className)} {...props} />;
}

export function SuiteTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, "min-h-[80px] py-2 leading-relaxed", className)} {...props} />;
}

export function SuiteSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, "h-9", className)} {...props}>
      {children}
    </select>
  );
}

/** Label + control + hint/error wrapper. */
export function SuiteField({
  label,
  hint,
  error,
  className,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      {label && <span className="text-[12px] font-medium text-suite-ink-2">{label}</span>}
      {children}
      {error ? (
        <span className="text-[11px] text-suite-dang">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-suite-ink-4">{hint}</span>
      ) : null}
    </label>
  );
}

import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * InputShell — bordered container wrapping a form control's editable area.
 * Ported verbatim from iox-website (src/components/ui/input-shell.tsx); only the
 * `cn` import path is adapted to this app (@/lib/cn).
 */
export type InputShellProps = ComponentProps<"div"> & {
  /** Optional leading adornment rendered before content. */
  leading?: ReactNode;
  /** Optional trailing adornment rendered after content. */
  trailing?: ReactNode;
};

export function InputShell({
  className,
  leading,
  trailing,
  children,
  ...props
}: InputShellProps) {
  return (
    <div
      className={cn(
        "flex h-[48px] w-full items-center gap-[8px] rounded-[16px] border border-[#7b7b7b] bg-white px-[16px]",
        "transition-colors focus-within:border-pagent",
        className,
      )}
      {...props}
    >
      {leading}
      {children}
      {trailing}
    </div>
  );
}

export default InputShell;

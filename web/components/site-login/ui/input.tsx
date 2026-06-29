import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { FieldLabel } from "./field-label";
import { InputShell } from "./input-shell";

/**
 * Input — single-line text field. Ported verbatim from iox-website
 * (src/components/ui/input.tsx); only the `cn` import path is adapted (@/lib/cn).
 */
export type InputProps = Omit<ComponentProps<"input">, "id"> & {
  /** Caption rendered above the box. Omit for a bare field. */
  label?: ReactNode;
  /** Render the "* " required marker in the label. */
  required?: boolean;
  /** Associates the label and input; also used as the input id. */
  id?: string;
  /** Classes for the outer wrapper (label + box stack). */
  wrapperClassName?: string;
  /** Classes for the InputShell box. */
  shellClassName?: string;
  /** Leading adornment inside the box (e.g. a glyph). */
  leadingIcon?: ReactNode;
  /** Trailing adornment inside the box. */
  trailing?: ReactNode;
};

export function Input({
  label,
  required,
  id,
  className,
  wrapperClassName,
  shellClassName,
  leadingIcon,
  trailing,
  ...props
}: InputProps) {
  return (
    <div className={cn("flex w-full flex-col gap-[8px]", wrapperClassName)}>
      {label ? (
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
      ) : null}
      <InputShell className={shellClassName} leading={leadingIcon} trailing={trailing}>
        <input
          id={id}
          required={required}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent text-[14px] font-normal leading-[24px] text-neutral-800 caret-neutral-800 outline-none",
            "placeholder:italic placeholder:text-neutral-600",
            className,
          )}
          {...props}
        />
      </InputShell>
    </div>
  );
}

export default Input;

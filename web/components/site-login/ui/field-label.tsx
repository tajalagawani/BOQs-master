import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/**
 * FieldLabel — small caption above a form control. Ported verbatim from
 * iox-website (src/components/ui/field-label.tsx); only the `cn` import path is
 * adapted to this app (@/lib/cn).
 */
export type FieldLabelProps = ComponentProps<"label"> & {
  /** Prepend the "* " required marker, matching the Figma copy. */
  required?: boolean;
};

export function FieldLabel({
  required = false,
  className,
  children,
  ...props
}: FieldLabelProps) {
  return (
    <label
      className={cn(
        "block w-fit text-[12px] font-normal leading-[16px] text-neutral-700",
        className,
      )}
      {...props}
    >
      {required ? <span aria-hidden>* </span> : null}
      {children}
    </label>
  );
}

export default FieldLabel;

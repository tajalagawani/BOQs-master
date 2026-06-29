import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Heading — Poppins display type from the IOX Figma "Headings" scale.
 * Ported verbatim from iox-website (src/components/ui/heading.tsx); only the
 * `cn` import path is adapted to this app (@/lib/cn).
 */
const headingVariants = cva(
  "font-[family-name:var(--font-poppins)] text-pagent",
  {
    variants: {
      variant: {
        h3: "text-[40px] font-semibold leading-[64px] max-sm:text-[28px] max-sm:leading-[40px]",
        subtitle1:
          "text-[32px] font-semibold leading-[48px] max-sm:text-[24px] max-sm:leading-[36px]",
        subtitle2:
          "text-[24px] font-bold leading-[40px] tracking-[0.4px] max-sm:text-[20px] max-sm:leading-[32px]",
      },
    },
    defaultVariants: {
      variant: "subtitle1",
    },
  },
);

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  /** Rendered element (defaults to `h2`). */
  as?: React.ElementType;
}

export function Heading({
  as: Comp = "h2",
  variant,
  className,
  ...props
}: HeadingProps) {
  return (
    <Comp className={cn(headingVariants({ variant }), className)} {...props} />
  );
}

export { headingVariants };
export default Heading;

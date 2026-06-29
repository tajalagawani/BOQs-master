import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Button / CTA — pill button for primary actions and CTAs.
 * Ported verbatim from iox-website (src/components/ui/button.tsx); only the
 * `cn` import path is adapted to this app (@/lib/cn).
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[8px] whitespace-nowrap rounded-[16px] font-normal text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pagent/40 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-pagent hover:bg-pagent/90",
        muted: "bg-neutral-300",
      },
      size: {
        sm: "px-[16px] py-[8px] text-[12px] leading-[16px]",
        md: "px-[24px] py-[8px] text-[14px] leading-[24px]",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      block: false,
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  block,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export default Button;

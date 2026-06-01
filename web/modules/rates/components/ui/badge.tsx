import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/modules/rates/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground",
        success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
        info: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
        violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

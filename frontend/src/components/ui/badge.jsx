import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[hsl(var(--brand))]/20 bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))]",
        secondary:
          "border-slate-200 bg-slate-50 text-slate-700",
        destructive:
          "border-red-200 bg-red-50 text-red-700",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

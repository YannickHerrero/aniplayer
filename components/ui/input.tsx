import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-[10px] border border-[var(--border-strong)] bg-card px-3 py-1 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus-visible:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }

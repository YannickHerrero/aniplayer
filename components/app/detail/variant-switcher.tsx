"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

const OPTIONS = [
  { v: "0", label: "Current" },
  { v: "1", label: "Split" },
  { v: "2", label: "Compact" },
  { v: "3", label: "Tabs" },
  { v: "4", label: "Rail" },
  { v: "5", label: "Sticky" },
]

/** Temporary on-page switcher to compare detail-page layout variants. */
export function VariantSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const active = params.get("v") ?? "0"

  const go = (v: string) => {
    const next = new URLSearchParams(params)
    if (v === "0") next.delete("v")
    else next.set("v", v)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-panel/95 p-1 shadow-[0_8px_30px_rgba(0,0,0,.5)] backdrop-blur">
        <span className="px-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-faint">
          Layout
        </span>
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            onClick={() => go(o.v)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active === o.v
                ? "bg-accent text-white"
                : "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

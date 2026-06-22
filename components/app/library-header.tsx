"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

type LibraryHeaderProps = {
  count: number
  query: string
  onQueryChange: (value: string) => void
}

export function LibraryHeader({
  count,
  query,
  onQueryChange,
}: LibraryHeaderProps) {
  return (
    <header className="flex h-[62px] items-center gap-3 border-b border-[var(--border)] px-[26px]">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={`Search ${count} titles…`}
          className="pl-9"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="rounded-[9px] border border-[var(--border-strong)] bg-card px-3 py-2 font-mono text-xs text-text-secondary transition-colors hover:text-text-primary">
          Sort · Recent
        </button>
        <button className="rounded-[9px] border border-[var(--border-strong)] bg-card px-3 py-2 font-mono text-xs text-text-secondary transition-colors hover:text-text-primary">
          Grid
        </button>
      </div>
    </header>
  )
}

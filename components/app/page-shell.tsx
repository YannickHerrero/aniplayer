"use client"

import { Sidebar } from "@/components/app/sidebar"
import { useLibrary } from "@/hooks/use-library"

/** Sidebar + titled main area, shared by the secondary nav pages. */
export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const { folders } = useLibrary()
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        folders={[{ label: "Anime", count: folders.length }]}
        scanned={folders.length}
        total={folders.length}
      />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-[62px] items-center gap-3 border-b border-[var(--border)] px-[26px]">
          <h1 className="font-display text-base font-semibold">{title}</h1>
          {subtitle && (
            <span className="text-xs text-text-muted">{subtitle}</span>
          )}
        </header>
        <div className="px-[26px] pb-[30px] pt-[22px]">{children}</div>
      </main>
    </div>
  )
}

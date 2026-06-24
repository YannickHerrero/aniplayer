"use client"

import { AniListGrid } from "@/components/app/anilist-grid"
import type { AnilistWatchingEntry } from "@/lib/anilist"

type WatchingRowProps = {
  items: AnilistWatchingEntry[]
  onError?: (message: string) => void
}

/** Home-page "Watching on AniList" section (titles not yet in the library). */
export function WatchingRow({ items, onError }: WatchingRowProps) {
  if (items.length === 0) return null

  return (
    <section className="mt-7">
      <h2 className="mb-1 font-display text-[17px] font-semibold">
        Watching on AniList
      </h2>
      <p className="mb-4 text-xs text-text-muted">
        Not in your library yet — click to add and download.
      </p>
      <AniListGrid items={items} onError={onError} />
    </section>
  )
}

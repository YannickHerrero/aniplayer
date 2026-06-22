"use client"

import { useMemo, useState } from "react"

import { EpisodeRow } from "@/components/app/episode-row"
import { cn } from "@/lib/utils"
import type { AnimeFolder } from "@/lib/types"

type EpisodeListProps = {
  folder: AnimeFolder
  watchedSet: Set<number>
  onPlay: (fileName: string) => void
  onToggleWatched: (episodeNumber: number) => void
  pendingEpisodes?: Set<number>
}

export function EpisodeList({
  folder,
  watchedSet,
  onPlay,
  onToggleWatched,
  pendingEpisodes,
}: EpisodeListProps) {
  const seasons = useMemo(() => {
    const set = new Set<number>()
    for (const ep of folder.episodes) if (ep.season != null) set.add(ep.season)
    return [...set].sort((a, b) => a - b)
  }, [folder.episodes])

  const [activeSeason, setActiveSeason] = useState<number | null>(
    seasons[0] ?? null
  )

  const visible = useMemo(() => {
    if (seasons.length <= 1) return folder.episodes
    return folder.episodes.filter((ep) => ep.season === activeSeason)
  }, [folder.episodes, seasons.length, activeSeason])

  // The first unwatched episode is "up next".
  const upNext = useMemo(() => {
    for (const ep of visible) {
      if (ep.episode != null && !watchedSet.has(ep.episode)) return ep.episode
    }
    return null
  }, [visible, watchedSet])

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Episodes</h2>
      </div>

      <div className="mb-3 flex items-center gap-2">
        {seasons.length > 1 &&
          seasons.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSeason(s)}
              className={cn(
                "rounded-[9px] border px-3.5 py-[7px] text-xs font-medium transition-colors",
                s === activeSeason
                  ? "border-accent/40 bg-accent/[0.18] text-white"
                  : "border-[var(--border-strong)] bg-card text-text-secondary"
              )}
            >
              Season {s}
            </button>
          ))}
      </div>

      <p className="mb-3 truncate font-sans text-xs text-text-muted">
        {folder.absolutePath}
      </p>

      <div className="flex flex-col gap-[3px]">
        {visible.map((ep) => (
          <EpisodeRow
            key={ep.fileName}
            episode={ep}
            watched={ep.episode != null && watchedSet.has(ep.episode)}
            isUpNext={ep.episode != null && ep.episode === upNext}
            onPlay={() => onPlay(ep.fileName)}
            onToggleWatched={() =>
              ep.episode != null && onToggleWatched(ep.episode)
            }
            togglePending={
              ep.episode != null && pendingEpisodes?.has(ep.episode)
            }
          />
        ))}
      </div>
    </section>
  )
}

"use client"

import { useMemo } from "react"

import { EpisodeRow } from "@/components/app/episode-row"
import type { EpisodeView } from "@/lib/episode-model"

type EpisodeListProps = {
  episodes: EpisodeView[]
  folderPath: string
  onPlay: (fileName: string) => void
  onToggleWatched: (episodeNumber: number) => void
  pendingEpisodes?: Set<number>
  /** Download available for this title (RD set + title mappable to Kitsu). */
  canDownload?: boolean
  onDownload?: (episodeNumber: number) => void
  downloadPendingEpisodes?: Set<number>
  noSourceEpisodes?: Set<number>
}

export function EpisodeList({
  episodes,
  folderPath,
  onPlay,
  onToggleWatched,
  pendingEpisodes,
  canDownload = false,
  onDownload,
  downloadPendingEpisodes,
  noSourceEpisodes,
}: EpisodeListProps) {
  // The first present, unwatched episode is "up next".
  const upNext = useMemo(() => {
    for (const ep of episodes) {
      if (ep.status === "present" && ep.episode != null && !ep.watched) {
        return ep.episode
      }
    }
    return null
  }, [episodes])

  const presentCount = episodes.filter((e) => e.status === "present").length

  return (
    <section>
      <div className="mb-1.5 flex items-baseline gap-3">
        <h2 className="font-display text-xl font-semibold">Episodes</h2>
        <span className="font-mono text-[11px] text-text-faint">
          {presentCount} / {episodes.length} in library
        </span>
      </div>

      <p className="mb-3 truncate font-sans text-xs text-text-muted">
        {folderPath}
      </p>

      <div className="flex flex-col gap-[3px]">
        {episodes.map((ep, i) => (
          <EpisodeRow
            key={ep.episode != null ? `e${ep.episode}` : `x${i}`}
            episode={ep.episode}
            status={ep.status}
            fileName={ep.file?.fileName ?? null}
            quality={ep.file?.quality ?? null}
            watched={ep.watched}
            isUpNext={ep.episode != null && ep.episode === upNext}
            downloadProgress={ep.downloadProgress}
            downloadPhase={ep.downloadPhase}
            onPlay={() => ep.file && onPlay(ep.file.fileName)}
            onToggleWatched={() =>
              ep.episode != null && onToggleWatched(ep.episode)
            }
            togglePending={
              ep.episode != null && pendingEpisodes?.has(ep.episode)
            }
            canDownload={canDownload}
            onDownload={() => ep.episode != null && onDownload?.(ep.episode)}
            downloadPending={
              ep.episode != null && downloadPendingEpisodes?.has(ep.episode)
            }
            noSource={ep.episode != null && noSourceEpisodes?.has(ep.episode)}
          />
        ))}
      </div>
    </section>
  )
}

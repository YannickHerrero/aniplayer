"use client"

import { EpisodeRow } from "@/components/app/episode-row"
import type { AnimeDetail } from "@/hooks/use-anime-detail"

/** The episode list body, identical across every variant. */
export function EpisodeRows({ detail }: { detail: AnimeDetail }) {
  const { episodeViews } = detail

  // First present, unwatched episode is "up next".
  let upNext: number | null = null
  for (const ep of episodeViews) {
    if (ep.status === "present" && ep.episode != null && !ep.watched) {
      upNext = ep.episode
      break
    }
  }

  return (
    <div className="flex flex-col gap-[3px]">
      {episodeViews.map((ep, i) => (
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
          onPlay={() => ep.file && detail.playEpisode(ep.file.fileName)}
          onToggleWatched={() =>
            ep.episode != null && detail.toggleWatched(ep.episode)
          }
          togglePending={
            ep.episode != null && detail.pendingEpisodes.has(ep.episode)
          }
          canDownload={detail.canDownload}
          onDownload={() => ep.episode != null && detail.startDownload(ep.episode)}
          downloadPending={
            ep.episode != null && detail.downloadPendingEpisodes.has(ep.episode)
          }
          noSource={ep.episode != null && detail.noSourceEpisodes.has(ep.episode)}
        />
      ))}
    </div>
  )
}

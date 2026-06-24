import { sortEpisodes } from "@/lib/episode-parser"
import type { EpisodeFile } from "@/lib/types"

export type EpisodeStatus =
  | "present" // a file is on disk
  | "downloading" // a download is in progress
  | "missing" // aired, not on disk
  | "unaired" // hasn't aired yet (per AniList)

export type EpisodeView = {
  /** Episode number (null only for unparseable extra files appended at the end). */
  episode: number | null
  status: EpisodeStatus
  file: EpisodeFile | null
  watched: boolean
  /** 0–100 while downloading, else null. */
  downloadProgress: number | null
}

type BuildEpisodeModelOptions = {
  /** Total episodes for the title (AniList count, with fallbacks). */
  total: number
  /** Files found on disk. */
  episodes: EpisodeFile[]
  /** Effective watched set (local merged with AniList progress). */
  watchedSet: Set<number>
  /** AniList's next-airing episode number; episodes >= this are unaired. */
  nextAiringEpisode: number | null
  /** Episode → download progress (0–100) for in-flight downloads. */
  downloading?: Map<number, number>
}

/**
 * Build the full 1..total episode list, overlaying on-disk files, watched
 * state, in-flight downloads, and unaired episodes. Files whose episode number
 * is unknown or outside 1..total are appended as extra "present" rows so
 * nothing playable is hidden.
 */
export function buildEpisodeModel({
  total,
  episodes,
  watchedSet,
  nextAiringEpisode,
  downloading,
}: BuildEpisodeModelOptions): EpisodeView[] {
  const byNumber = new Map<number, EpisodeFile>()
  const extras: EpisodeFile[] = []
  for (const file of episodes) {
    if (file.episode != null && file.episode >= 1 && file.episode <= total) {
      // Keep the first file seen for a given number.
      if (!byNumber.has(file.episode)) byNumber.set(file.episode, file)
      else extras.push(file)
    } else {
      extras.push(file)
    }
  }

  const views: EpisodeView[] = []
  for (let n = 1; n <= total; n++) {
    const file = byNumber.get(n) ?? null
    const progress = downloading?.get(n)
    let status: EpisodeStatus
    if (progress != null) status = "downloading"
    else if (file) status = "present"
    else if (nextAiringEpisode != null && n >= nextAiringEpisode)
      status = "unaired"
    else status = "missing"

    views.push({
      episode: n,
      status,
      file,
      watched: watchedSet.has(n),
      downloadProgress: progress ?? null,
    })
  }

  // Append extra/unnumbered files (e.g. specials) so they stay playable.
  for (const file of sortEpisodes(extras)) {
    views.push({
      episode: file.episode,
      status: "present",
      file,
      watched: file.episode != null && watchedSet.has(file.episode),
      downloadProgress: null,
    })
  }

  return views
}

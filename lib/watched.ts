/**
 * The effective set of watched episode numbers: the local watched list is the
 * source of truth, merged upward with AniList progress (everything up to the
 * AniList `progress` is considered watched too).
 */
export function effectiveWatchedSet(
  localWatched: number[],
  anilistProgress: number | null
): Set<number> {
  const set = new Set<number>(localWatched)
  if (anilistProgress && anilistProgress > 0) {
    for (let i = 1; i <= anilistProgress; i++) set.add(i)
  }
  return set
}

/** Highest contiguous-or-not watched episode number (max). */
export function maxWatched(watched: Set<number> | number[]): number {
  const values = watched instanceof Set ? [...watched] : watched
  return values.length > 0 ? Math.max(...values) : 0
}

/**
 * Total episode count for progress display.
 * Prefers AniList's episode count, then the next-airing episode minus one
 * (for currently-releasing shows), then the local file count.
 */
export function totalEpisodes(
  anilistEpisodes: number | null,
  nextAiringEpisode: number | null,
  localCount: number
): number {
  if (anilistEpisodes && anilistEpisodes > 0) return anilistEpisodes
  if (nextAiringEpisode && nextAiringEpisode > 1) return nextAiringEpisode - 1
  return localCount
}

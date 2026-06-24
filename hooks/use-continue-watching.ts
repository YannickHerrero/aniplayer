"use client"

import { useMemo } from "react"

import type { ContinueWatchingItem } from "@/components/app/continue-watching-row"
import { useAnilistProgress } from "@/hooks/use-anilist-progress"
import type { AnimeFolder, MappingsFile } from "@/lib/types"
import { effectiveWatchedSet, totalEpisodes } from "@/lib/watched"

/**
 * In-progress anime: started (locally or on AniList) with a next episode still
 * available on disk. Shared by the home page and the Continue-watching page.
 */
export function useContinueWatching(
  folders: AnimeFolder[],
  mappings: MappingsFile,
  watchedMap: Record<string, number[]>,
  token: string | null,
  connected: boolean
): ContinueWatchingItem[] {
  const mappedIds = useMemo(
    () =>
      folders
        .map((f) => mappings[f.slug]?.anilistId)
        .filter((id): id is number => typeof id === "number"),
    [folders, mappings]
  )
  const progressById = useAnilistProgress(mappedIds, connected ? token : null)

  return useMemo(() => {
    return folders.flatMap((folder) => {
      const mapping = mappings[folder.slug]
      const info = mapping ? progressById.get(mapping.anilistId) : undefined

      const watchedSet = effectiveWatchedSet(
        watchedMap[folder.slug] ?? [],
        info?.progress ?? null
      )
      if (watchedSet.size === 0) return []

      const next = folder.episodes.find(
        (ep) => ep.episode != null && !watchedSet.has(ep.episode)
      )
      if (!next || next.episode == null) return []

      const total = totalEpisodes(
        info?.episodes ?? null,
        info?.nextEpisode ?? null,
        folder.episodeCount
      )
      return [
        {
          slug: folder.slug,
          title: mapping?.title || folder.folderName,
          coverImage: mapping?.coverImage ?? null,
          upNext: next.episode,
          progressPct:
            total > 0 ? Math.min(100, (watchedSet.size / total) * 100) : 0,
        },
      ]
    })
  }, [folders, watchedMap, mappings, progressById])
}

"use client"

import { useMemo, useState } from "react"

import { AnimeGrid } from "@/components/app/anime-grid"
import {
  type ContinueWatchingItem,
  ContinueWatchingRow,
} from "@/components/app/continue-watching-row"
import { LibraryHeader } from "@/components/app/library-header"
import { Sidebar } from "@/components/app/sidebar"
import { WatchingRow } from "@/components/app/watching-row"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { useAnilistAuth } from "@/hooks/use-anilist-auth"
import { useAnilistProgress } from "@/hooks/use-anilist-progress"
import { useAnilistWatching } from "@/hooks/use-anilist-watching"
import { useAutoMatchLibrary } from "@/hooks/use-auto-match-library"
import { useLibrary } from "@/hooks/use-library"
import { useMappings } from "@/hooks/use-mappings"
import { useWatched } from "@/hooks/use-watched"
import { effectiveWatchedSet, totalEpisodes } from "@/lib/watched"

export default function LibraryPage() {
  const { folders, loading, error } = useLibrary()
  const { mappings, loading: mappingsLoading, saveMapping } = useMappings()
  const { watchedMap } = useWatched()
  const { token, connected, viewer } = useAnilistAuth()
  const [query, setQuery] = useState("")
  const [toast, setToast] = useState<{
    message: string
    tone: ToastTone
  } | null>(null)

  // AniList progress for every mapped anime, so "Continue watching" reflects
  // progress tracked on AniList (not just locally marked episodes).
  const mappedIds = useMemo(
    () =>
      folders
        .map((f) => mappings[f.slug]?.anilistId)
        .filter((id): id is number => typeof id === "number"),
    [folders, mappings]
  )
  const progressById = useAnilistProgress(mappedIds, connected ? token : null)

  // Match unmapped folders to AniList in the background so covers show up
  // without having to open each detail page first.
  useAutoMatchLibrary({
    folders,
    mappings,
    saveMapping,
    token,
    ready: !loading && !mappingsLoading,
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return folders
    return folders.filter((f) => f.folderName.toLowerCase().includes(q))
  }, [folders, query])

  // In-progress anime: started, with a next episode still available on disk.
  const continueWatching = useMemo<ContinueWatchingItem[]>(() => {
    return folders.flatMap((folder) => {
      const mapping = mappings[folder.slug]
      const info = mapping ? progressById.get(mapping.anilistId) : undefined

      // Local marks merged with AniList progress (same as the detail page).
      const watchedSet = effectiveWatchedSet(
        watchedMap[folder.slug] ?? [],
        info?.progress ?? null
      )
      if (watchedSet.size === 0) return []

      // The next episode that's actually on disk and not yet watched.
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

  // The viewer's "Watching" list on AniList, minus shows already in the
  // local library (those already appear in "All series").
  const { entries: watchingEntries } = useAnilistWatching(
    connected ? (viewer?.id ?? null) : null,
    token
  )
  const watchingToShow = useMemo(() => {
    const inLibrary = new Set(
      Object.values(mappings).map((m) => m.anilistId)
    )
    return watchingEntries.filter((e) => !inLibrary.has(e.anilistId))
  }, [watchingEntries, mappings])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        folders={[{ label: "Anime", count: folders.length }]}
        scanned={folders.length}
        total={folders.length}
      />
      <main className="flex-1 overflow-y-auto">
        <LibraryHeader
          count={folders.length}
          query={query}
          onQueryChange={setQuery}
        />
        <div className="px-[26px] pb-[30px] pt-[22px]">
          {!query && <ContinueWatchingRow items={continueWatching} />}

          <h2 className="mb-4 font-display text-[17px] font-semibold">
            All series
          </h2>

          {loading && (
            <p className="text-sm text-text-secondary">Scanning library…</p>
          )}
          {error && (
            <p className="text-sm text-red-400">Failed to load library: {error}</p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm text-text-secondary">
              {folders.length === 0
                ? "No anime found. Add folders to your library path."
                : "No titles match your search."}
            </p>
          )}

          {filtered.length > 0 && (
            <AnimeGrid folders={filtered} mappings={mappings} />
          )}

          {!query && (
            <WatchingRow
              items={watchingToShow}
              onError={(message) => setToast({ message, tone: "error" })}
            />
          )}
        </div>
      </main>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"

import { AnimeGrid } from "@/components/app/anime-grid"
import { ContinueWatchingRow } from "@/components/app/continue-watching-row"
import { LibraryHeader } from "@/components/app/library-header"
import { Sidebar } from "@/components/app/sidebar"
import { WatchingRow } from "@/components/app/watching-row"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { useAnilistAuth } from "@/hooks/use-anilist-auth"
import { useAnilistWatching } from "@/hooks/use-anilist-watching"
import { useAutoMatchLibrary } from "@/hooks/use-auto-match-library"
import { useContinueWatching } from "@/hooks/use-continue-watching"
import { useLibrary } from "@/hooks/use-library"
import { useMappings } from "@/hooks/use-mappings"
import { useWatched } from "@/hooks/use-watched"

export default function LibraryPage() {
  const { folders, loading, error } = useLibrary()
  const { mappings, loading: mappingsLoading, saveMapping } = useMappings()
  const { watchedMap } = useWatched()
  const { token, connected, viewer } = useAnilistAuth()
  const [query, setQuery] = useState("")
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(
    null
  )

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

  const continueWatching = useContinueWatching(
    folders,
    mappings,
    watchedMap,
    token,
    connected
  )

  // The viewer's "Watching" list on AniList, minus shows already local.
  const { entries: watchingEntries } = useAnilistWatching(
    connected ? (viewer?.id ?? null) : null,
    token
  )
  const watchingToShow = useMemo(() => {
    const inLibrary = new Set(Object.values(mappings).map((m) => m.anilistId))
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

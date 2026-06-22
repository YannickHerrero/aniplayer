"use client"

import { useMemo, useState } from "react"

import { AnimeGrid } from "@/components/app/anime-grid"
import { LibraryHeader } from "@/components/app/library-header"
import { Sidebar } from "@/components/app/sidebar"
import { useLibrary } from "@/hooks/use-library"

export default function LibraryPage() {
  const { folders, loading, error } = useLibrary()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return folders
    return folders.filter((f) => f.folderName.toLowerCase().includes(q))
  }, [folders, query])

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

          {filtered.length > 0 && <AnimeGrid folders={filtered} />}
        </div>
      </main>
    </div>
  )
}

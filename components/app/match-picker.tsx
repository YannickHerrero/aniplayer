"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { type AnilistMedia, searchAnilistAnime } from "@/lib/anilist"
import { cleanTitleForSearch } from "@/lib/auto-match"

type MatchPickerProps = {
  folderName: string
  token?: string | null
  onSelect: (media: AnilistMedia) => void
  trigger: React.ReactNode
}

export function MatchPicker({
  folderName,
  token,
  onSelect,
  trigger,
}: MatchPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AnilistMedia[]>([])
  const [loading, setLoading] = useState(false)

  // Seed the query with the cleaned folder title when first opened.
  useEffect(() => {
    if (open) setQuery(cleanTitleForSearch(folderName).title)
  }, [open, folderName])

  const runSearch = useCallback(
    async (term: string, signal?: AbortSignal) => {
      if (!term.trim()) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const media = await searchAnilistAnime(term, signal, token)
        setResults(media)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const id = setTimeout(() => runSearch(query, controller.signal), 300)
    return () => {
      clearTimeout(id)
      controller.abort()
    }
  }, [open, query, runSearch])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Match on AniList</DialogTitle>
          <DialogDescription>
            Pick the correct entry for “{folderName}”.
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search AniList…"
        />

        <div className="max-h-[360px] overflow-y-auto">
          {loading && (
            <p className="py-4 text-sm text-text-secondary">Searching…</p>
          )}
          {!loading && results.length === 0 && (
            <p className="py-4 text-sm text-text-secondary">No results.</p>
          )}
          <ul className="flex flex-col gap-1">
            {results.map((media) => (
              <li key={media.id}>
                <button
                  onClick={() => {
                    onSelect(media)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-card">
                    {media.coverImage && (
                      <Image
                        src={media.coverImage}
                        alt={media.title}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {media.title}
                    </p>
                    <p className="font-mono text-[11px] text-text-muted">
                      {[media.format, media.seasonYear, `${media.episodes ?? "?"} EP`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}

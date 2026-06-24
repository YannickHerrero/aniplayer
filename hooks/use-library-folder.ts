"use client"

import { useCallback, useEffect, useState } from "react"

import type { AnimeFolder } from "@/lib/types"

type UseLibraryFolderResult = {
  folder: AnimeFolder | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useLibraryFolder(slug: string): UseLibraryFolderResult {
  const [folder, setFolder] = useState<AnimeFolder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/library/${encodeURIComponent(slug)}`, {
          signal,
        })
        if (res.status === 404) {
          setFolder(null)
          setError("Anime not found")
          return
        }
        if (!res.ok) throw new Error(`Failed to load (${res.status})`)
        const data = (await res.json()) as { folder: AnimeFolder }
        setFolder(data.folder)
        setError(null)
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [slug]
  )

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const refresh = useCallback(() => {
    load()
  }, [load])

  return { folder, loading, error, refresh }
}

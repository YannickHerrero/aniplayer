"use client"

import { useCallback, useEffect, useState } from "react"

import { scanLibrary } from "@/lib/backend"
import type { AnimeFolder } from "@/lib/types"

type LibraryResponse = {
  root: string
  folders: AnimeFolder[]
}

type UseLibraryResult = {
  root: string | null
  folders: AnimeFolder[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useLibrary(): UseLibraryResult {
  const [root, setRoot] = useState<string | null>(null)
  const [folders, setFolders] = useState<AnimeFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      if (signal?.aborted) return
      const data = (await scanLibrary()) as LibraryResponse
      setRoot(data.root)
      setFolders(data.folders)
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const refresh = useCallback(() => {
    load()
  }, [load])

  return { root, folders, loading, error, refresh }
}

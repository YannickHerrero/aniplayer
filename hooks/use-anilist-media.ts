"use client"

import { useCallback, useEffect, useState } from "react"

import { type AnilistMedia, fetchAnilistMediaById } from "@/lib/anilist"

type UseAnilistMediaResult = {
  media: AnilistMedia | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useAnilistMedia(
  anilistId: number | null,
  token?: string | null
): UseAnilistMediaResult {
  const [media, setMedia] = useState<AnilistMedia | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!anilistId) {
        setMedia(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const result = await fetchAnilistMediaById(anilistId, signal, token)
        setMedia(result)
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [anilistId, token]
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  return { media, loading, error, refresh: () => load() }
}

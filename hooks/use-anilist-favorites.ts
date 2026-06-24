"use client"

import { useEffect, useState } from "react"

import {
  type AnilistFavoriteEntry,
  fetchAnilistFavorites,
} from "@/lib/anilist"

type UseAnilistFavoritesResult = {
  entries: AnilistFavoriteEntry[]
  loading: boolean
}

/** Fetch the connected viewer's favourited anime. */
export function useAnilistFavorites(
  userId: number | null,
  token: string | null
): UseAnilistFavoritesResult {
  const [entries, setEntries] = useState<AnilistFavoriteEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId || !token) {
      setEntries([])
      return
    }
    const controller = new AbortController()
    setLoading(true)
    fetchAnilistFavorites(userId, token, controller.signal)
      .then((list) => setEntries(list))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [userId, token])

  return { entries, loading }
}

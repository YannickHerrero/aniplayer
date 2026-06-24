"use client"

import { useEffect, useState } from "react"

import {
  type AnilistWatchingEntry,
  fetchAnilistWatchingList,
} from "@/lib/anilist"

type UseAnilistWatchingResult = {
  entries: AnilistWatchingEntry[]
  loading: boolean
}

/**
 * Fetch the connected viewer's "Watching" (CURRENT) anime list. No-op until
 * both a userId and token are available.
 */
export function useAnilistWatching(
  userId: number | null,
  token: string | null
): UseAnilistWatchingResult {
  const [entries, setEntries] = useState<AnilistWatchingEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId || !token) {
      setEntries([])
      return
    }
    const controller = new AbortController()
    setLoading(true)
    fetchAnilistWatchingList(userId, token, controller.signal)
      .then((list) => setEntries(list))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [userId, token])

  return { entries, loading }
}

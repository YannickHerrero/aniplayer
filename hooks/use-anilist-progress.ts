"use client"

import { useEffect, useMemo, useState } from "react"

import {
  type AnilistProgressInfo,
  fetchAnilistProgressBatch,
} from "@/lib/anilist"

/**
 * Fetch AniList progress + episode counts for a set of anime ids, keyed by id.
 * Re-runs when the id set or token changes.
 */
export function useAnilistProgress(
  ids: number[],
  token?: string | null
): Map<number, AnilistProgressInfo> {
  const [byId, setById] = useState<Map<number, AnilistProgressInfo>>(new Map())

  // Stable key so the effect only re-runs when the actual id set changes.
  const key = useMemo(() => [...new Set(ids)].sort((a, b) => a - b).join(","), [
    ids,
  ])

  useEffect(() => {
    const idList = key ? key.split(",").map(Number) : []
    if (idList.length === 0) {
      setById(new Map())
      return
    }
    const controller = new AbortController()
    fetchAnilistProgressBatch(idList, token, controller.signal)
      .then((infos) => setById(new Map(infos.map((i) => [i.id, i]))))
      .catch(() => {})
    return () => controller.abort()
  }, [key, token])

  return byId
}

"use client"

import { useCallback, useEffect, useState } from "react"

import { getWatchedAll, setWatched } from "@/lib/backend"

type WatchedMap = Record<string, number[]>

type UseWatchedResult = {
  watchedMap: WatchedMap
  loading: boolean
  pending: Set<string>
  /** Toggle an episode's local watched state; returns the new list. */
  toggle: (
    slug: string,
    episode: number,
    watched: boolean
  ) => Promise<number[]>
}

function key(slug: string, episode: number) {
  return `${slug}:${episode}`
}

export function useWatched(): UseWatchedResult {
  const [watchedMap, setWatchedMap] = useState<WatchedMap>({})
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<Set<string>>(new Set())

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        if (controller.signal.aborted) return
        const data = await getWatchedAll()
        const map: WatchedMap = {}
        for (const [slug, entry] of Object.entries(data.watched ?? {})) {
          map[slug] = entry.watched
        }
        setWatchedMap(map)
      } catch (err) {
        if ((err as Error).name === "AbortError") return
      } finally {
        setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [])

  const toggle = useCallback(
    async (slug: string, episode: number, watched: boolean) => {
      const k = key(slug, episode)
      setPending((prev) => new Set(prev).add(k))
      try {
        const updated = await setWatched({ slug, episode, watched })
        setWatchedMap((prev) => ({ ...prev, [slug]: updated }))
        return updated
      } finally {
        setPending((prev) => {
          const next = new Set(prev)
          next.delete(k)
          return next
        })
      }
    },
    []
  )

  return { watchedMap, loading, pending, toggle }
}

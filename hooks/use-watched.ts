"use client"

import { useCallback, useEffect, useState } from "react"

import type { WatchedFile } from "@/lib/types"

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
        const res = await fetch("/api/watched", { signal: controller.signal })
        if (!res.ok) return
        const data = (await res.json()) as { watched: WatchedFile }
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
        const res = await fetch("/api/watched", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, episode, watched }),
        })
        if (!res.ok) throw new Error("Failed to update watched state")
        const data = (await res.json()) as { watched: number[] }
        setWatchedMap((prev) => ({ ...prev, [slug]: data.watched }))
        return data.watched
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

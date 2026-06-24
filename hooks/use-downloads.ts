"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { DownloadProgress } from "@/lib/episode-model"
import type { DownloadEntry } from "@/lib/types"

type Options = {
  slug: string
  rdKey: string | null
  onComplete?: (episode: number) => void
  onError?: (message: string, episode: number) => void
}

type UseDownloadsResult = {
  start: (episode: number) => Promise<void>
  /** episode → progress + phase, only while downloading. */
  downloadingProgress: Map<number, DownloadProgress>
  /** episodes whose download is being started/resolved. */
  startingEpisodes: Set<number>
  /** episodes whose last attempt found no source. */
  noSourceEpisodes: Set<number>
}

export function useDownloads({
  slug,
  rdKey,
  onComplete,
  onError,
}: Options): UseDownloadsResult {
  const [downloads, setDownloads] = useState<Record<number, DownloadEntry>>({})
  const [starting, setStarting] = useState<Set<number>>(new Set())
  const [noSource, setNoSource] = useState<Set<number>>(new Set())

  // Keep callbacks current without retriggering the polling effect.
  const cb = useRef({ onComplete, onError })
  useEffect(() => {
    cb.current = { onComplete, onError }
  })

  // Stable key of the episodes currently downloading drives the poll loop.
  const activeKey = Object.values(downloads)
    .filter((d) => d.status === "downloading")
    .map((d) => d.episode)
    .sort((a, b) => a - b)
    .join(",")

  useEffect(() => {
    if (!activeKey) return
    const episodes = activeKey.split(",").map(Number)
    let cancelled = false

    const tick = async () => {
      await Promise.all(
        episodes.map(async (ep) => {
          try {
            const res = await fetch(
              `/api/download?slug=${encodeURIComponent(slug)}&episode=${ep}`
            )
            if (!res.ok) return
            const data = (await res.json()) as { download: DownloadEntry | null }
            if (cancelled || !data.download) return
            const dl = data.download
            setDownloads((prev) => ({ ...prev, [ep]: dl }))
            if (dl.status === "completed") {
              cb.current.onComplete?.(ep)
            } else if (dl.status === "failed") {
              if (/no source/i.test(dl.error ?? "")) {
                setNoSource((s) => new Set(s).add(ep))
              } else {
                cb.current.onError?.(dl.error ?? "Download failed", ep)
              }
            }
          } catch {
            // transient; next tick retries
          }
        })
      )
    }

    const id = setInterval(tick, 1500)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [activeKey, slug])

  const start = useCallback(
    async (episode: number) => {
      if (!rdKey) return
      setNoSource((s) => {
        const n = new Set(s)
        n.delete(episode)
        return n
      })
      setStarting((s) => new Set(s).add(episode))
      try {
        const res = await fetch("/api/download", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-realdebrid-key": rdKey,
          },
          body: JSON.stringify({ slug, episode }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          download?: DownloadEntry
          error?: string
        }
        if (!res.ok || !data.download) {
          cb.current.onError?.(data.error ?? "Failed to start download", episode)
          return
        }
        setDownloads((prev) => ({ ...prev, [episode]: data.download! }))
      } catch {
        cb.current.onError?.("Failed to start download", episode)
      } finally {
        setStarting((s) => {
          const n = new Set(s)
          n.delete(episode)
          return n
        })
      }
    },
    [rdKey, slug]
  )

  const downloadingProgress = new Map<number, DownloadProgress>()
  for (const d of Object.values(downloads)) {
    if (d.status === "downloading") {
      downloadingProgress.set(d.episode, { progress: d.progress, phase: d.phase })
    }
  }

  return {
    start,
    downloadingProgress,
    startingEpisodes: starting,
    noSourceEpisodes: noSource,
  }
}

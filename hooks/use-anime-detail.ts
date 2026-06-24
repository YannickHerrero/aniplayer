"use client"

import { useEffect, useRef, useState } from "react"

import { useAnilistAuth } from "@/hooks/use-anilist-auth"
import { useAnilistMedia } from "@/hooks/use-anilist-media"
import { useDownloads } from "@/hooks/use-downloads"
import { useLibraryFolder } from "@/hooks/use-library-folder"
import { useMappings } from "@/hooks/use-mappings"
import { useRealDebrid } from "@/hooks/use-realdebrid"
import { useWatched } from "@/hooks/use-watched"
import { type AnilistMedia, saveAnilistProgress } from "@/lib/anilist"
import { autoMatchAnime } from "@/lib/auto-match"
import { type EpisodeView, buildEpisodeModel } from "@/lib/episode-model"
import type { AnimeFolder } from "@/lib/types"
import { effectiveWatchedSet, maxWatched, totalEpisodes } from "@/lib/watched"

export type DetailToast = { message: string; tone: "error" | "info" | "success" }

export type AnimeDetail = {
  slug: string
  folder: AnimeFolder | null
  media: AnilistMedia | null
  loading: boolean
  error: string | null

  connected: boolean
  token: string | null

  /** Download feature available for this title (RD set + Kitsu-mappable). */
  canDownload: boolean

  episodeViews: EpisodeView[]
  watchedSet: Set<number>
  /** Total episodes for progress display. */
  total: number
  /** Episodes on disk. */
  localCount: number
  /** Next unwatched episode on disk (drives Resume), or null. */
  resumeFile: string | null
  resumeLabel: string

  // per-episode interaction state
  pendingEpisodes: Set<number>
  downloadPendingEpisodes: Set<number>
  noSourceEpisodes: Set<number>

  // actions
  playEpisode: (fileName: string) => void
  toggleWatched: (episode: number) => void
  startDownload: (episode: number) => void
  saveMapping: (slug: string, media: AnilistMedia) => Promise<unknown>

  toast: DetailToast | null
  setToast: (t: DetailToast | null) => void
}

/** All data + handlers for the anime detail page, shared by every layout. */
export function useAnimeDetail(slug: string): AnimeDetail {
  const { token, connected } = useAnilistAuth()
  const { key: rdKey, configured: rdConfigured } = useRealDebrid()

  const { folder, loading, error, refresh: refreshFolder } =
    useLibraryFolder(slug)
  const { mappings, saveMapping } = useMappings()
  const { watchedMap, pending, toggle } = useWatched()

  const mapping = mappings[slug] ?? null
  const { media, refresh: refreshMedia } = useAnilistMedia(
    mapping?.anilistId ?? null,
    token
  )

  const [toast, setToast] = useState<DetailToast | null>(null)

  // Is this title mappable to a Kitsu id (download feature available)?
  const [mappable, setMappable] = useState(false)
  useEffect(() => {
    if (!rdConfigured || !mapping?.anilistId) {
      setMappable(false)
      return
    }
    const controller = new AbortController()
    fetch(`/api/mappable?slug=${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { mappable?: boolean }) => setMappable(Boolean(data.mappable)))
      .catch(() => {})
    return () => controller.abort()
  }, [rdConfigured, mapping?.anilistId, slug])

  const {
    start: startDownload,
    downloadingProgress,
    startingEpisodes,
    noSourceEpisodes,
  } = useDownloads({
    slug,
    rdKey,
    onComplete: () => refreshFolder(),
    onError: (message) => setToast({ message, tone: "error" }),
  })

  // Lazily auto-match this folder to AniList the first time we see it unmapped.
  const attempted = useRef(false)
  useEffect(() => {
    if (!folder || mapping || attempted.current) return
    attempted.current = true
    const controller = new AbortController()
    ;(async () => {
      try {
        const best = await autoMatchAnime(folder.folderName, controller.signal, token)
        if (best) await saveMapping(slug, best)
      } catch {
        // best-effort
      }
    })()
    return () => controller.abort()
  }, [folder, mapping, slug, saveMapping, token])

  const localCount = folder?.episodeCount ?? 0
  const watchedSet = effectiveWatchedSet(
    (folder && watchedMap[slug]) || [],
    connected ? (media?.mediaListEntry?.progress ?? null) : null
  )
  const total = totalEpisodes(
    media?.episodes ?? null,
    media?.nextAiringEpisode?.episode ?? null,
    localCount
  )
  const episodeViews = folder
    ? buildEpisodeModel({
        total,
        episodes: folder.episodes,
        watchedSet,
        nextAiringEpisode: media?.nextAiringEpisode?.episode ?? null,
        downloading: downloadingProgress,
      })
    : []

  const resume =
    folder?.episodes.find(
      (ep) => ep.episode != null && !watchedSet.has(ep.episode)
    ) ?? folder?.episodes[0]

  const playEpisode = (fileName: string) => {
    void (async () => {
      try {
        const res = await fetch("/api/play", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, fileName }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          setToast({
            message: `Couldn't play: ${data.error ?? res.status}`,
            tone: "error",
          })
        }
      } catch {
        setToast({ message: "Couldn't reach VLC.", tone: "error" })
      }
    })()
  }

  const toggleWatched = (episode: number) => {
    void (async () => {
      const nowWatched = !watchedSet.has(episode)
      const updated = await toggle(slug, episode, nowWatched)
      if (token && mapping?.anilistId) {
        try {
          await saveAnilistProgress(mapping.anilistId, maxWatched(updated), token)
          refreshMedia()
        } catch {
          setToast({ message: "Couldn't sync progress to AniList.", tone: "error" })
        }
      }
    })()
  }

  const pendingEpisodes = new Set(
    [...pending]
      .filter((k) => k.startsWith(`${slug}:`))
      .map((k) => Number(k.split(":")[1]))
  )

  return {
    slug,
    folder,
    media,
    loading,
    error,
    connected,
    token,
    canDownload: rdConfigured && mappable,
    episodeViews,
    watchedSet,
    total,
    localCount,
    resumeFile: resume?.fileName ?? null,
    resumeLabel:
      resume?.episode != null ? `Resume · E${resume.episode}` : "Play",
    pendingEpisodes,
    downloadPendingEpisodes: startingEpisodes,
    noSourceEpisodes,
    playEpisode,
    toggleWatched,
    startDownload,
    saveMapping,
    toast,
    setToast,
  }
}

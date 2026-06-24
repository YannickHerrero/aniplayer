"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { AnilistTrackingPanel } from "@/components/app/anilist-tracking-panel"
import { DetailHero } from "@/components/app/detail-hero"
import { EpisodeList } from "@/components/app/episode-list"
import { MatchPicker } from "@/components/app/match-picker"
import { Button } from "@/components/ui/button"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { useAnilistAuth } from "@/hooks/use-anilist-auth"
import { useAnilistMedia } from "@/hooks/use-anilist-media"
import { useDownloads } from "@/hooks/use-downloads"
import { useLibraryFolder } from "@/hooks/use-library-folder"
import { useMappings } from "@/hooks/use-mappings"
import { useRealDebrid } from "@/hooks/use-realdebrid"
import { useWatched } from "@/hooks/use-watched"
import { saveAnilistProgress } from "@/lib/anilist"
import { autoMatchAnime } from "@/lib/auto-match"
import { buildEpisodeModel } from "@/lib/episode-model"
import {
  effectiveWatchedSet,
  maxWatched,
  totalEpisodes,
} from "@/lib/watched"

export default function AnimeDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const { token, connected } = useAnilistAuth()
  const { key: rdKey, configured: rdConfigured } = useRealDebrid()

  const {
    folder,
    loading: folderLoading,
    error,
    refresh: refreshFolder,
  } = useLibraryFolder(slug)
  const { mappings, saveMapping } = useMappings()
  const { watchedMap, pending, toggle } = useWatched()

  const mapping = mappings[slug] ?? null
  const { media, refresh: refreshMedia } = useAnilistMedia(
    mapping?.anilistId ?? null,
    token
  )

  const [toast, setToast] = useState<{
    message: string
    tone: ToastTone
  } | null>(null)

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
        const best = await autoMatchAnime(
          folder.folderName,
          controller.signal,
          token
        )
        if (best) await saveMapping(slug, best)
      } catch {
        // Auto-match is best-effort; the user can match manually.
      }
    })()
    return () => controller.abort()
  }, [folder, mapping, slug, saveMapping, token])

  if (folderLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-text-secondary">
        Loading…
      </div>
    )
  }

  if (error || !folder) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-secondary">{error ?? "Not found"}</p>
        <Button variant="secondary" asChild>
          <Link href="/">Back to library</Link>
        </Button>
      </div>
    )
  }

  const playEpisode = async (fileName: string) => {
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
  }

  const localCount = folder.episodeCount
  const localWatched = watchedMap[slug] ?? []
  const watchedSet = effectiveWatchedSet(
    localWatched,
    connected ? (media?.mediaListEntry?.progress ?? null) : null
  )

  const handleToggleWatched = async (episode: number) => {
    const nowWatched = !watchedSet.has(episode)
    const updated = await toggle(slug, episode, nowWatched)
    // Push progress to AniList (highest watched episode) when connected.
    if (token && mapping?.anilistId) {
      const progress = maxWatched(updated)
      try {
        await saveAnilistProgress(mapping.anilistId, progress, token)
        refreshMedia()
      } catch {
        setToast({
          message: "Couldn't sync progress to AniList.",
          tone: "error",
        })
      }
    }
  }
  const total = totalEpisodes(
    media?.episodes ?? null,
    media?.nextAiringEpisode?.episode ?? null,
    localCount
  )

  const episodeViews = buildEpisodeModel({
    total,
    episodes: folder.episodes,
    watchedSet,
    nextAiringEpisode: media?.nextAiringEpisode?.episode ?? null,
    downloading: downloadingProgress,
  })

  // Next unwatched episode on disk → drives the Resume button.
  const resumeEpisode =
    folder.episodes.find(
      (ep) => ep.episode != null && !watchedSet.has(ep.episode)
    ) ?? folder.episodes[0]

  return (
    <main className="min-h-screen">
      <DetailHero
        slug={slug}
        folderName={folder.folderName}
        media={media}
        onResume={
          resumeEpisode ? () => playEpisode(resumeEpisode.fileName) : undefined
        }
        resumeLabel={
          resumeEpisode?.episode != null
            ? `Resume · E${resumeEpisode.episode}`
            : "Play"
        }
        matchControl={
          <MatchPicker
            folderName={folder.folderName}
            token={token}
            onSelect={(m) => saveMapping(slug, m)}
            trigger={<Button variant="secondary">Change match</Button>}
          />
        }
      />

      <div className="px-10 pb-16">
        <AnilistTrackingPanel
          media={media}
          watchedCount={watchedSet.size}
          total={total}
          localCount={localCount}
          connected={connected}
        />

        <EpisodeList
          episodes={episodeViews}
          folderPath={folder.absolutePath}
          onPlay={playEpisode}
          onToggleWatched={handleToggleWatched}
          pendingEpisodes={
            new Set(
              [...pending]
                .filter((k) => k.startsWith(`${slug}:`))
                .map((k) => Number(k.split(":")[1]))
            )
          }
          canDownload={rdConfigured && mappable}
          onDownload={startDownload}
          downloadPendingEpisodes={startingEpisodes}
          noSourceEpisodes={noSourceEpisodes}
        />
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />
    </main>
  )
}

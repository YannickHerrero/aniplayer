"use client"

import { useParams } from "next/navigation"
import { useEffect, useRef } from "react"

import { AnilistTrackingPanel } from "@/components/app/anilist-tracking-panel"
import { DetailHero } from "@/components/app/detail-hero"
import { EpisodeList } from "@/components/app/episode-list"
import { MatchPicker } from "@/components/app/match-picker"
import { Button } from "@/components/ui/button"
import { useAnilistMedia } from "@/hooks/use-anilist-media"
import { useLibraryFolder } from "@/hooks/use-library-folder"
import { useMappings } from "@/hooks/use-mappings"
import { autoMatchAnime } from "@/lib/auto-match"
import { effectiveWatchedSet, totalEpisodes } from "@/lib/watched"

export default function AnimeDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  // TODO(phase 9): real AniList token from OAuth.
  const token: string | null = null
  const connected = Boolean(token)

  const { folder, loading: folderLoading, error } = useLibraryFolder(slug)
  const { mappings, saveMapping } = useMappings()

  const mapping = mappings[slug] ?? null
  const { media } = useAnilistMedia(mapping?.anilistId ?? null, token)

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
          <a href="/">Back to library</a>
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
        console.error("Playback failed:", data.error ?? res.status)
      }
    } catch (err) {
      console.error("Playback failed:", err)
    }
  }

  const localCount = folder.episodeCount
  const watchedSet = effectiveWatchedSet(
    [],
    connected ? (media?.mediaListEntry?.progress ?? null) : null
  )
  const total = totalEpisodes(
    media?.episodes ?? null,
    media?.nextAiringEpisode?.episode ?? null,
    localCount
  )

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
          folder={folder}
          watchedSet={watchedSet}
          onPlay={playEpisode}
          onToggleWatched={() => {
            // Wired to local + AniList state in phase 8.
          }}
        />
      </div>
    </main>
  )
}

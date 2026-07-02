"use client"

import { useCallback, useMemo, useState } from "react"

import Link from "@/components/app/link"
import { useParams } from "@/lib/navigation"

import { AnilistTrackingPanel } from "@/components/app/anilist-tracking-panel"
import { DetailHero } from "@/components/app/detail-hero"
import { MatchControl } from "@/components/app/detail/header-bits"
import { VariantCompact } from "@/components/app/detail/variant-compact"
import { VariantRail } from "@/components/app/detail/variant-rail"
import { VariantSplit } from "@/components/app/detail/variant-split"
import { VariantSticky } from "@/components/app/detail/variant-sticky"
import { VariantTabs } from "@/components/app/detail/variant-tabs"
import { EpisodeList } from "@/components/app/episode-list"
import { VideoPlayer } from "@/components/player/video-player"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { useAnimeDetail } from "@/hooks/use-anime-detail"
import { useDetailLayout } from "@/hooks/use-detail-layout"
import { usePlayer } from "@/hooks/use-player"

export default function AnimeDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const detail = useAnimeDetail(slug)
  const { layout, ready } = useDetailLayout()

  const [playerEpisode, setPlayerEpisode] = useState<number | null>(null)

  const player = usePlayer({
    onWatchedThreshold: (episode) => {
      detail.toggleWatched(episode)
    },
    onEnded: (episode) => {
      setPlayerEpisode(null)
      if (!detail.watchedSet.has(episode)) {
        detail.toggleWatched(episode)
      }
    },
  })

  const episodeNumForFile = useCallback(
    (fileName: string) => {
      const ep = detail.folder?.episodes.find((e) => e.fileName === fileName)
      return ep?.episode ?? null
    },
    [detail.folder?.episodes]
  )

  const handleClose = useCallback(() => {
    player.close()
    setPlayerEpisode(null)
  }, [player])

  const detailWithPlayer = useMemo(
    () => ({
      ...detail,
      playEpisode: (fileName: string) => {
        const ep = episodeNumForFile(fileName)
        if (ep != null) setPlayerEpisode(ep)
        player.open(slug, fileName, ep != null ? ep : 0)
      },
    }),
    [detail, player, slug, episodeNumForFile]
  )

  const folderTitle = detail.media?.title ?? detail.folder?.folderName ?? ""

  if (detail.loading || !ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-text-secondary">
        Loading…
      </div>
    )
  }

  if (detail.error || !detail.folder) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-secondary">
          {detail.error ?? "Not found"}
        </p>
        <Button variant="secondary" asChild>
          <Link href="/">Back to library</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      {renderLayout(layout, detailWithPlayer)}
      <VideoPlayer
        title={folderTitle}
        episodeName={
          playerEpisode != null ? `Episode ${playerEpisode}` : ""
        }
        onClose={handleClose}
        playerState={player}
      />
      <Toast
        message={detailWithPlayer.toast?.message ?? null}
        tone={detailWithPlayer.toast?.tone}
        onDismiss={() => detailWithPlayer.setToast(null)}
      />
    </>
  )
}

function renderLayout(layout: string, detail: ReturnType<typeof useAnimeDetail>) {
  switch (layout) {
    case "1":
      return <VariantSplit detail={detail} />
    case "2":
      return <VariantCompact detail={detail} />
    case "3":
      return <VariantTabs detail={detail} />
    case "4":
      return <VariantRail detail={detail} />
    case "5":
      return <VariantSticky detail={detail} />
    default:
      return (
        <main className="min-h-screen">
          <DetailHero
            slug={detail.slug}
            folderName={detail.folder?.folderName ?? detail.slug}
            media={detail.media}
            onResume={
              detail.resumeFile
                ? () => detail.playEpisode(detail.resumeFile!)
                : undefined
            }
            resumeLabel={detail.resumeLabel}
            matchControl={<MatchControl detail={detail} />}
          />

          <div className="px-10 pb-16">
            <AnilistTrackingPanel
              media={detail.media}
              watchedCount={detail.watchedSet.size}
              total={detail.total}
              localCount={detail.localCount}
              connected={detail.connected}
            />

            <EpisodeList
              episodes={detail.episodeViews}
              folderPath={detail.folder?.absolutePath ?? ""}
              onPlay={detail.playEpisode}
              onToggleWatched={detail.toggleWatched}
              pendingEpisodes={detail.pendingEpisodes}
              canDownload={detail.canDownload}
              onDownload={detail.startDownload}
              downloadPendingEpisodes={detail.downloadPendingEpisodes}
              noSourceEpisodes={detail.noSourceEpisodes}
            />
          </div>
        </main>
      )
  }
}

"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import { AnilistTrackingPanel } from "@/components/app/anilist-tracking-panel"
import { DetailHero } from "@/components/app/detail-hero"
import { MatchControl } from "@/components/app/detail/header-bits"
import { VariantCompact } from "@/components/app/detail/variant-compact"
import { VariantRail } from "@/components/app/detail/variant-rail"
import { VariantSplit } from "@/components/app/detail/variant-split"
import { VariantSticky } from "@/components/app/detail/variant-sticky"
import { VariantTabs } from "@/components/app/detail/variant-tabs"
import { EpisodeList } from "@/components/app/episode-list"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { type AnimeDetail, useAnimeDetail } from "@/hooks/use-anime-detail"
import { useDetailLayout } from "@/hooks/use-detail-layout"

export default function AnimeDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const detail = useAnimeDetail(slug)
  const { layout, ready } = useDetailLayout()

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
      {renderLayout(layout, detail)}
      <Toast
        message={detail.toast?.message ?? null}
        tone={detail.toast?.tone}
        onDismiss={() => detail.setToast(null)}
      />
    </>
  )
}

function renderLayout(layout: string, detail: AnimeDetail) {
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
      return <ClassicLayout detail={detail} />
  }
}

/** The original layout — full hero, then stacked tracking panel + episode list. */
function ClassicLayout({ detail }: { detail: AnimeDetail }) {
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

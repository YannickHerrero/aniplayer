"use client"

import Image from "next/image"

import { EpisodeRows } from "@/components/app/detail/episode-rows"
import {
  BackLink,
  Description,
  GenreChips,
  MatchControl,
  MetaRow,
  ResumeButton,
  StatusBadge,
  detailTitle,
} from "@/components/app/detail/header-bits"
import {
  AnilistBadge,
  NextEpisodeStat,
  ProgressStat,
  ScoreStat,
} from "@/components/app/detail/stats"
import type { AnimeDetail } from "@/hooks/use-anime-detail"
import { gradientFor } from "@/lib/gradient"

/** V1 — two-pane split: info left (own scroll), episodes right (own scroll). */
export function VariantSplit({ detail }: { detail: AnimeDetail }) {
  const { media, slug } = detail
  const title = detailTitle(detail)
  const presentCount = detail.episodeViews.filter(
    (e) => e.status === "present"
  ).length

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* LEFT — info */}
      <aside className="relative flex w-[40%] min-w-[400px] max-w-[560px] shrink-0 flex-col overflow-y-auto border-r border-[var(--border)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[260px]"
          style={
            media?.bannerImage
              ? {
                  backgroundImage: `url(${media.bannerImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : { background: gradientFor(slug) }
          }
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-bg/20 via-bg/75 to-bg" />

        <div className="relative px-7 pb-10 pt-6">
          <BackLink />

          <div className="mt-6 flex gap-5">
            <div
              className="relative h-[198px] w-[132px] shrink-0 overflow-hidden rounded-[12px] border border-white/[0.08] shadow-[0_18px_40px_-12px_rgba(0,0,0,.7)]"
              style={media?.coverImage ? undefined : { background: gradientFor(slug) }}
            >
              {media?.coverImage && (
                <Image
                  src={media.coverImage}
                  alt={title}
                  fill
                  sizes="132px"
                  className="object-cover"
                  priority
                />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <StatusBadge media={media} />
              <h1 className="mt-2.5 font-display text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-white">
                {title}
              </h1>
              <MetaRow media={media} className="mt-2.5" />
            </div>
          </div>

          <GenreChips media={media} max={6} />
          <div className="mt-4">
            <Description media={media} className="line-clamp-5" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ResumeButton detail={detail} />
            <MatchControl detail={detail} />
          </div>

          {/* AniList stats stacked */}
          <div className="mt-8 space-y-3">
            <AnilistBadge media={media} />
            <div className="rounded-2xl border border-[var(--border-strong)] bg-panel p-5">
              <ProgressStat
                watchedCount={detail.watchedSet.size}
                total={detail.total}
                localCount={detail.localCount}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border-strong)] bg-panel p-5">
                <ScoreStat media={media} connected={detail.connected} />
              </div>
              <div className="rounded-2xl border border-[var(--border-strong)] bg-gradient-to-br from-accent/10 to-transparent p-5">
                <NextEpisodeStat media={media} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT — episodes */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-baseline justify-between border-b border-[var(--border)] px-8 py-5">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-xl font-semibold">Episodes</h2>
            <span className="font-mono text-[11px] text-text-faint">
              {presentCount} / {detail.episodeViews.length} in library
            </span>
          </div>
          {detail.folder && (
            <span className="max-w-[40%] truncate font-sans text-xs text-text-muted">
              {detail.folder.absolutePath}
            </span>
          )}
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <EpisodeRows detail={detail} />
        </div>
      </main>
    </div>
  )
}

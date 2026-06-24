"use client"

import Image from "next/image"

import { EpisodeRows } from "@/components/app/detail/episode-rows"
import {
  BackLink,
  MatchControl,
  MetaRow,
  ResumeButton,
  detailTitle,
} from "@/components/app/detail/header-bits"
import { useCountdown } from "@/hooks/use-countdown"
import type { AnimeDetail } from "@/hooks/use-anime-detail"
import { gradientFor } from "@/lib/gradient"

/** V2 — slim sticky hero + condensed stat strip + full-width episode list. */
export function VariantCompact({ detail }: { detail: AnimeDetail }) {
  const { media, slug } = detail
  const title = detailTitle(detail)
  const presentCount = detail.episodeViews.filter(
    (e) => e.status === "present"
  ).length
  const pct =
    detail.total > 0
      ? Math.min(100, (detail.watchedSet.size / detail.total) * 100)
      : 0
  const countdown = useCountdown(media?.nextAiringEpisode?.airingAt ?? null)
  const score = media?.meanScore ? (media.meanScore / 10).toFixed(1) : null

  return (
    <div className="min-h-screen bg-bg">
      {/* Slim sticky hero bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-bg/85 backdrop-blur-md">
        <div className="relative flex items-center gap-4 px-8 py-3">
          <BackLink className="shrink-0" />
          <div
            className="relative h-[60px] w-[42px] shrink-0 overflow-hidden rounded-[7px] border border-white/[0.08]"
            style={media?.coverImage ? undefined : { background: gradientFor(slug) }}
          >
            {media?.coverImage && (
              <Image
                src={media.coverImage}
                alt={title}
                fill
                sizes="42px"
                className="object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[19px] font-bold tracking-[-0.01em] text-white">
              {title}
            </h1>
            <MetaRow media={media} className="mt-0.5 text-xs" />
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <ResumeButton detail={detail} />
            <MatchControl detail={detail} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-8 pb-16 pt-6">
        {/* Condensed stat strip */}
        <div className="flex items-stretch divide-x divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-panel">
          <div className="flex-1 px-6 py-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
              Progress
            </p>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-display text-[22px] font-bold leading-none">
                {detail.watchedSet.size}
              </span>
              <span className="font-display text-sm text-text-muted">
                / {detail.total}
              </span>
              <span className="ml-auto font-mono text-[11px] text-text-faint">
                {Math.round(pct)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6a5cf0] to-[#9b6cf0]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex-1 px-6 py-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
              Mean score
            </p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="font-display text-[22px] font-bold leading-none text-yellow">
                {media?.meanScore ?? "—"}
              </span>
              {score && (
                <span className="font-display text-sm text-text-muted">%</span>
              )}
            </div>
            {media?.popularity != null && (
              <p className="mt-2 text-xs text-text-tertiary">
                <span className="text-[#9b8df5]">
                  {media.popularity.toLocaleString()}
                </span>{" "}
                in popularity
              </p>
            )}
          </div>

          <div className="flex-1 bg-gradient-to-br from-accent/10 to-transparent px-6 py-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b8df5]">
              Next episode
            </p>
            {media?.nextAiringEpisode ? (
              <>
                <p className="mt-1.5 font-display text-[15px] font-semibold text-white">
                  Episode {media.nextAiringEpisode.episode}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="pulse-dot size-[6px] rounded-full bg-green shadow-[0_0_7px_var(--green)]" />
                  <span className="font-mono text-[13px] font-bold text-[#cabfff]">
                    {countdown}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-text-tertiary">—</p>
            )}
          </div>
        </div>

        {/* Episodes */}
        <div className="mb-3 mt-8 flex items-baseline gap-3">
          <h2 className="font-display text-xl font-semibold">Episodes</h2>
          <span className="font-mono text-[11px] text-text-faint">
            {presentCount} / {detail.episodeViews.length} in library
          </span>
        </div>
        <EpisodeRows detail={detail} />
      </div>
    </div>
  )
}

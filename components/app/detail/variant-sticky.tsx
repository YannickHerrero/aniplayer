"use client"

import Image from "next/image"
import { Play } from "lucide-react"
import { useState } from "react"

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
import { Button } from "@/components/ui/button"
import { useCountdown } from "@/hooks/use-countdown"
import type { AnimeDetail } from "@/hooks/use-anime-detail"
import { gradientFor } from "@/lib/gradient"
import { cn } from "@/lib/utils"

/** V5 — full hero that collapses into a sticky mini-header on scroll. */
export function VariantSticky({ detail }: { detail: AnimeDetail }) {
  const { media, slug } = detail
  const title = detailTitle(detail)
  const [collapsed, setCollapsed] = useState(false)
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
    <div
      className="h-screen overflow-y-auto bg-bg"
      onScroll={(e) => setCollapsed(e.currentTarget.scrollTop > 240)}
    >
      {/* Collapsing mini-header */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-30 border-b border-[var(--border)] bg-bg/90 backdrop-blur-md transition-all duration-200",
          collapsed
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="flex items-center gap-3 px-8 py-2.5">
          <div
            className="relative h-[44px] w-[30px] shrink-0 overflow-hidden rounded-[5px] border border-white/10"
            style={media?.coverImage ? undefined : { background: gradientFor(slug) }}
          >
            {media?.coverImage && (
              <Image src={media.coverImage} alt={title} fill sizes="30px" className="object-cover" />
            )}
          </div>
          <h1 className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-white">
            {title}
          </h1>
          <span className="font-mono text-[11px] text-text-faint">
            {detail.watchedSet.size}/{detail.total}
          </span>
          {detail.resumeFile && (
            <Button
              size="sm"
              onClick={() => detail.playEpisode(detail.resumeFile!)}
            >
              <Play className="size-3.5 fill-current" />
              Resume
            </Button>
          )}
        </div>
        <div className="h-[2px] bg-track">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Full hero */}
      <div className="relative">
        <div
          className="absolute inset-x-0 top-0 h-[320px]"
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
        <div className="absolute inset-x-0 top-0 h-[320px] bg-gradient-to-t from-bg via-bg/55 to-bg/25" />

        <div className="relative px-10 pb-8 pt-6">
          <BackLink />
          <div className="mt-8 flex items-end gap-8">
            <div
              className="relative h-[270px] w-[180px] shrink-0 overflow-hidden rounded-[14px] border border-white/[0.08] shadow-[0_24px_50px_-12px_rgba(0,0,0,.7)]"
              style={media?.coverImage ? undefined : { background: gradientFor(slug) }}
            >
              {media?.coverImage && (
                <Image
                  src={media.coverImage}
                  alt={title}
                  fill
                  sizes="180px"
                  className="object-cover"
                  priority
                />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <StatusBadge media={media} />
              <h1 className="mt-3 font-display text-[42px] font-bold leading-[1.02] tracking-[-0.03em] text-white">
                {title}
              </h1>
              <MetaRow media={media} className="mt-3" />
              <div className="mt-3">
                <GenreChips media={media} max={6} />
              </div>
              <div className="mt-3">
                <Description media={media} className="line-clamp-3 max-w-[680px]" />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ResumeButton detail={detail} />
                <MatchControl detail={detail} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-10 pb-16">
        {/* Compact inline stat row */}
        <div className="flex flex-wrap items-center gap-x-9 gap-y-3 rounded-2xl border border-[var(--border-strong)] bg-panel px-6 py-4">
          <div className="min-w-[180px] flex-1">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                Progress
              </span>
              <span className="font-mono text-[11px] text-text-faint">
                {detail.watchedSet.size}/{detail.total} · {Math.round(pct)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6a5cf0] to-[#9b6cf0]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
              Score
            </span>
            <span className="font-display text-base font-bold text-yellow">
              {score ? `${media?.meanScore}%` : "—"}
            </span>
          </div>
          {media?.nextAiringEpisode && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b8df5]">
                Next · Ep {media.nextAiringEpisode.episode}
              </span>
              <span className="pulse-dot size-[6px] rounded-full bg-green shadow-[0_0_7px_var(--green)]" />
              <span className="font-mono text-[13px] font-bold text-[#cabfff]">
                {countdown}
              </span>
            </div>
          )}
        </div>

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

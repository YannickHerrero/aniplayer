"use client"

import { AppImage as Image } from "@/components/app/app-image"
import { Play } from "lucide-react"

import { EpisodeRows } from "@/components/app/detail/episode-rows"
import {
  BackLink,
  MatchControl,
  MetaRow,
  detailTitle,
} from "@/components/app/detail/header-bits"
import { Button } from "@/components/ui/button"
import { useCountdown } from "@/hooks/use-countdown"
import type { AnimeDetail } from "@/hooks/use-anime-detail"
import { gradientFor } from "@/lib/gradient"

function ProgressRing({ pct }: { pct: number }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(100, pct) / 100)
  return (
    <div className="relative size-[72px] shrink-0">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--track)" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-white">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

/** V4 — fixed info rail (Plex/Jellyfin) with the episode list dominant. */
export function VariantRail({ detail }: { detail: AnimeDetail }) {
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
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Left rail */}
      <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-sidebar px-6 py-6">
        <BackLink />

        <div
          className="relative mt-5 aspect-[2/3] w-full overflow-hidden rounded-[14px] border border-white/[0.08] shadow-[0_18px_44px_-14px_rgba(0,0,0,.75)]"
          style={media?.coverImage ? undefined : { background: gradientFor(slug) }}
        >
          {media?.coverImage && (
            <Image
              src={media.coverImage}
              alt={title}
              fill
              sizes="280px"
              className="object-cover"
              priority
            />
          )}
        </div>

        <h1 className="mt-4 font-display text-xl font-bold leading-[1.1] tracking-[-0.01em] text-white">
          {title}
        </h1>
        <MetaRow media={media} className="mt-2 text-xs" />

        <div className="mt-4 flex flex-col gap-2">
          {detail.resumeFile && (
            <Button
              className="w-full"
              onClick={() => detail.playEpisode(detail.resumeFile!)}
            >
              <Play className="size-4 fill-current" />
              {detail.resumeLabel}
            </Button>
          )}
          <MatchControl detail={detail} />
        </div>

        {/* Progress ring */}
        <div className="mt-6 flex items-center gap-4">
          <ProgressRing pct={pct} />
          <div>
            <p className="font-display text-lg font-bold leading-none">
              {detail.watchedSet.size}{" "}
              <span className="text-sm font-medium text-text-muted">
                / {detail.total}
              </span>
            </p>
            <p className="mt-1 text-xs text-text-tertiary">episodes watched</p>
            <p className="mt-0.5 font-mono text-[11px] text-text-faint">
              {detail.localCount} in library
            </p>
          </div>
        </div>

        {/* Glanceable stats */}
        <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">
              Mean score
            </span>
            <span className="font-display text-sm font-bold text-yellow">
              {score ? `${media?.meanScore}%` : "—"}
            </span>
          </div>
          {media?.popularity != null && (
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">
                Popularity
              </span>
              <span className="text-sm text-[#9b8df5]">
                {media.popularity.toLocaleString()}
              </span>
            </div>
          )}
          {media?.nextAiringEpisode && (
            <div className="rounded-xl border border-accent/30 bg-accent/[0.1] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#9b8df5]">
                Next · Ep {media.nextAiringEpisode.episode}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="pulse-dot size-[6px] rounded-full bg-green shadow-[0_0_7px_var(--green)]" />
                <span className="font-mono text-[13px] font-bold text-[#cabfff]">
                  {countdown}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Episodes */}
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

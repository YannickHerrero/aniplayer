"use client"

import type { AnilistMedia } from "@/lib/anilist"
import { useCountdown } from "@/hooks/use-countdown"
import { cn } from "@/lib/utils"

type AnilistTrackingPanelProps = {
  media: AnilistMedia | null
  /** Effective watched count (local merged with AniList progress). */
  watchedCount: number
  /** Total episodes for the denominator. */
  total: number
  /** Episodes available on disk. */
  localCount: number
  /** Whether an AniList account is connected. */
  connected: boolean
}

function formatAirDate(airingAt: number): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(airingAt * 1000))
}

export function AnilistTrackingPanel({
  media,
  watchedCount,
  total,
  localCount,
  connected,
}: AnilistTrackingPanelProps) {
  const next = media?.nextAiringEpisode ?? null
  const countdown = useCountdown(next?.airingAt ?? null)

  const progressPct = total > 0 ? Math.min(100, (watchedCount / total) * 100) : 0
  const isReleasing = media?.status === "RELEASING"

  return (
    <div className="mb-[34px] overflow-hidden rounded-[18px] border border-[var(--border-strong)] bg-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-[22px] py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[18px] items-center justify-center rounded-[5px] bg-anilist font-display text-[10px] font-bold text-[#021b2e]">
            Al
          </span>
          <span className="font-display text-sm font-semibold text-[#eceaef]">
            AniList tracking
          </span>
          {!connected && (
            <span className="font-mono text-[11px] text-text-faint">
              · not connected
            </span>
          )}
        </div>
        {media?.status && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-2.5 py-1",
              isReleasing
                ? "border-green/30 bg-green/[0.12]"
                : "border-white/10 bg-white/[0.04]"
            )}
          >
            {isReleasing && (
              <span className="pulse-dot size-1.5 rounded-full bg-green shadow-[0_0_7px_var(--green)]" />
            )}
            <span
              className={cn(
                "font-mono text-[10px] font-bold tracking-[0.12em]",
                isReleasing ? "text-green" : "text-text-secondary"
              )}
            >
              {media.status}
            </span>
          </div>
        )}
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-[1.4fr_1px_1fr_1px_1.2fr] items-stretch">
        {/* Your progress */}
        <div className="px-[22px] py-5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
            Your progress
          </p>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-[34px] font-bold leading-none tracking-[-0.02em]">
              {watchedCount}
            </span>
            <span className="font-display text-lg font-medium text-text-muted">
              / {total}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-tertiary">episodes watched</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6a5cf0] to-[#9b6cf0] transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-text-faint">
            {localCount} aired locally · {Math.round(progressPct)}% complete
          </p>
        </div>

        <div className="bg-[var(--border)]" />

        {/* Mean score */}
        <div className="px-[22px] py-5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
            Mean score
          </p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-display text-[34px] font-bold leading-none tracking-[-0.02em] text-yellow">
              {media?.meanScore ?? "—"}
            </span>
            {media?.meanScore != null && (
              <span className="font-display text-base font-medium text-text-muted">
                %
              </span>
            )}
          </div>
          <div className="mt-3 space-y-1 text-xs leading-[1.5] text-text-tertiary">
            {media?.popularity != null && (
              <p>
                <span className="text-[#9b8df5]">
                  {media.popularity.toLocaleString()}
                </span>{" "}
                in popularity
              </p>
            )}
            {connected && media?.mediaListEntry?.score ? (
              <p>
                Your score ·{" "}
                <span className="text-yellow">{media.mediaListEntry.score}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="bg-[var(--border)]" />

        {/* Next episode */}
        <div className="bg-gradient-to-br from-accent/10 to-transparent px-[22px] py-5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#9b8df5]">
            Next episode
          </p>
          {next ? (
            <>
              <p className="mt-3 font-display text-base font-semibold text-white">
                Episode {next.episode}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {formatAirDate(next.airingAt)}
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-accent/40 bg-accent/[0.16] px-3 py-2.5">
                <span className="pulse-dot size-[7px] rounded-full bg-green shadow-[0_0_7px_var(--green)]" />
                <span className="font-mono text-sm font-bold tracking-[0.02em] text-[#cabfff]">
                  {countdown}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-text-tertiary">
              No upcoming episode.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

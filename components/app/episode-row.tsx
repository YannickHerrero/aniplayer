import { Check, Clock, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import type { EpisodeFile } from "@/lib/types"

type EpisodeRowProps = {
  episode: EpisodeFile
  watched: boolean
  /** Episode hasn't aired yet (no file expected). Local files are never unaired. */
  unaired?: boolean
  isUpNext?: boolean
  airText?: string | null
  onPlay: () => void
  onToggleWatched: () => void
  togglePending?: boolean
}

export function EpisodeRow({
  episode,
  watched,
  unaired = false,
  isUpNext = false,
  airText,
  onPlay,
  onToggleWatched,
  togglePending = false,
}: EpisodeRowProps) {
  const n = episode.episode
  const label = n != null ? `E${String(n).padStart(2, "0")}` : "—"
  const bigNumber = n != null ? String(n).padStart(2, "0") : "?"
  const title = n != null ? `Episode ${n}` : episode.fileName

  return (
    <div
      role="button"
      tabIndex={unaired ? -1 : 0}
      onClick={() => !unaired && onPlay()}
      onKeyDown={(e) => {
        if (!unaired && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onPlay()
        }
      }}
      className={cn(
        "group flex items-center gap-4 rounded-[13px] px-3.5 py-[11px] transition-colors",
        unaired ? "cursor-default" : "cursor-pointer hover:bg-white/[0.035]"
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-[84px] w-[148px] shrink-0 overflow-hidden rounded-[10px] border border-white/[0.05] bg-gradient-to-br from-[#1a1622] to-[#2a2038]">
        <span className="absolute inset-0 flex items-center justify-center font-display text-[30px] font-bold tracking-[-0.02em] text-white/10">
          {bigNumber}
        </span>
        {!unaired && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="size-7 fill-white text-white" />
          </span>
        )}
        {unaired && <span className="absolute inset-0 bg-[#08080b]/[0.62]" />}
        {watched && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-accent" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] text-text-muted">{label}</span>
          <span className="truncate font-display text-[15px] font-semibold text-[#eceaef]">
            {title}
          </span>
          {isUpNext && (
            <span className="rounded-md bg-accent px-2 py-[3px] font-mono text-[9px] font-bold tracking-[0.12em] text-white">
              UP NEXT
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-text-tertiary">
          {unaired ? (
            <span className="text-text-muted">
              {airText ? `Airs ${airText}` : "Not aired yet"} · not downloaded
            </span>
          ) : watched ? (
            <>
              <span className="text-[#5fb98f]">✓ Watched</span>
              {episode.quality ? ` · ${episode.quality}` : ""} · downloaded
            </>
          ) : (
            <>
              {episode.quality ? `${episode.quality} · ` : ""}downloaded
            </>
          )}
        </p>
      </div>

      {/* Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (!unaired) onToggleWatched()
        }}
        disabled={unaired || togglePending}
        title={
          unaired
            ? "Not aired"
            : watched
              ? "Mark unwatched"
              : "Mark watched"
        }
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm transition-all disabled:cursor-not-allowed",
          unaired
            ? "text-[#43424a]"
            : watched
              ? "bg-accent text-white"
              : "border-[1.5px] border-[#3a3942] text-text-tertiary hover:border-accent hover:text-[#9b8df5]"
        )}
      >
        {unaired ? (
          <Clock className="size-3.5" />
        ) : watched ? (
          <Check className="size-[15px]" />
        ) : (
          <span className="size-3 rounded-full border border-current" />
        )}
      </button>
    </div>
  )
}

import { Check, Clock, Download, Loader2, Play } from "lucide-react"

import type { EpisodeStatus } from "@/lib/episode-model"
import type { DownloadPhase } from "@/lib/types"
import { cn } from "@/lib/utils"

type EpisodeRowProps = {
  episode: number | null
  status: EpisodeStatus
  fileName: string | null
  quality: string | null
  watched: boolean
  isUpNext?: boolean
  /** 0–100 while downloading. */
  downloadProgress?: number | null
  downloadPhase?: DownloadPhase | null
  onPlay?: () => void
  onToggleWatched?: () => void
  togglePending?: boolean
  /** Download feature available for this episode (RD set + title mappable). */
  canDownload?: boolean
  /** Resolving a source / starting the download. */
  downloadPending?: boolean
  /** A lookup returned no cached source. */
  noSource?: boolean
  onDownload?: () => void
}

export function EpisodeRow({
  episode,
  status,
  fileName,
  quality,
  watched,
  isUpNext = false,
  downloadProgress,
  downloadPhase,
  onPlay,
  onToggleWatched,
  togglePending = false,
  canDownload = false,
  downloadPending = false,
  noSource = false,
  onDownload,
}: EpisodeRowProps) {
  const n = episode
  const label = n != null ? `E${String(n).padStart(2, "0")}` : "—"
  const bigNumber = n != null ? String(n).padStart(2, "0") : "?"
  const title = n != null ? `Episode ${n}` : (fileName ?? "Unknown")

  const isPresent = status === "present"
  const isDownloading = status === "downloading"
  const isMissing = status === "missing"
  const isUnaired = status === "unaired"
  const dimmed = isMissing || isUnaired

  return (
    <div
      role={isPresent ? "button" : undefined}
      tabIndex={isPresent ? 0 : -1}
      onClick={() => isPresent && onPlay?.()}
      onKeyDown={(e) => {
        if (isPresent && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onPlay?.()
        }
      }}
      className={cn(
        "group flex items-center gap-4 rounded-[13px] px-3.5 py-[11px] transition-colors",
        isPresent ? "cursor-pointer hover:bg-white/[0.035]" : "cursor-default"
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-[84px] w-[148px] shrink-0 overflow-hidden rounded-[10px] border border-white/[0.05] bg-gradient-to-br from-[#1a1622] to-[#2a2038]">
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-display text-[30px] font-bold tracking-[-0.02em]",
            dimmed ? "text-white/[0.06]" : "text-white/10"
          )}
        >
          {bigNumber}
        </span>
        {isPresent && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="size-7 fill-white text-white" />
          </span>
        )}
        {dimmed && <span className="absolute inset-0 bg-[#08080b]/[0.62]" />}
        {isDownloading && (
          <>
            <span className="absolute inset-0 bg-[#08080b]/[0.55]" />
            <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-[#cabfff]">
              {Math.round(downloadProgress ?? 0)}%
            </span>
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-track">
              <span
                className="block h-full bg-accent transition-[width]"
                style={{ width: `${downloadProgress ?? 0}%` }}
              />
            </span>
          </>
        )}
        {watched && isPresent && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-accent" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] text-text-muted">{label}</span>
          <span
            className={cn(
              "truncate font-display text-[15px] font-semibold",
              dimmed ? "text-text-muted" : "text-[#eceaef]"
            )}
          >
            {title}
          </span>
          {isUpNext && (
            <span className="rounded-md bg-accent px-2 py-[3px] font-mono text-[9px] font-bold tracking-[0.12em] text-white">
              UP NEXT
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-text-tertiary">
          {isDownloading ? (
            <span className="text-[#9b8df5]">
              {downloadPhase === "resolving"
                ? "Finding source…"
                : downloadPhase === "caching"
                  ? "Caching on Real-Debrid…"
                  : "Downloading…"}
            </span>
          ) : isUnaired ? (
            <span className="text-text-muted">Not aired yet</span>
          ) : isMissing ? (
            <span className="text-text-muted">
              {noSource ? "No source found" : "Not in library"}
            </span>
          ) : watched ? (
            <>
              <span className="text-[#5fb98f]">✓ Watched</span>
              {quality ? ` · ${quality}` : ""} · downloaded
            </>
          ) : (
            <>{quality ? `${quality} · ` : ""}downloaded</>
          )}
        </p>
      </div>

      {/* Right control */}
      {isPresent ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleWatched?.()
          }}
          disabled={togglePending}
          title={watched ? "Mark unwatched" : "Mark watched"}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-sm transition-all disabled:cursor-not-allowed",
            watched
              ? "bg-accent text-white"
              : "border-[1.5px] border-[#3a3942] text-text-tertiary hover:border-accent hover:text-[#9b8df5]"
          )}
        >
          {watched ? (
            <Check className="size-[15px]" />
          ) : (
            <span className="size-3 rounded-full border border-current" />
          )}
        </button>
      ) : isDownloading ? (
        <Loader2 className="size-5 shrink-0 animate-spin text-[#9b8df5]" />
      ) : isMissing && canDownload && !noSource ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDownload?.()
          }}
          disabled={downloadPending}
          title="Download this episode"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/[0.16] px-3 py-1.5 text-xs font-medium text-[#b3a9f7] transition-colors hover:bg-accent/[0.24] disabled:opacity-60"
        >
          {downloadPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          {downloadPending ? "Finding…" : "Download"}
        </button>
      ) : isUnaired ? (
        <span className="flex size-8 shrink-0 items-center justify-center text-[#43424a]">
          <Clock className="size-3.5" />
        </span>
      ) : (
        <span className="size-8 shrink-0" />
      )}
    </div>
  )
}

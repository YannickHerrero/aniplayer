"use client"

import { useCallback, useEffect, useMemo } from "react"
import { ArrowBigRight, Pause, Play, SkipForward, X } from "lucide-react"

import { SeekBar } from "@/components/player/seek-bar"
import { TrackSelector } from "@/components/player/track-selector"
import { usePlayer } from "@/hooks/use-player"

type VideoPlayerProps = {
  title: string
  episodeName: string
  onClose: () => void
  playerState: ReturnType<typeof usePlayer>
}

const SKIP_OPENING_SECS = 85

export function VideoPlayer({
  title,
  episodeName,
  onClose,
  playerState,
}: VideoPlayerProps) {
  const {
    status,
    position,
    duration,
    paused,
    tracks,
    playPause,
    seek,
    seekRelative,
    setAudioTrack,
    setSubtitleTrack,
    toggleFullscreen,
  } = playerState

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const activeAudioId = useMemo(
    () => tracks.audio.find((t) => t.selected)?.id ?? null,
    [tracks.audio]
  )

  const activeSubtitleId = useMemo(
    () => tracks.subtitle.find((t) => t.selected)?.id ?? null,
    [tracks.subtitle]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (status !== "playing") return

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          seekRelative(-10)
          break
        case "ArrowRight":
          e.preventDefault()
          seekRelative(10)
          break
        case " ":
          e.preventDefault()
          playPause()
          break
        case "f":
        case "F":
          e.preventDefault()
          toggleFullscreen()
          break
        case "Escape":
          e.preventDefault()
          handleClose()
          break
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [status, seekRelative, playPause, toggleFullscreen, handleClose])

  if (status === "idle") return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 select-none"
      role="application"
      aria-label="Video player"
    >
      {/* Video area — transparent background shows mpv video behind the webview */}
      <div className="flex-1 relative bg-transparent">
        {/* Loader */}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}

        {/* Click to play/pause */}
        {status === "playing" && (
          <button
            onClick={playPause}
            className="absolute inset-0 z-0"
            aria-label={paused ? "Play" : "Pause"}
          />
        )}

        {/* Paused overlay */}
        {paused && status === "playing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Play className="size-16 fill-white/80 text-white/80" />
          </div>
        )}
      </div>

      {/* Title bar */}
      <div className="absolute top-0 inset-x-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{title}</p>
          <p className="text-xs text-white/50 truncate">{episodeName}</p>
        </div>

        <button
          onClick={handleClose}
          className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
          aria-label="Close player"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col gap-2 pb-3 pt-1 px-2 bg-gradient-to-t from-black/80 to-transparent">
        <SeekBar position={position} duration={duration} onSeek={seek} />

        <div className="flex items-center gap-2 px-2">
          {/* Play/Pause */}
          <button
            onClick={playPause}
            className="flex size-9 items-center justify-center rounded-lg text-white/90 hover:bg-white/10 transition-colors"
            aria-label={paused ? "Play" : "Pause"}
          >
            {paused ? (
              <Play className="size-5 fill-current" />
            ) : (
              <Pause className="size-5 fill-current" />
            )}
          </button>

          {/* Skip back/forward */}
          <button
            onClick={() => seekRelative(-10)}
            className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            title="-10s"
            aria-label="Rewind 10 seconds"
          >
            <ArrowBigRight className="size-5 rotate-180" />
          </button>
          <button
            onClick={() => seekRelative(10)}
            className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            title="+10s"
            aria-label="Forward 10 seconds"
          >
            <ArrowBigRight className="size-5" />
          </button>

          {/* Skip opening */}
          <button
            onClick={() => seekRelative(SKIP_OPENING_SECS)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/80 hover:bg-white/10 transition-colors"
            title={`Skip ${SKIP_OPENING_SECS}s`}
            aria-label={`Skip forward ${SKIP_OPENING_SECS} seconds`}
          >
            <SkipForward className="size-3.5" />
            +{SKIP_OPENING_SECS}s
          </button>

          <div className="flex-1" />

          {/* Track selectors */}
          <TrackSelector
            label="Audio"
            tracks={tracks.audio}
            selectedId={activeAudioId}
            onSelect={setAudioTrack}
          />
          <TrackSelector
            label="Subtitles"
            tracks={tracks.subtitle}
            selectedId={activeSubtitleId}
            onSelect={setSubtitleTrack}
          />

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            aria-label="Toggle fullscreen"
          >
            <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 5.5V2.5h3M11 2.5h3v3M14 10.5v3h-3M5 13.5H2v-3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

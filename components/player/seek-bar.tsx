import { useCallback, useMemo, useRef, useState } from "react"

type SeekBarProps = {
  position: number
  duration: number
  onSeek: (secs: number) => void
}

export function SeekBar({ position, duration, onSeek }: SeekBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const fraction = duration > 0 ? position / duration : 0
  const pct = Math.min(100, Math.max(0, fraction * 100))

  const currentLabel = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0")
    const secs = Math.floor(position)
    const mins = Math.floor(secs / 60)
    const hours = Math.floor(mins / 60)
    if (hours > 0) {
      return `${hours}:${pad(mins % 60)}:${pad(secs % 60)}`
    }
    return `${mins}:${pad(secs % 60)}`
  }, [position])

  const durationLabel = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0")
    const secs = Math.floor(duration)
    const mins = Math.floor(secs / 60)
    const hours = Math.floor(mins / 60)
    if (hours > 0) {
      return `${hours}:${pad(mins % 60)}:${pad(secs % 60)}`
    }
    return `${mins}:${pad(secs % 60)}`
  }, [duration])

  const seekFromEvent = useCallback(
    (clientX: number) => {
      if (!barRef.current || duration <= 0) return
      const rect = barRef.current.getBoundingClientRect()
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      onSeek(frac * duration)
    },
    [duration, onSeek]
  )

  return (
    <div className="flex items-center gap-3 px-4">
      <span className="font-mono text-[11px] tabular-nums text-white/80 w-[52px] text-right shrink-0">
        {currentLabel}
      </span>

      <div
        ref={barRef}
        role="slider"
        aria-label="Seek"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        tabIndex={0}
        className="relative flex-1 h-5 flex items-center cursor-pointer group"
        onMouseDown={(e) => {
          e.preventDefault()
          setDragging(true)
          seekFromEvent(e.clientX)
        }}
        onMouseMove={(e) => {
          if (dragging) seekFromEvent(e.clientX)
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onClick={(e) => seekFromEvent(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            onSeek(Math.max(0, position - 10))
          } else if (e.key === "ArrowRight") {
            e.preventDefault()
            onSeek(Math.min(duration, position + 10))
          }
        }}
      >
        <div className="absolute inset-x-0 h-[3px] rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>

      <span className="font-mono text-[11px] tabular-nums text-white/60 w-[52px] shrink-0">
        {durationLabel}
      </span>
    </div>
  )
}

import type { PlayerTrack } from "@/lib/player-backend"
import { cn } from "@/lib/utils"

type TrackSelectorProps = {
  label: string
  tracks: PlayerTrack[]
  selectedId: number | null
  onSelect: (id: number) => void
}

export function TrackSelector({
  label,
  tracks,
  selectedId,
  onSelect,
}: TrackSelectorProps) {
  if (tracks.length <= 1) return null

  return (
    <div className="relative group">
      <button className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/60 transition-colors hover:bg-white/10 hover:text-white/90">
        {label}
        <svg
          className="size-3"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>
      <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
        <div className="rounded-lg border border-white/10 bg-[#1a1a22] py-1 shadow-xl min-w-[120px]">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => onSelect(track.id)}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/10",
                track.id === selectedId
                  ? "text-accent-light font-medium"
                  : "text-white/70"
              )}
            >
              {track.title || track.lang || `Track ${track.id}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

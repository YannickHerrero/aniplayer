"use client"

import Link from "next/link"
import { ArrowLeft, Play } from "lucide-react"

import { MatchPicker } from "@/components/app/match-picker"
import { Button } from "@/components/ui/button"
import type { AnimeDetail } from "@/hooks/use-anime-detail"
import { type AnilistMedia, plainDescription } from "@/lib/anilist"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  RELEASING: "RELEASING",
  FINISHED: "FINISHED",
  NOT_YET_RELEASED: "NOT YET RELEASED",
  CANCELLED: "CANCELLED",
  HIATUS: "HIATUS",
}

export function detailTitle(detail: AnimeDetail): string {
  return detail.media?.title || detail.folder?.folderName || detail.slug
}

export function BackLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] text-[#d8cfd0] transition-colors hover:text-white",
        className
      )}
    >
      <ArrowLeft className="size-4" /> Library
    </Link>
  )
}

export function StatusBadge({ media }: { media: AnilistMedia | null }) {
  if (!media?.status) return null
  return (
    <span className="inline-block rounded-full border border-white/20 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-[#f3c0b1]">
      {[media.season, media.seasonYear, STATUS_LABELS[media.status] ?? media.status]
        .filter(Boolean)
        .join(" · ")}
    </span>
  )
}

export function MetaRow({
  media,
  className,
}: {
  media: AnilistMedia | null
  className?: string
}) {
  const score = media?.meanScore ? (media.meanScore / 10).toFixed(1) : null
  const parts = [
    media?.seasonYear,
    media?.format,
    media?.episodes ? `${media.episodes} episodes` : null,
  ].filter(Boolean) as (string | number)[]

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-[13px] text-[#d8d4dd]",
        className
      )}
    >
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-[#8a7d80]">·</span>}
          {part}
        </span>
      ))}
      {score && (
        <span className="flex items-center gap-2">
          {parts.length > 0 && <span className="text-[#8a7d80]">·</span>}
          <span className="text-yellow">★ {score}</span>
        </span>
      )}
    </div>
  )
}

export function GenreChips({
  media,
  max,
}: {
  media: AnilistMedia | null
  max?: number
}) {
  if (!media || media.genres.length === 0) return null
  const genres = max ? media.genres.slice(0, max) : media.genres
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <span
          key={genre}
          className="rounded-full border border-white/[0.14] bg-white/10 px-3 py-1 text-xs text-[#e7e2ea]"
        >
          {genre}
        </span>
      ))}
    </div>
  )
}

export function Description({
  media,
  className,
}: {
  media: AnilistMedia | null
  className?: string
}) {
  const description = plainDescription(media?.description ?? null)
  if (!description) return null
  return (
    <p
      className={cn(
        "text-sm leading-[1.65] text-[#cfcbd4]",
        className ?? "line-clamp-4"
      )}
    >
      {description}
    </p>
  )
}

export function ResumeButton({ detail }: { detail: AnimeDetail }) {
  if (!detail.resumeFile) return null
  return (
    <Button onClick={() => detail.playEpisode(detail.resumeFile!)}>
      <Play className="size-4 fill-current" />
      {detail.resumeLabel}
    </Button>
  )
}

export function MatchControl({ detail }: { detail: AnimeDetail }) {
  if (!detail.folder) return null
  return (
    <MatchPicker
      folderName={detail.folder.folderName}
      token={detail.token}
      onSelect={(m) => detail.saveMapping(detail.slug, m)}
      trigger={<Button variant="secondary">Change match</Button>}
    />
  )
}

import { AppImage as Image } from "@/components/app/app-image"
import Link from "@/components/app/link"
import { ArrowLeft, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { type AnilistMedia, plainDescription } from "@/lib/anilist"
import { gradientFor } from "@/lib/gradient"

type DetailHeroProps = {
  slug: string
  folderName: string
  media: AnilistMedia | null
  /** Slot for the "change match" control (MatchPicker trigger). */
  matchControl?: React.ReactNode
  /** Resume action — plays the next unwatched episode. */
  onResume?: () => void
  resumeLabel?: string
}

const STATUS_LABELS: Record<string, string> = {
  RELEASING: "RELEASING",
  FINISHED: "FINISHED",
  NOT_YET_RELEASED: "NOT YET RELEASED",
  CANCELLED: "CANCELLED",
  HIATUS: "HIATUS",
}

export function DetailHero({
  slug,
  folderName,
  media,
  matchControl,
  onResume,
  resumeLabel,
}: DetailHeroProps) {
  const title = media?.title || folderName
  const description = plainDescription(media?.description ?? null)
  const score = media?.meanScore ? (media.meanScore / 10).toFixed(1) : null

  const metaParts = [
    media?.seasonYear,
    media?.format,
    media?.episodes ? `${media.episodes} episodes` : null,
  ].filter(Boolean) as (string | number)[]

  return (
    <div className="relative">
      {/* Banner */}
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
      <div className="absolute inset-x-0 top-0 h-[320px] bg-gradient-to-t from-bg via-bg/55 to-bg/30" />

      <div className="relative px-10 pb-[30px] pt-[26px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#d8cfd0] transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" /> Library
        </Link>

        <div className="mt-8 flex items-end gap-[30px]">
          {/* Cover */}
          <div
            className="relative h-[288px] w-[192px] shrink-0 overflow-hidden rounded-[14px] border border-white/[0.08] shadow-[0_24px_50px_-12px_rgba(0,0,0,.7)]"
            style={media?.coverImage ? undefined : { background: gradientFor(slug) }}
          >
            {media?.coverImage && (
              <Image
                src={media.coverImage}
                alt={title}
                fill
                sizes="192px"
                className="object-cover"
                priority
              />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1 pb-1">
            {media?.status && (
              <span className="inline-block rounded-full border border-white/20 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-[#f3c0b1]">
                {[
                  media.season,
                  media.seasonYear,
                  STATUS_LABELS[media.status] ?? media.status,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}

            <h1 className="mt-3 font-display text-[46px] font-bold leading-none tracking-[-0.03em] text-white">
              {title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-[#d8d4dd]">
              {metaParts.map((part, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-[#8a7d80]">·</span>}
                  {part}
                </span>
              ))}
              {score && (
                <span className="flex items-center gap-2">
                  <span className="text-[#8a7d80]">·</span>
                  <span className="text-yellow">★ {score}</span>
                </span>
              )}
            </div>

            {media && media.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {media.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/[0.14] bg-white/10 px-3 py-1 text-xs text-[#e7e2ea]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {description && (
              <p className="mt-3 max-w-[680px] text-sm leading-[1.65] text-[#cfcbd4] line-clamp-4">
                {description}
              </p>
            )}

            <div className="mt-5 flex items-center gap-3">
              {onResume && (
                <Button onClick={onResume}>
                  <Play className="size-4 fill-current" />
                  {resumeLabel ?? "Resume"}
                </Button>
              )}
              {matchControl}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

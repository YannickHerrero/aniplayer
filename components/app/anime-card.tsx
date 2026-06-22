import Image from "next/image"
import Link from "next/link"

import { gradientFor } from "@/lib/gradient"
import type { AnimeFolder } from "@/lib/types"

type AnimeCardProps = {
  folder: AnimeFolder
  /** AniList cover image (from mapping), if known. */
  coverImage?: string | null
  /** Display title (AniList title preferred over folder name). */
  title?: string
}

export function AnimeCard({ folder, coverImage, title }: AnimeCardProps) {
  const displayTitle = title || folder.folderName
  const quality = folder.qualities[0]
  const meta = [
    `${folder.episodeCount} EP`,
    ...(quality ? [quality] : []),
  ].join(" · ")

  return (
    <Link
      href={`/anime/${folder.slug}`}
      className="group relative block aspect-[2/3] overflow-hidden rounded-[11px] border border-[var(--border)] shadow-[0_8px_22px_rgba(0,0,0,.4)] transition-transform duration-200 hover:-translate-y-[5px]"
      style={coverImage ? undefined : { background: gradientFor(folder.slug) }}
    >
      {coverImage && (
        <Image
          src={coverImage}
          alt={displayTitle}
          fill
          sizes="(max-width: 1280px) 16vw, 200px"
          className="object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent to-[55%]" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="font-display text-[13px] font-semibold leading-[1.15] text-white">
          {displayTitle}
        </p>
        <p className="mt-1 font-mono text-[10px] text-white/60">{meta}</p>
      </div>
    </Link>
  )
}

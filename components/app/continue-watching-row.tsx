import Image from "next/image"
import Link from "next/link"

import { gradientFor } from "@/lib/gradient"

export type ContinueWatchingItem = {
  slug: string
  title: string
  coverImage: string | null
  /** Episode the user is up to (next to watch). */
  upNext: number
  /** 0–100 progress through the series. */
  progressPct: number
}

export function ContinueWatchingCard({ item }: { item: ContinueWatchingItem }) {
  return (
    <Link
      href={`/anime/${item.slug}`}
      className="group overflow-hidden rounded-xl border border-[var(--border)] bg-card transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div
        className="relative h-[118px]"
        style={
          item.coverImage ? undefined : { background: gradientFor(item.slug) }
        }
      >
        {item.coverImage && (
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            sizes="33vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent to-[60%]" />
        <p className="absolute bottom-2 left-3 font-display text-sm font-semibold tracking-tight text-white">
          {item.title}
        </p>
      </div>
      <div className="h-[3px] bg-track">
        <div
          className="h-full bg-accent"
          style={{ width: `${item.progressPct}%` }}
        />
      </div>
      <div className="px-3 py-2.5">
        <p className="font-mono text-[11px] text-text-tertiary">
          E{item.upNext} · up next
        </p>
      </div>
    </Link>
  )
}

export function ContinueWatchingRow({ items }: { items: ContinueWatchingItem[] }) {
  if (items.length === 0) return null

  return (
    <section className="mb-7">
      <h2 className="mb-4 font-display text-[17px] font-semibold">
        Continue watching
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {items.map((item) => (
          <ContinueWatchingCard key={item.slug} item={item} />
        ))}
      </div>
    </section>
  )
}

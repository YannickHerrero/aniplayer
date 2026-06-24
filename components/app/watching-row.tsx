"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"

import type { AnilistWatchingEntry } from "@/lib/anilist"
import { gradientFor } from "@/lib/gradient"

type WatchingRowProps = {
  items: AnilistWatchingEntry[]
  onError?: (message: string) => void
}

export function WatchingRow({ items, onError }: WatchingRowProps) {
  if (items.length === 0) return null

  return (
    <section className="mt-7">
      <h2 className="mb-1 font-display text-[17px] font-semibold">
        Watching on AniList
      </h2>
      <p className="mb-4 text-xs text-text-muted">
        Not in your library yet — click to add and download.
      </p>
      <div className="grid grid-cols-6 gap-4">
        {items.map((item) => (
          <WatchingCard key={item.anilistId} item={item} onError={onError} />
        ))}
      </div>
    </section>
  )
}

function WatchingCard({
  item,
  onError,
}: {
  item: AnilistWatchingEntry
  onError?: (message: string) => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const denom = item.episodes ?? "?"
  const progressPct =
    item.episodes && item.episodes > 0
      ? Math.min(100, (item.progress / item.episodes) * 100)
      : 0

  const open = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          anilistId: item.anilistId,
          coverImage: item.coverImage,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        slug?: string
        error?: string
      }
      if (!res.ok || !data.slug) {
        onError?.(data.error ?? "Couldn't add this show")
        setBusy(false)
        return
      }
      router.push(`/anime/${encodeURIComponent(data.slug)}`)
    } catch {
      onError?.("Couldn't add this show")
      setBusy(false)
    }
  }

  return (
    <button
      onClick={open}
      disabled={busy}
      title={`Add “${item.title}” and download`}
      className="group relative block aspect-[2/3] overflow-hidden rounded-[11px] border border-[var(--border)] text-left shadow-[0_8px_22px_rgba(0,0,0,.4)] transition-transform duration-200 hover:-translate-y-[5px] disabled:cursor-wait"
      style={item.coverImage ? undefined : { background: gradientFor(String(item.anilistId)) }}
    >
      {item.coverImage && (
        <Image
          src={item.coverImage}
          alt={item.title}
          fill
          sizes="(max-width: 1280px) 16vw, 200px"
          className="object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent to-[55%]" />

      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="size-6 animate-spin text-white" />
        </div>
      )}

      {/* AniList badge */}
      <span className="absolute right-2 top-2 flex size-[18px] items-center justify-center rounded-[5px] bg-anilist font-display text-[9px] font-bold text-[#021b2e]">
        Al
      </span>

      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="line-clamp-2 font-display text-[13px] font-semibold leading-[1.15] text-white">
          {item.title}
        </p>
        <p className="mt-1 font-mono text-[10px] text-white/70">
          {item.progress} / {denom} watched
        </p>
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full bg-accent"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </button>
  )
}

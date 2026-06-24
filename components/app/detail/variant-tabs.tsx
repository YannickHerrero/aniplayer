"use client"

import Image from "next/image"
import { useState } from "react"

import { EpisodeRows } from "@/components/app/detail/episode-rows"
import {
  BackLink,
  Description,
  GenreChips,
  MatchControl,
  MetaRow,
  ResumeButton,
  StatusBadge,
  detailTitle,
} from "@/components/app/detail/header-bits"
import {
  AnilistBadge,
  NextEpisodeStat,
  ProgressStat,
  ScoreStat,
} from "@/components/app/detail/stats"
import type { AnimeDetail } from "@/hooks/use-anime-detail"
import { gradientFor } from "@/lib/gradient"
import { cn } from "@/lib/utils"

type Tab = "episodes" | "overview" | "tracking"

/** V3 — cinematic banner + tabbed content (Episodes / Overview / Tracking). */
export function VariantTabs({ detail }: { detail: AnimeDetail }) {
  const { media, slug } = detail
  const title = detailTitle(detail)
  const [tab, setTab] = useState<Tab>("episodes")
  const presentCount = detail.episodeViews.filter(
    (e) => e.status === "present"
  ).length

  const tabs: { id: Tab; label: string }[] = [
    { id: "episodes", label: `Episodes` },
    { id: "overview", label: "Overview" },
    { id: "tracking", label: "AniList" },
  ]

  return (
    <div className="min-h-screen bg-bg">
      {/* Cinematic banner */}
      <div className="relative h-[300px]">
        <div
          className="absolute inset-0"
          style={
            media?.bannerImage
              ? {
                  backgroundImage: `url(${media.bannerImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center 30%",
                }
              : { background: gradientFor(slug) }
          }
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/70 to-transparent" />

        <div className="relative flex h-full flex-col px-10 py-7">
          <BackLink />
          <div className="mt-auto flex items-end gap-6">
            <div
              className="relative hidden h-[200px] w-[134px] shrink-0 overflow-hidden rounded-[12px] border border-white/10 shadow-[0_20px_45px_-12px_rgba(0,0,0,.8)] sm:block"
              style={media?.coverImage ? undefined : { background: gradientFor(slug) }}
            >
              {media?.coverImage && (
                <Image
                  src={media.coverImage}
                  alt={title}
                  fill
                  sizes="134px"
                  className="object-cover"
                  priority
                />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <StatusBadge media={media} />
              <h1 className="mt-2.5 font-display text-[40px] font-bold leading-[1.02] tracking-[-0.03em] text-white">
                {title}
              </h1>
              <MetaRow media={media} className="mt-2.5" />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ResumeButton detail={detail} />
                <MatchControl detail={detail} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] items-center gap-1 px-10">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative px-4 py-3.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {t.label}
              {t.id === "episodes" && (
                <span className="ml-1.5 font-mono text-[11px] text-text-faint">
                  {presentCount}/{detail.episodeViews.length}
                </span>
              )}
              {tab === t.id && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-10 pb-16 pt-6">
        {tab === "episodes" && <EpisodeRows detail={detail} />}

        {tab === "overview" && (
          <div className="max-w-[760px] space-y-5">
            <GenreChips media={media} />
            <Description media={media} className="text-[15px] leading-[1.7]" />
            {!media?.description && (
              <p className="text-sm text-text-muted">No synopsis available.</p>
            )}
          </div>
        )}

        {tab === "tracking" && (
          <div className="max-w-[820px] space-y-4">
            <AnilistBadge media={media} />
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[var(--border-strong)] bg-panel p-5">
                <ProgressStat
                  watchedCount={detail.watchedSet.size}
                  total={detail.total}
                  localCount={detail.localCount}
                />
              </div>
              <div className="rounded-2xl border border-[var(--border-strong)] bg-panel p-5">
                <ScoreStat media={media} connected={detail.connected} />
              </div>
              <div className="rounded-2xl border border-[var(--border-strong)] bg-gradient-to-br from-accent/10 to-transparent p-5">
                <NextEpisodeStat media={media} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

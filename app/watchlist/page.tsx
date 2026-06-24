"use client"

import { useState } from "react"

import { AniListGrid } from "@/components/app/anilist-grid"
import { PageShell } from "@/components/app/page-shell"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { useAnilistAuth } from "@/hooks/use-anilist-auth"
import { useAnilistWatching } from "@/hooks/use-anilist-watching"

export default function WatchlistPage() {
  const { token, connected, viewer } = useAnilistAuth()
  const { entries, loading } = useAnilistWatching(
    connected ? (viewer?.id ?? null) : null,
    token
  )
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(
    null
  )

  return (
    <PageShell title="Watchlist" subtitle="Your AniList watching list">
      {!connected ? (
        <p className="text-sm text-text-secondary">
          Connect your AniList account (sidebar) to see your watchlist.
        </p>
      ) : loading ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Nothing on your AniList watching list.
        </p>
      ) : (
        <AniListGrid
          items={entries}
          onError={(message) => setToast({ message, tone: "error" })}
        />
      )}

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />
    </PageShell>
  )
}

"use client"

import { useState } from "react"

import { AniListGrid } from "@/components/app/anilist-grid"
import { PageShell } from "@/components/app/page-shell"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { useAnilistAuth } from "@/hooks/use-anilist-auth"
import { useAnilistFavorites } from "@/hooks/use-anilist-favorites"

export default function FavoritesPage() {
  const { token, connected, viewer } = useAnilistAuth()
  const { entries, loading } = useAnilistFavorites(
    connected ? (viewer?.id ?? null) : null,
    token
  )
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(
    null
  )

  return (
    <PageShell title="Favorites" subtitle="Your AniList favorite anime">
      {!connected ? (
        <p className="text-sm text-text-secondary">
          Connect your AniList account (sidebar) to see your favorites.
        </p>
      ) : loading ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-text-secondary">No favorite anime yet.</p>
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

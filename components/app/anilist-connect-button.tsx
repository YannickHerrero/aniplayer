"use client"

import { useAnilistAuth } from "@/hooks/use-anilist-auth"

export function AnilistConnectButton() {
  const { connected, configured, viewer, connect, disconnect } =
    useAnilistAuth()

  if (!configured) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-panel p-3">
        <div className="flex items-center gap-2">
          <span className="flex size-[18px] items-center justify-center rounded-[5px] bg-anilist font-display text-[10px] font-bold text-[#021b2e]">
            Al
          </span>
          <span className="text-[12px] text-text-secondary">AniList</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-text-muted">
          Set NEXT_PUBLIC_ANILIST_CLIENT_ID to enable tracking.
        </p>
      </div>
    )
  }

  if (connected) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-panel p-3">
        <div className="flex items-center gap-2">
          <span className="flex size-[18px] items-center justify-center rounded-[5px] bg-anilist font-display text-[10px] font-bold text-[#021b2e]">
            Al
          </span>
          <span className="truncate text-[12px] text-text-primary">
            {viewer?.name ?? "Connected"}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="mt-2 text-[11px] text-text-muted transition-colors hover:text-text-secondary"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-anilist/40 bg-anilist/10 px-3 py-2.5 text-[13px] font-medium text-[#7dd3ff] transition-colors hover:bg-anilist/20"
    >
      <span className="flex size-[18px] items-center justify-center rounded-[5px] bg-anilist font-display text-[10px] font-bold text-[#021b2e]">
        Al
      </span>
      Connect AniList
    </button>
  )
}

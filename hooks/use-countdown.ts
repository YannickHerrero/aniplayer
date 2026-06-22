"use client"

import { useEffect, useState } from "react"

import { formatCountdown } from "@/lib/anilist"

/**
 * Live countdown to a unix timestamp (seconds). Returns the formatted string,
 * ticking every second. Returns null when no target is given.
 */
export function useCountdown(airingAt: number | null): string | null {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    if (airingAt === null) return
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [airingAt])

  if (airingAt === null) return null
  return formatCountdown(airingAt - now)
}

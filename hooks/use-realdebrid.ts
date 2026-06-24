"use client"

import { useCallback, useEffect, useState } from "react"

import {
  clearRealDebridKey,
  getStoredRealDebridKey,
  storeRealDebridKey,
} from "@/lib/realdebrid-auth"

type UseRealDebridResult = {
  key: string | null
  /** Whether a key is set (download feature gate). */
  configured: boolean
  setKey: (key: string) => void
  clearKey: () => void
}

export function useRealDebrid(): UseRealDebridResult {
  const [key, setKeyState] = useState<string | null>(null)

  // Load on mount and stay in sync across tabs.
  useEffect(() => {
    setKeyState(getStoredRealDebridKey())
    const onStorage = () => setKeyState(getStoredRealDebridKey())
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setKey = useCallback((next: string) => {
    storeRealDebridKey(next)
    setKeyState(getStoredRealDebridKey())
  }, [])

  const clearKey = useCallback(() => {
    clearRealDebridKey()
    setKeyState(null)
  }, [])

  return { key, configured: Boolean(key), setKey, clearKey }
}

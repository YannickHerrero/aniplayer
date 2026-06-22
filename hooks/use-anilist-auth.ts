"use client"

import { useCallback, useEffect, useState } from "react"

import { type AnilistViewer, fetchAnilistViewer } from "@/lib/anilist"
import {
  buildAuthorizeUrl,
  clearToken,
  getStoredToken,
} from "@/lib/anilist-auth"

type UseAnilistAuthResult = {
  token: string | null
  connected: boolean
  /** Whether a client ID is configured (connect is possible). */
  configured: boolean
  viewer: AnilistViewer | null
  connect: () => void
  disconnect: () => void
}

export function useAnilistAuth(): UseAnilistAuthResult {
  const [token, setToken] = useState<string | null>(null)
  const [viewer, setViewer] = useState<AnilistViewer | null>(null)

  // Load the stored token on mount and keep it in sync across tabs.
  useEffect(() => {
    setToken(getStoredToken()?.accessToken ?? null)
    const onStorage = () => setToken(getStoredToken()?.accessToken ?? null)
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  // Resolve the viewer whenever the token changes.
  useEffect(() => {
    if (!token) {
      setViewer(null)
      return
    }
    const controller = new AbortController()
    fetchAnilistViewer(token, controller.signal)
      .then((v) => setViewer(v))
      .catch(() => setViewer(null))
    return () => controller.abort()
  }, [token])

  const connect = useCallback(() => {
    const url = buildAuthorizeUrl()
    if (url) window.location.href = url
  }, [])

  const disconnect = useCallback(() => {
    clearToken()
    setToken(null)
    setViewer(null)
  }, [])

  return {
    token,
    connected: Boolean(token),
    configured: Boolean(process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID),
    viewer,
    connect,
    disconnect,
  }
}

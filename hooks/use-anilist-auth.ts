"use client"

import { useCallback, useEffect, useState } from "react"

import { type AnilistViewer, fetchAnilistViewer } from "@/lib/anilist"
import {
  buildAuthorizeUrl,
  clearToken,
  getStoredToken,
} from "@/lib/anilist-auth"
import { getConfig } from "@/lib/backend"

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
  const [authConfig, setAuthConfig] = useState<{
    clientId: string | null
    redirectUri: string | null
  }>({ clientId: null, redirectUri: null })

  // Load the stored token on mount and keep it in sync across tabs.
  useEffect(() => {
    setToken(getStoredToken()?.accessToken ?? null)
    const onStorage = () => setToken(getStoredToken()?.accessToken ?? null)
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        if (controller.signal.aborted) return
        const data = await getConfig()
        setAuthConfig({
          clientId: data.anilistClientId ?? null,
          redirectUri: data.anilistRedirectUri ?? null,
        })
      } catch (err) {
        if ((err as Error).name === "AbortError") return
      }
    })()
    return () => controller.abort()
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
    const url = buildAuthorizeUrl(authConfig.clientId, authConfig.redirectUri)
    if (url) window.location.href = url
  }, [authConfig.clientId, authConfig.redirectUri])

  const disconnect = useCallback(() => {
    clearToken()
    setToken(null)
    setViewer(null)
  }, [])

  return {
    token,
    connected: Boolean(token),
    configured: Boolean(authConfig.clientId),
    viewer,
    connect,
    disconnect,
  }
}

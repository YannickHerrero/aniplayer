"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { makeStoredToken, storeToken } from "@/lib/anilist-auth"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const oauthError = params.get("error")

    if (oauthError) {
      setError(params.get("message") || oauthError)
      return
    }
    if (!code) {
      setError("No authorization code returned from AniList.")
      return
    }

    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch("/api/auth/anilist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
          signal: controller.signal,
        })
        const data = (await res.json().catch(() => ({}))) as {
          accessToken?: string
          expiresIn?: number | null
          error?: string
        }
        if (!res.ok || !data.accessToken) {
          setError(data.error ?? "Failed to connect to AniList.")
          return
        }
        storeToken(makeStoredToken(data.accessToken, data.expiresIn))
        router.replace("/")
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError("Failed to connect to AniList.")
      }
    })()
    return () => controller.abort()
  }, [router])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      {error ? (
        <>
          <p className="max-w-md text-sm text-red-400">{error}</p>
          <Link href="/" className="text-sm text-accent-light hover:underline">
            Back to library
          </Link>
        </>
      ) : (
        <p className="text-sm text-text-secondary">Connecting to AniList…</p>
      )}
    </div>
  )
}

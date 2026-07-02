"use client"

import Link from "@/components/app/link"
import { useRouter } from "@/lib/navigation"
import { useLocation } from "react-router-dom"
import { useEffect, useState } from "react"

import { exchangeAnilistCode } from "@/lib/backend"
import { makeStoredToken, storeToken } from "@/lib/anilist-auth"

export default function AuthCallbackPage() {
  const router = useRouter()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search || window.location.search)
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
        if (controller.signal.aborted) return
        const data = await exchangeAnilistCode(code)
        storeToken(makeStoredToken(data.accessToken, data.expiresIn))
        router.replace("/")
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError("Failed to connect to AniList.")
      }
    })()
    return () => controller.abort()
  }, [location.search, router])

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

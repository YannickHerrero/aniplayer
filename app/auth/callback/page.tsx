"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { parseTokenFromHash, storeToken } from "@/lib/anilist-auth"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = parseTokenFromHash(window.location.hash)
    if (!token) {
      setError("No access token returned from AniList.")
      return
    }
    storeToken(token)
    router.replace("/")
  }, [router])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      {error ? (
        <>
          <p className="text-sm text-red-400">{error}</p>
          <a href="/" className="text-sm text-accent-light hover:underline">
            Back to library
          </a>
        </>
      ) : (
        <p className="text-sm text-text-secondary">Connecting to AniList…</p>
      )}
    </div>
  )
}

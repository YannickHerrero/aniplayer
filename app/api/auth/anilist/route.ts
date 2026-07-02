import { NextResponse } from "next/server"

import { firstConfigured, readRuntimeConfig } from "@/lib/app-config"

const TOKEN_URL = "https://anilist.co/api/v2/oauth/token"

/**
 * Exchange an AniList authorization code for an access token. Runs server-side
 * so the client secret never reaches the browser.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const code = (body as { code?: unknown })?.code
  if (typeof code !== "string" || !code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 })
  }

  const config = await readRuntimeConfig()
  const clientId = firstConfigured(
    process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID,
    config.anilistClientId
  )
  const clientSecret = firstConfigured(
    process.env.ANILIST_CLIENT_SECRET,
    config.anilistClientSecret
  )
  const redirectUri = firstConfigured(
    process.env.NEXT_PUBLIC_ANILIST_REDIRECT_URI,
    config.anilistRedirectUri
  )

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "AniList is not fully configured. Set NEXT_PUBLIC_ANILIST_CLIENT_ID, ANILIST_CLIENT_SECRET and NEXT_PUBLIC_ANILIST_REDIRECT_URI in .env.local.",
      },
      { status: 500 }
    )
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error?: string
    hint?: string
    message?: string
  }

  if (!res.ok || !data.access_token) {
    return NextResponse.json(
      {
        error:
          data.message || data.error || "AniList token exchange failed.",
        hint: data.hint,
      },
      { status: res.status === 200 ? 502 : res.status }
    )
  }

  return NextResponse.json({
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? null,
  })
}

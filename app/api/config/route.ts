import { NextResponse } from "next/server"

import {
  type RuntimeConfig,
  firstConfigured,
  readRuntimeConfig,
  writeRuntimeConfig,
} from "@/lib/app-config"
import { getDataDir } from "@/lib/data-dir"
import { getLibraryRoot } from "@/lib/library-paths"

export const dynamic = "force-dynamic"

/** Non-secret config for display/debugging. Never exposes the AniList token. */
export async function GET() {
  const config = await readRuntimeConfig()
  const anilistClientId = firstConfigured(
    process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID,
    config.anilistClientId
  )
  const anilistRedirectUri = firstConfigured(
    process.env.NEXT_PUBLIC_ANILIST_REDIRECT_URI,
    config.anilistRedirectUri
  )
  const anilistClientSecret = firstConfigured(
    process.env.ANILIST_CLIENT_SECRET,
    config.anilistClientSecret
  )

  const { anilistClientSecret: _secret, ...safeConfig } = config

  return NextResponse.json({
    libraryRoot: getLibraryRoot(),
    dataDir: getDataDir(),
    config: safeConfig,
    anilistClientConfigured: Boolean(anilistClientId),
    anilistClientId: anilistClientId ?? null,
    anilistRedirectUri: anilistRedirectUri ?? null,
    anilistClientSecretConfigured: Boolean(anilistClientSecret),
  })
}

export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (!isConfigPatch(body)) {
    return NextResponse.json({ error: "Invalid config" }, { status: 400 })
  }

  const current = await readRuntimeConfig()
  const next = { ...current }
  for (const [key, value] of Object.entries(body) as Array<
    [keyof RuntimeConfig, string | null]
  >) {
    const normalized = value?.trim() || undefined
    if (normalized) next[key] = normalized
    else delete next[key]
  }

  await writeRuntimeConfig(next)
  const { anilistClientSecret: _secret, ...safeConfig } = next
  return NextResponse.json({ config: safeConfig })
}

function isConfigPatch(body: unknown): body is Partial<
  Record<keyof RuntimeConfig, string | null>
> {
  if (typeof body !== "object" || body === null) return false
  const allowed = new Set([
    "animeLibraryPath",
    "downloadsPath",
    "dataDir",
    "vlcPath",
    "anilistClientId",
    "anilistClientSecret",
    "anilistRedirectUri",
  ])
  return Object.entries(body).every(
    ([key, value]) =>
      allowed.has(key) &&
      (typeof value === "string" || value === null || value === undefined)
  )
}

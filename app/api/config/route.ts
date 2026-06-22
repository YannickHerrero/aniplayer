import { NextResponse } from "next/server"

import { getDataDir } from "@/lib/data-dir"
import { getLibraryRoot } from "@/lib/library-paths"

export const dynamic = "force-dynamic"

/** Non-secret config for display/debugging. Never exposes the AniList token. */
export async function GET() {
  return NextResponse.json({
    libraryRoot: getLibraryRoot(),
    dataDir: getDataDir(),
    anilistClientConfigured: Boolean(
      process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID
    ),
    anilistRedirectUri: process.env.NEXT_PUBLIC_ANILIST_REDIRECT_URI ?? null,
  })
}

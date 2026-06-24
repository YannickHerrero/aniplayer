import { NextResponse } from "next/server"

import { resolveBestSource } from "@/lib/resolve-source"

export const dynamic = "force-dynamic"

/**
 * GET /api/sources?slug=<slug>&episode=<n>
 * Header: x-realdebrid-key
 * Returns the best cached source for an episode (or a status when none).
 */
export async function GET(request: Request) {
  const key = request.headers.get("x-realdebrid-key")
  if (!key) {
    return NextResponse.json(
      { error: "Real-Debrid key required" },
      { status: 401 }
    )
  }

  const url = new URL(request.url)
  const slug = url.searchParams.get("slug")
  const episode = Number(url.searchParams.get("episode"))

  if (!slug || !Number.isInteger(episode) || episode < 1) {
    return NextResponse.json(
      { error: "slug and a valid episode are required" },
      { status: 400 }
    )
  }

  const result = await resolveBestSource(slug, episode, key)

  if (result.status === "ok") {
    const { title, quality, size, filename, isCached } = result.source
    return NextResponse.json({
      status: "ok",
      source: { title, quality, size, filename, isCached },
    })
  }

  return NextResponse.json({ status: result.status })
}

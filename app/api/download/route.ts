import { NextResponse } from "next/server"

import { DownloadError, getDownload, startDownload } from "@/lib/downloader"

export const dynamic = "force-dynamic"

/** GET /api/download?slug=&episode= → current status (or null). */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get("slug")
  const episode = Number(url.searchParams.get("episode"))

  if (!slug || !Number.isInteger(episode)) {
    return NextResponse.json(
      { error: "slug and episode are required" },
      { status: 400 }
    )
  }

  const download = await getDownload(slug, episode)
  return NextResponse.json({ download })
}

/** POST { slug, episode } + x-realdebrid-key → start a download. */
export async function POST(request: Request) {
  const key = request.headers.get("x-realdebrid-key")
  if (!key) {
    return NextResponse.json(
      { error: "Real-Debrid key required" },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (!isDownloadRequest(body)) {
    return NextResponse.json(
      { error: "slug and episode are required" },
      { status: 400 }
    )
  }

  try {
    const download = await startDownload(body.slug, body.episode, key)
    return NextResponse.json({ download })
  } catch (err) {
    if (err instanceof DownloadError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: "Failed to start download" },
      { status: 500 }
    )
  }
}

function isDownloadRequest(
  body: unknown
): body is { slug: string; episode: number } {
  if (typeof body !== "object" || body === null) return false
  const b = body as Record<string, unknown>
  return typeof b.slug === "string" && typeof b.episode === "number"
}

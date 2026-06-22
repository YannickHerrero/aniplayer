import { NextResponse } from "next/server"

import { PlaybackError, playInVlc } from "@/lib/vlc"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (!isPlayRequest(body)) {
    return NextResponse.json(
      { error: "slug and fileName are required" },
      { status: 400 }
    )
  }

  try {
    await playInVlc(body.slug, body.fileName)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof PlaybackError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: "Failed to launch VLC" },
      { status: 500 }
    )
  }
}

function isPlayRequest(
  body: unknown
): body is { slug: string; fileName: string } {
  if (typeof body !== "object" || body === null) return false
  const b = body as Record<string, unknown>
  return typeof b.slug === "string" && typeof b.fileName === "string"
}

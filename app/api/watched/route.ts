import { NextResponse } from "next/server"

import { readWatched, setWatched } from "@/lib/watched-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const watched = await readWatched()
  return NextResponse.json({ watched })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (!isWatchedRequest(body)) {
    return NextResponse.json(
      { error: "slug, episode and watched are required" },
      { status: 400 }
    )
  }

  const list = await setWatched(body.slug, body.episode, body.watched)
  return NextResponse.json({ slug: body.slug, watched: list })
}

function isWatchedRequest(body: unknown): body is {
  slug: string
  episode: number
  watched: boolean
} {
  if (typeof body !== "object" || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.slug === "string" &&
    typeof b.episode === "number" &&
    typeof b.watched === "boolean"
  )
}

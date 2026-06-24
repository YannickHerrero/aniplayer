import { NextResponse } from "next/server"

import { createAnimeFolder, scanLibrary } from "@/lib/library"
import { getLibraryRoot } from "@/lib/library-paths"
import { readMappings, setMapping } from "@/lib/mapping-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const folders = await scanLibrary()
  return NextResponse.json({
    root: getLibraryRoot(),
    folders,
  })
}

/**
 * Create an empty library folder + AniList mapping for a watched-on-AniList
 * show the user wants to start downloading. Returns the slug (folder name) to
 * navigate to. Reuses an existing folder if this anilistId is already mapped.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (!isCreateRequest(body)) {
    return NextResponse.json(
      { error: "title and anilistId are required" },
      { status: 400 }
    )
  }

  // Don't duplicate: if this anilistId is already mapped, return that slug.
  const mappings = await readMappings()
  const existing = Object.entries(mappings).find(
    ([, m]) => m.anilistId === body.anilistId
  )
  if (existing) {
    return NextResponse.json({ slug: existing[0], reused: true })
  }

  const folderName = await createAnimeFolder(body.title)
  if (!folderName) {
    return NextResponse.json(
      { error: "Could not create a folder for this title" },
      { status: 400 }
    )
  }

  await setMapping(folderName, {
    anilistId: body.anilistId,
    title: body.title,
    coverImage: body.coverImage ?? null,
  })

  return NextResponse.json({ slug: folderName, reused: false })
}

function isCreateRequest(body: unknown): body is {
  title: string
  anilistId: number
  coverImage?: string | null
} {
  if (typeof body !== "object" || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.title === "string" &&
    b.title.trim().length > 0 &&
    typeof b.anilistId === "number"
  )
}

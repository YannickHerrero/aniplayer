import { NextResponse } from "next/server"

import { getKitsuId } from "@/lib/kitsu-map"
import { getMapping } from "@/lib/mapping-store"

export const dynamic = "force-dynamic"

/**
 * GET /api/mappable?slug=<slug> → { mappable }
 * Cheap local check (mapping + Kitsu index, no Torrentio call) so the UI can
 * hide the download feature for titles with no Kitsu id.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 })
  }

  const mapping = await getMapping(slug)
  if (!mapping?.anilistId) {
    return NextResponse.json({ mappable: false })
  }

  const kitsuId = await getKitsuId(mapping.anilistId)
  return NextResponse.json({ mappable: kitsuId != null })
}

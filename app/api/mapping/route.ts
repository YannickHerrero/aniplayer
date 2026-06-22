import { NextResponse } from "next/server"

import { deleteMapping, readMappings, setMapping } from "@/lib/mapping-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const mappings = await readMappings()
  return NextResponse.json({ mappings })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (!isMappingRequest(body)) {
    return NextResponse.json(
      { error: "slug and anilistId are required" },
      { status: 400 }
    )
  }

  const mapping = await setMapping(body.slug, {
    anilistId: body.anilistId,
    title: body.title,
    coverImage: body.coverImage ?? null,
  })

  return NextResponse.json({ mapping })
}

export async function DELETE(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 })
  }
  await deleteMapping(slug)
  return NextResponse.json({ ok: true })
}

function isMappingRequest(body: unknown): body is {
  slug: string
  anilistId: number
  title: string
  coverImage?: string | null
} {
  if (typeof body !== "object" || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.slug === "string" &&
    typeof b.anilistId === "number" &&
    typeof b.title === "string"
  )
}

import { NextResponse } from "next/server"

import { scanLibraryFolder } from "@/lib/library"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const folder = await scanLibraryFolder(slug)

  if (!folder) {
    return NextResponse.json({ error: "Anime not found" }, { status: 404 })
  }

  return NextResponse.json({ folder })
}

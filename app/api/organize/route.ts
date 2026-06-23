import { NextResponse } from "next/server"

import { getDownloadsRoot } from "@/lib/library-paths"
import {
  type MoveRequest,
  moveLooseVideos,
  proposeOrganization,
} from "@/lib/organizer"

export const dynamic = "force-dynamic"

export async function GET() {
  const proposals = await proposeOrganization()
  return NextResponse.json({
    downloadsRoot: getDownloadsRoot(),
    proposals,
  })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const moves = (body as { moves?: unknown })?.moves
  if (!Array.isArray(moves) || !moves.every(isMoveRequest)) {
    return NextResponse.json(
      { error: "moves must be an array of { fileName, targetFolder }" },
      { status: 400 }
    )
  }

  const results = await moveLooseVideos(moves)
  return NextResponse.json({ results })
}

function isMoveRequest(value: unknown): value is MoveRequest {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.fileName === "string" && typeof v.targetFolder === "string"
}

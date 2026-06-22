import { NextResponse } from "next/server"

import { scanLibrary } from "@/lib/library"
import { getLibraryRoot } from "@/lib/library-paths"

export const dynamic = "force-dynamic"

export async function GET() {
  const folders = await scanLibrary()
  return NextResponse.json({
    root: getLibraryRoot(),
    folders,
  })
}

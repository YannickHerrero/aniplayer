import { spawn } from "node:child_process"
import { access, realpath, stat } from "node:fs/promises"
import path from "node:path"

import { isVideoFile } from "@/lib/episode-parser"
import { firstConfigured, readRuntimeConfigSync } from "@/lib/app-config"
import {
  getLibraryRoot,
  isSafeSegment,
  slugToFolderName,
} from "@/lib/library-paths"

function getVlcBinary(): string {
  const config = readRuntimeConfigSync()
  const configured = firstConfigured(process.env.VLC_PATH, config.vlcPath)
  if (configured) return configured
  if (process.platform === "darwin") {
    return "/Applications/VLC.app/Contents/MacOS/VLC"
  }
  return process.platform === "win32" ? "vlc.exe" : "vlc"
}

export class PlaybackError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message)
  }
}

/**
 * Resolve and validate an episode path, then launch it in VLC (detached).
 * Throws PlaybackError (with an HTTP status) on any validation failure.
 */
export async function playInVlc(slug: string, fileName: string): Promise<void> {
  const folderName = slugToFolderName(slug)

  // No traversal / separators in either segment.
  if (!isSafeSegment(folderName) || !isSafeSegment(fileName)) {
    throw new PlaybackError("Invalid path segment")
  }
  if (!isVideoFile(fileName)) {
    throw new PlaybackError("Not a video file")
  }

  const root = getLibraryRoot()
  const target = path.join(root, folderName, fileName)

  // Containment: the real target must live inside the real library root.
  let realRoot: string
  let realTarget: string
  try {
    realRoot = await realpath(root)
    realTarget = await realpath(target)
  } catch {
    throw new PlaybackError("File not found", 404)
  }

  if (
    realTarget !== realRoot &&
    !realTarget.startsWith(realRoot + path.sep)
  ) {
    throw new PlaybackError("Path escapes library root", 403)
  }

  const info = await stat(realTarget)
  if (!info.isFile()) {
    throw new PlaybackError("Not a file")
  }

  await launch(realTarget)
}

async function launch(absolutePath: string): Promise<void> {
  // Prefer the configured/default VLC binary; fall back to `open -a VLC` on macOS.
  const vlcBinary = getVlcBinary()
  let command = vlcBinary
  let args = [absolutePath]
  try {
    if (path.isAbsolute(vlcBinary) || vlcBinary.includes(path.sep)) {
      await access(vlcBinary)
    }
  } catch {
    if (process.platform !== "darwin") throw new Error("VLC binary not found")
    command = "open"
    args = ["-a", "VLC", absolutePath]
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  })
  child.unref()
}

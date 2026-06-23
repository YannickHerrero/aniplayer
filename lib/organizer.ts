import { copyFile, mkdir, readdir, realpath, rename, stat, unlink } from "node:fs/promises"
import path from "node:path"

import { isVideoFile, parseEpisode } from "@/lib/episode-parser"
import {
  getDownloadsRoot,
  getLibraryRoot,
  isSafeSegment,
} from "@/lib/library-paths"

export type LooseVideo = {
  fileName: string
  episode: number | null
  quality: string | null
}

export type OrganizeProposal = LooseVideo & {
  /** Derived anime title (used for new folders). */
  title: string
  /** Proposed destination folder under the library root. */
  targetFolder: string
  /** Whether the proposed folder already exists in the library. */
  existing: boolean
}

export type MoveRequest = {
  fileName: string
  targetFolder: string
}

export type MoveResult = {
  fileName: string
  targetFolder: string
  ok: boolean
  reason?: string
}

/** Derive a clean anime title from a messy episode filename. */
export function titleFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  let s = dot > 0 ? fileName.slice(0, dot) : fileName

  s = s.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ")
  s = s.replace(/\bS\d{1,2}\s*E\d{1,3}\b/gi, " ")
  s = s.replace(/\b(?:episode|ep)[\s._-]*\d{1,3}\b/gi, " ")
  s = s.replace(
    /\b(1080p|720p|480p|2160p|4k|bd|bluray|web-?dl|hevc|x265|x264|av1|dual\s*audio)\b/gi,
    " "
  )
  s = s.replace(/\b(19|20)\d{2}\b/g, " ")

  // Remove the detected episode number where it trails the title (dash or bare).
  const { episode } = parseEpisode(fileName)
  if (episode != null) {
    const padded = `0*${episode}`
    s = s.replace(new RegExp(`[-\\s]+${padded}(v\\d+)?\\s*$`, "i"), " ")
  }

  return s
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** Pick the best existing folder whose normalized name overlaps the title. */
function matchExistingFolder(
  title: string,
  existingFolders: string[]
): string | null {
  const nt = normalize(title)
  if (!nt) return null

  let best: string | null = null
  let bestLen = 0
  for (const folder of existingFolders) {
    const nf = normalize(folder)
    if (!nf) continue
    if ((nt.includes(nf) || nf.includes(nt)) && nf.length > bestLen) {
      best = folder
      bestLen = nf.length
    }
  }
  return best
}

/** Video files sitting directly in the Downloads root (non-recursive). */
export async function scanLooseVideos(): Promise<LooseVideo[]> {
  const root = getDownloadsRoot()
  let dirents
  try {
    dirents = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }

  return dirents
    .filter((d) => d.isFile() && isVideoFile(d.name))
    .map((d) => {
      const { episode, quality } = parseEpisode(d.name)
      return { fileName: d.name, episode, quality }
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName))
}

/** Propose a destination folder for each loose video. */
export async function proposeOrganization(): Promise<OrganizeProposal[]> {
  const libraryRoot = getLibraryRoot()
  const loose = await scanLooseVideos()

  let existingFolders: string[] = []
  try {
    const dirents = await readdir(libraryRoot, { withFileTypes: true })
    existingFolders = dirents
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name)
  } catch {
    existingFolders = []
  }

  return loose.map((file) => {
    const title = titleFromFileName(file.fileName)
    const match = matchExistingFolder(title, existingFolders)
    return {
      ...file,
      title,
      targetFolder: match ?? title,
      existing: match != null,
    }
  })
}

/** Move loose videos into their target folders under the library root. */
export async function moveLooseVideos(
  moves: MoveRequest[]
): Promise<MoveResult[]> {
  const downloadsRoot = getDownloadsRoot()
  const libraryRoot = getLibraryRoot()

  let realDownloads: string
  try {
    realDownloads = await realpath(downloadsRoot)
  } catch {
    return moves.map((m) => ({
      fileName: m.fileName,
      targetFolder: m.targetFolder,
      ok: false,
      reason: "Downloads folder not found",
    }))
  }

  const results: MoveResult[] = []
  for (const move of moves) {
    const targetFolder = move.targetFolder.trim()
    const result: MoveResult = {
      fileName: move.fileName,
      targetFolder,
      ok: false,
    }

    if (
      !isSafeSegment(move.fileName) ||
      !isVideoFile(move.fileName) ||
      !isSafeSegment(targetFolder)
    ) {
      results.push({ ...result, reason: "Invalid file or folder name" })
      continue
    }

    try {
      const src = path.join(downloadsRoot, move.fileName)
      const realSrc = await realpath(src)
      // Only move files that actually live directly in the Downloads root.
      if (path.dirname(realSrc) !== realDownloads) {
        results.push({ ...result, reason: "File is not in Downloads root" })
        continue
      }
      const info = await stat(realSrc)
      if (!info.isFile()) {
        results.push({ ...result, reason: "Not a file" })
        continue
      }

      const destDir = path.join(libraryRoot, targetFolder)
      const destPath = path.join(destDir, move.fileName)

      // Don't overwrite an existing destination file.
      const exists = await stat(destPath).then(
        () => true,
        () => false
      )
      if (exists) {
        results.push({ ...result, reason: "Destination already exists" })
        continue
      }

      await mkdir(destDir, { recursive: true })
      try {
        await rename(realSrc, destPath)
      } catch (err) {
        // Cross-device move: copy then remove.
        if ((err as NodeJS.ErrnoException).code === "EXDEV") {
          await copyFile(realSrc, destPath)
          await unlink(realSrc)
        } else {
          throw err
        }
      }

      results.push({ ...result, ok: true })
    } catch {
      results.push({ ...result, reason: "Move failed" })
    }
  }

  return results
}

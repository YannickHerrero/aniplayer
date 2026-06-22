import { homedir } from "node:os"
import path from "node:path"

const DEFAULT_LIBRARY = "~/Downloads/anime"

/** Expand a leading `~` to the user's home directory. */
function expandTilde(input: string): string {
  if (input === "~") return homedir()
  if (input.startsWith("~/")) return path.join(homedir(), input.slice(2))
  return input
}

/** Absolute path to the anime library root (from ANIME_LIBRARY_PATH). */
export function getLibraryRoot(): string {
  const configured = process.env.ANIME_LIBRARY_PATH?.trim() || DEFAULT_LIBRARY
  return path.resolve(expandTilde(configured))
}

/** A folder name is safe if it has no path separators or traversal. */
export function isSafeSegment(segment: string): boolean {
  return (
    segment.length > 0 &&
    !segment.includes("/") &&
    !segment.includes("\\") &&
    !segment.includes("\0") &&
    segment !== "." &&
    segment !== ".."
  )
}

/** Encode a folder name into a URL-safe slug. */
export function folderNameToSlug(folderName: string): string {
  return encodeURIComponent(folderName)
}

/** Decode a slug back to the raw folder name. */
export function slugToFolderName(slug: string): string {
  return decodeURIComponent(slug)
}

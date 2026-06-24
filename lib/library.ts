import fs from "node:fs/promises"
import path from "node:path"

import {
  isVideoFile,
  parseEpisode,
  sortEpisodes,
} from "@/lib/episode-parser"
import { folderNameToSlug, getLibraryRoot } from "@/lib/library-paths"
import type { AnimeFolder, EpisodeFile } from "@/lib/types"

/** Scan a single anime folder into episode files. */
async function scanAnimeFolder(
  folderName: string,
  absolutePath: string
): Promise<AnimeFolder> {
  let entries: string[] = []
  try {
    const dirents = await fs.readdir(absolutePath, { withFileTypes: true })
    entries = dirents
      .filter((d) => d.isFile() && isVideoFile(d.name))
      .map((d) => d.name)
  } catch {
    entries = []
  }

  const episodes: EpisodeFile[] = entries.map((fileName) => {
    const { episode, season, quality } = parseEpisode(fileName)
    return {
      fileName,
      absolutePath: path.join(absolutePath, fileName),
      episode,
      season,
      quality,
    }
  })

  const sorted = sortEpisodes(episodes)
  const qualities = Array.from(
    new Set(sorted.map((e) => e.quality).filter((q): q is string => !!q))
  )

  return {
    slug: folderNameToSlug(folderName),
    folderName,
    absolutePath,
    episodes: sorted,
    episodeCount: sorted.length,
    qualities,
  }
}

/** Scan the whole library: one AnimeFolder per subfolder. */
export async function scanLibrary(): Promise<AnimeFolder[]> {
  const root = getLibraryRoot()

  let dirents
  try {
    dirents = await fs.readdir(root, { withFileTypes: true })
  } catch {
    // Library root doesn't exist yet — return empty instead of throwing.
    return []
  }

  const folders = dirents.filter((d) => d.isDirectory() && !d.name.startsWith("."))

  const scanned = await Promise.all(
    folders.map((d) => scanAnimeFolder(d.name, path.join(root, d.name)))
  )

  return scanned.sort((a, b) =>
    a.folderName.localeCompare(b.folderName, undefined, { sensitivity: "base" })
  )
}

/** Scan a single folder by slug, or null if it doesn't exist. */
export async function scanLibraryFolder(
  slug: string
): Promise<AnimeFolder | null> {
  const all = await scanLibrary()
  // Match the encoded slug or the raw folder name: Next.js decodes the route
  // param, so a slug like "A%20B" arrives here as the folder name "A B".
  return (
    all.find(
      (folder) => folder.slug === slug || folder.folderName === slug
    ) ?? null
  )
}

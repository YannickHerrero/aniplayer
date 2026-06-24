import { createWriteStream } from "node:fs"
import { mkdir, realpath, rename, stat, unlink } from "node:fs/promises"
import path from "node:path"
import { Readable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web"

import { deleteDownload, readDownloads, writeDownload } from "@/lib/downloads-store"
import { isVideoFile } from "@/lib/episode-parser"
import {
  getLibraryRoot,
  isSafeSegment,
  slugToFolderName,
} from "@/lib/library-paths"
import { resolveBestSource } from "@/lib/resolve-source"
import type { DownloadEntry } from "@/lib/types"

export class DownloadError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message)
  }
}

// In-memory registry holds live progress (persists across requests in the
// single local process); downloads.json survives restarts.
const registry = new Map<string, DownloadEntry>()
let hydrated = false

const keyOf = (slug: string, episode: number) => `${slug}:${episode}`

async function hydrate(): Promise<void> {
  if (hydrated) return
  hydrated = true
  const all = await readDownloads()
  for (const byEpisode of Object.values(all)) {
    for (const entry of Object.values(byEpisode)) {
      registry.set(keyOf(entry.slug, entry.episode), entry)
    }
  }
}

function save(entry: DownloadEntry, persist = false): void {
  entry.updatedAt = new Date().toISOString()
  registry.set(keyOf(entry.slug, entry.episode), entry)
  if (persist) void writeDownload(entry)
}

export async function getDownload(
  slug: string,
  episode: number
): Promise<DownloadEntry | null> {
  await hydrate()
  return registry.get(keyOf(slug, episode)) ?? null
}

export async function listDownloads(): Promise<DownloadEntry[]> {
  await hydrate()
  return [...registry.values()]
}

/** Start (or return an in-flight) download for one episode. */
export async function startDownload(
  slug: string,
  episode: number,
  realDebridKey: string
): Promise<DownloadEntry> {
  await hydrate()

  const existing = registry.get(keyOf(slug, episode))
  if (existing?.status === "downloading") return existing

  if (!isSafeSegment(slugToFolderName(slug))) {
    throw new DownloadError("Invalid folder name")
  }
  if (!Number.isInteger(episode) || episode < 1) {
    throw new DownloadError("Invalid episode")
  }

  const entry: DownloadEntry = {
    slug,
    episode,
    status: "downloading",
    progress: 0,
    bytes: 0,
    totalBytes: null,
    fileName: null,
    error: null,
    updatedAt: "",
  }
  save(entry, true)

  // Run in the background; the client polls for progress.
  void runDownload(entry, realDebridKey)
  return entry
}

function fail(entry: DownloadEntry, message: string): void {
  entry.status = "failed"
  entry.error = message
  save(entry, true)
}

function complete(entry: DownloadEntry): void {
  entry.status = "completed"
  entry.progress = 100
  entry.error = null
  save(entry, true)
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

/** Episode file extension from the source filename; default .mkv. */
function pickExtension(filename: string | null): string {
  if (filename) {
    const dot = filename.lastIndexOf(".")
    if (dot > 0) {
      const ext = filename.slice(dot).toLowerCase()
      if (isVideoFile(`x${ext}`)) return ext
    }
  }
  return ".mkv"
}

async function runDownload(
  entry: DownloadEntry,
  realDebridKey: string
): Promise<void> {
  const { slug, episode } = entry
  let partPath: string | null = null
  try {
    const result = await resolveBestSource(slug, episode, realDebridKey)
    if (result.status === "unmappable") return fail(entry, "Title not mappable")
    if (result.status === "no-source") return fail(entry, "No cached source")
    if (!result.source.url) return fail(entry, "Source has no direct link")

    const folderName = slugToFolderName(slug)
    const root = getLibraryRoot()
    const folderDir = path.join(root, folderName)
    await mkdir(folderDir, { recursive: true })

    // Containment: the folder must resolve inside the library root.
    const realRoot = await realpath(root)
    const realFolder = await realpath(folderDir)
    if (realFolder !== realRoot && !realFolder.startsWith(realRoot + path.sep)) {
      return fail(entry, "Path escapes library root")
    }

    const destName = `${folderName} - ${String(episode).padStart(2, "0")}${pickExtension(result.source.filename)}`
    const destPath = path.join(folderDir, destName)
    entry.fileName = destName

    if (await fileExists(destPath)) {
      return complete(entry)
    }

    const response = await fetch(result.source.url, { redirect: "follow" })
    if (!response.ok || !response.body) {
      return fail(entry, `Download failed (${response.status})`)
    }
    const totalBytes = Number(response.headers.get("content-length"))
    entry.totalBytes = Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : null
    save(entry)

    partPath = `${destPath}.part`
    let lastPersist = Date.now()
    const counter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        entry.bytes += chunk.length
        if (entry.totalBytes) {
          entry.progress = Math.min(99, (entry.bytes / entry.totalBytes) * 100)
        }
        const now = Date.now()
        const persist = now - lastPersist > 2000
        if (persist) lastPersist = now
        save(entry, persist)
        cb(null, chunk)
      },
    })

    const nodeReadable = Readable.fromWeb(
      response.body as unknown as NodeWebReadableStream
    )
    await pipeline(nodeReadable, counter, createWriteStream(partPath))

    // Atomic publish into the library folder.
    await rename(partPath, destPath)
    partPath = null
    complete(entry)
  } catch {
    if (partPath) await unlink(partPath).catch(() => {})
    fail(entry, "Download error")
  }
}

/** Forget a download record (e.g. once a rescan has picked up the file). */
export async function clearDownload(
  slug: string,
  episode: number
): Promise<void> {
  registry.delete(keyOf(slug, episode))
  await deleteDownload(slug, episode)
}

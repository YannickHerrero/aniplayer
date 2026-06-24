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
import {
  type RdTorrentFile,
  type RdTorrentInfo,
  addMagnet,
  getTorrentInfo,
  selectFiles,
  unrestrictLink,
} from "@/lib/real-debrid-api"
import { resolveBestSource } from "@/lib/resolve-source"
import { type TorrentioSource, buildMagnet } from "@/lib/torrentio"
import type { DownloadEntry } from "@/lib/types"

const RD_POLL_INTERVAL_MS = 3000
const RD_MAX_WAIT_MS = 20 * 60 * 1000

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
    phase: "resolving",
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
    if (result.status === "no-source") return fail(entry, "No source found")
    const source = result.source

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

    const destName = `${folderName} - ${String(episode).padStart(2, "0")}${pickExtension(source.filename)}`
    const destPath = path.join(folderDir, destName)
    entry.fileName = destName
    save(entry)

    if (await fileExists(destPath)) {
      return complete(entry)
    }

    // Cached → direct URL; otherwise add to Real-Debrid and wait for it.
    const directUrl =
      source.isCached && source.url
        ? source.url
        : await resolveViaRealDebrid(source, entry, realDebridKey)

    // Transfer phase: stream the direct link to disk.
    entry.phase = "transferring"
    entry.progress = 0
    entry.bytes = 0
    entry.totalBytes = null
    save(entry, true)

    const response = await fetch(directUrl, { redirect: "follow" })
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
  } catch (err) {
    if (partPath) await unlink(partPath).catch(() => {})
    fail(entry, err instanceof Error ? err.message : "Download error")
  }
}

/**
 * Add a torrent to Real-Debrid, select the target episode's file, wait for it
 * to finish caching, and return a direct, streamable URL.
 */
async function resolveViaRealDebrid(
  source: TorrentioSource,
  entry: DownloadEntry,
  key: string
): Promise<string> {
  const magnet = buildMagnet(source)
  if (!magnet) throw new Error("Source has no magnet")

  const id = await addMagnet(magnet, key)

  // Wait for RD to read the torrent's file list, then select the episode file.
  let info = await waitForFiles(id, key)
  const files = chooseFiles(info.files, source)
  await selectFiles(id, files, key)

  // Caching phase: poll until Real-Debrid has the file ready.
  entry.phase = "caching"
  entry.progress = 0
  save(entry, true)
  info = await pollUntilReady(id, key, entry)

  if (info.links.length === 0) throw new Error("Real-Debrid returned no links")
  return unrestrictLink(info.links[0], key)
}

async function waitForFiles(id: string, key: string): Promise<RdTorrentInfo> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const info = await getTorrentInfo(id, key)
    if (info.files.length > 0) return info
    if (["error", "magnet_error", "dead", "virus"].includes(info.status)) {
      throw new Error("Real-Debrid could not read the torrent")
    }
    await delay(1500)
  }
  throw new Error("Timed out reading torrent files")
}

async function pollUntilReady(
  id: string,
  key: string,
  entry: DownloadEntry
): Promise<RdTorrentInfo> {
  const deadline = Date.now() + RD_MAX_WAIT_MS
  while (Date.now() < deadline) {
    const info = await getTorrentInfo(id, key)
    if (info.status === "downloaded") return info
    if (["error", "magnet_error", "dead", "virus"].includes(info.status)) {
      throw new Error("Real-Debrid failed to cache the torrent")
    }
    if (typeof info.progress === "number") {
      entry.progress = Math.min(99, info.progress)
      save(entry)
    }
    await delay(RD_POLL_INTERVAL_MS)
  }
  throw new Error("Timed out waiting for Real-Debrid")
}

/** Select the single episode file (by Torrentio fileIdx / filename), else all. */
function chooseFiles(files: RdTorrentFile[], source: TorrentioSource): string {
  const videos = files.filter((f) => isVideoFile(f.path))
  if (videos.length <= 1) return "all"

  // Match the exact filename Torrentio pointed at.
  if (source.filename) {
    const target = source.filename.toLowerCase()
    const byName = videos.find((f) =>
      f.path.toLowerCase().endsWith(target)
    )
    if (byName) return String(byName.id)
  }

  // Torrentio fileIdx is the 0-based index into the torrent's file list.
  if (source.fileIdx != null && files[source.fileIdx]) {
    return String(files[source.fileIdx].id)
  }

  // Fallback: the largest video file.
  const largest = videos.reduce((a, b) => (b.bytes > a.bytes ? b : a))
  return String(largest.id)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Forget a download record (e.g. once a rescan has picked up the file). */
export async function clearDownload(
  slug: string,
  episode: number
): Promise<void> {
  registry.delete(keyOf(slug, episode))
  await deleteDownload(slug, episode)
}

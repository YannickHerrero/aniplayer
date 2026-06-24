import { readJsonStore, writeJsonStore } from "@/lib/data-dir"
import type { DownloadEntry, DownloadsFile } from "@/lib/types"

const DOWNLOADS_FILE = "downloads.json"

export async function readDownloads(): Promise<DownloadsFile> {
  return readJsonStore<DownloadsFile>(DOWNLOADS_FILE, {})
}

/** Upsert a single download entry and persist. */
export async function writeDownload(entry: DownloadEntry): Promise<void> {
  const all = await readDownloads()
  if (!all[entry.slug]) all[entry.slug] = {}
  all[entry.slug][String(entry.episode)] = entry
  await writeJsonStore(DOWNLOADS_FILE, all)
}

/** Remove a download entry (e.g. after a successful rescan picks up the file). */
export async function deleteDownload(
  slug: string,
  episode: number
): Promise<void> {
  const all = await readDownloads()
  const bySlug = all[slug]
  if (bySlug && String(episode) in bySlug) {
    delete bySlug[String(episode)]
    if (Object.keys(bySlug).length === 0) delete all[slug]
    await writeJsonStore(DOWNLOADS_FILE, all)
  }
}

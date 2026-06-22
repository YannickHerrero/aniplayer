import { readJsonStore, writeJsonStore } from "@/lib/data-dir"
import type { WatchedEntry, WatchedFile } from "@/lib/types"

const WATCHED_FILE = "watched.json"

export async function readWatched(): Promise<WatchedFile> {
  return readJsonStore<WatchedFile>(WATCHED_FILE, {})
}

export async function getWatched(slug: string): Promise<number[]> {
  const all = await readWatched()
  return all[slug]?.watched ?? []
}

/** Mark a single episode watched/unwatched for a slug; returns the new list. */
export async function setWatched(
  slug: string,
  episode: number,
  watched: boolean
): Promise<number[]> {
  const all = await readWatched()
  const current = new Set(all[slug]?.watched ?? [])

  if (watched) current.add(episode)
  else current.delete(episode)

  const list = [...current].sort((a, b) => a - b)
  const entry: WatchedEntry = {
    watched: list,
    updatedAt: new Date().toISOString(),
  }
  all[slug] = entry
  await writeJsonStore(WATCHED_FILE, all)
  return list
}

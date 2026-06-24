import { readJsonStore, writeJsonStore } from "@/lib/data-dir"

const KITSU_MAP_FILE = "kitsu-map.json"
const FRIBB_URL =
  "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json"
const TTL_MS = 7 * 24 * 60 * 60 * 1000

type KitsuMapFile = {
  fetchedAt: string
  /** anilist_id (as string) → kitsu_id */
  map: Record<string, number>
}

type FribbEntry = {
  anilist_id?: number
  kitsu_id?: number
}

// Module-level cache so we don't re-read/parse on every lookup (single process).
let cache: KitsuMapFile | null = null

function isFresh(file: KitsuMapFile): boolean {
  const ts = Date.parse(file.fetchedAt)
  return Number.isFinite(ts) && Date.now() - ts < TTL_MS
}

async function buildFromFribb(): Promise<KitsuMapFile> {
  const res = await fetch(FRIBB_URL, { cache: "no-store" })
  if (!res.ok) throw new Error(`Fribb fetch failed (${res.status})`)
  const list = (await res.json()) as FribbEntry[]

  const map: Record<string, number> = {}
  for (const entry of list) {
    if (
      typeof entry.anilist_id === "number" &&
      typeof entry.kitsu_id === "number"
    ) {
      map[String(entry.anilist_id)] = entry.kitsu_id
    }
  }
  return { fetchedAt: new Date().toISOString(), map }
}

/** Load the anilist→kitsu index, refreshing from Fribb when stale. */
async function loadMap(): Promise<KitsuMapFile> {
  if (cache && isFresh(cache)) return cache

  const stored = await readJsonStore<KitsuMapFile | null>(KITSU_MAP_FILE, null)
  if (stored && isFresh(stored)) {
    cache = stored
    return stored
  }

  try {
    const fresh = await buildFromFribb()
    await writeJsonStore(KITSU_MAP_FILE, fresh)
    cache = fresh
    return fresh
  } catch {
    // Network failure: prefer a stale cache over nothing.
    if (stored) {
      cache = stored
      return stored
    }
    return { fetchedAt: new Date(0).toISOString(), map: {} }
  }
}

/** Map an AniList id to a Kitsu id, or null if unmapped. */
export async function getKitsuId(anilistId: number): Promise<number | null> {
  if (!Number.isInteger(anilistId) || anilistId <= 0) return null
  const { map } = await loadMap()
  return map[String(anilistId)] ?? null
}

import { getKitsuId } from "@/lib/kitsu-map"
import { getMapping } from "@/lib/mapping-store"
import {
  type TorrentioSource,
  fetchTorrentioSources,
  pickBestCachedSource,
} from "@/lib/torrentio"

export type ResolveResult =
  | { status: "unmappable" }
  | { status: "no-source" }
  | { status: "ok"; source: TorrentioSource }

/**
 * Resolve the best cached Torrentio source for a library episode:
 * slug → AniList id (mapping) → Kitsu id (Fribb) → Torrentio → best cached.
 */
export async function resolveBestSource(
  slug: string,
  episode: number,
  realDebridKey: string,
  signal?: AbortSignal
): Promise<ResolveResult> {
  const mapping = await getMapping(slug)
  if (!mapping?.anilistId) return { status: "unmappable" }

  const kitsuId = await getKitsuId(mapping.anilistId)
  if (kitsuId == null) return { status: "unmappable" }

  const sources = await fetchTorrentioSources({
    kitsuId,
    episode,
    realDebridKey,
    signal,
  })
  const best = pickBestCachedSource(sources)
  if (!best) return { status: "no-source" }

  return { status: "ok", source: best }
}

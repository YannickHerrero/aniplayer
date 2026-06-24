// Server-side Torrentio client for anime (Kitsu absolute episode numbering).
// Scoring/normalization ported from the sibling "anidl" project.

const TORRENTIO_BASE_URL = "https://torrentio.strem.fun"

const PROVIDERS = [
  "nyaasi",
  "tokyotosho",
  "anidex",
  "horriblesubs",
  "yts",
  "eztv",
  "1337x",
  "thepiratebay",
  "torrentgalaxy",
  "rarbg",
  "kickasstorrents",
  "magnetdl",
]

export type TorrentioSource = {
  id: string
  provider: string
  title: string
  filename: string | null
  quality: string | null
  size: string | null
  sizeBytes: number
  seeders: number | null
  languages: string[]
  isCached: boolean
  url: string | null
  infoHash: string | null
  fileIdx: number | null
  trackers: string[]
  score: number
}

type TorrentioStreamResponse = {
  name?: string
  title?: string
  url?: string
  infoHash?: string
  fileIdx?: number
  behaviorHints?: { filename?: string }
  sources?: string[]
}

type TorrentioResponse = { streams?: TorrentioStreamResponse[] }

// Query with the Real-Debrid key + nodownloadlinks: Torrentio returns only
// RD-cached sources, each as a ready-to-stream URL. (Real-Debrid blocks adding
// new/uncached magnets, so only already-cached content is downloadable.)
function buildConfig(realDebridKey: string): string {
  return [
    `providers=${PROVIDERS.join(",")}`,
    "sort=qualitysize",
    "qualityfilter=scr,cam",
    "debridoptions=nodownloadlinks",
    `realdebrid=${realDebridKey}`,
  ].join("|")
}

/** Fetch + score cached sources for one episode (or a movie when episode null). */
export async function fetchTorrentioSources({
  kitsuId,
  episode,
  realDebridKey,
  signal,
}: {
  kitsuId: number
  episode: number | null
  realDebridKey: string
  signal?: AbortSignal
}): Promise<TorrentioSource[]> {
  const id = episode != null ? `kitsu:${kitsuId}:${episode}` : `kitsu:${kitsuId}`
  const kind = episode != null ? "series" : "movie"
  const url = `${TORRENTIO_BASE_URL}/${buildConfig(realDebridKey)}/stream/${kind}/${id}.json`

  const response = await fetch(url, { cache: "no-store", signal })
  if (!response.ok) {
    throw new Error(`Torrentio request failed (${response.status})`)
  }

  const payload = (await response.json()) as TorrentioResponse
  const sources = (payload.streams ?? []).map((stream, index) =>
    normalizeSource(stream, index)
  )
  return sources.sort((a, b) => b.score - a.score)
}

/**
 * Best downloadable source: the highest-scored one that came back with a
 * direct URL (Torrentio only returns URLs for RD-available/cached content).
 */
export function pickBestSource(
  sources: TorrentioSource[]
): TorrentioSource | null {
  return sources.find((s) => s.url) ?? null
}


function normalizeSource(
  source: TorrentioStreamResponse,
  index: number
): TorrentioSource {
  const title = source.title ?? ""
  const sizeMatch = title.match(/💾\s*([\d.]+\s*(?:GB|MB|TB))/i)
  const seedersMatch = title.match(/👤\s*(\d+)/)
  const qualityMatch = title.match(/\b(2160p|4K|1080p|720p|480p|360p)\b/i)
  const languageMatches = Array.from(
    title.matchAll(
      /(🇬🇧|🇺🇸|🇩🇪|🇫🇷|🇮🇹|🇪🇸|🇯🇵|🇰🇷|🇨🇳|🇧🇷|🇵🇹|🇷🇺|🇳🇱|🇵🇱|🇸🇪|🇳🇴|🇩🇰|🇫🇮|🇬🇷|🇹🇷|🇮🇳|🇹🇭|🇻🇳|🇮🇩|🇲🇽|🇦🇷)/g
    )
  )

  const trackers = (source.sources ?? [])
    .filter((s) => s.startsWith("tracker:"))
    .map((s) => s.slice("tracker:".length))

  const provider = source.name?.replace(/\n+/g, " ").trim() || "torrentio"
  const normalizedTitle = title.replace(/\n+/g, " ").trim()
  const sizeBytes = parseSizeBytes(sizeMatch?.[1] ?? null)
  const quality = qualityMatch?.[1]?.toUpperCase() ?? null
  const seeders = seedersMatch ? Number(seedersMatch[1]) : null
  // Torrentio only returns a URL for RD-available content, so a URL means cached.
  const isCached = Boolean(source.url)

  return {
    id: `${provider}-${source.infoHash ?? source.url ?? index}`,
    provider,
    title: normalizedTitle,
    filename: source.behaviorHints?.filename ?? null,
    quality,
    size: sizeMatch?.[1] ?? null,
    sizeBytes,
    seeders,
    languages: languageMatches.map((m) => m[0]),
    isCached,
    url: source.url ?? null,
    infoHash: source.infoHash ?? null,
    fileIdx: typeof source.fileIdx === "number" ? source.fileIdx : null,
    trackers,
    score: calculateScore({
      title: normalizedTitle,
      quality,
      sizeBytes,
      seeders,
      isCached,
      languageCount: languageMatches.length,
    }),
  }
}

function calculateScore({
  title,
  quality,
  sizeBytes,
  seeders,
  isCached,
  languageCount,
}: {
  title: string
  quality: string | null
  sizeBytes: number
  seeders: number | null
  isCached: boolean
  languageCount: number
}): number {
  if (isLikelyTrailer({ title, quality, sizeBytes })) return -10000

  let score = 0
  if (quality?.includes("1080P")) score += 1000
  else if (quality?.includes("720P")) score += 800
  else if (quality?.includes("2160P") || quality?.includes("4K")) score += 600
  else score += 400

  if (isCached) score += 1000
  score += languageCount * 30
  if (seeders && seeders > 0) score += Math.log2(seeders + 1) * 50
  if (sizeBytes < Number.MAX_SAFE_INTEGER) {
    const sizeGb = sizeBytes / (1024 * 1024 * 1024)
    score -= Math.pow(sizeGb, 1.5) * 80
  }
  return score
}

function isLikelyTrailer({
  title,
  quality,
  sizeBytes,
}: {
  title: string
  quality: string | null
  sizeBytes: number
}): boolean {
  if (
    /\b(trailer|promo|sample|preview|clip|teaser)\b/i.test(title)
  ) {
    return true
  }
  if (sizeBytes === Number.MAX_SAFE_INTEGER) return false
  const sizeMb = sizeBytes / (1024 * 1024)
  const q = quality?.toLowerCase() ?? ""
  if (q.includes("2160p") || q.includes("4k")) return sizeMb < 400
  if (q.includes("1080p")) return sizeMb < 150
  if (q.includes("720p")) return sizeMb < 80
  return sizeMb < 30
}

function parseSizeBytes(size: string | null): number {
  if (!size) return Number.MAX_SAFE_INTEGER
  const match = size.match(/^([\d.]+)\s*(GB|MB|TB)$/i)
  if (!match) return Number.MAX_SAFE_INTEGER
  const value = Number(match[1])
  if (!Number.isFinite(value)) return Number.MAX_SAFE_INTEGER
  const unit = match[2].toUpperCase()
  if (unit === "TB") return value * 1024 ** 4
  if (unit === "GB") return value * 1024 ** 3
  return value * 1024 ** 2
}

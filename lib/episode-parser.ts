import type { EpisodeFile } from "@/lib/types"

export const VIDEO_EXTENSIONS = new Set([".mkv", ".mp4", ".avi", ".mov", ".m4v"])

export function isVideoFile(fileName: string): boolean {
  const dot = fileName.lastIndexOf(".")
  if (dot < 0) return false
  return VIDEO_EXTENSIONS.has(fileName.slice(dot).toLowerCase())
}

/** Pull a quality tag like "1080p" / "720p" from anywhere in the name. */
function parseQuality(fileName: string): string | null {
  const match = fileName.match(/(\d{3,4})p/i)
  return match ? `${match[1]}p` : null
}

/**
 * Best-effort episode + season parser for messy fansub filenames.
 * Examples handled:
 *   "[Anime Time] ODDTAXI - S01E01.mkv"                      -> s1 e1
 *   "[Sokudo] Mushoku Tensei ... 04 [1080p BD][AV1].mkv"     -> e4
 *   "[SubsPlease] ... - 01v2 (720p) [A8D5].mkv"              -> e1
 *   "episode-2.mkv" / "Frieren - 01.mkv" / "E12.mkv"         -> e2 / e1 / e12
 */
export function parseEpisode(fileName: string): {
  episode: number | null
  season: number | null
  quality: string | null
} {
  const quality = parseQuality(fileName)

  // Strip extension.
  const dot = fileName.lastIndexOf(".")
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName

  // Strip bracketed/parenthesized groups (release group, hashes, quality, codec)
  // so their numbers don't get mistaken for episode numbers.
  const cleaned = stem
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  // 1) SxxEyy / SxxEyy-zz
  const sxe = cleaned.match(/S(\d{1,2})\s*E(\d{1,3})/i)
  if (sxe) {
    return {
      season: Number(sxe[1]),
      episode: Number(sxe[2]),
      quality,
    }
  }

  // 2) explicit "episode N" / "ep N" / "ENN"
  const epWord = cleaned.match(/\b(?:episode|ep|e)[\s._-]*(\d{1,3})\b/i)
  if (epWord) {
    return { season: null, episode: Number(epWord[1]), quality }
  }

  // 3) " - 04" or " - 04v2" (dash-delimited number, optional version)
  const dashNum = cleaned.match(/-\s*(\d{1,3})(?:v\d+)?\b/)
  if (dashNum) {
    return { season: null, episode: Number(dashNum[1]), quality }
  }

  // 4) a standalone number token (prefer the last one), ignoring 4-digit years
  const tokens = cleaned.match(/\b(\d{1,3})(?:v\d+)?\b/g)
  if (tokens && tokens.length > 0) {
    const last = tokens[tokens.length - 1].replace(/v\d+$/i, "")
    return { season: null, episode: Number(last), quality }
  }

  return { season: null, episode: null, quality }
}

/** Sort episodes ascending by season then episode; unknowns sink to the end. */
export function sortEpisodes(episodes: EpisodeFile[]): EpisodeFile[] {
  return [...episodes].sort((a, b) => {
    const seasonA = a.season ?? 0
    const seasonB = b.season ?? 0
    if (seasonA !== seasonB) return seasonA - seasonB

    const epA = a.episode ?? Number.POSITIVE_INFINITY
    const epB = b.episode ?? Number.POSITIVE_INFINITY
    if (epA !== epB) return epA - epB

    return a.fileName.localeCompare(b.fileName)
  })
}

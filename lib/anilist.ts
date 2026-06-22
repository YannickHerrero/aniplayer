export type AnilistAiringEpisode = {
  episode: number
  airingAt: number
  timeUntilAiring: number
}

export type AnilistMediaListEntry = {
  id: number
  progress: number
  score: number | null
  status: string | null
}

export type AnilistMedia = {
  id: number
  title: string
  coverImage: string | null
  bannerImage: string | null
  format: string | null
  season: string | null
  seasonYear: number | null
  episodes: number | null
  status: string | null
  genres: string[]
  description: string | null
  meanScore: number | null
  popularity: number | null
  nextAiringEpisode: AnilistAiringEpisode | null
  /** The viewer's list entry — only present when authenticated. */
  mediaListEntry: AnilistMediaListEntry | null
}

export type AnilistViewer = {
  id: number
  name: string
}

type AnilistMediaResponse = {
  id: number
  title?: {
    english?: string | null
    romaji?: string | null
    native?: string | null
  } | null
  coverImage?: { large?: string | null; medium?: string | null } | null
  bannerImage?: string | null
  format?: string | null
  season?: string | null
  seasonYear?: number | null
  episodes?: number | null
  status?: string | null
  genres?: string[] | null
  description?: string | null
  meanScore?: number | null
  popularity?: number | null
  nextAiringEpisode?: {
    episode?: number | null
    airingAt?: number | null
    timeUntilAiring?: number | null
  } | null
  mediaListEntry?: {
    id?: number | null
    progress?: number | null
    score?: number | null
    status?: string | null
  } | null
}

type AnilistGraphqlRequest = {
  query: string
  variables?: Record<string, unknown>
  signal?: AbortSignal
  /** AniList access token; forwarded to the proxy for authenticated calls. */
  token?: string | null
}

const MEDIA_FIELDS = `
  id
  title {
    english
    romaji
    native
  }
  coverImage {
    large
    medium
  }
  bannerImage
  format
  season
  seasonYear
  episodes
  status
  genres
  description(asHtml: false)
  meanScore
  popularity
  nextAiringEpisode {
    episode
    airingAt
    timeUntilAiring
  }
  mediaListEntry {
    id
    progress
    score
    status
  }
`

const SEARCH_ANIME_QUERY = `
  query ($search: String) {
    Page(perPage: 8) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        ${MEDIA_FIELDS}
      }
    }
  }
`

const MEDIA_BY_ID_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
    }
  }
`

const VIEWER_QUERY = `
  query {
    Viewer {
      id
      name
    }
  }
`

const PREFERRED_TV_FORMATS = new Set(["TV", "TV_SHORT", "ONA"])

/** Low-level GraphQL call through the local proxy (forwards token if present). */
async function requestAnilist<T>({
  query,
  variables,
  signal,
  token,
}: AnilistGraphqlRequest): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (token) headers["x-anilist-token"] = token

  const response = await fetch("/api/anilist", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    signal,
  })

  if (!response.ok && response.status !== 200) {
    throw new Error(`AniList request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as {
    data?: T
    errors?: Array<{ message?: string }> | null
  }

  if (payload.errors?.length) {
    throw new Error(
      payload.errors[0]?.message ?? "AniList returned an error response."
    )
  }

  return payload.data as T
}

export async function searchAnilistAnime(
  title: string,
  signal?: AbortSignal,
  token?: string | null
): Promise<AnilistMedia[]> {
  const trimmed = title.trim()
  if (!trimmed) return []

  const data = await requestAnilist<{
    Page?: { media?: AnilistMediaResponse[] | null } | null
  }>({ query: SEARCH_ANIME_QUERY, variables: { search: trimmed }, signal, token })

  return (data.Page?.media ?? []).map(normalizeAnilistMedia)
}

export async function fetchAnilistMediaById(
  id: number,
  signal?: AbortSignal,
  token?: string | null
): Promise<AnilistMedia | null> {
  if (!Number.isInteger(id) || id <= 0) return null

  const data = await requestAnilist<{ Media?: AnilistMediaResponse | null }>({
    query: MEDIA_BY_ID_QUERY,
    variables: { id },
    signal,
    token,
  })

  return data.Media ? normalizeAnilistMedia(data.Media) : null
}

export async function fetchAnilistViewer(
  token: string,
  signal?: AbortSignal
): Promise<AnilistViewer | null> {
  const data = await requestAnilist<{ Viewer?: AnilistViewer | null }>({
    query: VIEWER_QUERY,
    signal,
    token,
  })
  return data.Viewer ?? null
}

export function pickBestAnilistMatch(
  results: AnilistMedia[],
  year?: string | null
): AnilistMedia | null {
  if (results.length === 0) return null

  const targetYear = year ? Number(year) : null

  if (targetYear) {
    const yearAndTvMatch = results.find(
      (m) =>
        m.seasonYear === targetYear &&
        m.format !== null &&
        PREFERRED_TV_FORMATS.has(m.format)
    )
    if (yearAndTvMatch) return yearAndTvMatch

    const yearMatch = results.find((m) => m.seasonYear === targetYear)
    if (yearMatch) return yearMatch
  }

  const tvMatch = results.find(
    (m) => m.format !== null && PREFERRED_TV_FORMATS.has(m.format)
  )

  return tvMatch ?? results[0]
}

export function formatCountdown(secondsUntil: number): string {
  const total = Math.max(0, Math.floor(secondsUntil))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

/** Strip AniList's HTML description down to plain text. */
export function plainDescription(description: string | null): string | null {
  if (!description) return null
  return description
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeAnilistMedia(media: AnilistMediaResponse): AnilistMedia {
  const title =
    media.title?.english?.trim() ||
    media.title?.romaji?.trim() ||
    media.title?.native?.trim() ||
    `Anime ${media.id}`

  return {
    id: media.id,
    title,
    coverImage: media.coverImage?.large ?? media.coverImage?.medium ?? null,
    bannerImage: media.bannerImage ?? null,
    format: media.format ?? null,
    season: media.season ?? null,
    seasonYear: typeof media.seasonYear === "number" ? media.seasonYear : null,
    episodes: typeof media.episodes === "number" ? media.episodes : null,
    status: media.status ?? null,
    genres: media.genres ?? [],
    description: media.description ?? null,
    meanScore: typeof media.meanScore === "number" ? media.meanScore : null,
    popularity: typeof media.popularity === "number" ? media.popularity : null,
    nextAiringEpisode: normalizeNextAiringEpisode(media.nextAiringEpisode),
    mediaListEntry: normalizeMediaListEntry(media.mediaListEntry),
  }
}

function normalizeNextAiringEpisode(
  episode: AnilistMediaResponse["nextAiringEpisode"]
): AnilistAiringEpisode | null {
  if (
    !episode ||
    typeof episode.episode !== "number" ||
    typeof episode.airingAt !== "number"
  ) {
    return null
  }
  return {
    episode: episode.episode,
    airingAt: episode.airingAt,
    timeUntilAiring:
      typeof episode.timeUntilAiring === "number" ? episode.timeUntilAiring : 0,
  }
}

function normalizeMediaListEntry(
  entry: AnilistMediaResponse["mediaListEntry"]
): AnilistMediaListEntry | null {
  if (!entry || typeof entry.id !== "number") return null
  return {
    id: entry.id,
    progress: typeof entry.progress === "number" ? entry.progress : 0,
    score: typeof entry.score === "number" ? entry.score : null,
    status: entry.status ?? null,
  }
}

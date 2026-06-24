/** A single playable episode file inside an anime folder. */
export type EpisodeFile = {
  fileName: string
  /** Absolute path on disk — server-only, used to launch VLC. */
  absolutePath: string
  /** Parsed episode number, or null when it couldn't be determined. */
  episode: number | null
  /** Parsed season number, or null. */
  season: number | null
  /** Parsed quality tag (e.g. "1080p"), or null. */
  quality: string | null
}

/** One anime = one subfolder under the library root. */
export type AnimeFolder = {
  /** URL-safe stable identity (encoded folder name). */
  slug: string
  /** Raw folder name as it appears on disk. */
  folderName: string
  /** Absolute path to the folder — server-only. */
  absolutePath: string
  episodes: EpisodeFile[]
  episodeCount: number
  /** Distinct quality tags found across episodes. */
  qualities: string[]
}

/** Persisted folder→AniList link (data/mappings.json). */
export type FolderMapping = {
  anilistId: number
  title: string
  coverImage: string | null
  updatedAt: string
}

export type MappingsFile = Record<string, FolderMapping>

/** Persisted watched state (data/watched.json). */
export type WatchedEntry = {
  watched: number[]
  updatedAt: string
}

export type WatchedFile = Record<string, WatchedEntry>

/** Persisted download state (data/downloads.json). */
export type DownloadStatus = "downloading" | "completed" | "failed"

/** Sub-state while status is "downloading". */
export type DownloadPhase = "resolving" | "caching" | "transferring"

export type DownloadEntry = {
  slug: string
  episode: number
  status: DownloadStatus
  phase: DownloadPhase
  /** 0–100; 0 when unknown. During "caching" this is Real-Debrid's progress. */
  progress: number
  bytes: number
  totalBytes: number | null
  fileName: string | null
  error: string | null
  updatedAt: string
}

/** slug → episode (string key) → entry */
export type DownloadsFile = Record<string, Record<string, DownloadEntry>>

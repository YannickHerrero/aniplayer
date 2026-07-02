import { invoke } from "@tauri-apps/api/core"

import type {
  AnimeFolder,
  DownloadEntry,
  FolderMapping,
  MappingsFile,
  WatchedFile,
} from "@/lib/types"

export type RuntimeConfig = {
  animeLibraryPath?: string
  downloadsPath?: string
  dataDir?: string
  vlcPath?: string
  anilistClientId?: string
  anilistClientSecret?: string
  anilistRedirectUri?: string
}

export type OrganizeProposal = {
  fileName: string
  episode: number | null
  quality: string | null
  title: string
  targetFolder: string
  existing: boolean
}

export type MoveResult = {
  fileName: string
  targetFolder: string
  ok: boolean
  reason?: string
}

export type ConfigResponse = {
  libraryRoot: string
  dataDir: string
  config: RuntimeConfig
  anilistClientConfigured: boolean
  anilistClientId: string | null
  anilistRedirectUri: string | null
  anilistClientSecretConfigured: boolean
}

export async function getConfig(): Promise<ConfigResponse> {
  return invoke("get_config")
}

export async function patchConfig(
  patch: Partial<Record<keyof RuntimeConfig, string | null>>
): Promise<RuntimeConfig> {
  return invoke("patch_config", { patch })
}

export async function scanLibrary(): Promise<{
  root: string
  folders: AnimeFolder[]
}> {
  return invoke("scan_library_cmd")
}

export async function createLibraryEntry(input: {
  title: string
  anilistId: number
  coverImage?: string | null
}): Promise<{ slug: string; reused: boolean }> {
  return invoke("create_library_entry", input)
}

export async function getLibraryFolder(
  slug: string
): Promise<AnimeFolder | null> {
  return invoke("get_library_folder", { slug })
}

export async function getMappings(): Promise<{ mappings: MappingsFile }> {
  return invoke("get_mappings")
}

export async function setMapping(input: {
  slug: string
  anilistId: number
  title: string
  coverImage?: string | null
}): Promise<FolderMapping> {
  return invoke("set_mapping_cmd", input)
}

export async function deleteMapping(slug: string): Promise<void> {
  return invoke("delete_mapping_cmd", { slug })
}

export async function getWatchedAll(): Promise<{ watched: WatchedFile }> {
  return invoke("get_watched_all")
}

export async function setWatched(input: {
  slug: string
  episode: number
  watched: boolean
}): Promise<number[]> {
  return invoke("set_watched_cmd", input)
}

export async function playEpisode(input: {
  slug: string
  fileName: string
}): Promise<void> {
  return invoke("play_episode_cmd", input)
}

export async function getOrganize(): Promise<{
  downloadsRoot: string
  proposals: OrganizeProposal[]
}> {
  return invoke("get_organize")
}

export async function moveOrganize(
  moves: Array<{ fileName: string; targetFolder: string }>
): Promise<MoveResult[]> {
  return invoke("move_organize", { moves })
}

export async function anilistGraphql(input: {
  query: string
  variables?: Record<string, unknown>
  token?: string | null
}): Promise<unknown> {
  return invoke("anilist_graphql", input)
}

export async function exchangeAnilistCode(
  code: string
): Promise<{ accessToken: string; expiresIn: number | null }> {
  return invoke("anilist_exchange_code", { code })
}

export async function validateRealDebridKeyNative(
  apiKey: string
): Promise<unknown> {
  return invoke("validate_realdebrid_key", { apiKey })
}

export async function isMappable(slug: string): Promise<boolean> {
  return invoke("is_mappable", { slug })
}

export async function getDownload(input: {
  slug: string
  episode: number
}): Promise<DownloadEntry | null> {
  return invoke("get_download_cmd", input)
}

export async function startDownload(input: {
  slug: string
  episode: number
  realDebridKey: string
}): Promise<DownloadEntry> {
  return invoke("start_download_cmd", input)
}

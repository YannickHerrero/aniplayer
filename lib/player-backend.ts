import { invoke } from "@tauri-apps/api/core"

export type PlayerTrack = {
  id: number
  title: string | null
  lang: string | null
  selected: boolean
}

export type PlayerTracks = {
  audio: PlayerTrack[]
  subtitle: PlayerTrack[]
}

export type PlayerTimePos = {
  position: number
  duration: number
}

export async function playerOpen(input: {
  slug: string
  fileName: string
  episode: number
}): Promise<void> {
  return invoke("player_open", input)
}

export async function playerPlayPause(): Promise<void> {
  return invoke("player_play_pause")
}

export async function playerSeek(secs: number): Promise<void> {
  return invoke("player_seek", { secs })
}

export async function playerSeekRelative(delta: number): Promise<void> {
  return invoke("player_seek_relative", { delta })
}

export async function playerSetAudioTrack(trackId: number): Promise<void> {
  return invoke("player_set_audio_track", { trackId })
}

export async function playerSetSubtitleTrack(trackId: number): Promise<void> {
  return invoke("player_set_subtitle_track", { trackId })
}

export async function playerGetTracks(): Promise<PlayerTracks> {
  return invoke("player_get_tracks")
}

export async function playerSetVolume(volume: number): Promise<void> {
  return invoke("player_set_volume", { volume })
}

export async function playerToggleFullscreen(): Promise<boolean> {
  return invoke("player_toggle_fullscreen")
}

export async function playerClose(episode: number): Promise<number> {
  return invoke("player_close", { episode })
}

import { useCallback, useEffect, useRef, useState } from "react"

import type { PlayerTimePos, PlayerTracks } from "@/lib/player-backend"
import {
  playerClose,
  playerGetTracks,
  playerOpen,
  playerPlayPause,
  playerSeek,
  playerSeekRelative,
  playerSetAudioTrack,
  playerSetSubtitleTrack,
  playerToggleFullscreen,
} from "@/lib/player-backend"
import { type UnlistenFn, listen } from "@tauri-apps/api/event"

export type PlayerStatus = "idle" | "loading" | "playing"

export type UsePlayerResult = {
  status: PlayerStatus
  position: number
  duration: number
  paused: boolean
  tracks: PlayerTracks
  open: (slug: string, fileName: string, episode: number) => void
  close: () => void
  playPause: () => void
  seek: (secs: number) => void
  seekRelative: (delta: number) => void
  setAudioTrack: (id: number) => void
  setSubtitleTrack: (id: number) => void
  toggleFullscreen: () => void
}

type Callbacks = {
  onWatchedThreshold?: (episode: number) => void
  onEnded?: (episode: number) => void
}

export function usePlayer(callbacks?: Callbacks): UsePlayerResult {
  const [status, setStatus] = useState<PlayerStatus>("idle")
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [paused, setPaused] = useState(false)
  const [tracks, setTracks] = useState<PlayerTracks>({
    audio: [],
    subtitle: [],
  })

  const episodeRef = useRef<number>(0)
  const watchedMarked = useRef(false)
  const callbackRef = useRef(callbacks)

  useEffect(() => {
    callbackRef.current = callbacks
  })

  useEffect(() => {
    const unlisteners: UnlistenFn[] = []

    listen<PlayerTimePos>("player:time-pos", (event) => {
      const { position: pos, duration: dur } = event.payload
      setPosition(pos)
      setDuration(dur)

      const ep = episodeRef.current
      if (
        ep > 0 &&
        dur > 1 &&
        pos / dur >= 0.4 &&
        !watchedMarked.current
      ) {
        watchedMarked.current = true
        callbackRef.current?.onWatchedThreshold?.(ep)
      }
    }).then((unlisten) => unlisteners.push(unlisten))

    listen<boolean>("player:pause", (event) => {
      setPaused(event.payload)
    }).then((unlisten) => unlisteners.push(unlisten))

    listen<PlayerTracks>("player:tracks", (event) => {
      setTracks(event.payload)
    }).then((unlisten) => unlisteners.push(unlisten))

    listen<string>("player:end", () => {
      const ep = episodeRef.current
      setStatus("idle")
      if (ep > 0) {
        callbackRef.current?.onEnded?.(ep)
      }
    }).then((unlisten) => unlisteners.push(unlisten))

    return () => {
      unlisteners.forEach((fn) => fn())
    }
  }, [])

  const open = useCallback(
    async (slug: string, fileName: string, episode: number) => {
      watchedMarked.current = false
      episodeRef.current = episode
      setStatus("loading")
      try {
        await playerOpen({ slug, fileName, episode })
        setStatus("playing")
        setPaused(false)
        setPosition(0)
        setDuration(0)
        playerGetTracks().then(setTracks).catch(() => {})
      } catch {
        setStatus("idle")
      }
    },
    []
  )

  const close = useCallback(() => {
    const ep = episodeRef.current
    playerClose(ep).catch(() => {})
    setStatus("idle")
    setPaused(false)
    setPosition(0)
    setDuration(0)
    episodeRef.current = 0
    watchedMarked.current = false
  }, [])

  const playPause = useCallback(() => {
    playerPlayPause().catch(() => {})
  }, [])

  const seek = useCallback((secs: number) => {
    playerSeek(secs).catch(() => {})
  }, [])

  const seekRelative = useCallback((delta: number) => {
    playerSeekRelative(delta).catch(() => {})
  }, [])

  const setAudioTrack = useCallback((id: number) => {
    playerSetAudioTrack(id).catch(() => {})
  }, [])

  const setSubtitleTrack = useCallback((id: number) => {
    playerSetSubtitleTrack(id).catch(() => {})
  }, [])

  const toggleFullscreen = useCallback(() => {
    playerToggleFullscreen().catch(() => {})
  }, [])

  return {
    status,
    position,
    duration,
    paused,
    tracks,
    open,
    close,
    playPause,
    seek,
    seekRelative,
    setAudioTrack,
    setSubtitleTrack,
    toggleFullscreen,
  }
}

"use client"

import { useEffect, useRef } from "react"

import type { AnilistMedia } from "@/lib/anilist"
import { autoMatchAnime } from "@/lib/auto-match"
import type { AnimeFolder, FolderMapping, MappingsFile } from "@/lib/types"

const THROTTLE_MS = 350

type Options = {
  folders: AnimeFolder[]
  mappings: MappingsFile
  saveMapping: (slug: string, media: AnilistMedia) => Promise<FolderMapping>
  token?: string | null
  /** Only start once both folders and existing mappings have loaded. */
  ready: boolean
}

/**
 * Background-match every unmapped folder to AniList so the library grid shows
 * covers without needing to open each detail page first. Runs sequentially with
 * a small delay to stay within AniList's rate limits, and skips folders that
 * already have a cached mapping.
 */
export function useAutoMatchLibrary({
  folders,
  mappings,
  saveMapping,
  token,
  ready,
}: Options) {
  // Latest values read inside the loop without retriggering the effect.
  const mappingsRef = useRef(mappings)
  const saveRef = useRef(saveMapping)
  const tokenRef = useRef(token)
  const attempted = useRef<Set<string>>(new Set())

  // Keep the refs current (updated in an effect, not during render).
  useEffect(() => {
    mappingsRef.current = mappings
    saveRef.current = saveMapping
    tokenRef.current = token
  })

  useEffect(() => {
    if (!ready || folders.length === 0) return

    let cancelled = false
    ;(async () => {
      for (const folder of folders) {
        if (cancelled) break
        if (attempted.current.has(folder.slug)) continue
        attempted.current.add(folder.slug)
        if (mappingsRef.current[folder.slug]) continue

        try {
          const best = await autoMatchAnime(
            folder.folderName,
            undefined,
            tokenRef.current
          )
          if (best && !cancelled) await saveRef.current(folder.slug, best)
        } catch {
          // Best-effort; the user can match manually from the detail page.
        }
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [ready, folders])
}

"use client"

import { useCallback, useEffect, useState } from "react"

import type { AnilistMedia } from "@/lib/anilist"
import { deleteMapping, getMappings, setMapping } from "@/lib/backend"
import type { FolderMapping, MappingsFile } from "@/lib/types"

type UseMappingsResult = {
  mappings: MappingsFile
  loading: boolean
  saveMapping: (slug: string, media: AnilistMedia) => Promise<FolderMapping>
  removeMapping: (slug: string) => Promise<void>
  refresh: () => void
}

export function useMappings(): UseMappingsResult {
  const [mappings, setMappings] = useState<MappingsFile>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      if (signal?.aborted) return
      const data = await getMappings()
      setMappings(data.mappings ?? {})
    } catch (err) {
      if ((err as Error).name === "AbortError") return
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const saveMapping = useCallback(
    async (slug: string, media: AnilistMedia) => {
      const mapping = await setMapping({
        slug,
        anilistId: media.id,
        title: media.title,
        coverImage: media.coverImage,
      })
      setMappings((prev) => ({ ...prev, [slug]: mapping }))
      return mapping
    },
    []
  )

  const removeMapping = useCallback(async (slug: string) => {
    await deleteMapping(slug)
    setMappings((prev) => {
      const next = { ...prev }
      delete next[slug]
      return next
    })
  }, [])

  return {
    mappings,
    loading,
    saveMapping,
    removeMapping,
    refresh: () => load(),
  }
}

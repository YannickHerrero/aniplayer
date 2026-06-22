"use client"

import { useCallback, useEffect, useState } from "react"

import type { AnilistMedia } from "@/lib/anilist"
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
      const res = await fetch("/api/mapping", { signal })
      if (!res.ok) return
      const data = (await res.json()) as { mappings: MappingsFile }
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
      const res = await fetch("/api/mapping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          anilistId: media.id,
          title: media.title,
          coverImage: media.coverImage,
        }),
      })
      if (!res.ok) throw new Error("Failed to save mapping")
      const data = (await res.json()) as { mapping: FolderMapping }
      setMappings((prev) => ({ ...prev, [slug]: data.mapping }))
      return data.mapping
    },
    []
  )

  const removeMapping = useCallback(async (slug: string) => {
    await fetch(`/api/mapping?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
    })
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

"use client"

import { useCallback, useEffect, useState } from "react"

import {
  type DetailLayout,
  getStoredLayout,
  storeLayout,
} from "@/lib/detail-layout"

type UseDetailLayoutResult = {
  layout: DetailLayout
  setLayout: (layout: DetailLayout) => void
  /** False until the stored value is read (avoids a flash of the default). */
  ready: boolean
}

export function useDetailLayout(): UseDetailLayoutResult {
  const [layout, setLayoutState] = useState<DetailLayout>("0")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLayoutState(getStoredLayout())
    setReady(true)
    const onStorage = () => setLayoutState(getStoredLayout())
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setLayout = useCallback((next: DetailLayout) => {
    storeLayout(next)
    setLayoutState(next)
  }, [])

  return { layout, setLayout, ready }
}

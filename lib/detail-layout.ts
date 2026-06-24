const KEY = "aniplayer.detail-layout"

export type DetailLayout = "0" | "1" | "2" | "3" | "4" | "5"

export const DETAIL_LAYOUTS: { id: DetailLayout; label: string; hint: string }[] =
  [
    { id: "0", label: "Classic", hint: "Full hero, then stacked panels (original)" },
    { id: "1", label: "Split", hint: "Info left, scrollable episodes right" },
    { id: "2", label: "Compact", hint: "Slim sticky bar + stat strip + wide list" },
    { id: "3", label: "Cinematic", hint: "Banner + Episodes / Overview / AniList tabs" },
    { id: "4", label: "Rail", hint: "Fixed info rail, episodes dominant (Plex-style)" },
    { id: "5", label: "Sticky", hint: "Hero collapses into a sticky header on scroll" },
  ]

const VALID = new Set(DETAIL_LAYOUTS.map((l) => l.id))

export function getStoredLayout(): DetailLayout {
  if (typeof window === "undefined") return "0"
  try {
    const v = window.localStorage.getItem(KEY)
    return v && VALID.has(v as DetailLayout) ? (v as DetailLayout) : "0"
  } catch {
    return "0"
  }
}

export function storeLayout(layout: DetailLayout): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, layout)
}

const RD_KEY = "aniplayer.realdebrid-key"

/** Read the stored Real-Debrid API key, or null if unset. */
export function getStoredRealDebridKey(): string | null {
  if (typeof window === "undefined") return null
  try {
    const key = window.localStorage.getItem(RD_KEY)
    return key && key.trim() ? key.trim() : null
  } catch {
    return null
  }
}

export function storeRealDebridKey(key: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(RD_KEY, key.trim())
}

export function clearRealDebridKey(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(RD_KEY)
}

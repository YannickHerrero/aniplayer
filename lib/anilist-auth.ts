const TOKEN_KEY = "aniplayer.anilist-token"
const AUTHORIZE_URL = "https://anilist.co/api/v2/oauth/authorize"

export type StoredToken = {
  accessToken: string
  /** Unix ms when the token expires. */
  expiresAt: number
}

/** Read the stored token, returning null if missing or expired. */
export function getStoredToken(): StoredToken | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const token = JSON.parse(raw) as StoredToken
    if (!token.accessToken || token.expiresAt <= Date.now()) {
      window.localStorage.removeItem(TOKEN_KEY)
      return null
    }
    return token
  } catch {
    return null
  }
}

export function storeToken(token: StoredToken): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
}

export function clearToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_KEY)
}

/** Build the AniList implicit-grant authorize URL, or null if unconfigured. */
export function buildAuthorizeUrl(): string | null {
  const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID
  if (!clientId) return null

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "token",
  })
  const redirectUri = process.env.NEXT_PUBLIC_ANILIST_REDIRECT_URI
  if (redirectUri) params.set("redirect_uri", redirectUri)

  return `${AUTHORIZE_URL}?${params.toString()}`
}

/** Parse the `#access_token=…&expires_in=…` fragment from the OAuth callback. */
export function parseTokenFromHash(hash: string): StoredToken | null {
  const cleaned = hash.startsWith("#") ? hash.slice(1) : hash
  const params = new URLSearchParams(cleaned)
  const accessToken = params.get("access_token")
  if (!accessToken) return null

  const expiresIn = Number(params.get("expires_in"))
  // AniList implicit tokens last ~1 year; default to that if absent.
  const ttlMs =
    Number.isFinite(expiresIn) && expiresIn > 0
      ? expiresIn * 1000
      : 365 * 24 * 60 * 60 * 1000

  return { accessToken, expiresAt: Date.now() + ttlMs }
}

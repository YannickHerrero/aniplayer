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

/**
 * Build the AniList authorization-code authorize URL, or null if unconfigured.
 * AniList no longer supports implicit grant, so we use response_type=code and
 * exchange the returned code for a token server-side (see /api/auth/anilist).
 */
export function buildAuthorizeUrl(): string | null {
  const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_ANILIST_REDIRECT_URI
  if (!clientId || !redirectUri) return null

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
  })

  return `${AUTHORIZE_URL}?${params.toString()}`
}

/** Build a StoredToken from an access token + lifetime in seconds. */
export function makeStoredToken(
  accessToken: string,
  expiresInSeconds: number | null | undefined
): StoredToken {
  // AniList access tokens are long-lived (~1 year); fall back to that.
  const ttlMs =
    expiresInSeconds && expiresInSeconds > 0
      ? expiresInSeconds * 1000
      : 365 * 24 * 60 * 60 * 1000
  return { accessToken, expiresAt: Date.now() + ttlMs }
}

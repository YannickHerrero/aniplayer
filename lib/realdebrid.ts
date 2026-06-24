export type RealDebridUser = {
  username: string
  type: string | null
  premium: number | null
  expiration: string | null
}

type RealDebridUserResponse = {
  username?: string
  type?: string
  premium?: number
  expiration?: string
}

/** Validate a Real-Debrid API key via the local proxy; returns the user. */
export async function validateRealDebridKey(
  apiKey: string,
  signal?: AbortSignal
): Promise<RealDebridUser> {
  const response = await fetch("/api/realdebrid/user", {
    headers: { "x-realdebrid-key": apiKey },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Real-Debrid validation failed (${response.status})`)
  }

  const payload = (await response.json()) as RealDebridUserResponse

  if (!payload.username?.trim()) {
    throw new Error("Real-Debrid response is missing a username")
  }

  return {
    username: payload.username.trim(),
    type: payload.type?.trim() || null,
    premium: typeof payload.premium === "number" ? payload.premium : null,
    expiration: payload.expiration?.trim() || null,
  }
}

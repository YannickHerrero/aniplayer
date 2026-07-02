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
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  const payload = (await validateRealDebridKeyNative(
    apiKey
  )) as RealDebridUserResponse

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
import { validateRealDebridKeyNative } from "@/lib/backend"

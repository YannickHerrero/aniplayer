// Server-side Real-Debrid REST client for the download flow:
// add magnet → select file → poll until cached → unrestrict to a direct link.

const RD_BASE = "https://api.real-debrid.com/rest/1.0"

export type RdTorrentFile = {
  id: number
  path: string
  bytes: number
  selected: number
}

export type RdTorrentInfo = {
  id: string
  filename: string
  status: string
  progress: number
  links: string[]
  files: RdTorrentFile[]
}

export class RealDebridError extends Error {}

async function rdFetch(
  path: string,
  key: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${RD_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    throw new RealDebridError(`Real-Debrid ${path} failed (${res.status})`)
  }
  return res
}

function form(fields: Record<string, string>): {
  body: string
  headers: Record<string, string>
} {
  const body = new URLSearchParams(fields).toString()
  return {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  }
}

/** Add a magnet; returns the RD torrent id. */
export async function addMagnet(magnet: string, key: string): Promise<string> {
  const { body, headers } = form({ magnet })
  const res = await rdFetch("/torrents/addMagnet", key, {
    method: "POST",
    body,
    headers,
  })
  const data = (await res.json()) as { id?: string }
  if (!data.id) throw new RealDebridError("Real-Debrid did not return a torrent id")
  return data.id
}

/** Select which files to download ("all" or a comma-separated id list). */
export async function selectFiles(
  id: string,
  files: string,
  key: string
): Promise<void> {
  const { body, headers } = form({ files })
  await rdFetch(`/torrents/selectFiles/${id}`, key, {
    method: "POST",
    body,
    headers,
  })
}

export async function getTorrentInfo(
  id: string,
  key: string
): Promise<RdTorrentInfo> {
  const res = await rdFetch(`/torrents/info/${id}`, key)
  return (await res.json()) as RdTorrentInfo
}

/** Unrestrict an RD link into a direct, streamable download URL. */
export async function unrestrictLink(
  link: string,
  key: string
): Promise<string> {
  const { body, headers } = form({ link })
  const res = await rdFetch("/unrestrict/link", key, {
    method: "POST",
    body,
    headers,
  })
  const data = (await res.json()) as { download?: string }
  if (!data.download) throw new RealDebridError("Real-Debrid unrestrict returned no link")
  return data.download
}

/** Best-effort cleanup of a torrent entry from the RD account. */
export async function deleteTorrent(id: string, key: string): Promise<void> {
  try {
    await rdFetch(`/torrents/delete/${id}`, key, { method: "DELETE" })
  } catch {
    // non-fatal
  }
}

import { NextResponse } from "next/server"

const RD_USER_URL = "https://api.real-debrid.com/rest/1.0/user"

export const dynamic = "force-dynamic"

/** Proxy the Real-Debrid /user endpoint so the key isn't exposed in the page. */
export async function GET(request: Request) {
  const key = request.headers.get("x-realdebrid-key")
  if (!key) {
    return NextResponse.json(
      { error: "Real-Debrid key required" },
      { status: 401 }
    )
  }

  const response = await fetch(RD_USER_URL, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${key}` },
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: "Real-Debrid validation failed" },
      { status: response.status === 401 ? 401 : 502 }
    )
  }

  const data = await response.json()
  return NextResponse.json(data)
}

import { type NextRequest, NextResponse } from "next/server"

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co"

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid AniList request body" },
      { status: 400 }
    )
  }

  if (!isGraphqlRequest(body)) {
    return NextResponse.json(
      { error: "Invalid AniList request body" },
      { status: 400 }
    )
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    Accept: "application/json",
  }

  // Forward the caller's AniList token for authenticated reads/writes.
  const token = request.headers.get("x-anilist-token")
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(ANILIST_GRAPHQL_URL, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({
      query: body.query,
      variables: body.variables ?? {},
    }),
  })

  const responseBody = await response.text()

  const outHeaders: Record<string, string> = {
    "content-type": response.headers.get("content-type") ?? "application/json",
  }
  // Forward rate-limit info so the client can back off on 429.
  const retryAfter = response.headers.get("retry-after")
  if (retryAfter) outHeaders["retry-after"] = retryAfter

  return new NextResponse(responseBody, {
    status: response.status,
    headers: outHeaders,
  })
}

function isGraphqlRequest(
  body: unknown
): body is { query: string; variables?: Record<string, unknown> } {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { query?: unknown }).query === "string"
  )
}

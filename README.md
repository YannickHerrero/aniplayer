# Aniplayer

A personal, **localhost-only** web app to browse a local anime library, play
episodes in **VLC**, and track your progress on **AniList**.

Two pages:

- **Library** — a grid of every anime in your library (one card per folder).
- **Detail** — hero metadata, an **AniList tracking** panel (your progress
  _seen/total_, mean score, next-episode air date + live countdown), and an
  episode list where each episode opens in VLC and can be **marked complete**
  (which pushes your progress to AniList).

> ⚠️ This app reads your filesystem and launches VLC via local API routes with
> no authentication. It is meant to run only on `localhost` for personal use —
> **do not expose it to a network.**

## Requirements

- Node.js + [pnpm](https://pnpm.io)
- [VLC](https://www.videolan.org/) (macOS: installed at
  `/Applications/VLC.app`)

## Library layout

Point `ANIME_LIBRARY_PATH` at a folder that contains **one subfolder per
anime**, with episode files (`.mkv`, `.mp4`, …) inside:

```
~/Downloads/anime/
├── Frieren/
│   ├── Frieren - 01.mkv
│   └── Frieren - 02.mkv
└── Mushoku Tensei/
    └── [Sokudo] Mushoku Tensei 04 [1080p].mkv
```

Episode numbers are parsed from messy fansub filenames best-effort
(`S01E02`, `- 04`, `episode-2`, `01v2`, …).

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env.local` from the example and adjust:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Purpose |
   | --- | --- |
   | `ANIME_LIBRARY_PATH` | Library root (default `~/Downloads/anime`). |
   | `ANIPLAYER_DATA_DIR` | Where mappings/watched JSON live (default `./.data`). |
   | `NEXT_PUBLIC_ANILIST_CLIENT_ID` | Your AniList API client id (see below). |
   | `NEXT_PUBLIC_ANILIST_REDIRECT_URI` | Must match the AniList client exactly. |
   | `VLC_PATH` | Optional override for the VLC binary path. |

3. Run it:

   ```bash
   pnpm dev
   ```

   The app runs on a fixed, uncommon port: **http://localhost:39847**.

## Connecting AniList (optional but recommended)

Reading your personal progress/score and pushing "mark complete" both require an
authenticated AniList account via OAuth.

1. Go to **AniList → Settings → Developer →
   [Create New Client](https://anilist.co/settings/developer)**.
2. Set the **redirect URL** to exactly:

   ```
   http://localhost:39847/auth/callback
   ```

3. Copy the client **ID** into `NEXT_PUBLIC_ANILIST_CLIENT_ID` in `.env.local`
   (and keep `NEXT_PUBLIC_ANILIST_REDIRECT_URI` matching the redirect URL).
4. Restart the dev server, then click **Connect AniList** in the sidebar.

Without a connected account you can still browse, play, and mark episodes
locally — the AniList panel falls back to public data (mean score, popularity,
airing schedule) and local progress only.

## How it works

- **Matching:** each folder is auto-matched to an AniList entry by name the
  first time you open its detail page; use **Change match** to override.
  Mappings are cached in `<dataDir>/mappings.json`.
- **Watched state:** the local file `<dataDir>/watched.json` is the source of
  truth, merged upward with your AniList progress. Marking complete sets AniList
  progress to your highest watched episode.
- **Playback:** episode paths are validated (no traversal, must resolve inside
  the library root, must be a video file) before VLC is launched.

## Scripts

```bash
pnpm dev         # start the dev server on :39847
pnpm build       # production build
pnpm start       # run the production build on :39847
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
```

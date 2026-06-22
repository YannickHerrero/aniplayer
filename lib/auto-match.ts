import {
  type AnilistMedia,
  pickBestAnilistMatch,
  searchAnilistAnime,
} from "@/lib/anilist"

/** Derive a clean search title (and optional year) from a folder name. */
export function cleanTitleForSearch(folderName: string): {
  title: string
  year: string | null
} {
  // Year (1900–2099) anywhere in the name, before stripping.
  const yearMatch = folderName.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? yearMatch[0] : null

  const title = folderName
    .replace(/\[[^\]]*\]/g, " ") // release groups
    .replace(/\([^)]*\)/g, " ") // parenthetical notes
    .replace(/\b(19|20)\d{2}\b/g, " ") // years
    .replace(/\b(1080p|720p|480p|2160p|4k|bd|bluray|web-?dl|hevc|x265|x264|av1)\b/gi, " ")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return { title: title || folderName, year }
}

/** Search AniList for a folder and return the best match, or null. */
export async function autoMatchAnime(
  folderName: string,
  signal?: AbortSignal,
  token?: string | null
): Promise<AnilistMedia | null> {
  const { title, year } = cleanTitleForSearch(folderName)
  const results = await searchAnilistAnime(title, signal, token)
  return pickBestAnilistMatch(results, year)
}

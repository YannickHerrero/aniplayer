/**
 * Deterministic placeholder gradient for an anime card when no AniList cover
 * is available yet. Same input always yields the same gradient.
 */
const PALETTES: [string, string, string][] = [
  ["#2a0a0a", "#7a1f14", "#f0865e"],
  ["#1a1426", "#3d2a66", "#7c6cf0"],
  ["#06281f", "#0e6b4e", "#3ee08f"],
  ["#1a1622", "#4a2a5e", "#c06cf0"],
  ["#0a1a2a", "#1f4a7a", "#5eb0f0"],
  ["#2a1a06", "#7a5a14", "#f0c85e"],
]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function gradientFor(seed: string): string {
  const [a, b, c] = PALETTES[hashString(seed) % PALETTES.length]
  return `linear-gradient(145deg, ${a}, ${b} 55%, ${c})`
}

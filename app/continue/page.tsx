"use client"

import { ContinueWatchingCard } from "@/components/app/continue-watching-row"
import { PageShell } from "@/components/app/page-shell"
import { useAnilistAuth } from "@/hooks/use-anilist-auth"
import { useContinueWatching } from "@/hooks/use-continue-watching"
import { useLibrary } from "@/hooks/use-library"
import { useMappings } from "@/hooks/use-mappings"
import { useWatched } from "@/hooks/use-watched"

export default function ContinuePage() {
  const { folders } = useLibrary()
  const { mappings } = useMappings()
  const { watchedMap } = useWatched()
  const { token, connected } = useAnilistAuth()

  const items = useContinueWatching(
    folders,
    mappings,
    watchedMap,
    token,
    connected
  )

  return (
    <PageShell title="Continue watching">
      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Nothing in progress. Start watching an episode and it&apos;ll appear
          here.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {items.map((item) => (
            <ContinueWatchingCard key={item.slug} item={item} />
          ))}
        </div>
      )}
    </PageShell>
  )
}

import { AnimeCard } from "@/components/app/anime-card"
import type { AnimeFolder, MappingsFile } from "@/lib/types"

type AnimeGridProps = {
  folders: AnimeFolder[]
  mappings?: MappingsFile
}

export function AnimeGrid({ folders, mappings }: AnimeGridProps) {
  return (
    <div className="grid grid-cols-6 gap-4">
      {folders.map((folder) => {
        const mapping = mappings?.[folder.slug]
        return (
          <AnimeCard
            key={folder.slug}
            folder={folder}
            coverImage={mapping?.coverImage}
            title={mapping?.title}
          />
        )
      })}
    </div>
  )
}

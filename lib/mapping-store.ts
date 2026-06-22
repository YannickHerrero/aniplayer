import { readJsonStore, writeJsonStore } from "@/lib/data-dir"
import type { FolderMapping, MappingsFile } from "@/lib/types"

const MAPPINGS_FILE = "mappings.json"

export async function readMappings(): Promise<MappingsFile> {
  return readJsonStore<MappingsFile>(MAPPINGS_FILE, {})
}

export async function getMapping(
  slug: string
): Promise<FolderMapping | null> {
  const mappings = await readMappings()
  return mappings[slug] ?? null
}

export async function setMapping(
  slug: string,
  mapping: Omit<FolderMapping, "updatedAt">
): Promise<FolderMapping> {
  const mappings = await readMappings()
  const entry: FolderMapping = {
    ...mapping,
    updatedAt: new Date().toISOString(),
  }
  mappings[slug] = entry
  await writeJsonStore(MAPPINGS_FILE, mappings)
  return entry
}

export async function deleteMapping(slug: string): Promise<void> {
  const mappings = await readMappings()
  if (slug in mappings) {
    delete mappings[slug]
    await writeJsonStore(MAPPINGS_FILE, mappings)
  }
}

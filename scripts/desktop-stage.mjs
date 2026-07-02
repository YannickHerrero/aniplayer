import { cp, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const standaloneDir = path.join(root, ".next", "standalone")
const staticDir = path.join(root, ".next", "static")
const publicDir = path.join(root, "public")
const outputDir = path.join(root, "src-tauri", "resources", "next-server")

await rm(outputDir, { recursive: true, force: true })
await cp(standaloneDir, outputDir, { recursive: true })
await cp(staticDir, path.join(outputDir, ".next", "static"), { recursive: true })

try {
  await cp(publicDir, path.join(outputDir, "public"), { recursive: true })
} catch (err) {
  if (err?.code !== "ENOENT") throw err
}

console.log(`Staged Next standalone server at ${outputDir}`)

import { chmod, copyFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

const execFileAsync = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outputDir = path.join(root, "src-tauri", "binaries")

const { stdout } = await execFileAsync("rustc", ["--print", "host-tuple"])
const targetTriple = stdout.trim()
if (!targetTriple) {
  throw new Error("Could not determine Rust host target triple")
}

const extension = process.platform === "win32" ? ".exe" : ""
const output = path.join(outputDir, `node-${targetTriple}${extension}`)

await mkdir(outputDir, { recursive: true })
await copyFile(process.execPath, output)
await chmod(output, 0o755)

console.log(`Staged Node sidecar at ${output}`)

import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm"

await run(pnpm, ["build"])
await run(process.execPath, [path.join(root, "scripts", "desktop-stage.mjs")])
await run(process.execPath, [path.join(root, "scripts", "desktop-sidecar.mjs")])

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(" ")} failed with ${code}`))
    })
  })
}

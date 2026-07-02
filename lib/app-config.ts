import fs from "node:fs"
import fsp from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"

const CONFIG_FILE = "config.json"
const DEFAULT_CONFIG_DIR = "./.data"

export type RuntimeConfig = {
  animeLibraryPath?: string
  downloadsPath?: string
  dataDir?: string
  vlcPath?: string
  anilistClientId?: string
  anilistClientSecret?: string
  anilistRedirectUri?: string
}

function expandTilde(input: string): string {
  if (input === "~") return homedir()
  if (input.startsWith("~/")) return path.join(homedir(), input.slice(2))
  return input
}

export function getConfigDir(): string {
  const configured =
    process.env.ANIPLAYER_CONFIG_DIR?.trim() ||
    process.env.ANIPLAYER_DATA_DIR?.trim() ||
    DEFAULT_CONFIG_DIR
  return path.resolve(expandTilde(configured))
}

function configPath(): string {
  return path.join(getConfigDir(), CONFIG_FILE)
}

export function readRuntimeConfigSync(): RuntimeConfig {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8")) as RuntimeConfig
  } catch {
    return {}
  }
}

export async function readRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    return JSON.parse(await fsp.readFile(configPath(), "utf8")) as RuntimeConfig
  } catch {
    return {}
  }
}

export async function writeRuntimeConfig(config: RuntimeConfig): Promise<void> {
  const dir = getConfigDir()
  await fsp.mkdir(dir, { recursive: true })
  await fsp.writeFile(configPath(), JSON.stringify(config, null, 2), "utf8")
}

export function firstConfigured(
  ...values: Array<string | null | undefined>
): string | undefined {
  return values.map((v) => v?.trim()).find((v): v is string => Boolean(v))
}

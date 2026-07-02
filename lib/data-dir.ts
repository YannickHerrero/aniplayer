import { randomBytes } from "node:crypto"
import fs from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"

import { firstConfigured, readRuntimeConfigSync } from "@/lib/app-config"

const DEFAULT_DATA_DIR = "./.data"

function expandTilde(input: string): string {
  if (input === "~") return homedir()
  if (input.startsWith("~/")) return path.join(homedir(), input.slice(2))
  return input
}

/** Absolute path to the data dir (from ANIPLAYER_DATA_DIR). */
export function getDataDir(): string {
  const config = readRuntimeConfigSync()
  const configured = firstConfigured(
    process.env.ANIPLAYER_DATA_DIR,
    config.dataDir,
    DEFAULT_DATA_DIR
  ) ?? DEFAULT_DATA_DIR
  return path.resolve(expandTilde(configured))
}

async function ensureDataDir(): Promise<string> {
  const dir = getDataDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

/** Read a JSON store, returning `fallback` if the file is missing/corrupt. */
export async function readJsonStore<T>(
  fileName: string,
  fallback: T
): Promise<T> {
  const dir = getDataDir()
  try {
    const raw = await fs.readFile(path.join(dir, fileName), "utf8")
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Atomically write a JSON store (temp file + rename). */
export async function writeJsonStore<T>(
  fileName: string,
  data: T
): Promise<void> {
  const dir = await ensureDataDir()
  const target = path.join(dir, fileName)
  const tmp = path.join(dir, `.${fileName}.${randomBytes(6).toString("hex")}.tmp`)
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8")
  await fs.rename(tmp, target)
}

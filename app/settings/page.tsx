"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDetailLayout } from "@/hooks/use-detail-layout"
import { useRealDebrid } from "@/hooks/use-realdebrid"
import { DETAIL_LAYOUTS } from "@/lib/detail-layout"
import { type RealDebridUser, validateRealDebridKey } from "@/lib/realdebrid"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { key, configured, setKey, clearKey } = useRealDebrid()
  const { layout, setLayout, ready: layoutReady } = useDetailLayout()
  const [input, setInput] = useState("")
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">(
    "idle"
  )
  const [user, setUser] = useState<RealDebridUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const candidate = input.trim()
    if (!candidate) return
    setStatus("checking")
    setError(null)
    try {
      const validated = await validateRealDebridKey(candidate)
      setKey(candidate)
      setUser(validated)
      setStatus("ok")
      setInput("")
    } catch (err) {
      setStatus("error")
      setError((err as Error).message)
    }
  }

  const disconnect = () => {
    clearKey()
    setUser(null)
    setStatus("idle")
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Library
      </Link>

      <h1 className="mt-6 font-display text-2xl font-bold">Settings</h1>

      <section className="mt-8 rounded-2xl border border-[var(--border-strong)] bg-panel p-5">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-base font-semibold">Real-Debrid</h2>
          {configured && (
            <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-green">
              CONNECTED
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Required to download missing episodes. Get your API key at{" "}
          <a
            href="https://real-debrid.com/apitoken"
            target="_blank"
            rel="noreferrer"
            className="text-accent-light hover:underline"
          >
            real-debrid.com/apitoken
          </a>
          .
        </p>

        {configured ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              {user ? (
                <p className="text-text-primary">
                  {user.username}
                  {user.type ? ` · ${user.type}` : ""}
                </p>
              ) : (
                <p className="font-mono text-text-tertiary">
                  key ••••{key?.slice(-4)}
                </p>
              )}
            </div>
            <Button variant="secondary" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <Input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Real-Debrid API key"
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <Button onClick={save} disabled={status === "checking" || !input.trim()}>
              {status === "checking" ? "Checking…" : "Validate & save"}
            </Button>
          </div>
        )}

        {status === "ok" && (
          <p className="mt-2 text-xs text-green">Connected successfully.</p>
        )}
        {status === "error" && error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border-strong)] bg-panel p-5">
        <h2 className="font-display text-base font-semibold">
          Detail page layout
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          How an anime&apos;s page arranges its info and episode list.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {DETAIL_LAYOUTS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setLayout(opt.id)}
              disabled={!layoutReady}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                layout === opt.id
                  ? "border-accent/60 bg-accent/[0.12]"
                  : "border-[var(--border-strong)] bg-card hover:border-white/20"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-text-primary">
                  {opt.label}
                </span>
                {layout === opt.id && (
                  <span className="size-2 rounded-full bg-accent" />
                )}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-text-muted">
                {opt.hint}
              </p>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

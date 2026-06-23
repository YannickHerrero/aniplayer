"use client"

import { useCallback, useState } from "react"
import { FolderInput } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MoveResult, OrganizeProposal } from "@/lib/organizer"

type OrganizeButtonProps = {
  scanned: number
  total: number
}

type Row = {
  fileName: string
  targetFolder: string
  existing: boolean
  selected: boolean
}

type Phase = "idle" | "loading" | "list" | "moving" | "done"

export function OrganizeButton({ scanned, total }: OrganizeButtonProps) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [rows, setRows] = useState<Row[]>([])
  const [results, setResults] = useState<MoveResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setPhase("loading")
    setError(null)
    setResults([])
    try {
      const res = await fetch("/api/organize")
      if (!res.ok) throw new Error(`Scan failed (${res.status})`)
      const data = (await res.json()) as { proposals: OrganizeProposal[] }
      setRows(
        data.proposals.map((p) => ({
          fileName: p.fileName,
          targetFolder: p.targetFolder,
          existing: p.existing,
          selected: true,
        }))
      )
      setPhase("list")
    } catch (err) {
      setError((err as Error).message)
      setPhase("list")
    }
  }, [])

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) load()
  }

  const selected = rows.filter((r) => r.selected && r.targetFolder.trim())
  const movedCount = results.filter((r) => r.ok).length

  const move = async () => {
    setPhase("moving")
    try {
      const res = await fetch("/api/organize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          moves: selected.map((r) => ({
            fileName: r.fileName,
            targetFolder: r.targetFolder.trim(),
          })),
        }),
      })
      const data = (await res.json()) as { results: MoveResult[] }
      setResults(data.results ?? [])
      setPhase("done")
    } catch {
      setError("Move failed")
      setPhase("list")
    }
  }

  const finish = () => {
    setOpen(false)
    // Reflect the new folders in the library if anything actually moved.
    if (movedCount > 0) window.location.reload()
  }

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <button
        onClick={() => onOpenChange(true)}
        title="Organize loose downloads"
        className="w-full rounded-xl border border-[var(--border)] bg-panel p-3.5 text-left transition-colors hover:border-accent/40"
      >
        <div className="flex items-center gap-2">
          <span className="pulse-dot size-1.5 rounded-full bg-green shadow-[0_0_7px_var(--green)]" />
          <span className="text-[12px] text-text-secondary">Library ready</span>
          <FolderInput className="ml-auto size-3.5 text-text-muted" />
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-track">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6a5cf0] to-[#9b6cf0]"
            style={{ width: total > 0 ? `${(scanned / total) * 100}%` : "0%" }}
          />
        </div>
        <p className="mt-2 font-mono text-[11px] text-text-faint">
          {scanned} / {total} titles · organize
        </p>
      </button>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Organize downloads</DialogTitle>
          <DialogDescription>
            Loose video files in your Downloads folder. Confirm where each should
            go under your anime library.
          </DialogDescription>
        </DialogHeader>

        {phase === "loading" && (
          <p className="py-6 text-sm text-text-secondary">
            Scanning Downloads…
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {phase === "list" && !error && rows.length === 0 && (
          <p className="py-6 text-sm text-text-secondary">
            No loose video files found in your Downloads folder.
          </p>
        )}

        {(phase === "list" || phase === "moving") && rows.length > 0 && (
          <div className="max-h-[420px] overflow-y-auto">
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {rows.map((row, i) => (
                <li key={row.fileName} className="flex items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) =>
                      updateRow(i, { selected: e.target.checked })
                    }
                    className="size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-text-primary">
                      {row.fileName}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[11px] text-text-muted">
                        anime /
                      </span>
                      <Input
                        value={row.targetFolder}
                        onChange={(e) =>
                          updateRow(i, { targetFolder: e.target.value })
                        }
                        className="h-7 max-w-xs text-xs"
                      />
                      <span
                        className={
                          row.existing
                            ? "font-mono text-[10px] text-green"
                            : "font-mono text-[10px] text-text-faint"
                        }
                      >
                        {row.existing ? "existing" : "new"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {phase === "done" && (
          <div className="max-h-[420px] overflow-y-auto">
            <p className="mb-2 text-sm text-text-secondary">
              Moved {movedCount} of {results.length} file
              {results.length === 1 ? "" : "s"}.
            </p>
            <ul className="flex flex-col gap-1">
              {results.map((r) => (
                <li key={r.fileName} className="flex items-center gap-2 text-xs">
                  <span className={r.ok ? "text-green" : "text-red-400"}>
                    {r.ok ? "✓" : "✗"}
                  </span>
                  <span className="truncate text-text-secondary">
                    {r.fileName}
                  </span>
                  {!r.ok && r.reason && (
                    <span className="ml-auto shrink-0 text-text-muted">
                      {r.reason}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {phase === "done" ? (
            <Button onClick={finish}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={move}
                disabled={
                  phase === "moving" ||
                  phase === "loading" ||
                  selected.length === 0
                }
              >
                {phase === "moving"
                  ? "Moving…"
                  : `Move ${selected.length} file${
                      selected.length === 1 ? "" : "s"
                    }`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

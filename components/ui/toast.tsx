"use client"

import { useEffect } from "react"

import { cn } from "@/lib/utils"

export type ToastTone = "error" | "info" | "success"

type ToastProps = {
  message: string | null
  tone?: ToastTone
  onDismiss: () => void
  /** Auto-dismiss after this many ms (0 to disable). */
  duration?: number
}

export function Toast({
  message,
  tone = "info",
  onDismiss,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!message || duration <= 0) return
    const id = setTimeout(onDismiss, duration)
    return () => clearTimeout(id)
  }, [message, duration, onDismiss])

  if (!message) return null

  return (
    <div
      role="status"
      onClick={onDismiss}
      className={cn(
        "fixed bottom-5 right-5 z-50 max-w-sm cursor-pointer rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur",
        tone === "error" && "border-red-500/40 bg-red-500/15 text-red-200",
        tone === "success" && "border-green/40 bg-green/15 text-green",
        tone === "info" &&
          "border-[var(--border-strong)] bg-panel text-text-primary"
      )}
    >
      {message}
    </div>
  )
}

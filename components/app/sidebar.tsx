import Link from "next/link"
import { Heart, Home, ListVideo, PlayCircle } from "lucide-react"

import { AnilistConnectButton } from "@/components/app/anilist-connect-button"
import { OrganizeButton } from "@/components/app/organize-button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Home", icon: Home, href: "/", active: true },
  { label: "Continue watching", icon: PlayCircle, href: "/", active: false },
  { label: "Watchlist", icon: ListVideo, href: "/", active: false },
  { label: "Favorites", icon: Heart, href: "/", active: false },
]

type FolderEntry = { label: string; count: number }

type SidebarProps = {
  folders?: FolderEntry[]
  scanned?: number
  total?: number
}

export function Sidebar({
  folders = [],
  scanned = 0,
  total = 0,
}: SidebarProps) {
  return (
    <aside className="flex w-[236px] shrink-0 flex-col border-r border-[var(--border)] bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-[18px]">
        <div className="size-7 rounded-lg bg-gradient-to-br from-[#6a5cf0] to-[#9b6cf0]" />
        <span className="font-display text-base font-bold tracking-tight">
          Tsuki
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <Link
              key={i}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                item.active
                  ? "bg-accent/[0.16] text-white"
                  : "text-text-secondary hover:bg-white/[0.04]"
              )}
            >
              <Icon className="size-[18px]" strokeWidth={2} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Local folders */}
      <div className="mt-7 px-5">
        <p className="font-mono text-[11px] font-bold tracking-wider text-text-faint">
          LOCAL FOLDERS
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {folders.length === 0 ? (
            <li className="text-[13px] text-text-muted">No folders yet</li>
          ) : (
            folders.map((f) => (
              <li
                key={f.label}
                className="flex items-center justify-between text-[13px] text-[#c9c6d0]"
              >
                <span className="truncate">{f.label}</span>
                <span className="font-mono text-[11px] text-text-faint">
                  {f.count}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* AniList connect + library status / organizer */}
      <div className="mt-auto flex flex-col gap-3 p-4">
        <AnilistConnectButton />
        <OrganizeButton scanned={scanned} total={total} />
      </div>
    </aside>
  )
}

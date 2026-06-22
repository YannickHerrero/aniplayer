import { Sidebar } from "@/components/app/sidebar"

export default function LibraryPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-[62px] items-center border-b border-[var(--border)] px-[26px]">
          <h1 className="font-display text-base font-semibold">Library</h1>
        </header>
        <div className="px-[26px] py-[22px]">
          <p className="text-sm text-text-secondary">
            Library grid coming soon.
          </p>
        </div>
      </main>
    </div>
  )
}

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { HashRouter, Route, Routes } from "react-router-dom"

import AnimeDetailPage from "@/app/anime/[slug]/page"
import AuthCallbackPage from "@/app/auth/callback/page"
import ContinuePage from "@/app/continue/page"
import FavoritesPage from "@/app/favorites/page"
import LibraryPage from "@/app/page"
import SettingsPage from "@/app/settings/page"
import WatchlistPage from "@/app/watchlist/page"
import "@/app/globals.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/anime/:slug" element={<AnimeDetailPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/continue" element={<ContinuePage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
      </Routes>
    </HashRouter>
  </StrictMode>
)

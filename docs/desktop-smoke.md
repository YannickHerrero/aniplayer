# Desktop Smoke Checklist

Run these checks before shipping a Tauri build.

1. `pnpm lint` passes.
2. `pnpm typecheck` passes.
3. `cargo check` passes from `src-tauri` on a machine with Tauri Linux system dependencies installed.
4. `pnpm desktop:dev` opens the Tauri window and loads the library page.
5. Settings -> Desktop saves library path, data dir, VLC path, and AniList OAuth values.
6. Restarting the desktop app keeps the saved Settings -> Desktop values.
7. Library scan lists folders from the configured library path.
8. Opening an episode opens the in-app video overlay.
9. Play/pause, seek bar, and keyboard shortcuts (arrows ±10s) work.
10. Skip 85s button skips forward by 85 seconds.
11. Audio and subtitle track selectors work (for multi-track files).
12. Fullscreen toggle works.
13. Player closes cleanly and returns to the detail page.
14. Marking an episode watched persists after refresh.
15. Episode auto-marks watched when playback exceeds 40% of duration.
16. AniList connect completes through the configured callback route.
17. Real-Debrid key validation works from Settings.
18. Starting a missing episode download creates progress and eventually writes the file into the library folder.

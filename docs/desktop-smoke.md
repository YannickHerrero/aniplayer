# Desktop Smoke Checklist

Run these checks after `pnpm desktop:prepare` and before shipping a Tauri build.

1. `pnpm lint` passes.
2. `pnpm typecheck` passes.
3. `cargo check` passes from `src-tauri` on a machine with Tauri Linux system dependencies installed.
4. `pnpm desktop:dev` opens the Tauri window and loads the library page.
5. Settings -> Desktop saves library path, data dir, VLC path, and AniList OAuth values.
6. Restarting the desktop app keeps the saved Settings -> Desktop values.
7. Library scan lists folders from the configured library path.
8. Opening an episode launches VLC.
9. Marking an episode watched persists after refresh.
10. AniList connect completes through `http://localhost:39847/auth/callback`.
11. Real-Debrid key validation works from Settings.
12. Starting a missing episode download creates progress and eventually writes the file into the library folder.

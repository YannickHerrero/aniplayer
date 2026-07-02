use libmpv::{FileState, Mpv};
use raw_window_handle::HasWindowHandle;
use serde::Serialize;
use std::{
    fs,
    path::Path,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};
use tauri::{Emitter, Manager, Window};

use crate::{decode_slug, get_library_root, is_safe_segment, is_video_file, now_iso, to_string};

pub type SharedPlayer = Arc<std::sync::Mutex<Option<PlayerState>>>;

pub struct PlayerState {
    pub mpv: Arc<Mpv>,
    pub slug: String,
    pub episode: u32,
    running: Arc<AtomicBool>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerTimePos {
    pub position: f64,
    pub duration: f64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerTrack {
    pub id: u32,
    pub title: Option<String>,
    pub lang: Option<String>,
    pub selected: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerTracks {
    pub audio: Vec<PlayerTrack>,
    pub subtitle: Vec<PlayerTrack>,
}

#[tauri::command]
pub fn player_open(
    window: Window,
    state: tauri::State<'_, SharedPlayer>,
    slug: String,
    file_name: String,
    episode: u32,
) -> Result<(), String> {
    let folder_name = decode_slug(&slug);
    if !is_safe_segment(&folder_name) || !is_safe_segment(&file_name) || !is_video_file(&file_name)
    {
        return Err("Invalid episode path".into());
    }

    let root = fs::canonicalize(get_library_root()).map_err(|_| "Library not found".to_string())?;
    let target =
        fs::canonicalize(root.join(&folder_name).join(&file_name)).map_err(|e| to_string(e))?;
    if !target.starts_with(&root) || !target.is_file() {
        return Err("Path escapes library root".into());
    }

    let wid = get_wid(&window)?;

    let mpv = Mpv::with_initializer(|init| {
        init.set_property("wid", wid)?;
        init.set_property("video-sync", "display-resample")?;
        init.set_property("keep-open", "yes")?;
        init.set_property("ytdl", false)?;
        Ok(())
    })
    .map_err(to_string)?;

    mpv.set_property("osc", false).ok();
    mpv.set_property("osd-bar", false).ok();

    let path = target.to_string_lossy().to_string();
    mpv.playlist_load_files(&[(&path, FileState::Replace, None::<&str>)])
        .map_err(to_string)?;

    let mpv = Arc::new(mpv);
    let running = Arc::new(AtomicBool::new(true));

    start_poll_thread(window.clone(), mpv.clone(), running.clone());

    if let Ok(mut guard) = state.lock() {
        *guard = Some(PlayerState {
            mpv,
            slug,
            episode,
            running,
        });
    }

    Ok(())
}

#[tauri::command]
pub fn player_play_pause(state: tauri::State<'_, SharedPlayer>) -> Result<(), String> {
    with_mpv(&state, |mpv| {
        let paused: bool = mpv.get_property("pause").unwrap_or(true);
        if paused {
            mpv.unpause().map_err(to_string)
        } else {
            mpv.pause().map_err(to_string)
        }
    })
}

#[tauri::command]
pub fn player_seek(state: tauri::State<'_, SharedPlayer>, secs: f64) -> Result<(), String> {
    with_mpv(&state, |mpv| mpv.seek_absolute(secs).map_err(to_string))
}

#[tauri::command]
pub fn player_seek_relative(
    state: tauri::State<'_, SharedPlayer>,
    delta: f64,
) -> Result<(), String> {
    with_mpv(&state, |mpv| {
        if delta >= 0.0 {
            mpv.seek_forward(delta).map_err(to_string)
        } else {
            mpv.seek_backward(-delta).map_err(to_string)
        }
    })
}

#[tauri::command]
pub fn player_set_audio_track(
    state: tauri::State<'_, SharedPlayer>,
    track_id: u32,
) -> Result<(), String> {
    with_mpv(&state, |mpv| {
        mpv.set_property("aid", track_id as i64).map_err(to_string)
    })
}

#[tauri::command]
pub fn player_set_subtitle_track(
    state: tauri::State<'_, SharedPlayer>,
    track_id: u32,
) -> Result<(), String> {
    with_mpv(&state, |mpv| {
        mpv.set_property("sid", track_id as i64).map_err(to_string)
    })
}

#[tauri::command]
pub fn player_get_tracks(state: tauri::State<'_, SharedPlayer>) -> Result<PlayerTracks, String> {
    with_mpv(&state, |mpv| {
        let count: i64 = mpv.get_property("track-list/count").map_err(to_string)?;
        let mut audio = Vec::new();
        let mut subtitle = Vec::new();

        for i in 0..count {
            let prefix = format!("track-list/{i}");
            let track_type: Option<String> = mpv.get_property(&format!("{prefix}/type")).ok();
            let id: Option<i64> = mpv.get_property(&format!("{prefix}/id")).ok();
            let title: Option<String> = mpv
                .get_property(&format!("{prefix}/title"))
                .ok()
                .filter(|s: &String| !s.is_empty());
            let lang: Option<String> = mpv
                .get_property(&format!("{prefix}/lang"))
                .ok()
                .filter(|s: &String| !s.is_empty());
            let selected: Option<bool> = mpv.get_property(&format!("{prefix}/selected")).ok();

            let track = PlayerTrack {
                id: id.unwrap_or(0) as u32,
                title,
                lang,
                selected: selected.unwrap_or(false),
            };

            match track_type.as_deref() {
                Some("audio") => audio.push(track),
                Some("sub") => subtitle.push(track),
                _ => {}
            }
        }

        Ok(PlayerTracks { audio, subtitle })
    })
}

#[tauri::command]
pub fn player_set_volume(state: tauri::State<'_, SharedPlayer>, volume: f64) -> Result<(), String> {
    with_mpv(&state, |mpv| {
        mpv.set_property("volume", volume.clamp(0.0, 150.0) as i64)
            .map_err(to_string)
    })
}

#[tauri::command]
pub fn player_toggle_fullscreen(window: Window) -> Result<bool, String> {
    let is_fullscreen = window.is_fullscreen().unwrap_or(false);
    window.set_fullscreen(!is_fullscreen).map_err(to_string)?;
    Ok(!is_fullscreen)
}

#[tauri::command]
pub fn player_close(state: tauri::State<'_, SharedPlayer>, episode: u32) -> Result<u32, String> {
    if let Ok(mut guard) = state.lock() {
        if let Some(player) = guard.take() {
            player.running.store(false, Ordering::Relaxed);
            drop(player);
        }
    }
    Ok(episode)
}

fn with_mpv<T>(
    state: &tauri::State<'_, SharedPlayer>,
    f: impl FnOnce(&Mpv) -> Result<T, String>,
) -> Result<T, String> {
    let guard = state.lock().map_err(to_string)?;
    let player = guard.as_ref().ok_or("No active player")?;
    f(&player.mpv)
}

fn start_poll_thread(window: Window, mpv: Arc<Mpv>, running: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut last_tracks = PlayerTracks {
            audio: Vec::new(),
            subtitle: Vec::new(),
        };
        let mut was_ended = false;

        while running.load(Ordering::Relaxed) {
            thread::sleep(Duration::from_millis(150));

            let position: Option<f64> = mpv.get_property("time-pos").ok();
            let duration: Option<f64> = mpv.get_property("duration").ok();
            let paused: Option<bool> = mpv.get_property("pause").ok();

            if let (Some(pos), Some(dur)) = (position, duration) {
                if dur > 1.0 && pos >= dur - 1.0 {
                    if !was_ended {
                        was_ended = true;
                        window.emit("player:end", now_iso()).ok();
                    }
                } else {
                    was_ended = false;
                }

                let _ = window.emit(
                    "player:time-pos",
                    PlayerTimePos {
                        position: pos,
                        duration: dur,
                    },
                );
            }

            if let Some(paused) = paused {
                let _ = window.emit("player:pause", paused);
            }

            let new_tracks = read_tracks(&mpv);
            if !tracks_equal(&new_tracks, &last_tracks) {
                let _ = window.emit("player:tracks", new_tracks.clone());
                last_tracks = new_tracks;
            }
        }
    });
}

fn read_tracks(mpv: &Mpv) -> PlayerTracks {
    let count: i64 = mpv.get_property("track-list/count").unwrap_or(0);
    let mut audio = Vec::new();
    let mut subtitle = Vec::new();

    for i in 0..count {
        let prefix = format!("track-list/{i}");
        let track_type: Option<String> = mpv.get_property(&format!("{prefix}/type")).ok();
        let id: Option<i64> = mpv.get_property(&format!("{prefix}/id")).ok();
        let title: Option<String> = mpv
            .get_property(&format!("{prefix}/title"))
            .ok()
            .filter(|s: &String| !s.is_empty());
        let lang: Option<String> = mpv
            .get_property(&format!("{prefix}/lang"))
            .ok()
            .filter(|s: &String| !s.is_empty());
        let selected: Option<bool> = mpv.get_property(&format!("{prefix}/selected")).ok();

        let track = PlayerTrack {
            id: id.unwrap_or(0) as u32,
            title,
            lang,
            selected: selected.unwrap_or(false),
        };

        match track_type.as_deref() {
            Some("audio") => audio.push(track),
            Some("sub") => subtitle.push(track),
            _ => {}
        }
    }

    PlayerTracks { audio, subtitle }
}

fn tracks_equal(a: &PlayerTracks, b: &PlayerTracks) -> bool {
    a.audio.len() == b.audio.len()
        && a.subtitle.len() == b.subtitle.len()
        && a.audio
            .iter()
            .zip(b.audio.iter())
            .all(|(a, b)| a.id == b.id && a.selected == b.selected)
        && a.subtitle
            .iter()
            .zip(b.subtitle.iter())
            .all(|(a, b)| a.id == b.id && a.selected == b.selected)
}

#[cfg(target_os = "macos")]
fn get_wid(window: &Window) -> Result<i64, String> {
    use raw_window_handle::RawWindowHandle;
    let handle = window.window_handle().map_err(to_string)?;
    let raw = handle.as_raw();
    match raw {
        RawWindowHandle::AppKit(h) => Ok(h.ns_view.as_ptr() as i64),
        _ => Err("Expected AppKit window handle".into()),
    }
}

#[cfg(target_os = "windows")]
fn get_wid(window: &Window) -> Result<i64, String> {
    use raw_window_handle::RawWindowHandle;
    let handle = window.window_handle().map_err(to_string)?;
    let raw = handle.as_raw();
    match raw {
        RawWindowHandle::Win32(h) => {
            let hwnd: isize = h.hwnd.into();
            Ok(hwnd as i64)
        }
        _ => Err("Expected Win32 window handle".into()),
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn get_wid(_window: &Window) -> Result<i64, String> {
    Err("In-app player not yet supported on this platform (requires macOS or Windows)".into())
}

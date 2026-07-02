use chrono::Utc;
use futures_util::StreamExt;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    env,
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    process::Command,
    sync::{Mutex, OnceLock},
};

const DEFAULT_LIBRARY: &str = "~/Downloads/anime";
const DEFAULT_DATA_DIR: &str = "./.data";
const CONFIG_FILE: &str = "config.json";
const MAPPINGS_FILE: &str = "mappings.json";
const WATCHED_FILE: &str = "watched.json";
const DOWNLOADS_FILE: &str = "downloads.json";
const KITSU_MAP_FILE: &str = "kitsu-map.json";
const ANILIST_TOKEN_URL: &str = "https://anilist.co/api/v2/oauth/token";
const ANILIST_GRAPHQL_URL: &str = "https://graphql.anilist.co";
const FRIBB_URL: &str =
    "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json";

#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeConfig {
    anime_library_path: Option<String>,
    downloads_path: Option<String>,
    data_dir: Option<String>,
    vlc_path: Option<String>,
    anilist_client_id: Option<String>,
    anilist_client_secret: Option<String>,
    anilist_redirect_uri: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct EpisodeFile {
    file_name: String,
    absolute_path: String,
    episode: Option<u32>,
    season: Option<u32>,
    quality: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AnimeFolder {
    slug: String,
    folder_name: String,
    absolute_path: String,
    episodes: Vec<EpisodeFile>,
    episode_count: usize,
    qualities: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct FolderMapping {
    anilist_id: u32,
    title: String,
    cover_image: Option<String>,
    updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct WatchedEntry {
    watched: Vec<u32>,
    updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DownloadEntry {
    slug: String,
    episode: u32,
    status: String,
    phase: String,
    progress: f64,
    bytes: u64,
    total_bytes: Option<u64>,
    file_name: Option<String>,
    error: Option<String>,
    updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConfigResponse {
    library_root: String,
    data_dir: String,
    config: RuntimeConfig,
    anilist_client_configured: bool,
    anilist_client_id: Option<String>,
    anilist_redirect_uri: Option<String>,
    anilist_client_secret_configured: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConfigPatch {
    anime_library_path: Option<Option<String>>,
    downloads_path: Option<Option<String>>,
    data_dir: Option<Option<String>>,
    vlc_path: Option<Option<String>>,
    anilist_client_id: Option<Option<String>>,
    anilist_client_secret: Option<Option<String>>,
    anilist_redirect_uri: Option<Option<String>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryResponse {
    root: String,
    folders: Vec<AnimeFolder>,
}

#[derive(Serialize)]
struct MappingsResponse {
    mappings: HashMap<String, FolderMapping>,
}

#[derive(Serialize)]
struct WatchedResponse {
    watched: HashMap<String, WatchedEntry>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct OrganizeProposal {
    file_name: String,
    episode: Option<u32>,
    quality: Option<String>,
    title: String,
    target_folder: String,
    existing: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MoveRequest {
    file_name: String,
    target_folder: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MoveResult {
    file_name: String,
    target_folder: String,
    ok: bool,
    reason: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganizeResponse {
    downloads_root: String,
    proposals: Vec<OrganizeProposal>,
}

#[derive(Clone)]
struct TorrentioSource {
    title: String,
    filename: Option<String>,
    quality: Option<String>,
    size_bytes: u64,
    url: Option<String>,
    score: f64,
}

static DOWNLOAD_REGISTRY: OnceLock<Mutex<HashMap<String, DownloadEntry>>> = OnceLock::new();
static KITSU_CACHE: OnceLock<Mutex<Option<HashMap<String, u32>>>> = OnceLock::new();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            patch_config,
            scan_library_cmd,
            get_library_folder,
            create_library_entry,
            get_mappings,
            set_mapping_cmd,
            delete_mapping_cmd,
            get_watched_all,
            set_watched_cmd,
            play_episode_cmd,
            get_organize,
            move_organize,
            anilist_graphql,
            anilist_exchange_code,
            validate_realdebrid_key,
            is_mappable,
            get_download_cmd,
            start_download_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_config() -> Result<ConfigResponse, String> {
    let config = read_runtime_config();
    let client_id = first_configured(&[
        env::var("NEXT_PUBLIC_ANILIST_CLIENT_ID").ok(),
        config.anilist_client_id.clone(),
    ]);
    let redirect_uri = first_configured(&[
        env::var("NEXT_PUBLIC_ANILIST_REDIRECT_URI").ok(),
        config.anilist_redirect_uri.clone(),
    ]);
    let secret = first_configured(&[
        env::var("ANILIST_CLIENT_SECRET").ok(),
        config.anilist_client_secret.clone(),
    ]);

    let mut safe_config = config.clone();
    safe_config.anilist_client_secret = None;

    Ok(ConfigResponse {
        library_root: get_library_root(),
        data_dir: get_data_dir(),
        config: safe_config,
        anilist_client_configured: client_id.is_some(),
        anilist_client_id: client_id,
        anilist_redirect_uri: redirect_uri,
        anilist_client_secret_configured: secret.is_some(),
    })
}

#[tauri::command]
fn patch_config(patch: ConfigPatch) -> Result<RuntimeConfig, String> {
    let mut config = read_runtime_config();
    apply_config_patch(&mut config.anime_library_path, patch.anime_library_path);
    apply_config_patch(&mut config.downloads_path, patch.downloads_path);
    apply_config_patch(&mut config.data_dir, patch.data_dir);
    apply_config_patch(&mut config.vlc_path, patch.vlc_path);
    apply_config_patch(&mut config.anilist_client_id, patch.anilist_client_id);
    apply_config_patch(
        &mut config.anilist_client_secret,
        patch.anilist_client_secret,
    );
    apply_config_patch(&mut config.anilist_redirect_uri, patch.anilist_redirect_uri);
    write_runtime_config(&config)?;
    config.anilist_client_secret = None;
    Ok(config)
}

#[tauri::command]
fn scan_library_cmd() -> Result<LibraryResponse, String> {
    Ok(LibraryResponse {
        root: get_library_root(),
        folders: scan_library(),
    })
}

#[tauri::command]
fn get_library_folder(slug: String) -> Result<Option<AnimeFolder>, String> {
    Ok(scan_library()
        .into_iter()
        .find(|folder| folder.slug == slug || folder.folder_name == slug))
}

#[tauri::command]
fn create_library_entry(
    title: String,
    anilist_id: u32,
    cover_image: Option<String>,
) -> Result<Value, String> {
    let mut mappings = read_json_store::<HashMap<String, FolderMapping>>(MAPPINGS_FILE, {})?;
    if let Some((slug, _)) = mappings
        .iter()
        .find(|(_, mapping)| mapping.anilist_id == anilist_id)
    {
        return Ok(json!({ "slug": slug, "reused": true }));
    }

    let folder_name = sanitize_folder_name(&title);
    if !is_safe_segment(&folder_name) {
        return Err("Could not create a folder for this title".into());
    }

    fs::create_dir_all(Path::new(&get_library_root()).join(&folder_name)).map_err(to_string)?;
    let slug = folder_to_slug(&folder_name);
    mappings.insert(
        slug.clone(),
        FolderMapping {
            anilist_id,
            title,
            cover_image,
            updated_at: now_iso(),
        },
    );
    write_json_store(MAPPINGS_FILE, &mappings)?;
    Ok(json!({ "slug": slug, "reused": false }))
}

#[tauri::command]
fn get_mappings() -> Result<MappingsResponse, String> {
    Ok(MappingsResponse {
        mappings: read_json_store(MAPPINGS_FILE, {})?,
    })
}

#[tauri::command]
fn set_mapping_cmd(
    slug: String,
    anilist_id: u32,
    title: String,
    cover_image: Option<String>,
) -> Result<FolderMapping, String> {
    let mut mappings = read_json_store::<HashMap<String, FolderMapping>>(MAPPINGS_FILE, {})?;
    let mapping = FolderMapping {
        anilist_id,
        title,
        cover_image,
        updated_at: now_iso(),
    };
    mappings.insert(slug, mapping.clone());
    write_json_store(MAPPINGS_FILE, &mappings)?;
    Ok(mapping)
}

#[tauri::command]
fn delete_mapping_cmd(slug: String) -> Result<(), String> {
    let mut mappings = read_json_store::<HashMap<String, FolderMapping>>(MAPPINGS_FILE, {})?;
    mappings.remove(&slug);
    write_json_store(MAPPINGS_FILE, &mappings)
}

#[tauri::command]
fn get_watched_all() -> Result<WatchedResponse, String> {
    Ok(WatchedResponse {
        watched: read_json_store(WATCHED_FILE, {})?,
    })
}

#[tauri::command]
fn set_watched_cmd(slug: String, episode: u32, watched: bool) -> Result<Vec<u32>, String> {
    let mut all = read_json_store::<HashMap<String, WatchedEntry>>(WATCHED_FILE, {})?;
    let mut set: HashSet<u32> = all
        .get(&slug)
        .map(|entry| entry.watched.iter().copied().collect())
        .unwrap_or_default();
    if watched {
        set.insert(episode);
    } else {
        set.remove(&episode);
    }
    let mut list: Vec<u32> = set.into_iter().collect();
    list.sort_unstable();
    all.insert(
        slug,
        WatchedEntry {
            watched: list.clone(),
            updated_at: now_iso(),
        },
    );
    write_json_store(WATCHED_FILE, &all)?;
    Ok(list)
}

#[tauri::command]
fn play_episode_cmd(slug: String, file_name: String) -> Result<(), String> {
    if !is_safe_segment(&decode_slug(&slug))
        || !is_safe_segment(&file_name)
        || !is_video_file(&file_name)
    {
        return Err("Invalid episode path".into());
    }
    let root = fs::canonicalize(get_library_root()).map_err(|_| "Library not found".to_string())?;
    let target = fs::canonicalize(root.join(decode_slug(&slug)).join(file_name))
        .map_err(|_| "File not found".to_string())?;
    if !target.starts_with(&root) || !target.is_file() {
        return Err("Path escapes library root".into());
    }

    let configured = first_configured(&[
        env::var("VLC_PATH").ok(),
        read_runtime_config().vlc_path.clone(),
    ]);
    let mut command = configured.unwrap_or_else(default_vlc_binary);
    let mut args = vec![target.to_string_lossy().to_string()];

    if Path::new(&command).is_absolute() && !Path::new(&command).exists() {
        if cfg!(target_os = "macos") {
            command = "open".into();
            args = vec![
                "-a".into(),
                "VLC".into(),
                target.to_string_lossy().to_string(),
            ];
        } else {
            return Err("VLC binary not found".into());
        }
    }

    Command::new(command)
        .args(args)
        .spawn()
        .map_err(to_string)?;
    Ok(())
}

#[tauri::command]
fn get_organize() -> Result<OrganizeResponse, String> {
    Ok(OrganizeResponse {
        downloads_root: get_downloads_root(),
        proposals: propose_organization(),
    })
}

#[tauri::command]
fn move_organize(moves: Vec<MoveRequest>) -> Result<Vec<MoveResult>, String> {
    Ok(move_loose_videos(moves))
}

#[tauri::command]
async fn anilist_graphql(
    query: String,
    variables: Option<Value>,
    token: Option<String>,
) -> Result<Value, String> {
    let client = reqwest::Client::new();
    let mut request = client
        .post(ANILIST_GRAPHQL_URL)
        .header("content-type", "application/json")
        .header("accept", "application/json")
        .json(&json!({ "query": query, "variables": variables.unwrap_or_else(|| json!({})) }));
    if let Some(token) = token.filter(|t| !t.trim().is_empty()) {
        request = request.bearer_auth(token);
    }
    let response = request.send().await.map_err(to_string)?;
    let status = response.status();
    let body = response.json::<Value>().await.map_err(to_string)?;
    if !status.is_success() {
        return Err(format!("AniList request failed with status {status}"));
    }
    Ok(body)
}

#[tauri::command]
async fn anilist_exchange_code(code: String) -> Result<Value, String> {
    let config = read_runtime_config();
    let client_id = first_configured(&[
        env::var("NEXT_PUBLIC_ANILIST_CLIENT_ID").ok(),
        config.anilist_client_id.clone(),
    ])
    .ok_or("AniList client ID is not configured")?;
    let client_secret = first_configured(&[
        env::var("ANILIST_CLIENT_SECRET").ok(),
        config.anilist_client_secret.clone(),
    ])
    .ok_or("AniList client secret is not configured")?;
    let redirect_uri = first_configured(&[
        env::var("NEXT_PUBLIC_ANILIST_REDIRECT_URI").ok(),
        config.anilist_redirect_uri.clone(),
    ])
    .ok_or("AniList redirect URI is not configured")?;

    let response = reqwest::Client::new()
        .post(ANILIST_TOKEN_URL)
        .header("content-type", "application/json")
        .json(&json!({
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "code": code,
        }))
        .send()
        .await
        .map_err(to_string)?;
    let status = response.status();
    let data = response.json::<Value>().await.map_err(to_string)?;
    if !status.is_success() || data.get("access_token").is_none() {
        return Err(data
            .get("message")
            .or_else(|| data.get("error"))
            .and_then(Value::as_str)
            .unwrap_or("AniList token exchange failed")
            .to_string());
    }
    Ok(json!({
        "accessToken": data.get("access_token").and_then(Value::as_str),
        "expiresIn": data.get("expires_in").and_then(Value::as_u64),
    }))
}

#[tauri::command]
async fn validate_realdebrid_key(api_key: String) -> Result<Value, String> {
    let response = reqwest::Client::new()
        .get("https://api.real-debrid.com/rest/1.0/user")
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(to_string)?;
    if !response.status().is_success() {
        return Err("Real-Debrid validation failed".into());
    }
    response.json::<Value>().await.map_err(to_string)
}

#[tauri::command]
async fn is_mappable(slug: String) -> Result<bool, String> {
    let mappings = read_json_store::<HashMap<String, FolderMapping>>(MAPPINGS_FILE, {})?;
    let Some(mapping) = mappings.get(&slug) else {
        return Ok(false);
    };
    Ok(get_kitsu_id(mapping.anilist_id).await?.is_some())
}

#[tauri::command]
fn get_download_cmd(slug: String, episode: u32) -> Result<Option<DownloadEntry>, String> {
    hydrate_downloads()?;
    let registry = DOWNLOAD_REGISTRY.get().unwrap().lock().map_err(to_string)?;
    Ok(registry.get(&download_key(&slug, episode)).cloned())
}

#[tauri::command]
async fn start_download_cmd(
    slug: String,
    episode: u32,
    real_debrid_key: String,
) -> Result<DownloadEntry, String> {
    hydrate_downloads()?;
    let key = download_key(&slug, episode);
    {
        let registry = DOWNLOAD_REGISTRY.get().unwrap().lock().map_err(to_string)?;
        if let Some(existing) = registry.get(&key) {
            if existing.status == "downloading" {
                return Ok(existing.clone());
            }
        }
    }

    let entry = DownloadEntry {
        slug: slug.clone(),
        episode,
        status: "downloading".into(),
        phase: "resolving".into(),
        progress: 0.0,
        bytes: 0,
        total_bytes: None,
        file_name: None,
        error: None,
        updated_at: now_iso(),
    };
    save_download(entry.clone(), true)?;

    tauri::async_runtime::spawn(async move {
        if let Err(err) = run_download(slug, episode, real_debrid_key).await {
            let _ = fail_download(&key, err);
        }
    });

    Ok(entry)
}

async fn run_download(slug: String, episode: u32, real_debrid_key: String) -> Result<(), String> {
    let source = resolve_best_source(&slug, episode, &real_debrid_key).await?;
    let source_url = source.url.ok_or("Source has no direct link")?;
    let folder_name = decode_slug(&slug);
    if !is_safe_segment(&folder_name) {
        return Err("Invalid folder name".into());
    }
    let folder_dir = Path::new(&get_library_root()).join(&folder_name);
    fs::create_dir_all(&folder_dir).map_err(to_string)?;

    let ext = source
        .filename
        .as_deref()
        .and_then(|name| Path::new(name).extension())
        .and_then(|ext| ext.to_str())
        .map(|ext| format!(".{ext}"))
        .filter(|ext| is_video_file(&format!("x{ext}")))
        .unwrap_or_else(|| ".mkv".into());
    let dest_name = format!("{} - {:02}{}", folder_name, episode, ext);
    let dest_path = folder_dir.join(&dest_name);
    update_download(&slug, episode, |entry| {
        entry.file_name = Some(dest_name.clone())
    })?;
    if dest_path.exists() {
        complete_download(&slug, episode)?;
        return Ok(());
    }

    update_download(&slug, episode, |entry| entry.phase = "transferring".into())?;
    let response = reqwest::get(source_url).await.map_err(to_string)?;
    if !response.status().is_success() {
        return Err(format!("Download failed ({})", response.status()));
    }
    let total = response.content_length();
    update_download(&slug, episode, |entry| entry.total_bytes = total)?;

    let part_path = dest_path.with_extension(format!("{}part", ext.trim_start_matches('.')));
    let mut file = File::create(&part_path).map_err(to_string)?;
    let mut stream = response.bytes_stream();
    let mut bytes = 0_u64;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(to_string)?;
        file.write_all(&chunk).map_err(to_string)?;
        bytes += chunk.len() as u64;
        update_download(&slug, episode, |entry| {
            entry.bytes = bytes;
            if let Some(total) = total.filter(|t| *t > 0) {
                entry.progress = ((bytes as f64 / total as f64) * 100.0).min(99.0);
            }
        })?;
    }
    fs::rename(part_path, dest_path).map_err(to_string)?;
    complete_download(&slug, episode)
}

async fn resolve_best_source(
    slug: &str,
    episode: u32,
    real_debrid_key: &str,
) -> Result<TorrentioSource, String> {
    let mappings = read_json_store::<HashMap<String, FolderMapping>>(MAPPINGS_FILE, {})?;
    let mapping = mappings.get(slug).ok_or("Title not mappable")?;
    let kitsu_id = get_kitsu_id(mapping.anilist_id)
        .await?
        .ok_or("Title not mappable")?;
    let sources = fetch_torrentio_sources(kitsu_id, episode, real_debrid_key).await?;
    sources
        .into_iter()
        .filter(|source| source.url.is_some())
        .max_by(|a, b| a.score.total_cmp(&b.score))
        .ok_or("No source found".into())
}

async fn fetch_torrentio_sources(
    kitsu_id: u32,
    episode: u32,
    real_debrid_key: &str,
) -> Result<Vec<TorrentioSource>, String> {
    let providers = [
        "nyaasi",
        "tokyotosho",
        "anidex",
        "horriblesubs",
        "yts",
        "eztv",
        "1337x",
        "thepiratebay",
        "torrentgalaxy",
        "rarbg",
        "kickasstorrents",
        "magnetdl",
    ];
    let config = format!(
        "providers={}|sort=qualitysize|qualityfilter=scr,cam|debridoptions=nodownloadlinks|realdebrid={}",
        providers.join(","),
        real_debrid_key
    );
    let url = format!(
        "https://torrentio.strem.fun/{config}/stream/series/kitsu:{kitsu_id}:{episode}.json"
    );
    let response = reqwest::get(url).await.map_err(to_string)?;
    if !response.status().is_success() {
        return Err(format!("Torrentio request failed ({})", response.status()));
    }
    let payload = response.json::<Value>().await.map_err(to_string)?;
    Ok(payload
        .get("streams")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .map(normalize_source)
        .collect())
}

fn normalize_source(stream: &Value) -> TorrentioSource {
    let title = stream
        .get("title")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .replace('\n', " ");
    let filename = stream
        .get("behaviorHints")
        .and_then(|h| h.get("filename"))
        .and_then(Value::as_str)
        .map(ToOwned::to_owned);
    let quality = Regex::new(r"(?i)\b(2160p|4k|1080p|720p|480p|360p)\b")
        .ok()
        .and_then(|re| re.find(&title).map(|m| m.as_str().to_uppercase()));
    let size_bytes = parse_size_bytes(&title);
    let is_cached = stream.get("url").and_then(Value::as_str).is_some();
    let mut score = if quality.as_deref() == Some("1080P") {
        1000.0
    } else if quality.as_deref() == Some("720P") {
        800.0
    } else if matches!(quality.as_deref(), Some("2160P" | "4K")) {
        600.0
    } else {
        400.0
    };
    if is_cached {
        score += 1000.0;
    }
    if size_bytes > 0 {
        let size_gb = size_bytes as f64 / 1024_f64.powi(3);
        score -= size_gb.powf(1.5) * 80.0;
    }
    TorrentioSource {
        title,
        filename,
        quality,
        size_bytes,
        url: stream
            .get("url")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
        score,
    }
}

async fn get_kitsu_id(anilist_id: u32) -> Result<Option<u32>, String> {
    if let Some(map) = KITSU_CACHE
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(to_string)?
        .clone()
    {
        return Ok(map.get(&anilist_id.to_string()).copied());
    }

    let stored = read_json_store::<Value>(KITSU_MAP_FILE, json!(null)).unwrap_or(Value::Null);
    if let Some(map) = stored.get("map").and_then(Value::as_object) {
        let parsed = map
            .iter()
            .filter_map(|(key, value)| value.as_u64().map(|id| (key.clone(), id as u32)))
            .collect::<HashMap<_, _>>();
        *KITSU_CACHE
            .get_or_init(|| Mutex::new(None))
            .lock()
            .map_err(to_string)? = Some(parsed.clone());
        return Ok(parsed.get(&anilist_id.to_string()).copied());
    }

    let response = reqwest::get(FRIBB_URL).await.map_err(to_string)?;
    let list = response.json::<Vec<Value>>().await.map_err(to_string)?;
    let mut map = HashMap::new();
    for entry in list {
        if let (Some(anilist), Some(kitsu)) = (
            entry.get("anilist_id").and_then(Value::as_u64),
            entry.get("kitsu_id").and_then(Value::as_u64),
        ) {
            map.insert(anilist.to_string(), kitsu as u32);
        }
    }
    write_json_store(
        KITSU_MAP_FILE,
        &json!({ "fetchedAt": now_iso(), "map": map }),
    )?;
    *KITSU_CACHE
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(to_string)? = Some(map.clone());
    Ok(map.get(&anilist_id.to_string()).copied())
}

fn scan_library() -> Vec<AnimeFolder> {
    let root = PathBuf::from(get_library_root());
    let mut folders = Vec::new();
    let Ok(entries) = fs::read_dir(&root) else {
        return folders;
    };
    for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_dir() {
            continue;
        }
        let folder_name = entry.file_name().to_string_lossy().to_string();
        if folder_name.starts_with('.') {
            continue;
        }
        folders.push(scan_anime_folder(folder_name, entry.path()));
    }
    folders.sort_by(|a, b| {
        a.folder_name
            .to_lowercase()
            .cmp(&b.folder_name.to_lowercase())
    });
    folders
}

fn scan_anime_folder(folder_name: String, absolute_path: PathBuf) -> AnimeFolder {
    let mut episodes = Vec::new();
    if let Ok(entries) = fs::read_dir(&absolute_path) {
        for entry in entries.flatten() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if entry.file_type().map(|t| t.is_file()).unwrap_or(false) && is_video_file(&file_name)
            {
                let (episode, season, quality) = parse_episode(&file_name);
                episodes.push(EpisodeFile {
                    file_name,
                    absolute_path: entry.path().to_string_lossy().to_string(),
                    episode,
                    season,
                    quality,
                });
            }
        }
    }
    episodes.sort_by(|a, b| {
        (
            a.season.unwrap_or(0),
            a.episode.unwrap_or(u32::MAX),
            &a.file_name,
        )
            .cmp(&(
                b.season.unwrap_or(0),
                b.episode.unwrap_or(u32::MAX),
                &b.file_name,
            ))
    });
    let qualities = episodes
        .iter()
        .filter_map(|episode| episode.quality.clone())
        .collect::<HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    AnimeFolder {
        slug: folder_to_slug(&folder_name),
        folder_name,
        absolute_path: absolute_path.to_string_lossy().to_string(),
        episode_count: episodes.len(),
        episodes,
        qualities,
    }
}

fn propose_organization() -> Vec<OrganizeProposal> {
    let downloads_root = PathBuf::from(get_downloads_root());
    let library_root = PathBuf::from(get_library_root());
    let existing = fs::read_dir(library_root)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|entry| entry.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect::<Vec<_>>();
    fs::read_dir(downloads_root)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|entry| {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if !entry.file_type().map(|t| t.is_file()).unwrap_or(false)
                || !is_video_file(&file_name)
            {
                return None;
            }
            let (episode, _, quality) = parse_episode(&file_name);
            let title = title_from_file_name(&file_name);
            let target = match_existing_folder(&title, &existing).unwrap_or_else(|| title.clone());
            Some(OrganizeProposal {
                file_name,
                episode,
                quality,
                title,
                existing: existing.iter().any(|folder| folder == &target),
                target_folder: target,
            })
        })
        .collect()
}

fn move_loose_videos(moves: Vec<MoveRequest>) -> Vec<MoveResult> {
    let downloads_root = PathBuf::from(get_downloads_root());
    let library_root = PathBuf::from(get_library_root());
    moves
        .into_iter()
        .map(|move_request| {
            let target_folder = move_request.target_folder.trim().to_string();
            let mut result = MoveResult {
                file_name: move_request.file_name.clone(),
                target_folder: target_folder.clone(),
                ok: false,
                reason: None,
            };
            if !is_safe_segment(&move_request.file_name)
                || !is_video_file(&move_request.file_name)
                || !is_safe_segment(&target_folder)
            {
                result.reason = Some("Invalid file or folder name".into());
                return result;
            }
            let src = downloads_root.join(&move_request.file_name);
            let dest_dir = library_root.join(&target_folder);
            let dest = dest_dir.join(&move_request.file_name);
            if dest.exists() {
                result.reason = Some("Destination already exists".into());
                return result;
            }
            if let Err(err) = fs::create_dir_all(dest_dir).and_then(|_| fs::rename(src, dest)) {
                result.reason = Some(err.to_string());
                return result;
            }
            result.ok = true;
            result
        })
        .collect()
}

fn parse_episode(file_name: &str) -> (Option<u32>, Option<u32>, Option<String>) {
    let quality = Regex::new(r"(?i)(\d{3,4})p")
        .ok()
        .and_then(|re| re.captures(file_name).map(|cap| format!("{}p", &cap[1])));
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or(file_name);
    let cleaned = Regex::new(r"\[[^\]]*\]|\([^)]*\)")
        .unwrap()
        .replace_all(stem, " ")
        .to_string();
    if let Some(cap) = Regex::new(r"(?i)S(\d{1,2})\s*E(\d{1,3})")
        .unwrap()
        .captures(&cleaned)
    {
        return (cap[2].parse().ok(), cap[1].parse().ok(), quality);
    }
    for pattern in [
        r"(?i)\b(?:episode|ep|e)[\s._-]*(\d{1,3})\b",
        r"-\s*(\d{1,3})(?:v\d+)?\b",
        r"\b(\d{1,3})(?:v\d+)?\b",
    ] {
        if let Some(cap) = Regex::new(pattern).unwrap().captures_iter(&cleaned).last() {
            return (cap[1].parse().ok(), None, quality);
        }
    }
    (None, None, quality)
}

fn title_from_file_name(file_name: &str) -> String {
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or(file_name);
    let mut title = Regex::new(r"\[[^\]]*\]|\([^)]*\)")
        .unwrap()
        .replace_all(stem, " ")
        .to_string();
    title = Regex::new(r"(?i)\bS\d{1,2}\s*E\d{1,3}\b|\b(?:episode|ep)[\s._-]*\d{1,3}\b|\b(1080p|720p|480p|2160p|4k|bd|bluray|web-?dl|hevc|x265|x264|av1)\b")
        .unwrap()
        .replace_all(&title, " ")
        .to_string();
    title = Regex::new(r"[._]+|\s+-\s*\d{1,3}.*$|\s+")
        .unwrap()
        .replace_all(&title, " ")
        .trim()
        .to_string();
    title
}

fn match_existing_folder(title: &str, folders: &[String]) -> Option<String> {
    let normalized_title = normalize_title(title);
    folders
        .iter()
        .filter_map(|folder| {
            let normalized = normalize_title(folder);
            if normalized_title.contains(&normalized) || normalized.contains(&normalized_title) {
                Some((folder.clone(), normalized.len()))
            } else {
                None
            }
        })
        .max_by_key(|(_, len)| *len)
        .map(|(folder, _)| folder)
}

fn normalize_title(value: &str) -> String {
    value
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect()
}

fn read_runtime_config() -> RuntimeConfig {
    read_json_path(&config_path()).unwrap_or_default()
}

fn write_runtime_config(config: &RuntimeConfig) -> Result<(), String> {
    write_json_path(&config_path(), config)
}

fn read_json_store<T: for<'de> Deserialize<'de>>(
    file_name: &str,
    fallback: T,
) -> Result<T, String> {
    Ok(read_json_path(&Path::new(&get_data_dir()).join(file_name)).unwrap_or(fallback))
}

fn write_json_store<T: Serialize>(file_name: &str, data: &T) -> Result<(), String> {
    write_json_path(&Path::new(&get_data_dir()).join(file_name), data)
}

fn read_json_path<T: for<'de> Deserialize<'de>>(path: &Path) -> Option<T> {
    fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
}

fn write_json_path<T: Serialize>(path: &Path, data: &T) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(to_string)?;
    }
    fs::write(path, serde_json::to_string_pretty(data).map_err(to_string)?).map_err(to_string)
}

fn hydrate_downloads() -> Result<(), String> {
    let registry = DOWNLOAD_REGISTRY.get_or_init(|| Mutex::new(HashMap::new()));
    let mut registry = registry.lock().map_err(to_string)?;
    if !registry.is_empty() {
        return Ok(());
    }
    let stored =
        read_json_store::<HashMap<String, HashMap<String, DownloadEntry>>>(DOWNLOADS_FILE, {})?;
    for by_episode in stored.values() {
        for entry in by_episode.values() {
            registry.insert(download_key(&entry.slug, entry.episode), entry.clone());
        }
    }
    Ok(())
}

fn save_download(entry: DownloadEntry, persist: bool) -> Result<(), String> {
    DOWNLOAD_REGISTRY
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .map_err(to_string)?
        .insert(download_key(&entry.slug, entry.episode), entry.clone());
    if persist {
        let mut all =
            read_json_store::<HashMap<String, HashMap<String, DownloadEntry>>>(DOWNLOADS_FILE, {})?;
        all.entry(entry.slug.clone())
            .or_default()
            .insert(entry.episode.to_string(), entry);
        write_json_store(DOWNLOADS_FILE, &all)?;
    }
    Ok(())
}

fn update_download(
    slug: &str,
    episode: u32,
    update: impl FnOnce(&mut DownloadEntry),
) -> Result<(), String> {
    let key = download_key(slug, episode);
    let mut entry = DOWNLOAD_REGISTRY
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .map_err(to_string)?
        .get(&key)
        .cloned()
        .ok_or("Download missing")?;
    update(&mut entry);
    entry.updated_at = now_iso();
    save_download(entry, true)
}

fn complete_download(slug: &str, episode: u32) -> Result<(), String> {
    update_download(slug, episode, |entry| {
        entry.status = "completed".into();
        entry.progress = 100.0;
        entry.error = None;
    })
}

fn fail_download(key: &str, message: String) -> Result<(), String> {
    let mut registry = DOWNLOAD_REGISTRY
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .map_err(to_string)?;
    let Some(entry) = registry.get_mut(key) else {
        return Ok(());
    };
    entry.status = "failed".into();
    entry.error = Some(message);
    entry.updated_at = now_iso();
    let entry = entry.clone();
    drop(registry);
    save_download(entry, true)
}

fn get_library_root() -> String {
    let config = read_runtime_config();
    resolve_path(
        first_configured(&[
            env::var("ANIME_LIBRARY_PATH").ok(),
            config.anime_library_path,
            Some(DEFAULT_LIBRARY.into()),
        ])
        .unwrap_or_else(|| DEFAULT_LIBRARY.into()),
    )
}

fn get_downloads_root() -> String {
    let config = read_runtime_config();
    if let Some(downloads) =
        first_configured(&[env::var("DOWNLOADS_PATH").ok(), config.downloads_path])
    {
        return resolve_path(downloads);
    }
    Path::new(&get_library_root())
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .to_string_lossy()
        .to_string()
}

fn get_data_dir() -> String {
    let config = read_runtime_config();
    resolve_path(
        first_configured(&[
            env::var("ANIPLAYER_DATA_DIR").ok(),
            config.data_dir,
            Some(DEFAULT_DATA_DIR.into()),
        ])
        .unwrap_or_else(|| DEFAULT_DATA_DIR.into()),
    )
}

fn get_config_dir() -> String {
    resolve_path(
        first_configured(&[
            env::var("ANIPLAYER_CONFIG_DIR").ok(),
            env::var("ANIPLAYER_DATA_DIR").ok(),
            Some(DEFAULT_DATA_DIR.into()),
        ])
        .unwrap_or_else(|| DEFAULT_DATA_DIR.into()),
    )
}

fn config_path() -> PathBuf {
    Path::new(&get_config_dir()).join(CONFIG_FILE)
}

fn resolve_path(value: String) -> String {
    let expanded = if value == "~" {
        home_dir()
    } else if let Some(rest) = value.strip_prefix("~/") {
        home_dir().join(rest)
    } else {
        PathBuf::from(value)
    };
    if expanded.is_absolute() {
        expanded
    } else {
        env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(expanded)
    }
    .to_string_lossy()
    .to_string()
}

fn home_dir() -> PathBuf {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn first_configured(values: &[Option<String>]) -> Option<String> {
    values
        .iter()
        .flatten()
        .map(|value| value.trim())
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn apply_config_patch(target: &mut Option<String>, patch: Option<Option<String>>) {
    if let Some(value) = patch {
        *target = value.and_then(|value| {
            let trimmed = value.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        });
    }
}

fn sanitize_folder_name(title: &str) -> String {
    title
        .chars()
        .map(|ch| if "/\\:*?\"<>|".contains(ch) { ' ' } else { ch })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim_matches(['.', ' '])
        .to_string()
}

fn is_safe_segment(segment: &str) -> bool {
    !segment.is_empty()
        && !segment.contains('/')
        && !segment.contains('\\')
        && !segment.contains('\0')
        && segment != "."
        && segment != ".."
}

fn folder_to_slug(folder_name: &str) -> String {
    urlencoding::encode(folder_name).to_string()
}

fn decode_slug(slug: &str) -> String {
    urlencoding::decode(slug)
        .map(|value| value.to_string())
        .unwrap_or_else(|_| slug.to_string())
}

fn is_video_file(file_name: &str) -> bool {
    Path::new(file_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            matches!(
                ext.to_lowercase().as_str(),
                "mkv" | "mp4" | "avi" | "mov" | "m4v"
            )
        })
        .unwrap_or(false)
}

fn default_vlc_binary() -> String {
    if cfg!(target_os = "macos") {
        "/Applications/VLC.app/Contents/MacOS/VLC".into()
    } else if cfg!(target_os = "windows") {
        "vlc.exe".into()
    } else {
        "vlc".into()
    }
}

fn parse_size_bytes(title: &str) -> u64 {
    let Ok(re) = Regex::new(r"(?i)([\d.]+)\s*(GB|MB|TB)") else {
        return 0;
    };
    let Some(cap) = re.captures(title) else {
        return 0;
    };
    let value = cap[1].parse::<f64>().unwrap_or(0.0);
    match cap[2].to_uppercase().as_str() {
        "TB" => (value * 1024_f64.powi(4)) as u64,
        "GB" => (value * 1024_f64.powi(3)) as u64,
        _ => (value * 1024_f64.powi(2)) as u64,
    }
}

fn download_key(slug: &str, episode: u32) -> String {
    format!("{slug}:{episode}")
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn to_string(err: impl std::fmt::Display) -> String {
    err.to_string()
}

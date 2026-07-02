#[cfg(not(debug_assertions))]
use std::{
    net::TcpStream,
    thread,
    time::{Duration, Instant},
};

#[cfg(not(debug_assertions))]
use tauri::Manager;
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

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

            #[cfg(not(debug_assertions))]
            start_next_server(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(not(debug_assertions))]
fn start_next_server(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let server_dir = app.path().resource_dir()?.join("next-server");
    let server_js = server_dir.join("server.js");

    let (mut rx, child) = app
        .shell()
        .sidecar("node")?
        .arg(server_js)
        .current_dir(server_dir)
        .env("NODE_ENV", "production")
        .env("HOSTNAME", "127.0.0.1")
        .env("PORT", "39847")
        .spawn()?;

    tauri::async_runtime::spawn(async move {
        let _child = child;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    log::info!("next: {}", String::from_utf8_lossy(&line))
                }
                CommandEvent::Stderr(line) => {
                    log::warn!("next: {}", String::from_utf8_lossy(&line))
                }
                _ => {}
            }
        }
    });

    wait_for_next_server()?;
    Ok(())
}

#[cfg(not(debug_assertions))]
fn wait_for_next_server() -> Result<(), Box<dyn std::error::Error>> {
    let deadline = Instant::now() + Duration::from_secs(20);

    while Instant::now() < deadline {
        if TcpStream::connect(("127.0.0.1", 39847)).is_ok() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }

    Err(std::io::Error::new(
        std::io::ErrorKind::TimedOut,
        "Next server did not start on 127.0.0.1:39847",
    )
    .into())
}

use std::sync::Mutex;

pub struct ServerState(pub Mutex<Option<tokio::task::JoinHandle<()>>>);

/// Start a local HTTP server so player devices can download the pack over LAN.
///
/// The server serves a single file at GET /pack — the most recently exported .pack.
/// Returns the LAN URL (e.g. "http://192.168.1.5:7878/pack").
#[tauri::command]
pub async fn start_local_server(pack_path: String) -> Result<String, String> {
    // TODO: implement full local HTTP server using tiny_http or axum
    // For now, return stub so the app compiles
    let _ = pack_path;
    Ok("http://127.0.0.1:7878/pack".to_string())
}

/// Stop the local HTTP server if running.
#[tauri::command]
pub async fn stop_local_server() -> Result<(), String> {
    // TODO: implement server teardown
    Ok(())
}

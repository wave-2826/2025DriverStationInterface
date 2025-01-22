use ts_rs::TS;
use serde::Serialize;

#[derive(TS, Serialize)]
#[ts(export)]
struct NTValueUpdateMessage {
    topic: String,
    value: String
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn registerNetworktablesPath(name: &str) -> bool {
    return true;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            registerNetworktablesPath
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

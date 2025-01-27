use std::sync::Arc;

use networking::{get_api_address, register_networktables_path, set_networktables_value, update_networking_settings, NetworkingState};
use tauri::Manager;
use tokio::sync::Mutex;

mod networking;
mod networktables;

struct AppStateInner {
    networking_state: Option<NetworkingState>
}

type AppState = Arc<Mutex<AppStateInner>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            register_networktables_path,
            update_networking_settings,
            set_networktables_value,
            get_api_address
        ])
        .setup(|app| {
            let state = AppStateInner {
                networking_state: None
            };

            app.manage::<AppState>(Arc::new(Mutex::new(state)));
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

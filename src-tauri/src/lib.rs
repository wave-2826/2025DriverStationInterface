use std::sync::{Arc, Mutex};

use networking::{register_networktables_path, update_networking_settings, get_api_address, NetworkingState};
use tauri::Manager;

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

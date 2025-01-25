// Prevents additional console window on Windows in release; do not remove!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tokio::main]
async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    wave_driver_station_interface_lib::run()
}

// Prevents additional console window on Windows in release; do not remove!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    wave_driver_station_interface_lib::run()
}

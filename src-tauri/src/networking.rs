use std::{collections::HashMap, net::IpAddr, sync::{atomic::AtomicBool, Arc}};

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tokio::{sync::RwLock, task::JoinHandle};
use ts_rs::TS;
use simple_mdns::sync_discovery::OneShotMdnsResolver;

use crate::{networktables::Client, AppState};

#[derive(TS, Serialize)]
#[ts(export)]
struct NTValueUpdateMessage {
    topic: String,
    value: String
}

#[derive(TS, Serialize, Deserialize, Clone)]
#[ts(export)]
pub struct NTUpdateMessage {
    connected: bool,
    latency: f64,
}

#[tauri::command]
pub fn register_networktables_path(name: &str) -> bool {
    println!("register_networktables_path: {}", name);
    return true;
}

#[derive(TS, Serialize, Deserialize, Debug)]
#[ts(export)]
#[serde(tag = "type", content = "value", rename_all = "camelCase")]
pub enum IPAddressMode {
    DriverStation,
    TeamNumber,
    #[allow(non_camel_case_types)]
    mDNS,
    Localhost,
    Custom(String)
}

// fn resolve_mdns(team_number: u16) -> Result<NTAddr, String> {
//     let addr = format!("roboRIO-{}-FRC.local", team_number);

//     let resolver = match OneShotMdnsResolver::new() {
//         Ok(resolver) => resolver,
//         Err(e) => return Err(format!("Failed to create mDNS resolver: {}", e)),
//     };

//     match resolver.query_service_address(&addr) {
//         Ok(None) => {
//             Err(format!("Failed to resolve mDNS address for team number {}: No address found", team_number))
//         }
//         Ok(Some(IpAddr::V4(ip))) => Ok(NTAddr::Custom(ip)),
//         Ok(Some(IpAddr::V6(_))) => Err("IPv6 addresses are not supported".to_string()),
//         Err(e) => Err(format!("Failed to resolve mDNS address: {}", e)),
//     }
// }

// impl IPAddressMode {
//     pub fn get_ntaddr(&self, team_number: u16) -> Result<NTAddr, String> {
//         match self {
//             IPAddressMode::Localhost => Ok(NTAddr::Local),
//             IPAddressMode::TeamNumber => Ok(NTAddr::TeamNumber(team_number)),
//             IPAddressMode::mDNS => resolve_mdns(team_number),
//             IPAddressMode::Custom(ip) => ip.parse::<std::net::Ipv4Addr>()
//                 .map_err(|_| "Invalid IP address".to_string())
//                 .map(|ip| NTAddr::Custom(ip)),
//             IPAddressMode::DriverStation => Ok(NTAddr::Custom(std::net::Ipv4Addr::new(42, 42, 42, 42)))
//         }
//     }
// }

#[derive(TS, Serialize, Deserialize)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct NetworkSettingsUpdateMessage {
    pub ip_address_mode: IPAddressMode,
    pub team_number: u16
}

#[derive(Debug)]
pub struct NetworkingState {
    pub ip_address_mode: IPAddressMode,
    pub team_number: u16,

    // nt_client: NtClientThread
}

fn verify_ip_address_mode(ip_address_mode: &IPAddressMode) -> bool {
    match ip_address_mode {
        IPAddressMode::DriverStation => true,
        IPAddressMode::TeamNumber => true,
        IPAddressMode::mDNS => true,
        IPAddressMode::Localhost => true,
        IPAddressMode::Custom(ip) => ip.parse::<std::net::Ipv4Addr>().is_ok()
    }
}

// The future returned by connect() only ends when the connection is closed.
// To close the connection manually, we stop a thread that runs the client.
// This probably isn't the best way to do this, but it works.
#[derive(Debug)]
struct NtClientThread {
    thread: JoinHandle<()>,
    nt_updates_running: bool,
    connected: AtomicBool
}

impl NtClientThread {
    // pub fn new(ntaddr: NTAddr) -> Self {
    //     let (thread, announced_topics, time) = Self::spawn_thread(ntaddr);
    //     Self {
    //         thread,
    //         nt_updates_running: false,
    //         connected: AtomicBool::new(false)
    //     }
    // }

    // pub fn change_ip(&mut self, ntaddr: NTAddr) {
    //     self.thread.abort();

    //     self.connected.store(false, std::sync::atomic::Ordering::Relaxed);
    // }

    pub fn start_networktables_updates(self: &mut Self, channel: Channel<NTUpdateMessage>) {
        if self.nt_updates_running {
            return;
        }

        self.nt_updates_running = true;

        println!("Starting NetworkTables updates...");

        tokio::spawn(async move {
            loop {
                tokio::time::sleep(std::time::Duration::from_millis(5000)).await;
        
                // TODO
                
                match channel.send(NTUpdateMessage {
                    connected: true,
                    latency: 0.1
                }) {
                    Ok(_) => {},
                    Err(_) => {
                        println!("Failed to send NetworkTables update message");
                        break;
                    }
                }
            }
        });
    }
}

#[tauri::command]
pub fn update_networking_settings(
    state: tauri::State<'_, AppState>,
    payload: NetworkSettingsUpdateMessage,
    update: Channel<NTUpdateMessage>
) -> Result<(), String> {
    let state = &mut state.lock().unwrap().networking_state;

    if !verify_ip_address_mode(&payload.ip_address_mode) {
        eprintln!("Invalid IP address mode: {:?}", payload.ip_address_mode);
        return Err("Invalid IP address mode".to_string());
    }

    if payload.team_number < 1 || payload.team_number > 25599 {
        eprintln!("Invalid team number: {}", payload.team_number);
        return Err("Invalid team number".to_string());
    }

    if state.is_none() {
        // let addr = payload.ip_address_mode.get_ntaddr(payload.team_number);
        // if addr.is_err() {
        //     eprintln!("Failed to get NTAddr: {}", addr.err().unwrap());
        //     return Err("Failed to get NTAddr".to_string());
        // }

        state.replace(NetworkingState {
            ip_address_mode: payload.ip_address_mode,
            team_number: payload.team_number,
            // nt_client: NtClientThread::new(addr.unwrap())
        });
    } else {
        let state = state.as_mut().unwrap();
        state.ip_address_mode = payload.ip_address_mode;
        state.team_number = payload.team_number;

        // let addr = state.ip_address_mode.get_ntaddr(payload.team_number);
        // if addr.is_err() {
        //     eprintln!("Failed to get NTAddr: {}", addr.err().unwrap());
        //     return Err("Failed to get NTAddr".to_string());
        // }

        // state.nt_client.change_ip(addr.unwrap());
    }

    println!("Networking settings updated: {:?}", state);
    
    // let nt_client = &mut state.as_mut().unwrap().nt_client;

    // nt_client.start_networktables_updates(update);

    Ok(())
}
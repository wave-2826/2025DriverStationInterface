use std::{net::{IpAddr, Ipv4Addr, SocketAddr, SocketAddrV4}, sync::{atomic::{AtomicBool, Ordering}, Arc}, time::Duration};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tokio::{select, task::JoinHandle, time, sync::RwLock};
use ts_rs::TS;
use simple_mdns::sync_discovery::OneShotMdnsResolver;

use crate::{networktables::{Client, Config, Subscription, SubscriptionOptions}, AppState};

#[derive(TS, Serialize, Deserialize, Clone)]
#[ts(export)]
pub struct NTValueUpdateMessage {
    topic: String,
    value: String
}

#[derive(TS, Serialize, Deserialize, Clone)]
#[ts(export)]
pub struct NTStatusUpdateMessage {
    connected: bool,
    latency: f64,
}

#[derive(TS, Serialize, Deserialize, Clone)]
#[ts(export)]
#[serde(tag = "type", rename_all="camelCase")]
pub enum NTUpdateMessage {
    StatusUpdate(NTStatusUpdateMessage),
    ValueUpdate(NTValueUpdateMessage)
}

#[derive(TS, Serialize, Deserialize, Clone)]
#[ts(export)]
pub struct NTRegisterPathMessage {
    path: String
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

fn resolve_mdns(team_number: u16) -> Result<SocketAddr, String> {
    let addr = format!("roboRIO-{}-FRC.local", team_number);

    let resolver = match OneShotMdnsResolver::new() {
        Ok(resolver) => resolver,
        Err(e) => return Err(format!("Failed to create mDNS resolver: {}", e)),
    };

    match resolver.query_service_address(&addr) {
        Ok(None) => {
            Err(format!("Failed to resolve mDNS address for team number {}: No address found", team_number))
        }
        Ok(Some(IpAddr::V4(ip))) => Ok(SocketAddr::V4(
            SocketAddrV4::new(ip, 5810)
        )),
        Ok(Some(IpAddr::V6(_))) => Err("IPv6 addresses are not supported".to_string()),
        Err(e) => Err(format!("Failed to resolve mDNS address: {}", e)),
    }
}

impl IPAddressMode {
    pub fn get_ip_address(&self, team_number: u16) -> Result<SocketAddr, String> {
        match self {
            IPAddressMode::Localhost => Ok(SocketAddr::V4(SocketAddrV4::new(
                Ipv4Addr::new(127, 0, 0, 1), 5810
            ))),
            IPAddressMode::TeamNumber => {
                let first_digits = (team_number / 100) as u8;
                let last_digits = (team_number % 100) as u8;
                return Ok(SocketAddr::V4(SocketAddrV4::new(
                    Ipv4Addr::new(10, first_digits, last_digits, 2), 5810 // 5811 for secure connections
                )));
            },
            IPAddressMode::mDNS => resolve_mdns(team_number),
            IPAddressMode::Custom(ip) => ip.parse::<SocketAddr>()
                .map_err(|_| "Invalid IP address".to_string()),
            IPAddressMode::DriverStation => Ok(SocketAddr::V4(SocketAddrV4::new(
                Ipv4Addr::new(42, 42, 42, 42), 5810 // 5811 for secure connections
            )))
        }
    }
}

#[derive(TS, Serialize, Deserialize)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct NetworkSettingsUpdateMessage {
    pub ip_address_mode: IPAddressMode,
    pub team_number: u16
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

type ClientLock = Arc<RwLock<Option<Client>>>;
type SubscriptionLock = Arc<RwLock<Option<Subscription>>>;

// The future returned by connect() only ends when the connection is closed.
// To close the connection manually, we stop a thread that runs the client.
// This probably isn't the best way to do this, but it works.
#[derive(Debug)]
struct NtClientThread {
    thread: JoinHandle<()>,
    nt_updates_thread: Option<JoinHandle<()>>,
    client: ClientLock,
    subscribed_topics: Vec<String>,
    subscription: SubscriptionLock,
    connected: Arc<AtomicBool>
}

impl NtClientThread {
    pub fn new(ntaddr: SocketAddr) -> Self {
        let connected = Arc::new(AtomicBool::new(false));
        let (thread, client, subscription) = Self::spawn_thread(
            ntaddr,
            connected.clone(),
            vec![]
        );
        Self {
            thread,
            client,
            nt_updates_thread: None,
            subscribed_topics: vec![],
            subscription,
            connected
        }
    }

    pub fn change_ip(&mut self, address: SocketAddr) {
        self.connected.store(false, Ordering::Relaxed);

        self.thread.abort();

        let (thread, client, subscription) = Self::spawn_thread(
            address,
            self.connected.clone(),
            self.subscribed_topics.clone()
        );
        
        self.thread = thread;
        self.client = client;
        self.subscription = subscription;
    }

    pub fn set_subscribed_topics(self: &mut Self, topics: &Vec<String>) -> Result<(), String> {
        self.subscribed_topics.clone_from(topics);
        
        let client = self.client.blocking_read();
        if let Some(client) = client.as_ref() {
            if let Some(sub) = self.subscription.blocking_write().take() {
                if let Err(e) = client.blocking_unsubscribe(sub) {
                    eprintln!("Failed to ubsubscribe from active topics: {}", e);
                    return Ok(());
                }
            }

            let new_subscription = client.blocking_subscribe_w_options(&topics, Some(SubscriptionOptions {
                ..Default::default()
            }));

            if let Err(e) = new_subscription {
                return Err(format!("Failed to subscribe to topics: {}", e));
            }

            *self.subscription.blocking_write() = Some(new_subscription.unwrap());

            return Ok(());
        }

        return Ok(());
    }

    pub fn spawn_thread(
        address: SocketAddr,
        connected_boolean: Arc<AtomicBool>,
        subscribed_topics: Vec<String>
    ) -> (
        JoinHandle<()>,
        ClientLock,
        SubscriptionLock
    ) {
        let client_lock: ClientLock = Arc::new(RwLock::new(None));
        let client_lock_2: ClientLock = client_lock.clone();

        let subscription_lock: SubscriptionLock = Arc::new(RwLock::new(None));
        let subscription_lock_2: SubscriptionLock = subscription_lock.clone();

        let thread_handle = tokio::spawn(async move {
            println!("Attempting to connect to NT4 server at {}...", address);

            let client = loop {
                match Client::new_w_config(address, Config {
                    name: "WaveDSInterface".to_string(),
                    ..Default::default()
                }).await {
                    Ok(c) => break c,
                    Err(e) => {
                        eprintln!("Failed to create client: {}", e);
                    }
                };
                tokio::time::sleep(Duration::from_secs(2)).await;
            };

            if subscribed_topics.len() > 0 {
                let subscription = client.subscribe_w_options(&subscribed_topics, Some(
                    SubscriptionOptions {
                        ..Default::default()
                    }
                )).await;

                if let Err(e) = subscription {
                    eprintln!("Failed to subscribe to topics: {}", e);
                    return;
                }

                *subscription_lock_2.write().await = Some(subscription.unwrap());
            }

            client_lock_2.write().await.replace(client);

            connected_boolean.store(true, Ordering::Relaxed);

            println!("Started client");
        });

        return (thread_handle, client_lock, subscription_lock);
    }

    pub fn run_nt_updates_with_channel(self: &mut Self, channel: Channel<NTUpdateMessage>) {
        if let Some(thread) = &self.nt_updates_thread {
            thread.abort();
        }

        let connected = self.connected.clone();
        let client = self.client.clone();
        let subscription = self.subscription.clone();

        println!("Starting NetworkTables updates...");

        self.nt_updates_thread.replace(tokio::spawn(async move {
            let mut nt_update_interval = time::interval(std::time::Duration::from_millis(300));
            loop {
                let mut subscription = subscription.write().await;
                let topic_update_recieve = async {
                    match subscription.as_mut().map(|v| v.receiver.recv()) {
                        Some(future) => Some(future.await),
                        None => None
                    }
                };

                select! {
                    _ = nt_update_interval.tick() => {
                        let client = &*client.read().await;

                        match channel.send(NTUpdateMessage::StatusUpdate(NTStatusUpdateMessage {
                            connected: connected.load(Ordering::Relaxed),
                            latency: match client {
                                Some(c) => c.get_latest_latency().as_secs_f64(),
                                None => 0.0
                            }
                        })) {
                            Ok(_) => {},
                            Err(_) => {
                                println!("Failed to send NetworkTables status update message");
                                break;
                            }
                        }
                    }
                    Some(message) = topic_update_recieve => {
                        let message = message.unwrap();

                        match channel.send(NTUpdateMessage::ValueUpdate(NTValueUpdateMessage {
                            topic: message.topic_name,
                            value: message.data.to_string()
                        })) {
                            Ok(_) => {},
                            Err(_) => {
                                println!("Failed to send NetworkTables update message");
                                break;
                            }
                        }
                    }
                }
            }
        }));
    }
}

#[derive(Debug)]
pub struct NetworkingState {
    pub ip_address_mode: IPAddressMode,
    pub team_number: u16,
    registered_topics: Vec<String>,
    // So many layers of locking...
    nt_client: Arc<Mutex<NtClientThread>>
}

#[tauri::command]
pub async fn update_networking_settings(
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

    let addr = match payload.ip_address_mode.get_ip_address(payload.team_number) {
        Err(e) => {
            eprintln!("Failed to get NTAddr: {}", e);
            return Err("Failed to get NTAddr".to_string());
        },
        Ok(v) => v
    };

    if state.is_none() {
        state.replace(NetworkingState {
            ip_address_mode: payload.ip_address_mode,
            team_number: payload.team_number,
            registered_topics: Vec::new(),
            nt_client: Arc::new(Mutex::new(NtClientThread::new(addr)))
        });
    } else {
        let state = state.as_mut().unwrap();
        state.ip_address_mode = payload.ip_address_mode;
        state.team_number = payload.team_number;
        state.nt_client.lock().change_ip(addr);
    }

    println!("Networking settings updated: {:?}", state);
    
    let nt_client = &mut state.as_mut().unwrap().nt_client;
    nt_client.lock().run_nt_updates_with_channel(update);

    Ok(())
}


#[tauri::command]
pub async fn register_networktables_path(
    state: tauri::State<'_, AppState>,
    payload: NTRegisterPathMessage
) -> Result<(), String> {
    let networking_state = &mut state.lock().unwrap().networking_state;
    if networking_state.is_none() {
        eprintln!("Attempted to register NetworkTables path {} before initializing networking!", payload.path);
        return Err("Attempted to register NetworkTables path before initializing networking!".to_string());
    }
    let networking_state = networking_state.as_mut().unwrap();

    println!("Registering NetworkTables path {}", payload.path);
    networking_state.registered_topics.push(payload.path);

    // TODO: debounce on subscribing

    // Warning: Insanely hacky async stuff... like, insanely hacky.
    let nt_client = networking_state.nt_client.clone();
    let registered_topics = networking_state.registered_topics.clone();

    std::thread::spawn(move || {
        match nt_client.lock().set_subscribed_topics(&registered_topics) {
            Err(e) => {
                eprintln!("Failed to set subscribed topics: {}", e);
            }
            Ok(_) => {}
        }
    });
    
    return Ok(());
}
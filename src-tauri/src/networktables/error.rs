use thiserror::Error;
use rmp::encode::ValueWriteError;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Websocket error: {0:?}")]
    Tungstenite(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("Json error: {0:?}")]
    SerdeJson(#[from] serde_json::Error),
    #[error("IO error: {0:?}")]
    Io(#[from] std::io::Error),
    #[error("Server Unexpectedly Closed")]
    Closed(#[from] tokio::sync::mpsc::error::SendError<tokio_tungstenite::tungstenite::Message>),

    #[error("MsgPack Error: {0:?}")]
    RmpError(#[from] ValueWriteError),

    #[error("Timed out connecting to server")]
    ConnectTimeout(#[from] tokio::time::error::Elapsed),
    #[error("Server responeded with an invalid type of message")]
    InvalidMessageType(&'static str),
    #[error("Invalid message type number: {0:?}")]
    InvalidMessageNumber(u64),
    #[error("Invalid message type string: {0:?}")]
    InvalidMessageString(String),

    #[error("Unknown Error occured.")]
    Idk,
}

pub type Result<T> = std::result::Result<T, Error>;
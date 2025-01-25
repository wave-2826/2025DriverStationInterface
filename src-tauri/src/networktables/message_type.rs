use super::error;
use serde::{de::Visitor, Serialize};

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Type {
    Boolean,
    Double,
    Int,
    Float,
    String,
    Json,
    Raw,
    Rpc,
    MsgPack,
    ProtoBuf,
    #[serde(rename = "boolean[]")]
    BooleanArray,
    #[serde(rename = "double[]")]
    DoubleArray,
    #[serde(rename = "int[]")]
    IntArray,
    #[serde(rename = "float[]")]
    FloatArray,
    #[serde(rename = "string[]")]
    StringArray,
}

impl Into<u8> for Type {
    fn into(self) -> u8 {
        match self {
            Type::Boolean => 0,
            Type::Double => 1,
            Type::Int => 2,
            Type::Float => 3,
            Type::String => 4,
            Type::Json => 4,
            Type::Raw => 5,
            Type::Rpc => 5,
            Type::MsgPack => 5,
            Type::ProtoBuf => 5,
            Type::BooleanArray => 16,
            Type::DoubleArray => 17,
            Type::IntArray => 18,
            Type::FloatArray => 19,
            Type::StringArray => 20,
        }
    }
}

impl ToString for Type {
    fn to_string(&self) -> String {
        match self {
            Self::Boolean => "boolean",
            Self::Double => "double",
            Self::Int => "int",
            Self::Float => "float",
            Self::String => "string",
            Self::Json => "json",
            Self::Raw => "raw",
            Self::Rpc => "rpc",
            Self::MsgPack => "msgpack",
            Self::ProtoBuf => "protobuf",
            Self::BooleanArray => "boolean[]",
            Self::DoubleArray => "double[]",
            Self::IntArray => "int[]",
            Self::FloatArray => "float[]",
            Self::StringArray => "string[]",
        }
        .to_string()
    }
}

impl TryFrom<u64> for Type {
    fn try_from(value: u64) -> error::Result<Self> {
        match value {
            0 => Ok(Self::Boolean),
            1 => Ok(Self::Double),
            2 => Ok(Self::Int),
            3 => Ok(Self::Float),
            4 => Ok(Self::String),
            5 => Ok(Self::Raw),
            16 => Ok(Self::BooleanArray),
            17 => Ok(Self::DoubleArray),
            18 => Ok(Self::IntArray),
            19 => Ok(Self::FloatArray),
            20 => Ok(Self::StringArray),
            x => Err(error::Error::InvalidMessageNumber(x)),
        }
    }

    type Error = error::Error;
}

impl<'a> TryFrom<&'a str> for Type {
    type Error = error::Error;

    fn try_from(value: &'a str) -> Result<Self, Self::Error> {
        match value {
            "boolean" => Ok(Self::Boolean),
            "double" => Ok(Self::Double),
            "int" => Ok(Self::Int),
            "float" => Ok(Self::Float),
            "string" => Ok(Self::String),
            "json" => Ok(Self::Json),
            "raw" => Ok(Self::Raw),
            "rpc" => Ok(Self::Rpc),
            "msgpack" => Ok(Self::MsgPack),
            "protobuf" => Ok(Self::ProtoBuf),
            "boolean[]" => Ok(Self::BooleanArray),
            "double[]" => Ok(Self::DoubleArray),
            "int[]" => Ok(Self::IntArray),
            "float[]" => Ok(Self::FloatArray),
            "string[]" => Ok(Self::StringArray),
            _ => Err(error::Error::InvalidMessageString(value.to_string())),
        }
    }
}

impl TryFrom<String> for Type {
    type Error = error::Error;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Type::try_from(value.as_str())
    }
}

struct MessageTypeVisitor;

impl<'de> Visitor<'de> for MessageTypeVisitor {
    type Value = Type;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(formatter, "A valid network tables 4 type string.")
    }

    fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Type::try_from(v).map_err(|_e| E::custom("Not a valid network tables 4 type string."))
    }
}

impl<'de> serde::de::Deserialize<'de> for Type {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        deserializer.deserialize_str(MessageTypeVisitor)
    }
}
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.
import type { NTStatusUpdateMessage } from "./NTStatusUpdateMessage";
import type { NTValueUpdateMessage } from "./NTValueUpdateMessage";

export type NTUpdateMessage = { "type": "statusUpdate" } & NTStatusUpdateMessage | { "type": "valueUpdate" } & NTValueUpdateMessage;

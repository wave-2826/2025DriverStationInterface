import { ref, Ref, watch } from "vue";
import { IPAddressMode as BackendIPAddressMode } from "@bindings/IPAddressMode";
import { NetworkSettingsUpdateMessage } from "@bindings/NetworkSettingsUpdateMessage";
import { Channel, invoke } from "@tauri-apps/api/core";
import { NTUpdateMessage } from "@bindings/NTUpdateMessage";

export enum IPAddressMode {
  DriverStation,
  TeamNumber,
  mDNS,
  Localhost,
  Custom,
};

const reactiveSettings: Record<string, Ref<any>> = {};

export const teamNumber = getSetting("teamNumber", 0);
export const customIPAddress = getSetting("customIP", "127.0.0.1");
export const ipAddressMode = getSetting("ipAddressMode", IPAddressMode.DriverStation);

function send<T>(key: string, value: T, extra?: { [key: string]: any }) {
  invoke(key, {
    payload: value,
    ...extra,
  });
}

function updateNetworking() {
  const ipAddress = customIPAddress.value;
  const team = teamNumber.value;

  // I'm not a huge fan of this, but it works for now.
  const mode: BackendIPAddressMode = ({
    [IPAddressMode.DriverStation]: { type: "driverStation" },
    [IPAddressMode.TeamNumber]: { type: "teamNumber" },
    [IPAddressMode.mDNS]: { type: "mDNS" },
    [IPAddressMode.Localhost]: { type: "localhost" },
    [IPAddressMode.Custom]: { type: "custom", value: ipAddress },
  } as const)[ipAddressMode.value];

  const NTUpdateChannel = new Channel<NTUpdateMessage>();
  NTUpdateChannel.onmessage = (message: NTUpdateMessage) => {
    console.log("Received NT update:", message);
  };

  send<NetworkSettingsUpdateMessage>("update_networking_settings", {
    ipAddressMode: mode,
    teamNumber: team,
  }, {
    update: NTUpdateChannel
  });

  console.log(`Updated networking settings: ${JSON.stringify(mode)}`);
}

watch(teamNumber, updateNetworking);
watch(customIPAddress, updateNetworking);
watch(ipAddressMode, updateNetworking);

updateNetworking();

function getSetting<T>(key: string, defaultValue: T): Ref<T> {
  if (!reactiveSettings[key]) {
    const localStorageValue = localStorage.getItem(key);
    reactiveSettings[key] = ref<T>(localStorageValue ? JSON.parse(localStorageValue) : defaultValue);
    watch(reactiveSettings[key], (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue));
    });
  }
  return reactiveSettings[key];
}
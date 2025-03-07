import { computed, Ref, ref, watch } from "vue";
import { Point } from "./types/renderTypes";
import { AllianceColor } from "./types/autoTypes";
import { IPAddressMode as BackendIPAddressMode } from "@bindings/IPAddressMode";
import { NetworkSettingsUpdateMessage } from "@bindings/NetworkSettingsUpdateMessage";
import { Channel, invoke } from "@tauri-apps/api/core";
import { NTUpdateMessage } from "@bindings/NTUpdateMessage";
import { NTSetValueMessage } from "@bindings/NTSetValueMessage";
import { NTRegisterPathMessage } from "@bindings/NTRegisterPathMessage";
import { customIPAddress, IPAddressMode, ipAddressMode, teamNumber } from "./settings";

export const connected = ref(false);
export const latency_seconds = ref(0.0);

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
        [IPAddressMode.TeamNumber]: { type: "teamNumber" },
        [IPAddressMode.mDNS]: { type: "mDNS" },
        [IPAddressMode.Localhost]: { type: "localhost" },
        [IPAddressMode.Custom]: { type: "custom", value: ipAddress },
        [IPAddressMode.USB]: { type: "USB" }
    } as const)[ipAddressMode.value];
  
    const NTUpdateChannel = new Channel<NTUpdateMessage>();
    NTUpdateChannel.onmessage = (message: NTUpdateMessage) => {
        switch(message.type) {
            case "statusUpdate":
                connected.value = message.connected;
                latency_seconds.value = message.latency;
                break;
            case "valueUpdate":
                const listener = NTListeners[message.topic];
                if(!listener) {
                    console.error(`Recieved update for topic ${message.topic}, but no listeners existed.`);
                    return;
                }
        
                listener.ref.value = listener.transform ? listener.transform(message.value) : message.value;
                break;
            default:
                const _exhaustiveCheck: never = message;
                console.log(`Recieved invalid message ${_exhaustiveCheck}`);
        }
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

const selectedBranchPath = "/DriverStationInterface/ReefBranch";
const selectedLevelPath = "/DriverStationInterface/ReefLevel";

const robotXPositionPath = "/DriverStationInterface/RobotX";
const robotYPositionPath = "/DriverStationInterface/RobotY";
const robotAnglePath = "/DriverStationInterface/RobotRotation";

const isRedAlliancePath = "/FMSInfo/IsRedAlliance";
const selectedAutoPath = "/SmartDashboard/Auto Choices/selected";

const NTListeners: Record<string, {
    transform?: (v: string) => any,
    ref: Ref<any>
}> = {};

/**
 * The types for this are a bit messed up; if transform isn't supplied, T must be a string.
 * TODO: Figure out how to represent that with Typescript's type system.
 * @param topicPath 
 * @param defaultValue 
 * @param transform 
 * @returns 
 */
function createNTTopicRef<T>(topicPath: string, defaultValue: T, transform?: (v: string) => T): Ref<T> {
    if(NTListeners[topicPath]) return NTListeners[topicPath].ref;
    
    const state = ref(defaultValue);
    send<NTRegisterPathMessage>("register_networktables_path", {
        path: topicPath
    });

    NTListeners[topicPath] = {
        transform,
        ref: state
    };
    return state as Ref<T>;
}

export let selectedBranch: Ref<string> = createNTTopicRef(selectedBranchPath, "None");
export let selectedLevel: Ref<number> = createNTTopicRef(selectedLevelPath, 0, (level) => parseInt(level.substring(1)));

let robotXPosition: Ref<number> = createNTTopicRef(robotXPositionPath, 0.0, parseFloat);
let robotYPosition: Ref<number> = createNTTopicRef(robotYPositionPath, 0.0, parseFloat);
let robotPosition: Ref<Point> = computed(() => new Point(
    robotXPosition.value,
    robotYPosition.value
));

let robotAngle: Ref<number> = createNTTopicRef(robotAnglePath, Math.PI / 4, (a) => parseFloat(a) - Math.PI / 2);
let currentAlliance: Ref<AllianceColor> = createNTTopicRef(isRedAlliancePath, "red", (v) => v === "true" ? "red" : "blue");

export let selectedAuto = createNTTopicRef(selectedAutoPath, "None");

/** Sets the currently-selected autonomous routine. */
export function setSelectedAuto(auto: string) {
    send<NTSetValueMessage>("set_networktables_value", {
        topic: selectedAutoPath,
        value: auto
    });
}

/** Sets the currently-selected branch. */
export function setSelectedBranch(branch: string) {
    send<NTSetValueMessage>("set_networktables_value", {
        topic: selectedBranchPath,
        value: branch
    });
}

/** Sets the currently-selected level. */
export function setSelectedLevel(level: number) {
    send<NTSetValueMessage>("set_networktables_value", {
        topic: selectedLevelPath,
        value: `L${level.toString()}`
    });
}

/** Gets the currently-selected autonomous routine as a ref. */
export function getSelectedAutoReactive(): Ref<string> {
    return selectedAuto;
}

/** Gets the current alliance configured in the driver station or FMS. Returns null if not connected. */
export function getCurrentAlliance(): "red" | "blue" | null {
    if(!connected.value) return null;
    return currentAlliance.value;
}

/** Gets the current robot angle. 0 degrees is +X. Returns null if not connected. */
export function getRobotAngle(): number | null {
    if(!connected.value) return null;
    return robotAngle.value;
}

/** Gets the current robot position. Returns null if not connected. */
export function getRobotPosition(): Point | null {
    if(!connected.value) return null;
    return robotPosition.value;
}

/** Gets the currently-selected level. Returns null if not connected. */
export function getSelectedLevel(): number | null {
    if(!connected.value) return null;
    return selectedLevel.value;
}

/** Gets the currently-selected branch. Returns null if not connected. */
export function getSelectedBranch(): string | null {
    if(!connected.value) return null;
    return selectedBranch.value;
}
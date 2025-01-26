import { Ref, ref, watch } from "vue";
import { Point } from "./types/renderTypes";
import { AllianceColor } from "./types/autoTypes";
import { IPAddressMode as BackendIPAddressMode } from "@bindings/IPAddressMode";
import { NetworkSettingsUpdateMessage } from "@bindings/NetworkSettingsUpdateMessage";
import { Channel, invoke } from "@tauri-apps/api/core";
import { NTUpdateMessage } from "@bindings/NTUpdateMessage";
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
        [IPAddressMode.DriverStation]: { type: "driverStation" },
        [IPAddressMode.TeamNumber]: { type: "teamNumber" },
        [IPAddressMode.mDNS]: { type: "mDNS" },
        [IPAddressMode.Localhost]: { type: "localhost" },
        [IPAddressMode.Custom]: { type: "custom", value: ipAddress },
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

const selectedBranchPath = "/todo/SelectedBranch";
const selectedLevelPath = "/todo/SelectedLevel";
const robotPositionPath = "/todo/RobotPosition";
const robotAnglePath = "/todo/RobotAngle";
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

const stringToPoint = (s: string) => {
    const components = s.split(",");
    return new Point(parseFloat(components[0]), parseFloat(components[1]));
};

let selectedBranch: Ref<string> = createNTTopicRef(selectedBranchPath, "D");
let selectedLevel: Ref<number> = createNTTopicRef(selectedLevelPath, 2, Number);

let robotPosition: Ref<Point> = createNTTopicRef(robotPositionPath, new Point(6, 3.5), stringToPoint);
let robotAngle: Ref<number> = createNTTopicRef(robotAnglePath, Math.PI / 4, Number);

let currentAlliance: Ref<AllianceColor> = createNTTopicRef(isRedAlliancePath, "red", (v) => v === "true" ? "red" : "blue");

let selectedAuto = createNTTopicRef(selectedAutoPath, "None");

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
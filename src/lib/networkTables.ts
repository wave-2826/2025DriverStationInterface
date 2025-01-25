import { Ref, ref } from "vue";
import { Point } from "./types/renderTypes";
import { AllianceColor } from "./types/autoTypes";
import { NTValueUpdateMessage } from "@bindings/NTValueUpdateMessage";
import { emit, listen } from "@tauri-apps/api/event";

let connected = true;

const selectedBranchPath = "/todo/SelectedBranch";
const selectedLevelPath = "/todo/SelectedLevel";
const robotPositionPath = "/todo/RobotPosition";
const robotAnglePath = "/todo/RobotAngle";
const currentAlliancePath = "/todo/Alliance";
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
    emit("register_networktables_path", topicPath);

    NTListeners[topicPath] = {
        transform,
        ref: state
    };
    return state as Ref<T>;
}

listen<NTValueUpdateMessage>('networktables_value_changed', (event) => {
    const message = event.payload;
    const listener = NTListeners[message.topic];
    if(!listener) {
        console.error(`Recieved update for topic ${message.topic}, but no listeners existed.`);
        return;
    }

    listener.ref.value = listener.transform ? listener.transform(message.value) : message.value;
});

const stringToPoint = (s: string) => {
    const components = s.split(",");
    return new Point(parseFloat(components[0]), parseFloat(components[1]));
};

let selectedBranch: Ref<string> = createNTTopicRef(selectedBranchPath, "D");
let selectedLevel: Ref<number> = createNTTopicRef(selectedLevelPath, 2, Number);

let robotPosition: Ref<Point> = createNTTopicRef(robotPositionPath, new Point(6, 3.5), stringToPoint);
let robotAngle: Ref<number> = createNTTopicRef(robotAnglePath, Math.PI / 4, Number);

let currentAlliance: Ref<AllianceColor> = createNTTopicRef(currentAlliancePath, "red");

let selectedAuto = createNTTopicRef(selectedAutoPath, "None");

/** Gets the currently-selected autonomous routine as a ref. */
export function getSelectedAutoReactive(): Ref<string> {
    return selectedAuto;
}

/** Gets the current alliance configured in the driver station or FMS. Returns null if not connected. */
export function getCurrentAlliance(): "red" | "blue" | null {
    if(!connected) return null;
    return currentAlliance.value;
}

/** Gets the current robot angle. 0 degrees is +X. Returns null if not connected. */
export function getRobotAngle(): number | null {
    if(!connected) return null;
    return robotAngle.value;
}

/** Gets the current robot position. Returns null if not connected. */
export function getRobotPosition(): Point | null {
    if(!connected) return null;
    return robotPosition.value;
}

/** Gets the currently-selected level. Returns null if not connected. */
export function getSelectedLevel(): number | null {
    if(!connected) return null;
    return selectedLevel.value;
}

/** Gets the currently-selected branch. Returns null if not connected. */
export function getSelectedBranch(): string | null {
    if(!connected) return null;
    return selectedBranch.value;
}
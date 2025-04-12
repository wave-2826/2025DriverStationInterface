import { computed, Ref, ref, watch } from "vue";
import { Point } from "./types/renderTypes";
import { AllianceColor } from "./types/autoTypes";
import { customIPAddress, IPAddressMode, ipAddressMode, teamNumber } from "./settings";
import { NetworkTables, NetworkTablesTopic, NetworkTablesTypeInfo, NetworkTablesTypeInfos, NetworkTablesTypes } from 'ntcore-ts-client';

let ntClient: NetworkTables = NetworkTables.getInstanceByTeam(1);
let topics: { [key: string]: NetworkTablesTopic<any> } = {};

ntClient.addRobotConnectionListener((newConnected) => {
    connected.value = newConnected;
});

// setInterval(updateLatency, 1000 / 10);

export const connected = ref(false);
export const latency_seconds = ref(0.0);
  
export function getURI(): string {
    const ipAddress = customIPAddress.value;
    const team = teamNumber.value;
  
    switch(ipAddressMode.value) {
        case IPAddressMode.Localhost: {
            return "localhost";
        }
        case IPAddressMode.TeamNumber: {
            const teamStart = Math.floor(team / 100);
            const teamEnd = team % 100;
            return `10.${teamStart}.${teamEnd}.2`;
        }
        case IPAddressMode.Custom: {
            return ipAddress;
        }
        case IPAddressMode.USB: {
            return "127.11.22.12";
        }
        case IPAddressMode.mDNS: {
            return `roboRIO-${teamNumber}-FRC.local`;
        }
        default: {
            let _exhaustiveCheck: never = ipAddressMode.value;
            console.log("Unknown IP address mode: ", _exhaustiveCheck);
            return "";
        }
    }
}

function updateNetworking() {
    try {
        ntClient.changeURI(getURI());
    } catch(e) {
        console.error("Failed to connect to network tables: ", e);
    }
}

// function updateLatency() {
//     if(ntClient == null) return;
    
//     // Measure latency -- This is super hacky since getServerTime is private, but I like the latency numbers :)
//     const serverTime = ntClient.client.messenger.socket["getServerTime"]();
//     const latencyMicros = performance.now() * 1000 - serverTime;
//     const latencySeconds = latencyMicros / 1e6;
//     latency_seconds.value = latencySeconds;
// }

watch(teamNumber, updateNetworking);
watch(customIPAddress, updateNetworking);
watch(ipAddressMode, updateNetworking);

updateNetworking();

/**
 * Creates a NetworkTables topic reference that will automatically update when the value changes.  
 * If transform is not provided, RefValueType must be the same as NTValueType. Maybe there's
 * a better way to represent this in Typescript, but I don't know it.
 * @param topicPath 
 * @param defaultValue 
 * @param transform 
 * @returns 
 */
async function createNTTopicRef<NTValueType extends NetworkTablesTypes, RefValueType = NTValueType>(
    topicPath: string,
    type: NetworkTablesTypeInfo,
    defaultValue: NTValueType,
    transform?: (value: NTValueType) => RefValueType,
    publishing?: boolean
): Promise<Ref<RefValueType>> {
    if(transform == null) {
        transform = (v) => v as unknown as RefValueType
    }

    let value: Ref<RefValueType> = ref(transform(defaultValue)) as Ref<RefValueType>; // I'm not sure why this is necessary, but it is.
    let topic = topics[topicPath];
    if(topic == null) {
        topic = ntClient.createTopic<NTValueType>(topicPath, type, defaultValue);
        
        if(publishing) await topic.publish({
            cached: false,
            persistent: false,
            retained: true
        });

        topics[topicPath] = topic;
    }

    topic.subscribe((newValue) => {
        value.value = transform(newValue as NTValueType);
    });

    return value;
}

async function setValue<NTValueType extends NetworkTablesTypes>(topicPath: string, value: NTValueType) {
    const topic = topics[topicPath];
    if(topic == null) {
        console.error("Cannot set value of non-existent topic: ", topicPath);
        return;
    }
    
    topic.setValue(value);
}

const selectedBranchPath = "/DriverStationInterface/ReefBranch";
const selectedLevelPath = "/DriverStationInterface/ReefLevel";

const robotXPositionPath = "/DriverStationInterface/RobotX";
const robotYPositionPath = "/DriverStationInterface/RobotY";
const robotAnglePath = "/DriverStationInterface/RobotRotation";

const isRedAlliancePath = "/FMSInfo/IsRedAlliance";
const selectedAutoPath = "/SmartDashboard/Auto Choices/selected";

export let selectedBranch = await createNTTopicRef<string>(selectedBranchPath, NetworkTablesTypeInfos.kString, "None", undefined, true);
export let selectedLevel = await createNTTopicRef<string, number>(
    selectedLevelPath,
    NetworkTablesTypeInfos.kString, "0",
    (level) => parseInt(level.substring(1)),
    true
);

let robotXPosition = await createNTTopicRef<number>(robotXPositionPath, NetworkTablesTypeInfos.kDouble, 0.0);
let robotYPosition = await createNTTopicRef<number>(robotYPositionPath, NetworkTablesTypeInfos.kDouble, 0.0);
let robotPosition: Ref<Point> = computed(() => new Point(
    robotXPosition.value,
    robotYPosition.value
));

let robotAngle = await createNTTopicRef<number>(robotAnglePath, NetworkTablesTypeInfos.kDouble, Math.PI / 4, (a) => a - Math.PI / 2);
let currentAlliance = await createNTTopicRef<boolean, AllianceColor>(isRedAlliancePath, NetworkTablesTypeInfos.kBoolean, false, v => v ? "red" : "blue");

export let selectedAuto = await createNTTopicRef<string>(selectedAutoPath, NetworkTablesTypeInfos.kString, "None", undefined, true);

/** Sets the currently-selected autonomous routine. */
export function setSelectedAuto(auto: string) {
    setValue<string>(selectedAutoPath, auto);
}

/** Sets the currently-selected branch. */
export function setSelectedBranch(branch: string) {
    setValue<string>(selectedBranchPath, branch);
}

/** Sets the currently-selected level. */
export function setSelectedLevel(level: number) {
    setValue<string>(selectedLevelPath, `L${level.toString()}`);
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
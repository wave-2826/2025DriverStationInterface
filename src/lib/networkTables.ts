import { computed, Ref, ref, watch } from "vue";
import { Point } from "./types/renderTypes";
import { AllianceColor } from "./types/autoTypes";
import { customIPAddress, IPAddressMode, ipAddressMode, teamNumber } from "./settings";
import { Nt4Client, Nt4Topic } from "./nt4";

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
            return `roboRIO-${team}-FRC.local`;
        }
        default: {
            let _exhaustiveCheck: never = ipAddressMode.value;
            console.log("Unknown IP address mode: ", _exhaustiveCheck);
            return "";
        }
    }
}

let ntClient: Nt4Client | null = null;

let topics: { [key: string]: {
    path: string,
    transform: (value: any) => any,
    defaultValue: any,
    ref: Ref<any>,
    publishing: boolean
} } = {};


function updateLatency() {
    if(ntClient == null) return;
    
    latency_seconds.value = (ntClient.getLatencyMs() ?? 0) / 1000;
}
setInterval(updateLatency, 1000 / 10);

async function updateNetworking() {
    try {
        if(ntClient !== null) {
            ntClient.disconnect();
            return;
        }

        function onConnect() {
            console.log("Connected to network tables!");
            connected.value = true;
        }
        function onDisconnect() {
            console.log("Disconnected from network tables!");
            connected.value = false;
        }
        
        ntClient = new Nt4Client(getURI(), "WaveDSInterface", (topic: Nt4Topic) => {
            // On topic announced
            console.log("Topic announced: ", topic.name);
        }, (topic: Nt4Topic) => {
            // On topic unannounced
            console.log("Topic unannounced: ", topic.name);
        }, (topic: Nt4Topic, _timestamp_us: number, value: unknown) => {
            // On new topic data
            const topicRef = topics[topic.name];
            if(topicRef == null) return;

            const newValue = topicRef.transform(value);
            if(newValue !== topicRef.ref.value) {
                topicRef.ref.value = newValue;
            }
        }, onConnect, onDisconnect);

        ntClient.subscribeAll(Object.values(topics).map(t => t.path), false);

        console.log("Connecting to network tables at ", getURI());
        ntClient.connect();
    } catch(e) {
        console.error("Failed to connect to network tables: ", e);
    }
}

/**
 * Creates a NetworkTables topic reference that will automatically update when the value changes.  
 * If transform is not provided, RefValueType must be the same as NTValueType. Maybe there's
 * a better way to represent this in Typescript, but I don't know it.
 * @param topicPath 
 * @param defaultValue 
 * @param transform 
 * @returns 
 */
async function createNTTopicRef<NTValueType, RefValueType = NTValueType>(
    topicPath: string,
    defaultValue: NTValueType,
    transform?: ((value: any) => RefValueType) | null
): Promise<Ref<RefValueType>> {
    if(transform == null) {
        transform = (v) => v as unknown as RefValueType
    }

    if(topics[topicPath] == null) {
        let value: Ref<RefValueType> = ref(transform(defaultValue)) as Ref<RefValueType>;
        topics[topicPath] = {
            path: topicPath,
            transform: transform ?? ((v) => v as unknown as RefValueType),
            defaultValue,
            ref: value,
            publishing: false
        };
    }

    return topics[topicPath].ref;
}

async function setValue<NTValueType>(topicPath: string, typeName: string, value: NTValueType) {
    if(ntClient === null) return;

    if(!topics[topicPath]) {
        console.error("Topic not found: ", topicPath);
        return;
    }

    const topic = topics[topicPath];
    if(!topic.publishing) {
        ntClient.publishNewTopic(topicPath, typeName);
        ntClient.setRetained(topicPath, true);
    }

    ntClient.addSample(topicPath, value);

    topic.ref.value = topic.transform(value);
    topic.publishing = true;
}

const selectedBranchPath = "/DriverStationInterface/ReefBranch";
const selectedLevelPath = "/DriverStationInterface/ReefLevel";

const robotXPositionPath = "/DriverStationInterface/RobotX";
const robotYPositionPath = "/DriverStationInterface/RobotY";
const robotAnglePath = "/DriverStationInterface/RobotRotation";
const matchTimePatch = "/DriverStationInterface/MatchTime";

const isRedAlliancePath = "/FMSInfo/IsRedAlliance";
const selectedAutoPath = "/SmartDashboard/Auto Choices/selected";

export let selectedBranch = await createNTTopicRef<string>(selectedBranchPath, "A");
export let selectedLevel = await createNTTopicRef<string, number>(
    selectedLevelPath,
    "L1",
    (level) => parseInt(level.substring(1))
);

let robotXPosition = await createNTTopicRef<number>(robotXPositionPath, 0.0);
let robotYPosition = await createNTTopicRef<number>(robotYPositionPath, 0.0);
let robotPosition: Ref<Point> = computed(() => new Point(
    robotXPosition.value,
    robotYPosition.value
));

let robotAngle = await createNTTopicRef<number>(robotAnglePath, Math.PI / 4, (a) => a - Math.PI / 2);
let currentAlliance = await createNTTopicRef<boolean, AllianceColor>(isRedAlliancePath, false, v => v ? "red" : "blue");

export let selectedAuto = await createNTTopicRef<string>(selectedAutoPath, "None", null);

export let matchTime = await createNTTopicRef<number>(matchTimePatch, -1);

watch(teamNumber, updateNetworking);
watch(customIPAddress, updateNetworking);
watch(ipAddressMode, updateNetworking);

updateNetworking();

/** Sets the currently-selected autonomous routine. */
export function setSelectedAuto(auto: string) {
    setValue<string>(selectedAutoPath, "string", auto);
}

/** Sets the currently-selected branch. */
export function setSelectedBranch(branch: string) {
    setValue<string>(selectedBranchPath, "string", branch);
}

/** Sets the currently-selected level. */
export function setSelectedLevel(level: number) {
    setValue<string>(selectedLevelPath, "string", `L${level.toString()}`);
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
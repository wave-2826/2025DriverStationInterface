import { Point } from "./renderTypes";

/** A pose in an autonomous routine */
export class AutoPose {
    constructor(public position: Point, public rotation: number, public timeSeconds: number) {}
};

/** An autonomous routine */
export class AutoRoutine {
    public totalTime: number = 0;

    constructor(public name: string, public poses: AutoPose[]) {
        this.totalTime = poses[poses.length - 1].timeSeconds;
    }

    /**
     * Gets the pose at the specified time along the path.
     * We sample the paths at a high resolution, so there's no need to interpolate.
     */
    public getPoseAtTime(timeSeconds: number): AutoPose {
        for (let i = 0; i < this.poses.length - 1; i++) {
            if (this.poses[i].timeSeconds <= timeSeconds && this.poses[i + 1].timeSeconds >= timeSeconds) {
                return this.poses[i];
            }
        }
        return this.poses[this.poses.length - 1];
    }
}

/** The response of the driver station interface API auto data endpoint. */
export type AutoDataAPIResponse = {
    autoChoices: {
        name: string,
        poses: {
            x: number,
            y: number,
            rot: number,
            t: number
        }[]
    }[]
};

export type AllianceColor = "red" | "blue";
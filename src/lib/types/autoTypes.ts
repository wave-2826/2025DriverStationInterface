import { Point } from "./renderTypes";

/** A pose in an autonomous routine */
export class AutoPose {
    constructor(public position: Point, public rotation: number) {}
};

export type AllianceColor = "red" | "blue";
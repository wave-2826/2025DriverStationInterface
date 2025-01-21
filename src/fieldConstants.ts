export class Point {
    /** 
     * See https://firstfrc.blob.core.windows.net/frc2025/FieldAssets/2025FieldDrawings-FieldLayoutAndMarking.pdf
     * All positions are in meters.
     * @param x The X position of the location on the field (away from blue driver stations)
     * @param y The Y position of the location on the field (toward left when at blue driver stations)
     */
    constructor(public x: number, public y: number) {}
}

export type PathTransformation = {
    lengthToScreenSpace(length: number): number,
    pointToScreenSpace(point: Point): Point
};

// Hexagons go clockwise starting at the "top" point

export const BLUE_FIELD_REEF_CENTER = new Point(4.489, 4.026);

export const BLUE_FIELD_LINE_OUTER_POINTS = [
    new Point(4.489, 5.397),
    new Point(5.677, 4.711),
    new Point(5.677, 3.34 ),
    new Point(4.489, 2.655),
    new Point(3.302, 3.340),
    new Point(3.302, 4.711)
];
export const BLUE_FIELD_LINE_INNER_POINTS = [
    new Point(4.489, 5.338),
    new Point(5.626, 4.682),
    new Point(5.626, 3.370),
    new Point(4.489, 2.714),
    new Point(3.353, 4.682),
    new Point(3.353, 3.370)
];
export const BLUE_FIELD_REEF_PERIMETER_POINTS = [
    new Point(4.489, 4.986),
    new Point(5.321, 4.506),
    new Point(5.321, 3.546),
    new Point(4.489, 3.066),
    new Point(3.658, 3.546),
    new Point(3.658, 4.506)
];
export const BLUE_FIELD_REEF_TROUGH_INNER_POINTS = [
    new Point(4.489, 4.7),
    new Point(5.073, 4.363),
    new Point(5.073, 3.689),
    new Point(4.489, 3.352),
    new Point(3.905, 3.689),
    new Point(3.905, 4.363)
];

export const REEF_MIN_Y = 2.655;
export const REEF_MAX_Y = 5.397;
export const REEF_MIN_X = 3.302;
export const REEF_MAX_X = 5.677;

// Branches go clockwise starting from the branch labeled "J" in the FMS (at the "top" on the right side)

export const BLUE_FIELD_BRANCH_NAMES = ["J", "I", "H", "G", "F", "E", "D", "C", "B", "A", "L", "K"];

export const BLUE_FIELD_BRANCH_TOP_POINTS = [
    new Point(4.737, 4.784), // J
    new Point(5.021, 4.619), // I
    new Point(5.270, 4.190), // H
    new Point(5.269, 3.862), // G
    new Point(5.022, 3.432), // F
    new Point(4.737, 3.269), // E
    new Point(4.241, 3.268), // D
    new Point(3.957, 3.433), // C
    new Point(3.709, 3.862), // B
    new Point(3.710, 4.190), // A
    new Point(3.957, 4.620), // L
    new Point(4.242, 4.783)  // K
];
export const BLUE_FIELD_BRANCH_BOTTOM_POINTS = [
    new Point(4.487, 4.442), // J
    new Point(4.765, 4.283), // I
    new Point(4.883, 4.079), // H
    new Point(4.877, 3.756), // G
    new Point(4.756, 3.548), // F
    new Point(4.472, 3.384), // E
    new Point(4.233, 3.379), // D
    new Point(3.955, 3.537), // C
    new Point(3.838, 3.741), // B
    new Point(3.845, 4.064), // A
    new Point(3.966, 4.273), // L
    new Point(4.249, 4.438)  // K
];

export type Path = {
    type: "line";
    start: Point,
    end: Point
} | {
    type: "arc";
    center: Point,
    radius: number,
    /** In radians */
    startAngle: number,
    /** In radians */
    endAngle: number
};

const degToRad = (deg: number) => deg / 180 * Math.PI;

// Points are relative to the center of the bottom of the reef branch, with +X to the "left" and +Y up
export const REEF_BRANCH_WIDTH = 0.042;
export const REEF_BRANCH_DRAW: Path[] = [
    { // Back vertical section
        type: "line",
        start: new Point(0, 0),
        end: new Point(0, 1.350)
    },
    { // Back curve
        type: "arc",
        center: new Point(0.102, 1.350),
        radius: 0.102,
        startAngle: degToRad(180),
        endAngle: degToRad(180+55),
    },
    { // L4 tilted section
        type: "line",
        start: new Point(0.043, 1.434),
        end: new Point(0.211, 1.551)
    },
    { // Front curve
        type: "arc",
        center: new Point(0.152, 1.634),
        radius: 0.1016,
        startAngle: degToRad(0),
        endAngle: degToRad(55),
    },
    { // L4 top section
        type: "line",
        start: new Point(0.254, 1.634),
        end: new Point(0.254, 1.809)
    },
    { // L3 section
        type: "line",
        start: new Point(0.01, 1.006492),
        end: new Point(0.253, 1.177)
    },
    { // L2 section
        type: "line",
        start: new Point(0.01, 0.603),
        end: new Point(0.253, 0.774)
    },
];
export const REEF_BOTTOM_DRAW = [
    new Point(-0.054, 0.498),
    new Point(0.057, 0.498),
    // new Point(0.057, 0.449),
    new Point(0.059, 0.451),
    new Point(0.289, 0.390),
    // new Point(0.292, 0.377),
    new Point(0.292, 0.438),
    new Point(0.305, 0.438),
    new Point(0.305, -0.016),
    new Point(-0.054, -0.016)
];

export const BRANCH_MAX_Y = 1.809;
export const BRANCH_MIN_Y = -0.016;

// TODO: Stuff I guess??
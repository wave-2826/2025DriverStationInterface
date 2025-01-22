import { Point, Branch, PathSegment } from "../types/renderTypes";

export const fieldData = {
    "game": "Reefscape",
    "field-image": "2025-field.png",
    "field-corners": {
        "top-left": [ 534, 291 ],
        "bottom-right": [ 3466, 1638 ]
    },
    "field-size": [ 57.573, 26.417 ],
    "field-unit": "foot"
} as const;

let fieldImage: HTMLImageElement | null = null;
export function getFieldImage(callback: (img: HTMLImageElement) => void) {
    if(fieldImage) callback(fieldImage);
    else {
        const image = new Image();
        image.onload = () => {
            fieldImage = image;
            callback(image);
        };
        image.src = fieldData["field-image"];
    }
}

export const BLUE_FIELD_REEF_CENTER = new Point(4.489, 4.026);

export const BLUE_FIELD_REEF_LINE_OUTER_RADIUS = 1.370996;
export const BLUE_FIELD_REEF_LINE_INNER_RADIUS = 1.312337;
export const BLUE_FIELD_REEF_PERIMETER_RADIUS = 0.953950;
export const BLUE_FIELD_REEF_TROUGH_RADIUS = 0.670377;

// Branches go clockwise starting from the branch labeled "J" in the FMS (at the "top" on the right side)

export const BLUE_FIELD_BRANCHES = [
    new Branch("J", new Point(4.610132, 4.564421), new Point(4.737, 4.784)),
    new Branch("I", new Point(4.895292, 4.399783), new Point(5.021, 4.619)),
    new Branch("H", new Point(5.016087, 4.190560), new Point(5.270, 4.190)),
    new Branch("G", new Point(5.016087, 3.861285), new Point(5.269, 3.862)),
    new Branch("F", new Point(4.895292, 3.652063), new Point(5.022, 3.432)),
    new Branch("E", new Point(4.610131, 3.487425), new Point(4.737, 3.269)),
    new Branch("D", new Point(4.368542, 3.487425), new Point(4.241, 3.268)),
    new Branch("C", new Point(4.083381, 3.652063), new Point(3.957, 3.433)),
    new Branch("B", new Point(3.962587, 3.861286), new Point(3.709, 3.862)),
    new Branch("A", new Point(3.962587, 4.190561), new Point(3.710, 4.190)),
    new Branch("L", new Point(4.083382, 4.399783), new Point(3.957, 4.620)),
    new Branch("K", new Point(4.368542, 4.564421), new Point(4.242, 4.783))
];


const degToRad = (deg: number) => deg / 180 * Math.PI;

// Points are relative to the center of the bottom of the reef branch, with +X to the "left" and +Y up
export const REEF_BRANCH_WIDTH = 0.042;
export const REEF_BRANCH_DRAW: PathSegment[] = [
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
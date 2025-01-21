export class Point {
    /** 
     * See https://firstfrc.blob.core.windows.net/frc2025/FieldAssets/2025FieldDrawings-FieldLayoutAndMarking.pdf
     * All positions are in meters.
     * @param x The X position of the location on the field (away from blue driver stations)
     * @param y The Y position of the location on the field (toward left when at blue driver stations)
     */
    constructor(public x: number, public y: number) {}
};

export class Branch {
    /**
     * A reef branch.
     * @param identifier 
     * @param bottomPoint 
     * @param topPoint 
     */
    constructor(public FMSIdentifier: string, public bottomPoint: Point, public topPoint: Point) {}
};

export type PathSegment = {
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

export type PathTransformation = {
    lengthToScreenSpace(length: number): number,
    pointToScreenSpace(point: Point): Point
};

export class Color {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    constructor(public from: string | [number, number, number]) {
        if(typeof from === "string") {
            const bigint = parseInt(from.slice(1), 16);
            this.r = (bigint >> 16) & 255;
            this.g = (bigint >> 8) & 255;
            this.b = bigint & 255;
        } else {
            this.r = from[0];
            this.g = from[1];
            this.b = from[2];
        }
    }

    get rgb() {
        return [this.r, this.g, this.b] as const;
    }

    get rgbString() {
        return `rgb(${this.r}, ${this.g}, ${this.b})`;
    }
    
    adjustBrightness(brightness: number) {
        return new Color([this.r * brightness, this.g * brightness, this.b * brightness]);
    }
}
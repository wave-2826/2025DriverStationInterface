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
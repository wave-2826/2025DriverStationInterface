class Point {
    /** 
     * See https://firstfrc.blob.core.windows.net/frc2025/FieldAssets/2025FieldDrawings-FieldLayoutAndMarking.pdf
     * All positions are in meters.
     * @param x The X position of the location on the field (away from blue driver stations)
     * @param y The Y position of the location on the field (toward left when at blue driver stations)
     */
    constructor(public x: number, public y: number) {}
}

// Hexagons go clockwise starting at the "top" point

const BLUE_FIELD_LINE_OUTER_POINTS = [
    new Point(4.489, 5.397),
    new Point(5.677, 4.711),
    new Point(5.677, 3.34 ),
    new Point(4.489, 2.655),
    new Point(3.302, 3.340),
    new Point(3.302, 4.711)
];
const BLUE_FIELD_LINE_INNER_POINTS = [
    new Point(4.489, 5.338),
    new Point(5.626, 4.682),
    new Point(),
    new Point(4.489, 2.714),
    new Point(3.353, 3.370),
    new Point()
];

// TODO: Stuff I guess??

// const 
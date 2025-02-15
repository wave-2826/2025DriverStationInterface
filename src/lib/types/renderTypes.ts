export class Point {
    /** 
     * See https://firstfrc.blob.core.windows.net/frc2025/FieldAssets/2025FieldDrawings-FieldLayoutAndMarking.pdf
     * All positions are in meters.
     * @param x The X position of the location on the field (away from blue driver stations)
     * @param y The Y position of the location on the field (toward left when at blue driver stations)
     */
    constructor(public x: number, public y: number) {}
    
    add(other: Point) {
        return new Point(this.x + other.x, this.y + other.y);
    }

    multiply(scalar: number) {
        return new Point(this.x * scalar, this.y * scalar);
    }

    lerp(other: Point, t: number) {
        return new Point(this.x + (other.x - this.x) * t, this.y + (other.y - this.y) * t);
    }
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
    lengthToWorldSpace(length: number): number,
    pointToScreenSpace(point: Point): Point
};

const COLOR_NAMES: Record<string, string> = {
    "red": "#ff0000",
    "green": "#00ff00",
    "blue": "#0000ff",
    "yellow": "#ffff00",
    "purple": "#800080",
    "cyan": "#00ffff",
    "magenta": "#ff00ff",
    "white": "#ffffff",
    "black": "#000000"
};

export class Color {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    constructor(public from: string | [number, number, number]) {
        if(typeof from === "string") {
            if(COLOR_NAMES[from]) from = COLOR_NAMES[from];

            if(from[0] !== "#") throw new Error("Invalid color string");
            from = from.slice(1);

            if(from.length === 3) {
                from = from[0] + from[0] + from[1] + from[1] + from[2] + from[2];
            }

            const bigint = parseInt(from, 16);
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
    get transparentRgbString() {
        return `rgba(${this.r}, ${this.g}, ${this.b}, 0.0)`;
    }
    
    adjustBrightness(brightness: number) {
        return new Color([this.r * brightness, this.g * brightness, this.b * brightness]);
    }

    lerp(other: Color, t: number) {
        return new Color([
            this.r + (other.r - this.r) * t,
            this.g + (other.g - this.g) * t,
            this.b + (other.b - this.b) * t
        ]);
    }
}

export type SelectionRegionData = {
    points: Point[],
    label: string,
    labelSize: number,
    labelAnimationAngle: number,
    labelAlign: "center" | "left" | "right",
    labelPosition: Point,
    onSelect: () => void,
    selected: () => boolean
};

export class SelectionRegion {
    private currentLabelColor: Color | null = null;
    private currentTranslationOffset: Point | null = null;
    private animationDirection: Point;
    public selected = false;

    constructor(private data: SelectionRegionData) {
        this.animationDirection = new Point(
            Math.sin(data.labelAnimationAngle),
            Math.cos(data.labelAnimationAngle)
        );
    }

    pointInRegion(transformedPoint: Point, transform: PathTransformation) {
        // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html
        const x = transformedPoint.x, y = transformedPoint.y;
        
        const points = this.points.map(p => transform.pointToScreenSpace(p));

        var inside = false;
        for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            if(((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
        }
        
        return inside;
    }

    update(deltaTime: number, hovered: boolean) {
        this.selected = this.data.selected();

        const lerpFactor = 1 - Math.exp(-deltaTime * 15);

        const targetColor = this.selected ? "#aaffaa" : (hovered ? "#ccc" : "#888");
        if(this.currentLabelColor === null) this.currentLabelColor = new Color(targetColor);
        else this.currentLabelColor = this.currentLabelColor.lerp(new Color(targetColor), lerpFactor);

        const targetOffset = this.selected ? this.animationDirection.multiply(0.05) : (hovered ? this.animationDirection.multiply(0.02) : new Point(0, 0));
        if(this.currentTranslationOffset === null) this.currentTranslationOffset = targetOffset;
        else this.currentTranslationOffset = this.currentTranslationOffset.lerp(targetOffset, lerpFactor);
    }

    get points() {
        return this.data.points;
    }

    get label() {
        return this.data.label;
    }

    get labelAlign() {
        return this.data.labelAlign;
    }

    get labelColor() {
        return this.currentLabelColor?.rgbString ?? "#888";
    }

    font(transform: PathTransformation) {
        return `bold ${transform.lengthToScreenSpace(this.data.labelSize)}px RazerBlackwidow`;
    }

    labelPosition(transform: PathTransformation) {
        return transform.pointToScreenSpace(this.data.labelPosition.add(this.currentTranslationOffset ?? new Point(0, 0)));
    }

    onSelect() {
        this.data.onSelect();
    }
}
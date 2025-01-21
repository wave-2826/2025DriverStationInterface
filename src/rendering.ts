import { BLUE_FIELD_BRANCHES, BLUE_FIELD_REEF_CENTER, BLUE_FIELD_REEF_LINE_INNER_RADIUS, BLUE_FIELD_REEF_LINE_OUTER_RADIUS, BLUE_FIELD_REEF_PERIMETER_RADIUS, BLUE_FIELD_REEF_TROUGH_RADIUS, BRANCH_MAX_Y, BRANCH_MIN_Y, REEF_BOTTOM_DRAW, REEF_BRANCH_DRAW, REEF_BRANCH_WIDTH } from "./fieldConstants";
import { Color, PathSegment, PathTransformation, Point } from "./renderTypes";

let selectedBranch: string | null = "D";
let selectedLevel: number | null = 2;

let robotPosition: Point | null = new Point(6, 3.5);
/** The robot angle. 0 degrees is +X. */
let robotAngle: number | null = Math.PI / 4;

let currentAlliance: "red" | "blue" = "blue";

const inchesToMeters = (inches: number) => inches * 0.0254;
const robotWidth = inchesToMeters(30);
const robotLength = inchesToMeters(30);
const robotBumperWidth = inchesToMeters(4);
// const robotBumperBorderRadius = inchesToMeters(0.5);

const BRANCH_COLOR = new Color("#a70fb9");
const DRAW_STYLIZED = true;
const OUTLINE_COLOR = new Color("black");
const OUTLINE_THICKNESS = 8;

const BLUE_FIELD_REEF_LINE_OUTER = createReefPerimeterHexagon(BLUE_FIELD_REEF_LINE_OUTER_RADIUS);
const BLUE_FIELD_REEF_LINE_INNER = createReefPerimeterHexagon(BLUE_FIELD_REEF_LINE_INNER_RADIUS);
const BLUE_FIELD_REEF_PERIMETER = createReefPerimeterHexagon(BLUE_FIELD_REEF_PERIMETER_RADIUS);
const BLUE_FIELD_REEF_TROUGH = createReefPerimeterHexagon(BLUE_FIELD_REEF_TROUGH_RADIUS);

const allReefPoints = [...BLUE_FIELD_REEF_LINE_OUTER, ...BLUE_FIELD_REEF_LINE_INNER, ...BLUE_FIELD_REEF_PERIMETER, ...BLUE_FIELD_REEF_TROUGH];
const REEF_MIN_X = Math.min(...allReefPoints.map(p => p.x));
const REEF_MIN_Y = Math.min(...allReefPoints.map(p => p.y));
const REEF_MAX_Y = Math.max(...allReefPoints.map(p => p.y));

/**
 * 
 * @param size The distance from the center to the hexagon's corners
 * @returns 
 */
function createReefPerimeterHexagon(size: number) {
    const center = BLUE_FIELD_REEF_CENTER;

    const points: Point[] = [];
    for(let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i + Math.PI / 2;
        points.push(new Point(center.x + Math.cos(angle) * size, center.y + Math.sin(angle) * size));
    }
    return points;
}

export function drawField(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    drawReef(ctx, canvas);
    drawReefBranch(ctx, canvas);
}

function drawPath(path: PathSegment[], ctx: CanvasRenderingContext2D, width: number, color: Color, expand: number, transform: PathTransformation, inSegments = true) {
    ctx.lineWidth = transform.lengthToScreenSpace(width);
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    ctx.strokeStyle = color.rgbString;
    
    if(!inSegments) ctx.beginPath();
    
    for(const section of path) {
        switch(section.type) {
            case "arc":
                const center = transform.pointToScreenSpace(section.center);
                const radius = transform.lengthToScreenSpace(section.radius);
                if(inSegments) ctx.beginPath();
                ctx.arc(center.x, center.y, radius, section.startAngle, section.endAngle, false);
                if(inSegments) ctx.stroke();
            break;
            case "line":
                const start = transform.pointToScreenSpace(section.start);
                const end = transform.pointToScreenSpace(section.end);
                
                let dir = [end.x - start.x, end.y - start.y];
                const mag = Math.sqrt(dir[0] ** 2 + dir[1] ** 2);
                dir = [dir[0] / mag * expand, dir[1] / mag * expand];
                
                if(inSegments) ctx.beginPath();
                if(inSegments) ctx.moveTo(start.x - dir[0], start.y - dir[1]);
                ctx.lineTo(end.x + dir[0], end.y + dir[1]);
                if(inSegments) ctx.stroke();
            break;
        }
    }

    if(!inSegments) {
        ctx.closePath();
        ctx.stroke();
    }
}

function movePolygonPath(polygon: Point[], ctx: CanvasRenderingContext2D, transform: PathTransformation) {
    let i = 0;
    for(const vertex of polygon) {
        const point = transform.pointToScreenSpace(vertex);
        if(i++ === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    }
}

function drawPolygonShaded(
    polygon: Point[], center: Point,
    ctx: CanvasRenderingContext2D,
    color: Color,
    transform: PathTransformation
) {
    const triangles: [Point, Point, Point][] = [];
    for(let i = 0; i < polygon.length; i++) {
        triangles.push([polygon[i], polygon[(i + 1) % polygon.length], center]);
    }
    
    for(const triangle of triangles) {
        const brightnessAdjustment = 1 + 0.4 * (triangle[0].y - center.y) / (BRANCH_MAX_Y - center.y);
        ctx.fillStyle = color.adjustBrightness(brightnessAdjustment).rgbString;
        
        let point0 = transform.pointToScreenSpace(triangle[0]);
        let point1 = transform.pointToScreenSpace(triangle[1]);
        let point2 = transform.pointToScreenSpace(triangle[2]);

        // Expand the triangle a little bit to avoid gaps from anti-aliasing
        const expandAmount = 1;
        const triangleCenter = new Point(
            (point0.x + point1.x + point2.x) / 3,
            (point0.y + point1.y + point2.y) / 3
        );
        function expand(point: Point) {
            let normal = [triangleCenter.x - point.x, triangleCenter.y - point.y];
            const mag = Math.sqrt(normal[0] ** 2 + normal[1] ** 2);
            normal = [normal[0] / mag * expandAmount, normal[1] / mag * expandAmount];

            return new Point(
                point.x - normal[0] * expandAmount,
                point.y - normal[1] * expandAmount
            );
        }
        point0 = expand(point0);
        point1 = expand(point1);
        point2 = expand(point2);

        ctx.beginPath();
        ctx.moveTo(point0.x, point0.y);
        ctx.lineTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.lineTo(point0.x, point0.y);
        ctx.fill();
    }
}


function drawRobot(ctx: CanvasRenderingContext2D, transform: PathTransformation) {
    if(!robotPosition || !robotAngle || !currentAlliance) {
        return;
    }

    const robotPath: PathSegment[] = [
        { // Front line
            type: "line",
            start: new Point(-robotWidth / 2, -robotLength / 2),
            end: new Point(robotWidth / 2, -robotLength / 2)
        },
        { // Right line
            type: "line",
            start: new Point(robotWidth / 2, -robotLength / 2),
            end: new Point(robotWidth / 2, robotLength / 2)
        },
        { // Back line
            type: "line",
            start: new Point(robotWidth / 2, robotLength / 2),
            end: new Point(-robotWidth / 2, robotLength / 2)
        },
        { // Left line
            type: "line",
            start: new Point(-robotWidth / 2, robotLength / 2),
            end: new Point(-robotWidth / 2, -robotLength / 2)
        },
    ];

    const robotTransform: PathTransformation = {
        pointToScreenSpace(point) {
            const fieldPoint = new Point(
                point.x * Math.cos(robotAngle) - point.y * Math.sin(robotAngle) + robotPosition.x,
                point.x * Math.sin(robotAngle) + point.y * Math.cos(robotAngle) + robotPosition.y
            );
            return transform.pointToScreenSpace(fieldPoint);
        },
        lengthToScreenSpace: transform.lengthToScreenSpace
    };

    drawPath(robotPath, ctx, robotBumperWidth, new Color(currentAlliance === "red" ? "#990000" : "#000099"), 0, robotTransform, false);
    ctx.fillStyle = "#111111";
    ctx.fill();

    // Draw a triangle facing the front of the robot
    const trianglePath: PathSegment[] = [
        { // Point
            type: "line",
            start: new Point(0, 0),
            end: new Point(0, robotLength * 0.4)
        },
        { // Right line
            type: "line",
            start: new Point(0, 0),
            end: new Point(robotWidth * 0.15, robotLength * 0.2)
        },
        { // Back line
            type: "line",
            start: new Point(robotWidth * 0.15, robotLength * 0.2),
            end: new Point(robotWidth * -0.15, robotLength * 0.2)
        },
    ];
    drawPath(trianglePath, ctx, 0.04, new Color("#cccccc"), 0, robotTransform, false);
    ctx.fillStyle = "#cccccc";
    ctx.fill();
}

function drawReef(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const REEF_MARGIN = 0.15;
    const scale = canvas.height * (1 - REEF_MARGIN * 2) / (REEF_MAX_Y - REEF_MIN_Y);
    const reefTransform: PathTransformation = {
        pointToScreenSpace(point) {
            return new Point(
                canvas.width * 0.8 - (point.x - REEF_MIN_X) * scale,
                canvas.height - (point.y - REEF_MIN_Y) * scale - canvas.height * REEF_MARGIN
            );
        },
        lengthToScreenSpace(length) {
            return length * scale;
        },
    };

    ctx.beginPath();
    movePolygonPath(BLUE_FIELD_REEF_LINE_OUTER, ctx, reefTransform);
    ctx.closePath();
    movePolygonPath(BLUE_FIELD_REEF_LINE_INNER, ctx, reefTransform);
    ctx.closePath();
    ctx.fillStyle = "#0432a8";
    ctx.fill("evenodd");
    ctx.globalCompositeOperation = "source-over";

    // If drawing stylized, we add an to the reef perimiter
    if(DRAW_STYLIZED) {
        ctx.beginPath();
        movePolygonPath(createReefPerimeterHexagon(BLUE_FIELD_REEF_PERIMETER_RADIUS + OUTLINE_THICKNESS / scale), ctx, reefTransform);
        ctx.closePath();
        ctx.fillStyle = OUTLINE_COLOR.rgbString;
        ctx.fill();
    }

    drawPolygonShaded(BLUE_FIELD_REEF_PERIMETER, BLUE_FIELD_REEF_CENTER, ctx, new Color([100, 100, 100]), reefTransform);
    drawPolygonShaded(BLUE_FIELD_REEF_TROUGH, BLUE_FIELD_REEF_CENTER, ctx, new Color([50, 50, 50]), reefTransform);

    for(const branch of BLUE_FIELD_BRANCHES) {
        const bottom = reefTransform.pointToScreenSpace(branch.bottomPoint);
        const top = reefTransform.pointToScreenSpace(branch.topPoint);

        ctx.lineCap = "round";
        if(DRAW_STYLIZED) {
            ctx.lineWidth = reefTransform.lengthToScreenSpace(REEF_BRANCH_WIDTH) * 2.5;
        } else {    
            ctx.lineWidth = reefTransform.lengthToScreenSpace(REEF_BRANCH_WIDTH);
        }

        ctx.beginPath();
        ctx.moveTo(bottom.x, bottom.y);
        ctx.lineTo(top.x, top.y);

        if(DRAW_STYLIZED) {
            ctx.strokeStyle = BRANCH_COLOR.rgbString;
        } else {
            const gradient = ctx.createLinearGradient(bottom.x, bottom.y, top.x, top.y);
            gradient.addColorStop(0, BRANCH_COLOR.adjustBrightness(0.8).rgbString);
            gradient.addColorStop(1, BRANCH_COLOR.rgbString);
            ctx.strokeStyle = gradient;
        }
        
        if(DRAW_STYLIZED) {
            // Draw an outline
            const lineWidth = ctx.lineWidth;
            const strokeStyle = ctx.strokeStyle;
            ctx.lineWidth = lineWidth + OUTLINE_THICKNESS * 2;
            ctx.strokeStyle = OUTLINE_COLOR.rgbString;
            ctx.stroke();
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = strokeStyle;
        }

        ctx.stroke();

        if(!DRAW_STYLIZED) {
            // Draw a dot at the top
            ctx.beginPath();
            ctx.arc(top.x, top.y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fillStyle = BRANCH_COLOR.adjustBrightness(1.1).rgbString;
            ctx.fill();
        }
    }
    
    drawRobot(ctx, reefTransform);
}

function drawReefBranch(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const scale = canvas.height * 0.75 / (BRANCH_MAX_Y - BRANCH_MIN_Y);
    const branchTransform: PathTransformation = {
        pointToScreenSpace(point) {
            return new Point(point.x * scale + canvas.width * 0.1, canvas.height - point.y * scale - canvas.height * 0.1);
        },
        lengthToScreenSpace(length) {
            return length * scale;
        },
    };

    const reefBottomDraw: Point[] = DRAW_STYLIZED ? [
        new Point(-0.054, 0.498),
        new Point(0.305, 0.438),
        new Point(0.305, -0.016),
        new Point(-0.054, -0.016),
    ] : REEF_BOTTOM_DRAW;
    const branchWidth = DRAW_STYLIZED ? REEF_BRANCH_WIDTH * 1.5 : REEF_BRANCH_WIDTH;
    
    if(DRAW_STYLIZED) {
        // Draw an outline before the reef
        drawPath(REEF_BRANCH_DRAW, ctx, branchWidth + OUTLINE_THICKNESS / scale * 2, OUTLINE_COLOR, OUTLINE_THICKNESS, branchTransform);
        ctx.beginPath();
        movePolygonPath(reefBottomDraw, ctx, branchTransform);
        ctx.closePath();
        ctx.lineWidth = OUTLINE_THICKNESS * 2;
        ctx.strokeStyle = OUTLINE_COLOR.rgbString;
        ctx.stroke();
    }

    drawPath(REEF_BRANCH_DRAW, ctx, branchWidth, BRANCH_COLOR, 1, branchTransform);
    ctx.beginPath();
    movePolygonPath(reefBottomDraw, ctx, branchTransform);
    ctx.closePath();
    ctx.fillStyle = "gray";
    ctx.fill();
}
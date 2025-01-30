import {
    BLUE_FIELD_BRANCHES, BLUE_FIELD_REEF_CENTER,
    BLUE_FIELD_REEF_LINE_INNER_RADIUS, BLUE_FIELD_REEF_LINE_OUTER_RADIUS,
    BLUE_FIELD_REEF_PERIMETER_RADIUS, BLUE_FIELD_REEF_TROUGH_RADIUS,
    BRANCH_MAX_Y, BRANCH_MIN_Y,
    fieldCenter,
    REEF_BOTTOM_DRAW, REEF_BRANCH_DRAW,
    REEF_BRANCH_SELECTIONS, REEF_BRANCH_WIDTH,
    REEF_SELECTIONS
} from "./constants/fieldConstants";
import { getCurrentAlliance, getRobotAngle, getRobotPosition } from "./networkTables";
import { Color, PathSegment, PathTransformation, Point, SelectionRegion } from "./types/renderTypes";
import { robotBumperWidth, robotLength, robotWidth } from "./constants/robotConstants";

const BRANCH_COLOR = new Color("#a70fb9");
const DRAW_STYLIZED = true;
const OUTLINE_COLOR = new Color("black");
const OUTLINE_THICKNESS = 8;

const DEBUG_SELECTION_BOUNDARIES = true;

const BLUE_FIELD_REEF_LINE_OUTER = createReefPerimeterHexagon(BLUE_FIELD_REEF_LINE_OUTER_RADIUS);
const BLUE_FIELD_REEF_LINE_INNER = createReefPerimeterHexagon(BLUE_FIELD_REEF_LINE_INNER_RADIUS);
const BLUE_FIELD_REEF_PERIMETER = createReefPerimeterHexagon(BLUE_FIELD_REEF_PERIMETER_RADIUS);
const BLUE_FIELD_REEF_TROUGH = createReefPerimeterHexagon(BLUE_FIELD_REEF_TROUGH_RADIUS);

function flipForAlliance(point: Point) {
    // The field has rotational symmetry, so we need to flip the X and Y coordinates over the center of the field.
    if(getCurrentAlliance() === "blue") return point;
    return new Point(
        fieldCenter.x * 2 - point.x,
        fieldCenter.y * 2 - point.y
    );
}

function getReefBounds(): {
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
} {
    const allReefPoints = [
        ...BLUE_FIELD_REEF_LINE_OUTER, ...BLUE_FIELD_REEF_LINE_INNER,
        ...BLUE_FIELD_REEF_PERIMETER, ...BLUE_FIELD_REEF_TROUGH
    ].map(flipForAlliance);
    return {
        minX: Math.min(...allReefPoints.map(p => p.x)),
        maxX: Math.max(...allReefPoints.map(p => p.x)),
        minY: Math.min(...allReefPoints.map(p => p.y)),
        maxY: Math.max(...allReefPoints.map(p => p.y))
    };
}

const getFieldLineColor = () => getCurrentAlliance() === "red" ? "#a80004" : "#0432a8";

let reefBranchSelections: SelectionRegion[] = REEF_BRANCH_SELECTIONS.map(r => new SelectionRegion(r));
let reefSelections: SelectionRegion[] = REEF_SELECTIONS.map(r => new SelectionRegion(r));

let mousePosition: Point | null = null;
let isMouseDown = false;

export function mouseDown(event: MouseEvent, canvas: HTMLCanvasElement) {
    isMouseDown = true;
    mousePosition = new Point(event.offsetX, event.offsetY);

    if(!mousePosition) return;
    
    const branchTransform = getBranchTransform(canvas);
    for(const region of reefBranchSelections) {
        if(region.pointInRegion(mousePosition, branchTransform)) {
            region.onSelect();
        }
    }

    const reefTransform = getReefTransform(canvas);
    for(const region of reefSelections) {
        if(region.pointInRegion(mousePosition, {
            pointToScreenSpace(point) {
                return reefTransform.pointToScreenSpace(flipForAlliance(point));
            },
            lengthToScreenSpace(length) {
                return reefTransform.lengthToScreenSpace(length);
            },
            lengthToWorldSpace(length) {
                return reefTransform.lengthToWorldSpace(length);
            }
        })) {
            region.onSelect();
        }
    }
}
export function mouseUp(_event: MouseEvent, _canvas: HTMLCanvasElement) {
    isMouseDown = false;
}
export function mouseMove(event: MouseEvent, _canvas: HTMLCanvasElement) {
    mousePosition = new Point(event.offsetX, event.offsetY);
}

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

export function drawField(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, deltaTime: number) {
    drawReef(ctx, canvas, deltaTime);
    drawReefBranch(ctx, canvas, deltaTime);
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
    const robotPosition = getRobotPosition();
    const robotAngle = getRobotAngle();
    const currentAlliance = getCurrentAlliance();
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
        lengthToScreenSpace: transform.lengthToScreenSpace,
        lengthToWorldSpace: transform.lengthToWorldSpace
    };

    drawPath(robotPath, ctx, robotBumperWidth * 2, new Color(currentAlliance === "red" ? "#990000" : "#000099"), 0, robotTransform, false);
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

function drawReef(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, deltaTime: number) {
    const reefTransform = getReefTransform(canvas);

    const reefCenter = flipForAlliance(BLUE_FIELD_REEF_CENTER);

    ctx.beginPath();
    movePolygonPath(BLUE_FIELD_REEF_LINE_OUTER.map(flipForAlliance), ctx, reefTransform);
    ctx.closePath();
    movePolygonPath(BLUE_FIELD_REEF_LINE_INNER.map(flipForAlliance), ctx, reefTransform);
    ctx.closePath();
    ctx.fillStyle = getFieldLineColor();
    ctx.fill("evenodd");
    ctx.globalCompositeOperation = "source-over";

    // If drawing stylized, we add an to the reef perimiter
    if(DRAW_STYLIZED) {
        ctx.beginPath();
        movePolygonPath(createReefPerimeterHexagon(
            BLUE_FIELD_REEF_PERIMETER_RADIUS + reefTransform.lengthToWorldSpace(OUTLINE_THICKNESS)
        ).map(flipForAlliance), ctx, reefTransform);
        ctx.closePath();
        ctx.fillStyle = OUTLINE_COLOR.rgbString;
        ctx.fill();
    }

    drawPolygonShaded(BLUE_FIELD_REEF_PERIMETER.map(flipForAlliance), reefCenter, ctx, new Color([100, 100, 100]), reefTransform);
    drawPolygonShaded(BLUE_FIELD_REEF_TROUGH.map(flipForAlliance), reefCenter, ctx, new Color([50, 50, 50]), reefTransform);

    for(const branch of BLUE_FIELD_BRANCHES) {
        const bottom = reefTransform.pointToScreenSpace(flipForAlliance(branch.bottomPoint));
        const top = reefTransform.pointToScreenSpace(flipForAlliance(branch.topPoint));

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
    
    drawSelectionRegions(reefSelections, ctx, {
        pointToScreenSpace(point) {
            return reefTransform.pointToScreenSpace(flipForAlliance(point));
        },
        lengthToScreenSpace(length) {
            return reefTransform.lengthToScreenSpace(length);
        },
        lengthToWorldSpace(length) {
            return reefTransform.lengthToWorldSpace(length);
        }
    }, deltaTime);
    
    drawRobot(ctx, reefTransform);
}

function getBranchTransform(canvas: HTMLCanvasElement): PathTransformation {
    const scale = canvas.height * 0.75 / (BRANCH_MAX_Y - BRANCH_MIN_Y);
    return {
        pointToScreenSpace(point) {
            return new Point(point.x * scale + canvas.width * 0.1, canvas.height - point.y * scale - canvas.height * 0.1);
        },
        lengthToScreenSpace(length) {
            return length * scale;
        },
        lengthToWorldSpace(length) {
            return length / scale;
        }
    };
}

function getReefTransform(canvas: HTMLCanvasElement): PathTransformation {
    const bounds = getReefBounds();

    const REEF_MARGIN = 0.2;
    const scale = canvas.height * (1 - REEF_MARGIN * 2) / (bounds.maxX - bounds.minX);
    return {
        pointToScreenSpace(point) {
            return new Point(
                canvas.width * 0.8 - (point.y - bounds.minY) * scale,
                canvas.height - (point.x - bounds.minX) * scale - canvas.height * REEF_MARGIN
            );
        },
        lengthToScreenSpace(length) {
            return length * scale;
        },
        lengthToWorldSpace(length) {
            return length / scale;
        }
    };
}

function drawReefBranch(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, deltaTime: number) {
    const branchTransform = getBranchTransform(canvas);

    const reefBottomDraw: Point[] = DRAW_STYLIZED ? [
        new Point(-0.054, 0.498),
        new Point(0.305, 0.438),
        new Point(0.305, -0.016),
        new Point(-0.054, -0.016),
    ] : REEF_BOTTOM_DRAW;
    const branchWidth = DRAW_STYLIZED ? REEF_BRANCH_WIDTH * 1.5 : REEF_BRANCH_WIDTH;
    
    if(DRAW_STYLIZED) {
        // Draw an outline before the reef
        drawPath(REEF_BRANCH_DRAW, ctx, branchWidth + branchTransform.lengthToWorldSpace(OUTLINE_THICKNESS) * 2, OUTLINE_COLOR, OUTLINE_THICKNESS, branchTransform);
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

    drawSelectionRegions(reefBranchSelections, ctx, branchTransform, deltaTime);
}

function drawSelectionRegions(regions: SelectionRegion[], ctx: CanvasRenderingContext2D, transform: PathTransformation, deltaTime: number) {
    for(const region of regions) {
        region.update(deltaTime, region.pointInRegion(mousePosition ?? new Point(0, 0), transform));
        
        if(DEBUG_SELECTION_BOUNDARIES) {
            ctx.beginPath();
            movePolygonPath(region.points, ctx, transform);
            ctx.closePath();
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fill();
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.fillStyle = region.labelColor;
        ctx.strokeStyle = OUTLINE_COLOR.rgbString;
        ctx.lineWidth = 14;
        ctx.textBaseline = "middle";
        ctx.font = region.font(transform);
        ctx.textAlign = region.labelAlign;

        const position = region.labelPosition(transform);
        ctx.strokeText(region.label, position.x, position.y);
        ctx.fillText(region.label, position.x, position.y);
    }
}
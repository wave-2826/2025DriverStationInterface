<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from "vue";
import { Path as PathSegment, PathTransformation, Point, REEF_BOTTOM_DRAW, REEF_BRANCH_DRAW, REEF_BRANCH_WIDTH, BRANCH_MAX_Y, BRANCH_MIN_Y, REEF_MAX_X, REEF_MIN_X, BLUE_FIELD_LINE_OUTER_POINTS, REEF_MAX_Y, REEF_MIN_Y, BLUE_FIELD_REEF_PERIMETER_POINTS, BLUE_FIELD_REEF_TROUGH_INNER_POINTS, BLUE_FIELD_REEF_CENTER } from "./fieldConstants";

const canvasRef = useTemplateRef("canvas");
let ctx: CanvasRenderingContext2D | null = null;

const BORDER_COLOR = "transparent";
const BORDER_WIDTH = 10;

function resize() {
  const canvas = canvasRef.value;
  if(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

function drawPath(path: PathSegment[], ctx: CanvasRenderingContext2D, width: number, color: string, expand: number, transform: PathTransformation) {
  ctx.lineWidth = transform.lengthToScreenSpace(width);
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  ctx.strokeStyle = color;

  for(const section of path) {
    switch(section.type) {
      case "arc":
        const center = transform.pointToScreenSpace(section.center);
        const radius = transform.lengthToScreenSpace(section.radius);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, section.startAngle, section.endAngle, false);
        ctx.stroke();
        break;
      case "line":
        const start = transform.pointToScreenSpace(section.start);
        const end = transform.pointToScreenSpace(section.end);
        
        let dir = [end.x - start.x, end.y - start.y];
        const mag = Math.sqrt(dir[0] ** 2 + dir[1] ** 2);
        dir = [dir[0] / mag * expand, dir[1] / mag * expand];

        ctx.beginPath();
        ctx.moveTo(start.x - dir[0], start.y - dir[1]);
        ctx.lineTo(end.x + dir[0], end.y + dir[1]);
        ctx.stroke();
        break;
    }
  }
}

function drawPolygon(polygon: Point[], ctx: CanvasRenderingContext2D, color: string, transform: PathTransformation) {
  const strokePolygon = [...polygon, polygon[0], polygon[1]];
  
  ctx.fillStyle = color;
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = BORDER_WIDTH;

  ctx.beginPath();
  let i = 0;
  for(const vertex of strokePolygon) {
    const point = transform.pointToScreenSpace(vertex);
    if(i++ === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
  ctx.stroke();
  ctx.fill();
}

function drawPolygonShaded(
  polygon: Point[], center: Point,
  ctx: CanvasRenderingContext2D,
  color: [number, number, number],
  transform: PathTransformation
) {
  const triangles: [Point, Point, Point][] = [];
  for(let i = 0; i < polygon.length; i++) {
    triangles.push([polygon[i], polygon[(i + 1) % polygon.length], center]);
  }

  for(const triangle of triangles) {
    ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    const point0 = transform.pointToScreenSpace(triangle[0]);
    const point1 = transform.pointToScreenSpace(triangle[1]);
    const point2 = transform.pointToScreenSpace(triangle[2]);
    
    ctx.beginPath();
    ctx.moveTo(point0.x, point0.y);
    ctx.lineTo(point1.x, point1.y);
    ctx.lineTo(point2.x, point2.y);
    ctx.lineTo(point0.x, point0.y);
    ctx.fill();
  }
}


function drawReef(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const scale = canvas.height * 0.75 / (REEF_MAX_Y - REEF_MIN_Y);
  const reefTransform: PathTransformation = {
    pointToScreenSpace(point) {
      return new Point(
        canvas.width * 0.8 - (point.x - REEF_MIN_X) * scale,
        canvas.height - (point.y - REEF_MIN_Y) * scale - canvas.height * 0.1
      );
    },
    lengthToScreenSpace(length) {
      return length * scale;
    },
  };

  drawPolygon(BLUE_FIELD_LINE_OUTER_POINTS, ctx, "blue", reefTransform);
  drawPolygon(BLUE_FIELD_LINE_OUTER_POINTS, ctx, "#181818", reefTransform);
  drawPolygonShaded(BLUE_FIELD_REEF_PERIMETER_POINTS, BLUE_FIELD_REEF_CENTER, ctx, [100, 100, 100], reefTransform);
  drawPolygonShaded(BLUE_FIELD_REEF_TROUGH_INNER_POINTS, BLUE_FIELD_REEF_CENTER, ctx, [50, 50, 50], reefTransform);
}

function drawReefBranch(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const scale = canvas.height * 0.75 / (BRANCH_MAX_Y - BRANCH_MIN_Y);
  const branchTransform: PathTransformation = {
    pointToScreenSpace(point) {
      return new Point(point.x * scale + canvas.width * 0.2, canvas.height - point.y * scale - canvas.height * 0.1);
    },
    lengthToScreenSpace(length) {
      return length * scale;
    },
  };
  drawPath(REEF_BRANCH_DRAW, ctx, REEF_BRANCH_WIDTH + BORDER_WIDTH / scale, BORDER_COLOR, Math.ceil(BORDER_WIDTH / 2), branchTransform);
  drawPath(REEF_BRANCH_DRAW, ctx, REEF_BRANCH_WIDTH, "purple", 1, branchTransform);
  drawPolygon(REEF_BOTTOM_DRAW, ctx, "gray", branchTransform);
}

let running = true;
let lastElapsed = 0;
function draw(elapsed: number) {
  const canvas = canvasRef.value;

  if(!ctx || !canvas) {
    requestAnimationFrame(draw);
    return;
  }

  const delta = (elapsed - lastElapsed) / 1000;
  lastElapsed = elapsed;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawReef(ctx, canvas);
  drawReefBranch(ctx, canvas);

  if(running) requestAnimationFrame(draw);
}

onMounted(() => {
  const canvas = canvasRef.value!;
  if(canvas === null) {
    console.error("Failed to get context");
    return;
  }
  
  resize();
  window.addEventListener("resize", resize);

  ctx = canvas.getContext("2d");
  if(ctx === null) {
    console.error("Failed to get context");
    return;
  }

  requestAnimationFrame(draw);
});

onUnmounted(() => {
  window.removeEventListener("resize", resize);
  running = false;
});
</script>

<template>
  <main class="container">
    <h1>WAVE Driver Station Interface</h1>
    <canvas ref="canvas"></canvas>
  </main>
</template>

<style scoped>
canvas {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100vh;
}
</style>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #f6f6f6;
  background-color: #181818;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

body {
  overflow: hidden;
}
</style>
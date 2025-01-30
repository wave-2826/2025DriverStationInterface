<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from "vue";
import { drawField, mouseDown, mouseMove, mouseUp } from "../lib/rendering";

const canvasRef = useTemplateRef("canvas");
let ctx: CanvasRenderingContext2D | null = null;

const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const canvas = canvasRef.value;
        if(canvas) {
            canvas.width = entry.contentRect.width;
            canvas.height = entry.contentRect.height;
            draw(lastElapsed);
        }
    }
});

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

    drawField(ctx, canvas, delta);

    if(running) requestAnimationFrame(draw);
}

function onMouseDown(event: MouseEvent) {
    if(!canvasRef.value) return;
    mouseDown(event, canvasRef.value);
}
function onMouseMove(event: MouseEvent) {
    if(!canvasRef.value) return;
    mouseMove(event, canvasRef.value);
}
function onMouseUp(event: MouseEvent) {
    if(!canvasRef.value) return;
    mouseUp(event, canvasRef.value);
}

onMounted(() => {
    const canvas = canvasRef.value!;
    if(canvas === null) {
        console.error("Failed to get context");
        return;
    }
    
    resizeObserver.observe(canvas);

    ctx = canvas.getContext("2d");
    if(ctx === null) {
        console.error("Failed to get context");
        return;
    }

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mousemove", onMouseMove);

    requestAnimationFrame(draw);
});

onUnmounted(() => {
    resizeObserver.disconnect();
    running = false;
    
    const canvas = canvasRef.value!;
    if(canvas === null) return;
    
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("mousemove", onMouseMove);
});
</script>

<template>
    <canvas ref="canvas"></canvas>
</template>

<style scoped>
canvas {
    width: 100%;
    height: 100%;
}
</style>
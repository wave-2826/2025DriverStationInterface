<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from "vue";
import { drawField } from "../lib/rendering";

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

    drawField(ctx, canvas);

    if(running) requestAnimationFrame(draw);
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

    requestAnimationFrame(draw);
});

onUnmounted(() => {
    resizeObserver.disconnect();
    running = false;
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
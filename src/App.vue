<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from "vue";

const canvasRef = useTemplateRef("canvas");
let ctx: CanvasRenderingContext2D | null = null;

function resize() {
  const canvas = canvasRef.value;
  if(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
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
    <h1>Welcome to Tauri + Vue</h1>
    <canvas ref="canvas"></canvas>
  </main>
</template>

<style scoped>
canvas {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background-image: url(./assets/backgroundImage.jpg);
  background-size: cover;
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
<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue';
import { fieldData, getFieldImage } from '../../lib/constants/fieldConstants';
import { Point } from '../../lib/types/renderTypes';
import { robotLength, robotWidth } from '../../lib/constants/robotConstants';
import { AutoRoutine } from '../../lib/types/autoTypes';
import { setSelectedAuto } from '../../lib/networkTables';

const {
    isBlue,
    selected,
    titleSize,
    routine
} = defineProps<{
    isBlue: boolean,
    selected: boolean,
    titleSize: string,
    routine: AutoRoutine
}>();

const canvas = useTemplateRef("canvas");
let render: (() => void) | null = null;
watch(() => isBlue, (_) => render?.());
watch(() => routine, (_) => render?.());

let animationTime = 0;
let animationRunning = false;
let lastTime = 0;
function animate() {
    if(!animationRunning) return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    animationTime += deltaTime / 1000;
    if(animationTime > routine.totalTime) animationTime = 0;

    render?.();

    requestAnimationFrame(animate);
}

function mouseOver() {
    animationRunning = true;
    lastTime = Date.now();
    animate();
}
function mouseOut() {
    animationRunning = false;
}

function rotate(cx: number, cy: number, x: number, y: number, angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nx = (cos * (x - cx)) + (sin * (y - cy)) + cx;
    const ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
}
const rotatePoint = (center: Point, rotation: number, reference: Point) => {
    const point = rotate(center.x, center.y, reference.x + center.x, reference.y + center.y, rotation);
    return {
        x: point[0],
        y: point[1]
    };
};

onMounted(() => {
    const autoCanvas = canvas.value;
    if(!autoCanvas) {
        console.error("No canvas available!");
        return;
    }
    
    const autoCtx = autoCanvas.getContext("2d");
    if(!autoCtx) {
        console.error("Could not get canvas context");
        return;
    }

    getFieldImage((fieldImage) => {
        const canvasWidth = 1920;
        const canvasHeight = Math.floor(canvasWidth * (fieldImage.height / fieldImage.width));

        autoCanvas.width = canvasWidth;
        autoCanvas.height = canvasHeight;

        const fieldTopPixels = fieldData["field-corners"]["top-left"][1] / fieldImage.height * canvasHeight;
        const fieldBottomPixels = fieldData["field-corners"]["bottom-right"][1] / fieldImage.height * canvasHeight;
        const fieldLeftPixels = fieldData["field-corners"]["top-left"][0] / fieldImage.width * canvasWidth;
        const fieldRightPixels = fieldData["field-corners"]["bottom-right"][0] / fieldImage.width * canvasWidth;
        const fieldHeightRatio = (fieldBottomPixels - fieldTopPixels) / canvasHeight;
        const fieldWidthRatio = (fieldRightPixels - fieldLeftPixels) / canvasWidth;

        const feetToMeters = 0.3048;
        const fieldWidth = fieldData["field-size"][0] * feetToMeters;
        const fieldHeight = fieldData["field-size"][1] * feetToMeters;

        const fieldPosToPixelPos = (pos: Point) => {
            const x = (pos.x / fieldWidth * autoCanvas.width) * fieldWidthRatio + fieldLeftPixels;
            return {
                x: isBlue ? x : (autoCanvas.width * fieldWidthRatio) - (x - fieldLeftPixels) + fieldLeftPixels,
                y: (autoCanvas.height - pos.y / fieldHeight * autoCanvas.height) * fieldHeightRatio + fieldTopPixels
            };
        };
        
        render = () => {
            autoCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            autoCtx.drawImage(fieldImage, 0, 0, autoCanvas.width, autoCanvas.height);
            
            autoCtx.strokeStyle = isBlue ? "#aaaaff" : "#ffaaaa";
            autoCtx.lineCap = "round";
            autoCtx.lineJoin = "round";
            autoCtx.lineWidth = 10;
            autoCtx.beginPath();
            
            for(let i = 0; i < routine.poses.length; i++) {
                const pathPoint = routine.poses[i];
                const pos = fieldPosToPixelPos(pathPoint.position);

                if(i === 0) autoCtx.moveTo(pos.x, pos.y);
                else autoCtx.lineTo(pos.x, pos.y);
            }
            autoCtx.stroke();

            autoCtx.strokeStyle = isBlue ? "#5555bb" : "#bb5555";
            const lineWidth = 15;
            autoCtx.lineWidth = lineWidth;
            autoCtx.beginPath();
            
            // Display the current robot position
            const currentPose = routine.getPoseAtTime(animationTime);
            const center = currentPose.position;
            const rotation = -currentPose.rotation; // Radians

            const lineWidthMeters = lineWidth / autoCanvas.width * fieldWidth;
            const length = robotLength / 2 - lineWidthMeters / 2;
            const width = robotWidth / 2 - lineWidthMeters / 2;
            const points = [
                fieldPosToPixelPos(rotatePoint(center, rotation, { x: length, y: width })),
                fieldPosToPixelPos(rotatePoint(center, rotation, { x: length, y: -width })),
                fieldPosToPixelPos(rotatePoint(center, rotation, { x: -length, y: -width })),
                fieldPosToPixelPos(rotatePoint(center, rotation, { x: -length, y: width }))
            ];
            autoCtx.moveTo(points[0].x, points[0].y);
            for(let i = 0; i < points.length; i++) {
                autoCtx.lineTo(points[i].x, points[i].y);
            }
            autoCtx.lineTo(points[0].x, points[0].y);
            autoCtx.stroke();
        };

        render();
    });

    autoCanvas.addEventListener("mouseover", mouseOver);
    autoCanvas.addEventListener("mouseout", mouseOut);
});

onUnmounted(() => {
    const autoCanvas = canvas.value;
    if(autoCanvas) {
        autoCanvas.removeEventListener("mouseover", mouseOver);
        autoCanvas.removeEventListener("mouseout", mouseOut);
    }
});
</script>

<template>
    <div class="auto" :class="selected ? 'selected' : ''">
        <span class="title">
            {{ routine.name }}
            <span class="selectedText">(Selected)</span>
        </span>
        <canvas ref="canvas"></canvas>
        <div class="options">
            <span class="time">Duration: {{ routine.totalTime.toFixed(1) }}s</span>
            <button class="selectPath" @click="setSelectedAuto(routine.name)">Select path</button>
        </div>
    </div>
</template>

<style scoped>

.auto {
    display: flex;
    flex-direction: column;
    min-width: 0;
    margin: 0.5rem;
    padding: 0.5rem;
    background-color: #3e3e3e;
    border-radius: 0.5rem;

    outline: 2px solid transparent;
    transition: outline-color 0.1s;
}

.title {
    font-size: v-bind('titleSize');
    margin: 0.5rem;
}
.selectedText {
    font-size: calc(v-bind('titleSize') * 0.6);
    line-height: 0;
    color: #7fcc7f;
    margin-left: 1rem;

    display: inline;
    opacity: 0;
    transition: opacity 0.1s;
}

.selected {
    outline-color: #7fcc7f;
}
.selected .selectedText {
    opacity: 1;
}

.options {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    padding: 0.5rem;
}
.time {
    font-size: 1.1rem;
    line-height: 1.7;
    margin: 0 1rem;
    color: #eee;
}
button {
    flex: 1;
    outline: none;
    border: none;
    border-radius: 5px;
    color: white;
    padding: 0.5rem;
    width: 10rem;
}
button.displayStart {
    background-color: #855585;
}
button.displayStart:hover {
    background-color: #9c649c;
}
button.displayStart:active {
    background-color: #b172b1;
}
button.selectPath {
    background-color: #497449;
}
button.selectPath:hover {
    background-color: #558a55;
}
button.selectPath:active {
    background-color: #63a063;
}
</style>
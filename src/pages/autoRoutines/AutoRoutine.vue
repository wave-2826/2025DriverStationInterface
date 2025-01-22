<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from 'vue';
import { fieldData, getFieldImage } from '../../lib/constants/fieldConstants';
import { Point } from '../../lib/types/renderTypes';
import { robotLength, robotWidth } from '../../lib/constants/robotConstants';
import { AutoPose } from '../../lib/types/autoTypes';

const {
    name,
    isBlue,
    selected,
    poses
} = defineProps<{
    name: string,
    isBlue: boolean,
    selected: boolean,
    poses: AutoPose[]
}>();

let showingStart = ref(true);

const canvas = useTemplateRef("canvas");
let render: (() => void) | null = null;

watch(showingStart, (_) => render);

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
            
            autoCtx.strokeStyle = "#aaaa55";
            autoCtx.lineCap = "round";
            autoCtx.lineJoin = "round";
            autoCtx.lineWidth = 15;
            autoCtx.beginPath();
            
            for(let i = 0; i < poses.length; i++) {
                const pathPoint = poses[i];
                const pos = fieldPosToPixelPos(pathPoint.position);

                if(i === 0) autoCtx.moveTo(pos.x, pos.y);
                else autoCtx.lineTo(pos.x, pos.y);
            }
            autoCtx.stroke();

            if(showingStart) {
                autoCtx.strokeStyle = "#bb5555";
                const lineWidth = 15;
                autoCtx.lineWidth = lineWidth;
                autoCtx.beginPath();
                
                const center = poses[0].position;
                const rotation = -poses[0].rotation; // Radians

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
            }
        };

        render();
    });
});
</script>

<template>
    <div class="auto" :class="selected ? 'selected' : ''">
        <span>
            {{ name }}
            <span class="selectedText">(Selected)</span>
        </span>
        <canvas ref="canvas"></canvas>
        <div class="buttons">
            <button class="displaystart" @click="showingStart = !showingStart">
                {{ showingStart ? "Hide start" : "Display start" }}
            </button>
            <button class="selectpath">Select path</button>
        </div>
    </div>
</template>

<style scoped>

</style>
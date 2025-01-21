<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onMounted, useTemplateRef } from 'vue';

const { tabs, activeTab } = defineProps<{
    tabs: { name: string }[],
    activeTab: number
}>();

const appWindow = getCurrentWindow();

let closeButton = useTemplateRef("closeButton");
let maximizeButton = useTemplateRef("maximizeButton");
let minimizeButton = useTemplateRef("minimizeButton");

onMounted(() => {
    closeButton.value?.addEventListener("click", () => appWindow.close());
    minimizeButton.value?.addEventListener("click", () => appWindow.minimize());
    maximizeButton.value?.addEventListener("click", () => appWindow.toggleMaximize());
});
</script>

<template>
    <div data-tauri-drag-region class="titlebar">
        <div class="tabs">
            <button class="tab" v-for="(tab, i) in tabs" :class="{ active: i === activeTab }" @click="$emit('updateActiveTab', i)">{{ tab.name }}</button>
        </div>
        <div class="title">Wave Robotics Driver Station Interface</div>
        <div class="windowControls">
            <button class="windowControl" ref="minimizeButton">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M20 14H4v-4h16"/></svg>
            </button>
            <button class="windowControl" ref="maximizeButton">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4zm2 4v10h12V8z"/></svg>
            </button>
            <button class="windowControl" ref="closeButton">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
        </div>
    </div>
</template>

<style scoped>
.titlebar {
    height: 28px;
    background: #1a1a1a;
    user-select: none;
    display: flex;
    justify-content: space-between;
}
.titlebar > * {
    flex: 1;
}

.title {
    font-size: 14px;
    line-height: 28px;
    padding-left: 10px;
    color: #fff;
    pointer-events: none;
    text-align: center;
}

.windowControls {
    display: flex;
    justify-content: flex-end;
}
.windowControl {
    border: none;
    outline: none;
    background: none;

    aspect-ratio: 1;
    cursor: pointer;

    height: 28px;

    color: #ccc;
    transition: background-color 0.2s, color 0.2s;
}
.windowControl svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
}
button:hover {
    background: #2a2a2a;
    color: #fff;
}

.tabs {
    display: flex;
    gap: 4px;
    margin-left: 10px;
}
.tab {
    background: #282828;
    border: none;
    border-radius: 10px 10px 0 0;
    margin-top: 5px;
    color: #ddd;
    cursor: pointer;

    transition: background-color 0.2s, color 0.2s, margin-top 0.2s;
}
.tab.active {
    background: #404040 !important;
    color: #fff;
    margin-top: 5px;
}
.tab:hover {
    background: #2a2a2a;
    color: #fff;
    margin-top: 2px;
}
</style>
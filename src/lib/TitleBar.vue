<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onMounted, useTemplateRef } from 'vue';

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
            <button class="tab">Competition</button>
            <button class="tab">Auto routines</button>
            <button class="tab">Settings</button>
        </div>
        <div class="title">Wave Robotics Driver Station Interface</div>
        <div>
            <button class="window-control" id="titlebar-minimize" ref="minimizeButton">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M20 14H4v-4h16"/></svg>
            </button>
            <button class="window-control" id="titlebar-maximize" ref="maximizeButton">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4zm2 4v10h12V8z"/></svg>
            </button>
            <button class="window-control" id="titlebar-close" ref="closeButton">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
        </div>
    </div>
</template>

<style scoped>
.titlebar {
    height: 24px;
    background: #1a1a1a;
    user-select: none;
    display: flex;
    justify-content: space-between;
}

.title {
    font-size: 14px;
    line-height: 24px;
    padding-left: 10px;
    color: #fff;
    line-height: 1.75;
}

.window-control {
    border: none;
    background: none;

    aspect-ratio: 1;
    cursor: pointer;

    color: #ccc;
    transition: background-color 0.2s, color 0.2s;
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
.tab:hover {
    background: #2a2a2a;
    color: #fff;
    margin-top: 0px;
}
</style>
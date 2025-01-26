<script setup lang="ts">
import { ref } from "vue";
import StatusBar from "./lib/StatusBar.vue";
import TitleBar from "./lib/TitleBar.vue";
import CompetitionTargetSelectionPage from "./pages/CompetitionTargetSelectionPage.vue";
import AutoRoutinesPage from "./pages/AutoRoutinesPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";

import "./style.css";

const pages = [
    { name: "Competition", component: CompetitionTargetSelectionPage },
    { name: "Auto routines", component: AutoRoutinesPage },
    { name: "Settings", component: SettingsPage }
];

let activePage = ref(0);
</script>

<template>
    <div class="layout">
        <TitleBar :tabs="pages" v-bind:active-tab="activePage" @update-active-tab="activePage = $event" />
        <main>
            <component :is="pages[activePage].component" />
        </main> 
        <StatusBar />
    </div>
</template>

<style scoped>
.layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

main {
    flex: 1;
    overflow: hidden;
}
</style>
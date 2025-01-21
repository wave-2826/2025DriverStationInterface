<script setup lang="ts">
import StatusBar from "./lib/StatusBar.vue";
import TitleBar from "./lib/TitleBar.vue";
import CompetitionTargetSelectionPage from "./pages/CompetitionTargetSelectionPage.vue";
import "./style.css";
</script>

<template>
    <div class="layout">
        <TitleBar />
        <main class="page">
            <CompetitionTargetSelectionPage />
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

.page {
    flex: 1;
    overflow: hidden;
}
</style>
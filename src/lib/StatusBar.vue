<script setup lang="ts">
import { teamNumber } from "../lib/settings";
</script>

<template>
    <div class="statusBar">
        <span>Network Tables: Disconnected</span>
        
        <span v-if="teamNumber !== 0">Team {{ teamNumber }}</span>
        <span v-else class="invalid">Team number not set!</span>

        <span>Latency: 0.00ms</span>
    </div>
</template>

<style scoped>
.statusBar {
    width: 100%;
    height: 24px;
    background-color: #1a1a1a;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
}
.statusBar span {
    font-size: 14px;
    flex: 1;
}
.statusBar span:nth-child(2) {
    text-align: center;
}
.statusBar span:nth-child(3) {
    text-align: right;
}

.invalid {
    color: #ff6666;
}
</style>
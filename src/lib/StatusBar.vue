<script setup lang="ts">

</script>

<template>
    <div class="statusBar">
        <span>Network Tables: Connected</span>
        <span>Team Unknown</span>
        <span>Latency: 0.00ms</span>
    </div>
</template>

<style scoped>
.statusBar {
    width: 100%;
    height: 28px;
    background-color: #1a1a1a;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
}
.statusBar span {
    font-size: 14px;
}
</style>
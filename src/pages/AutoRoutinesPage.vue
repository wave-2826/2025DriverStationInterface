<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Point } from '../lib/types/renderTypes';
import AutoRoutine from './autoRoutines/AutoRoutine.vue';

let isBlue = ref(true);
let columnsShown = ref(2);

// TODO
// function autoDataChanged(key, value, isNew) {
//     try {
//         const data = JSON.parse(value);
//         const autoChoices = data.autoChoices;
        
//         for(const autoChoice of autoChoices) {
//             selectPathButton.onclick = () => {
//                 if(!isNTConnected) return;
//                 NetworkTables.putValue(selectedAutoPath, autoChoice.name);
//             };
//         }
            
//         updateSelected();
//     } catch(e) {
//         console.log(value);
//         console.error(e);
//     }
// }
</script>

<template>
    <div class="page">
        <div class="top">
            <h1>Autonomous routines</h1>
            <button class="sideButton" id="sideButton" @click="isBlue = !isBlue">
                {{ isBlue ? "Switch to red (only visual)" : "Switch to blue (only visual)" }}
            </button>
            <select class="columns" v-bind:value="columnsShown">
                <option value="1">1 column</option>
                <option value="2">2 columns</option>
                <option value="3">3 columns</option>
                <option value="4">4 columns</option>
            </select>
        </div>
        <br />

        <div
            id="autos"
            class="autos"
            :style="`gridTemplateColumns: ${'1fr '.repeat(columnsShown)}; --title-size: ${2.734 * (0.8 ** columnsShown)}rem`"
        >
            <!-- <AutoRoutine
                v-for="(auto, index) in autos"
                :key="index"
                :name="auto.name"
                :isBlue="isBlue"
                :selected="selectedAuto === auto.name"
                :poses="auto.poses"
            /> -->
            <!-- TODO -->
        </div>
    </div>
</template>

<style scoped>
.page {
    padding: 0.5rem;
    color: aliceblue;
    font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
}

.autos {
    --title-size: 1.75rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
}
.auto {
    display: flex;
    flex-direction: column;
    min-width: 0;
    margin: 0.5rem;
    padding: 0.5rem;
    background-color: #363636;
    border-radius: 0.5rem;
}
.auto.selected {
    background-color: #2c492c;
}
.auto span {
    font-size: var(--title-size);
    margin-bottom: 0.75rem;
    margin-left: 0.5rem;
}
.auto .buttons {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    padding: 0.5rem;
}
.auto button.displaystart {
    background-color: #855585;
}
.auto button.displaystart:hover {
    background-color: #9c649c;
}
.auto button.displaystart:active {
    background-color: #b172b1;
}
.auto button.selectpath {
    background-color: #497449;
}
.auto button.selectpath:hover {
    background-color: #558a55;
}
.auto button.selectpath:active {
    background-color: #63a063;
}

.auto .selectedText {
    color: #7fcc7f;
    font-size: calc(var(--title-size) * 0.6);
    margin-left: 1rem;
    display: none;
}
.auto.selected .selectedText {
    display: inline;
}

.top {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
}
.top h1 {
    font-size: 1.5rem;
}
.top .sideButton {
    background-color: #49746d;
    font-size: 1.5rem;
    height: 3rem;
    width: 20rem;
}
.top .sideButton:hover {
    background-color: #49746d;
}
.top .sideButton:active {
    background-color: #49746d;
}

.top .columns {
    background-color: #746049;
    color: white;
    border: none;
    outline: none;
    border-radius: 5px;
    padding: 0.5rem;
    font-size: 1.5rem;
    width: 13rem;
}

button {
    outline: none;
    border: none;
    border-radius: 5px;
    color: white;
    padding: 0.5rem;
    width: 10rem;
}
</style>
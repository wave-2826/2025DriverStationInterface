<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Point } from '../lib/types/renderTypes';
import { AutoDataAPIResponse, AutoPose, AutoRoutine } from '../lib/types/autoTypes';
import AutoRoutineComponent from "./autoRoutines/AutoRoutine.vue";
import { selectedAuto } from '../lib/networkTables';
import { invoke } from '@tauri-apps/api/core';

let isBlue = ref(true);
let columnsShown = ref(2);
let titleSize = computed(() => `${2.734 * (0.8 ** columnsShown.value)}rem`);
let loadError = ref<string | null>(null);

let autos = ref<AutoRoutine[]>([]);

// function autoDataChanged(key, value, isNew) {
//     for(const autoChoice of autoChoices) {
//         selectPathButton.onclick = () => {
//             if(!isNTConnected) return;
//             NetworkTables.putValue(selectedAutoPath, autoChoice.name);
//         };
//     }
// }

async function fetchAutoData() {
    let apiAddress = "";
    try {
        apiAddress = await invoke("get_api_address");
    } catch(e) {
        loadError.value = "Could not get API address";
        return;
    }

    try {
        console.log("Fetching auto data from", apiAddress);
        const response = await fetch(`http://${apiAddress}/autoData`);
        if(!response.ok) {
            loadError.value = `HTTP error: ${response.status}`;
            return;
        }
        const data: AutoDataAPIResponse = await response.json();

        autos.value = data.autoChoices.map(choice => new AutoRoutine(
            choice.name,
            choice.poses.map(pose => new AutoPose(
                new Point(pose.x, pose.y),
                pose.rot,
                pose.t
            ))
        ));
    } catch(e: any) {
        loadError.value = e.toString();
    }
}

onMounted(() => {
    fetchAutoData();
});
</script>

<template>
    <div class="page">
        <div class="top">
            <h1>Autonomous routines</h1>
            <div>
                <button @click="fetchAutoData" class="refresh">Refresh</button>
                <button class="sideButton" @click="isBlue = !isBlue">
                    {{ isBlue ? "Switch to red (only visual)" : "Switch to blue (only visual)" }}
                </button>
                <select class="columns" v-bind:value="columnsShown" @change="columnsShown = parseInt(($event.target as HTMLSelectElement)?.value)">
                    <option value="1">1 column</option>
                    <option value="2">2 columns</option>
                    <option value="3">3 columns</option>
                    <option value="4">4 columns</option>
                </select>
            </div>
        </div>
        
        <span v-if="autos.length === 0">Loading...</span>
        <span v-if="loadError !== null">Error loading autos: {{ loadError }}</span>

        <div
            id="autos"
            class="autos"
            v-if="autos.length > 0"
            v-bind:style="{ gridTemplateColumns: '1fr '.repeat(columnsShown) }"
        >
            <AutoRoutineComponent
                v-for="(auto, index) in autos"
                :key="index"
                :isBlue="isBlue"
                :titleSize="titleSize"
                :selected="selectedAuto === auto.name"
                :routine="auto"
            />
        </div>
    </div>
</template>

<style scoped>
.page {
    color: aliceblue;
    font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.autos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    padding: 0.5rem;
    overflow-y: auto;
}

button {
    outline: none;
    border: none;
    border-radius: 5px;
    color: white;
}

.top {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 2rem;
    background-color: #1a1a1a;
}
.top h1 {
    font-size: 1.5rem;
    margin: 0;
}

.top .sideButton {
    background-color: #49746d;
    font-size: 1rem;
    padding: 0.25rem 0.5rem;
    width: 15rem;
    margin-right: 1rem;
}
.top .sideButton:hover {
    background-color: #518078;
}
.top .sideButton:active {
    background-color: #568a81;
}

.top .refresh {
    background-color: #744970;
    font-size: 1rem;
    padding: 0.25rem 0.5rem;
    width: 10rem;
    margin-right: 1rem;
}
.top .refresh:hover {
    background-color: #855280;
}
.top .refresh:active {
    background-color: #965e90;
}

.top .columns {
    background-color: #746049;
    color: white;
    border: none;
    outline: none;
    border-radius: 5px;
    padding: 0.25rem 0.5rem;
    font-size: 1rem;
    width: 10rem;
}
</style>
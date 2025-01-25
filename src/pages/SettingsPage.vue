<script setup lang="ts">
import { teamNumber, customIPAddress, ipAddressMode, IPAddressMode } from "../lib/settings";

const ipAddressModes: {
    [mode in IPAddressMode]: {
        label: string;
    }
} = {
    [IPAddressMode.Custom]: { label: "Custom" },
    [IPAddressMode.DriverStation]: { label: "Driver Station" },
    [IPAddressMode.Localhost]: { label: "Localhost" },
    [IPAddressMode.TeamNumber]: { label: "Team number (10.##.##.2)" },
    [IPAddressMode.mDNS]: { label: "mDNS (roboRIO-####-FRC.local)" },
};

function verifyIP(ip: string) {
    const parts = ip.split(".");
    if (parts.length !== 4) return true;
    for (const part of parts) {
        if (!/^\d+$/.test(part)) return true;
        const num = parseInt(part);
        if (num < 0 || num > 255) return true;
    }
    return false;
}
</script>

<template>
    <div class="page">
        <h1>Network settings</h1>

        <div class="setting">
            <label for="teamNumber">Team number</label>
            <input type="number" id="teamNumber" v-model.number="teamNumber" :class="{ 'error': teamNumber < 0 || teamNumber > 25599 || !Number.isInteger(teamNumber) }" />
        </div>

        <div class="setting">
            <label for="ipAddressMode">IP address mode</label>
            <select id="ipAddressMode" v-model.number="ipAddressMode">
                <option v-for="(mode, key) in ipAddressModes" :value="parseInt(key as any)" :key="key">{{ mode.label }}</option>
            </select>
        </div>

        <div class="setting" v-if="ipAddressMode === IPAddressMode.Custom">
            <label for="customIPAddress">Custom IP address</label>
            <input type="text" id="customIPAddress" v-model="customIPAddress" :class="{ 'error': verifyIP(customIPAddress) }" />
        </div>
    </div>
</template>

<style scoped>
.page {
    width: 50ch;
    height: 100%;
    padding-top: 10rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
}

.setting {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
}
.setting label {
    flex: 1;
}

.setting input {
    flex: 1.5;
    padding: 0.2rem 0.5rem;
    border: 1px solid #777;
    outline: none;
    border-radius: 0.25rem;
    background-color: transparent;
    color: white;

    transition: border-color 0.2s ease-in-out;
}
.setting input:hover {
    border-color: #aaa;
}
.setting input:focus {
    border-color: #ccc;
}
.setting input.error {
    border-color: #ff7777;
}

.setting select {
    flex: 1.5;
    padding: 0.2rem 0.5rem;
    border: 1px solid #777;
    outline: none;
    border-radius: 0.25rem;
    background-color: transparent;
    color: white;

    transition: border-color 0.2s ease-in-out;
}
.setting select:hover {
    border-color: #aaa;
}
.setting select option {
    background-color: #222;
}
</style>
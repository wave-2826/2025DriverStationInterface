import { ref, Ref, watch } from "vue";

export enum IPAddressMode {
    TeamNumber,
    mDNS,
    Localhost,
    Custom,
};

const reactiveSettings: Record<string, Ref<any>> = {};

export const teamNumber = getSetting("teamNumber", 0);
export const customIPAddress = getSetting("customIP", "127.0.0.1");
export const ipAddressMode = getSetting("ipAddressMode", IPAddressMode.TeamNumber);

function getSetting<T>(key: string, defaultValue: T): Ref<T> {
    if (!reactiveSettings[key]) {
        const localStorageValue = localStorage.getItem(key);
        reactiveSettings[key] = ref<T>(localStorageValue ? JSON.parse(localStorageValue) : defaultValue);
        watch(reactiveSettings[key], (newValue) => {
            localStorage.setItem(key, JSON.stringify(newValue));
        });
    }
    return reactiveSettings[key];
}
// src/renderer/src/utils/morningMtfSettings.ts
import { ALL_INSTRUMENTS } from "./settingsStorage"; // daha önce tanımladığımız liste
import type { MorningMtfTimeframeId } from "../../../shared/morningMtfTypes";

const STORAGE_KEY = "tj_morning_mtf_settings_v1";

export type MorningMtfSettings = {
    [symbol: string]: MorningMtfTimeframeId[];
};

const DEFAULT_TFS: MorningMtfTimeframeId[] = ["4H", "15M", "5M"];

export const AVAILABLE_TFS: MorningMtfTimeframeId[] = [
    "4H",
    "1H",
    "15M",
    "5M",
    "1M",
];

export function loadMorningMtfSettings(): MorningMtfSettings {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as MorningMtfSettings;
        return parsed ?? {};
    } catch {
        return {};
    }
}

export function saveMorningMtfSettings(settings: MorningMtfSettings) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getTimeframesForSymbol(
    symbol: string,
    settings: MorningMtfSettings,
): MorningMtfTimeframeId[] {
    if (settings[symbol] && settings[symbol]!.length > 0) {
        return settings[symbol]!;
    }
    // Varsayılan: 3 TF
    return DEFAULT_TFS;
}

export function getAllTrackedSymbols(settings: MorningMtfSettings): string[] {
    const fromSettings = Object.keys(settings);
    return Array.from(
        new Set([...ALL_INSTRUMENTS, ...fromSettings]),
    ).sort();
}

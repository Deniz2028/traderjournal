// src/renderer/src/utils/morningMtfClient.ts
import type { MorningMtfDaySnapshot } from "../../../shared/morningMtfTypes";
import type { MorningMtfApi } from "../preload-api";

function getApi(): MorningMtfApi {
    // @ts-expect-error - global injected by preload
    return window.api.morningMtf;
}

export function fetchMorningForDate(date: string) {
    return getApi().getForDate(date);
}

export function saveMorningForDate(snapshot: MorningMtfDaySnapshot) {
    return getApi().saveForDate(snapshot);
}

export function fetchMorningForMonth(year: number, month: number) {
    return getApi().getForMonth(year, month);
}

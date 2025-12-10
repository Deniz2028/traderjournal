import type { EODApi } from "../preload-api";

function getApi(): EODApi {
    // @ts-expect-error - global injected
    return window.api.eodApi;
}

export function fetchEodForDate(date: string) {
    return getApi().getForDate(date);
}

export function saveEodForDate(date: string, data: any) {
    return getApi().saveForDate(date, data);
}

export function fetchEodForMonth(yyyyMM: string) {
    return getApi().getForMonth(yyyyMM);
}

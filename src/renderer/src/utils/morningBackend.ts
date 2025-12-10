// src/renderer/src/utils/morningBackend.ts

export type MorningBias = "Long" | "Short" | "Neutral";

export interface MorningTimeframeEntry {
    timeframe: string;
    bias: MorningBias;
    chartUrl: string;
    notes: string;
}

export interface MorningInstrumentSnapshot {
    symbol: string;
    dailyBias: MorningBias;
    entries: MorningTimeframeEntry[];
}

export interface MorningDaySnapshot {
    date: string; // YYYY-MM-DD
    instruments: MorningInstrumentSnapshot[];
}

export interface MorningDaySummary {
    date: string;
    instrumentCount: number;
}

// Runtime access to preload bridge
function getApi() {
    return (window as any).journalMorning;
}

export async function getMorningDay(
    date: string,
): Promise<MorningDaySnapshot | null> {
    const api = getApi();
    if (!api || !api.getDay) return null;
    return (await api.getDay(date)) as MorningDaySnapshot | null;
}

export async function saveMorningDay(
    snapshot: MorningDaySnapshot,
): Promise<void> {
    const api = getApi();
    if (!api || !api.saveDay) return;
    await api.saveDay(snapshot);
}

export async function listMorningDays(): Promise<MorningDaySummary[]> {
    const api = getApi();
    if (!api || !api.listDays) return [];
    return (await api.listDays()) as MorningDaySummary[];
}

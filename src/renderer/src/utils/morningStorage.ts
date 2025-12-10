// src/renderer/src/utils/morningStorage.ts

import type { Bias } from "../types";

export interface FrameState {
    chartUrl: string;
    bias: Bias;
    notes: string;
}

export interface MorningInstrumentDay {
    symbol: string;
    date: string; // YYYY-MM-DD
    dailyBias: Bias;
    frames: Record<string, FrameState>;
}

interface MorningState {
    [symbol: string]: {
        [date: string]: MorningInstrumentDay;
    };
}

const STORAGE_KEY = "tj_morning_v2";

function loadState(): MorningState {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as MorningState;
        if (!parsed || typeof parsed !== "object") return {};
        return parsed;
    } catch {
        return {};
    }
}

function saveState(state: MorningState) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadInstrumentDay(
    symbol: string,
    dateISO: string,
    timeframes: string[],
): MorningInstrumentDay {
    const state = loadState();
    const bySymbol = state[symbol] ?? {};
    const existing = bySymbol[dateISO];

    const base: MorningInstrumentDay =
        existing ?? {
            symbol,
            date: dateISO,
            dailyBias: "Neutral",
            frames: {},
        };

    // Ensure all requested timeframes exist
    const frames: Record<string, FrameState> = { ...base.frames };
    for (const tf of timeframes) {
        if (!frames[tf]) {
            frames[tf] = {
                chartUrl: "",
                bias: "Neutral",
                notes: "",
            };
        }
    }

    return {
        ...base,
        frames,
    };
}

export function saveInstrumentDay(day: MorningInstrumentDay) {
    const state = loadState();
    if (!state[day.symbol]) {
        state[day.symbol] = {};
    }
    state[day.symbol][day.date] = day;
    saveState(state);
}

// src/renderer/src/utils/settingsStorage.ts

export type Timeframe =
    | "4H"
    | "1H"
    | "30M"
    | "15M"
    | "5M"
    | "1M";

export const AVAILABLE_TIMEFRAMES: Timeframe[] = [
    "4H",
    "1H",
    "30M",
    "15M",
    "5M",
    "1M",
];

// ---- Dashboard instruments (existing behaviour) ----

const DASHBOARD_INSTRUMENTS_KEY = "tj_dashboard_instruments_v1";

/**
 * All instruments that can be selected in Settings.
 * 8 majors + NASDAQ + DXY + Gold + Silver.
 */
export const ALL_INSTRUMENTS: string[] = [
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "AUDUSD",
    "NZDUSD",
    "USDCAD",
    "USDCHF",
    "EURJPY",
    "NAS100",
    "DXY",
    "XAUUSD",
    "XAGUSD",
];

const DEFAULT_INSTRUMENTS: string[] = [
    "XAUUSD",
    "EURUSD",
    "GBPUSD",
    "NAS100",
];

export function getDashboardInstruments(): string[] {
    if (typeof window === "undefined") {
        return DEFAULT_INSTRUMENTS;
    }

    try {
        const raw = window.localStorage.getItem(DASHBOARD_INSTRUMENTS_KEY);
        if (!raw) return DEFAULT_INSTRUMENTS;
        const parsed = JSON.parse(raw) as string[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return DEFAULT_INSTRUMENTS;
        }
        return parsed;
    } catch {
        return DEFAULT_INSTRUMENTS;
    }
}

export function saveDashboardInstruments(instruments: string[]) {
    if (typeof window === "undefined") return;
    const filtered = instruments.filter((x) => ALL_INSTRUMENTS.includes(x));
    window.localStorage.setItem(
        DASHBOARD_INSTRUMENTS_KEY,
        JSON.stringify(filtered),
    );
}

// ---- Morning Analysis timeframes per symbol ----

const MORNING_TF_KEY = "tj_morning_timeframes_v1";

export type TimeframeMap = Record<string, Timeframe[]>;

const DEFAULT_TIMEFRAMES: Timeframe[] = ["4H", "15M", "5M"];

export function getMorningTimeframeMap(): TimeframeMap {
    if (typeof window === "undefined") {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(MORNING_TF_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as TimeframeMap;
        if (!parsed || typeof parsed !== "object") return {};
        return parsed;
    } catch {
        return {};
    }
}

export function saveMorningTimeframeMap(map: TimeframeMap) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MORNING_TF_KEY, JSON.stringify(map));
}

export function getTimeframesForSymbol(symbol: string): Timeframe[] {
    const map = getMorningTimeframeMap();
    const frames = map[symbol];
    if (!frames || frames.length === 0) return DEFAULT_TIMEFRAMES;
    // Filter out invalid entries, keep only known tfs
    return frames.filter((tf) => AVAILABLE_TIMEFRAMES.includes(tf));
}

// ---- Achievements View Mode ----

const ACHIEVEMENTS_MODE_KEY = "tj_achievements_mode_v1";

export type AchievementsMode = "passed_only" | "all";

export function getAchievementsMode(): AchievementsMode {
    if (typeof window === "undefined") return "passed_only";
    try {
        const raw = window.localStorage.getItem(ACHIEVEMENTS_MODE_KEY);
        if (raw === "all") return "all";
        return "passed_only"; // Default
    } catch {
        return "passed_only";
    }
}

export function saveAchievementsMode(mode: AchievementsMode) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACHIEVEMENTS_MODE_KEY, mode);
    window.dispatchEvent(new Event("achievements-mode-changed"));
}

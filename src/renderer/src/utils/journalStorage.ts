// src/renderer/src/utils/journalStorage.ts

// --- Types --------------------------------------------------------

export type Bias3 = "Long" | "Short" | "Neutral";
export type Outcome = "TP" | "SL" | "BE";

export interface MtfFrame {
    id: string;        // "4H", "15m", "5m" like IDs
    timeframe: string; // Label
    bias: Bias3;
    link: string;
    notes: string;
}

// Renamed from TodayJournal to MtfTrade to reflect multiple trades
export interface MtfTrade {
    id: string;          // Unique ID for the trade
    dateISO: string;     // "2025-12-11"
    symbol: string;      // XAUUSD
    tradeBias: Bias3;    // Trade direction
    frames: MtfFrame[];

    // pre-trade saved?
    preSaved: boolean;

    // post-trade
    outcome?: Outcome;
    resultR?: number | null;
    exitLink?: string;
    exitNotes?: string;
}

// --- Internal helpers ---------------------------------------------

const STORAGE_KEY = "tj_today_mtf_v3_multi"; // Changed key to avoid collision/migration complexity for now

interface RawStore {
    [dateISO: string]: MtfTrade[];
}

export function loadStore(): RawStore {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as RawStore;
    } catch {
        return {};
    }
}

function saveStore(store: RawStore) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function createEmptyTrade(dateISO: string): MtfTrade {
    return {
        id: crypto.randomUUID(),
        dateISO,
        symbol: "XAUUSD",
        tradeBias: "Neutral",
        frames: [
            { id: "0", timeframe: "4H", bias: "Neutral", link: "", notes: "" },
            { id: "1", timeframe: "15m", bias: "Neutral", link: "", notes: "" },
            { id: "2", timeframe: "5m", bias: "Neutral", link: "", notes: "" },
        ],
        preSaved: false,
        outcome: undefined,
        resultR: null,
        exitLink: "",
        exitNotes: "",
    };
}

// --- Public API ---------------------------------------------------

export function loadTradesForDate(dateISO: string): MtfTrade[] {
    const store = loadStore();
    return store[dateISO] || [];
}

export function createNewTrade(dateISO: string): MtfTrade {
    return createEmptyTrade(dateISO);
}

export function saveTrade(trade: MtfTrade) {
    const store = loadStore();
    const list = store[trade.dateISO] || [];

    const idx = list.findIndex(t => t.id === trade.id);
    if (idx >= 0) {
        list[idx] = trade;
    } else {
        list.push(trade);
    }

    store[trade.dateISO] = list;
    saveStore(store);
}

export function deleteTrade(tradeId: string, dateISO: string) {
    const store = loadStore();
    const list = store[dateISO] || [];
    const newList = list.filter(t => t.id !== tradeId);
    store[dateISO] = newList;
    saveStore(store);
}

export function hasPostReview(trade: MtfTrade): boolean {
    return typeof trade.outcome === "string";
}

/**
 * Returns a summary of trades for a given month.
 * Used by the Calendar to show pills and net R.
 */
export function getMonthlySummary(year: number, month: number): Record<string, { count: number; netR: number; trades: MtfTrade[] }> {
    const store = loadStore();
    const result: Record<string, { count: number; netR: number; trades: MtfTrade[] }> = {};

    // Month is 0-indexed (0=Jan)
    // Keys are "YYYY-MM-DD"
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    Object.keys(store).forEach(dateKey => {
        if (dateKey.startsWith(prefix)) {
            const list = store[dateKey] || [];
            const netR = list.reduce((acc, t) => acc + (t.resultR || 0), 0);
            result[dateKey] = {
                count: list.length,
                netR,
                trades: list
            };
        }
    });

    return result;
}

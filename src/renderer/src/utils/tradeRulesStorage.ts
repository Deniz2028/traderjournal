import type { TradeRule } from "../types/tradeRules";

const STORAGE_KEY = "tj_trade_rules_v1";

function safeParse(raw: string | null): TradeRule[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as TradeRule[];
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch {
        return [];
    }
}

export function loadTradeRules(): TradeRule[] {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return safeParse(raw);
}

export function saveTradeRules(list: TradeRule[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addTradeRule(text: string): TradeRule[] {
    const trimmed = text.trim();
    if (!trimmed) return loadTradeRules();

    const all = loadTradeRules();
    const now = Date.now();

    const newRule: TradeRule = {
        id: String(now),
        text: trimmed,
        isActive: true,
    };

    const next = [...all, newRule];
    saveTradeRules(next);
    return next;
}

export function removeTradeRule(id: string): TradeRule[] {
    const all = loadTradeRules();
    const next = all.filter((r) => r.id !== id);
    saveTradeRules(next);
    return next;
}

export function toggleTradeRule(id: string): TradeRule[] {
    const all = loadTradeRules();
    const next = all.map((r) =>
        r.id === id ? { ...r, isActive: !r.isActive } : r
    );
    saveTradeRules(next);
    return next;
}

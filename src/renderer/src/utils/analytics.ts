// src/renderer/src/utils/analytics.ts
import type { Trade } from "../types";

/**
 * Analytics model
 */

export interface DailyPnLPoint {
    date: string;       // "2025-12-11"
    totalR: number;     // o güne ait toplam R
    cumulativeR: number; // baştan bugüne kümülatif R
}

export interface SymbolStats {
    symbol: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number; // 0–1
    avgR: number;
    totalR: number;
}

export interface WeekdayStats {
    weekdayIndex: number; // 0 = Pazar, 1 = Pazartesi...
    weekdayLabel: string; // "Mon", "Tue"...
    trades: number;
    totalR: number;
    avgR: number;
}

export interface AnalyticsSummary {
    totalTrades: number;
    totalR: number;
    avgR: number;
    winRate: number; // 0–1
}

/**
 * Yardımcı – YYYY-MM-DD -> Date
 */
function parseISO(dateStr: string): Date {
    return new Date(dateStr + "T00:00:00");
}

/**
 * Günlük PnL + kümülatif PnL hesapla
 */
export function buildDailyPnL(trades: Trade[]): DailyPnLPoint[] {
    const byDate = new Map<string, number>();

    for (const t of trades) {
        if (!t.date) continue;
        const prev = byDate.get(t.date) ?? 0;
        byDate.set(t.date, prev + (t.resultR ?? 0));
    }

    const dates = Array.from(byDate.keys()).sort(
        (a, b) => parseISO(a).getTime() - parseISO(b).getTime(),
    );

    const result: DailyPnLPoint[] = [];
    let cumulative = 0;

    for (const d of dates) {
        const total = byDate.get(d) ?? 0;
        cumulative += total;
        result.push({
            date: d,
            totalR: total,
            cumulativeR: cumulative,
        });
    }

    return result;
}

/**
 * Sembole göre performans
 */
export function buildSymbolStats(trades: Trade[]): SymbolStats[] {
    const bySymbol = new Map<string, Trade[]>();

    for (const t of trades) {
        const key = (t.symbol || "").toUpperCase();
        if (!key) continue;
        const arr = bySymbol.get(key) ?? [];
        arr.push(t);
        bySymbol.set(key, arr);
    }

    const result: SymbolStats[] = [];

    for (const [symbol, list] of bySymbol.entries()) {
        const tradesCount = list.length;
        if (!tradesCount) continue;

        let wins = 0;
        let losses = 0;
        let totalR = 0;

        for (const t of list) {
            const r = t.resultR ?? 0;
            totalR += r;
            if (r > 0) wins += 1;
            else if (r < 0) losses += 1;
        }

        const avgR = totalR / tradesCount;
        const winRate = tradesCount ? wins / tradesCount : 0;

        result.push({
            symbol,
            trades: tradesCount,
            wins,
            losses,
            winRate,
            avgR,
            totalR,
        });
    }

    // En çok trade edilenler en üstte
    result.sort((a, b) => b.trades - a.trades);

    return result;
}

/**
 * Haftanın gününe göre performans
 */
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildWeekdayStats(trades: Trade[]): WeekdayStats[] {
    const map = new Map<number, { trades: number; totalR: number }>();

    for (const t of trades) {
        if (!t.date) continue;
        const d = parseISO(t.date);
        const idx = d.getDay(); // 0..6
        const bucket = map.get(idx) ?? { trades: 0, totalR: 0 };
        bucket.trades += 1;
        bucket.totalR += t.resultR ?? 0;
        map.set(idx, bucket);
    }

    const result: WeekdayStats[] = [];

    for (let i = 0; i < 7; i += 1) {
        const bucket = map.get(i) ?? { trades: 0, totalR: 0 };
        const avgR = bucket.trades ? bucket.totalR / bucket.trades : 0;
        result.push({
            weekdayIndex: i,
            weekdayLabel: WEEKDAY_LABELS[i],
            trades: bucket.trades,
            totalR: bucket.totalR,
            avgR,
        });
    }

    // Pazartesi başa gelsin (Mon..Sun)
    return [...result.slice(1), result[0]];
}

/**
 * Genel özet
 */
export function buildSummary(trades: Trade[]): AnalyticsSummary {
    const totalTrades = trades.length;
    let totalR = 0;
    let wins = 0;

    for (const t of trades) {
        const r = t.resultR ?? 0;
        totalR += r;
        if (r > 0) wins += 1;
    }

    const avgR = totalTrades ? totalR / totalTrades : 0;
    const winRate = totalTrades ? wins / totalTrades : 0;

    return {
        totalTrades,
        totalR,
        avgR,
        winRate,
    };
}

// src/renderer/src/utils/tradeStorage.ts
import type { Trade } from "../types";

/**
 * All trade operations are forwarded to the Electron main process
 * via window.tjApi, which persists data to a JSON file under userData.
 */

export async function getTrades(): Promise<Trade[]> {
    if (typeof window === "undefined" || !window.tjApi) return [];
    const trades = await window.tjApi.getAllTrades();
    return trades as Trade[];
}

export async function addTrade(trade: Trade): Promise<void> {
    if (typeof window === "undefined" || !window.tjApi) return;
    await window.tjApi.addTrade(trade);
}

export async function getTradesForMonth(
    year: number,
    monthIndex0: number,
): Promise<Trade[]> {
    if (typeof window === "undefined" || !window.tjApi) return [];
    const trades = await window.tjApi.getTradesForMonth(year, monthIndex0);
    return trades as Trade[];
}

// src/main/tradeRepo.ts
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export type Direction = "Long" | "Short" | "Neutral";
export type ReviewStatus = "Reviewed" | "Pending";

export interface Trade {
    id: string;
    date: string;     // "YYYY-MM-DD"
    symbol: string;
    dir: Direction;
    resultR: number;
    time: string;     // "HH:mm"
    status: ReviewStatus;
}

function getDataDir() {
    const userData = app.getPath("userData");
    return path.join(userData, "trade-journal-data");
}

function getTradesFilePath() {
    return path.join(getDataDir(), "trades.json");
}

function ensureDataDir() {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export function loadTrades(): Trade[] {
    try {
        ensureDataDir();
        const filePath = getTradesFilePath();
        console.log("REPO DEBUG: Loading trades from:", filePath);
        if (!fs.existsSync(filePath)) {
            console.log("REPO DEBUG: File does not exist:", filePath);
            return [];
        }
        const raw = fs.readFileSync(filePath, "utf-8");
        if (!raw.trim()) return [];
        const parsed = JSON.parse(raw) as Trade[];
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch {
        return [];
    }
}

export function saveTrades(trades: Trade[]) {
    ensureDataDir();
    const filePath = getTradesFilePath();
    fs.writeFileSync(filePath, JSON.stringify(trades, null, 2), "utf-8");
}

export function addTrade(trade: Trade) {
    const trades = loadTrades();
    trades.push(trade);
    saveTrades(trades);
}

/**
 * Filter trades by year + month index (0-based).
 */
export function getTradesForMonth(year: number, monthIndex0: number): Trade[] {
    return loadTrades().filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === monthIndex0;
    });
}

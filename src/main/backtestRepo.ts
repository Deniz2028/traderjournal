import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type BacktestDirection = "Long" | "Short";
export type BacktestOutcome = "TP" | "SL" | "BE";

export interface BacktestSession {
    id: string;
    name: string;
    type: "Backtesting" | "Prop Firm";
    balance: number;
    assets: string[];
    startDate?: string;
    endDate?: string;
    creationDate: string;
    status: "Active" | "Ended";
    // Prop Firm specific
    profitTarget?: number; // percent e.g. 10
    maxDailyLoss?: number; // value e.g. 5000
    maxTotalLoss?: number; // value e.g. 10000
    timeInvested?: number; // minutes spent on this session
}

export interface BacktestTrade {
    id: string;
    sessionId: string; // Link to session
    date: string;
    symbol: string;
    direction: BacktestDirection;
    outcome: BacktestOutcome;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    beforeChart?: string;
    afterChart?: string;
    notes?: string;
    resultR?: number;
}

function getDataDir() {
    const userData = app.getPath("userData");
    return path.join(userData, "trade-journal-data");
}

function getBacktestsFilePath() {
    return path.join(getDataDir(), "backtests.json");
}

function getSessionsFilePath() {
    return path.join(getDataDir(), "sessions.json"); // New file for sessions
}

function ensureDataDir() {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// --- Sessions ---

export function loadSessions(): BacktestSession[] {
    try {
        ensureDataDir();
        const filePath = getSessionsFilePath();
        if (!fs.existsSync(filePath)) return [];
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export function saveSessions(sessions: BacktestSession[]) {
    ensureDataDir();
    fs.writeFileSync(getSessionsFilePath(), JSON.stringify(sessions, null, 2));
}

export function addSession(session: Omit<BacktestSession, "id" | "creationDate" | "status">): BacktestSession {
    const list = loadSessions();
    const newSession: BacktestSession = {
        ...session,
        id: randomUUID(),
        creationDate: new Date().toISOString(),
        status: "Active"
    };
    list.push(newSession);
    saveSessions(list);
    return newSession;
}

export function deleteSession(id: string) {
    let list = loadSessions();
    list = list.filter(s => s.id !== id);
    saveSessions(list);

    // Also delete trades for this session? Maybe keep them orphaned or cascade delete.
    // Ideally cascade delete.
    let trades = loadBacktests();
    trades = trades.filter(t => t.sessionId !== id);
    saveBacktests(trades);
}


// --- Trades (Modified for Session) ---

export function loadBacktests(): BacktestTrade[] {
    try {
        ensureDataDir();
        const filePath = getBacktestsFilePath();
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const raw = fs.readFileSync(filePath, "utf-8");
        if (!raw.trim()) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Failed to load backtests", e);
        return [];
    }
}

export function saveBacktests(trades: BacktestTrade[]) {
    try {
        ensureDataDir();
        const filePath = getBacktestsFilePath();
        fs.writeFileSync(filePath, JSON.stringify(trades, null, 2), "utf-8");
    } catch (e) {
        console.error("Failed to save backtests", e);
    }
}

export function addBacktest(trade: Omit<BacktestTrade, "id">): BacktestTrade {
    const list = loadBacktests();
    const newTrade: BacktestTrade = {
        ...trade,
        id: randomUUID()
    };
    list.push(newTrade);
    saveBacktests(list);
    return newTrade;
}

export function updateBacktest(trade: BacktestTrade) {
    const list = loadBacktests();
    const index = list.findIndex(t => t.id === trade.id);
    if (index !== -1) {
        list[index] = trade;
        saveBacktests(list);
    }
}

export function deleteBacktest(id: string) {
    let list = loadBacktests();
    list = list.filter(t => t.id !== id);
    saveBacktests(list);
}

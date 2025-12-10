import { app, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";

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

export interface MorningStoreFile {
    days: MorningDaySnapshot[];
}

const FILE_NAME = "morning.json";

function getStorePath(): string {
    const userData = app.getPath("userData");
    return path.join(userData, FILE_NAME);
}

function readStore(): MorningStoreFile {
    try {
        const filePath = getStorePath();
        if (!fs.existsSync(filePath)) {
            return { days: [] };
        }
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw) as MorningStoreFile;
        if (!parsed || !Array.isArray(parsed.days)) {
            return { days: [] };
        }
        return parsed;
    } catch {
        return { days: [] };
    }
}

function writeStore(store: MorningStoreFile) {
    const filePath = getStorePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
}

export function getDaySnapshot(date: string): MorningDaySnapshot | null {
    const store = readStore();
    return store.days.find((d) => d.date === date) ?? null;
}

export function saveDaySnapshot(snapshot: MorningDaySnapshot) {
    const store = readStore();
    const idx = store.days.findIndex((d) => d.date === snapshot.date);
    if (idx >= 0) {
        store.days[idx] = snapshot;
    } else {
        store.days.push(snapshot);
    }
    writeStore(store);
}

/**
 * Return a lightweight list of days for overview (e.g. for Calendar).
 */
export function listDaySummaries(): { date: string; instrumentCount: number }[] {
    const store = readStore();
    return store.days.map((d) => ({
        date: d.date,
        instrumentCount: d.instruments.length,
    }));
}

/**
 * Register IPC handlers for Morning Analysis.
 *
 * Channels:
 * - journal:morning:getDay(date: string) => MorningDaySnapshot | null
 * - journal:morning:saveDay(snapshot: MorningDaySnapshot) => void
 * - journal:morning:listDays() => { date, instrumentCount }[]
 */
export function registerMorningHandlers() {
    ipcMain.handle("journal:morning:getDay", (_event, date: string) => {
        return getDaySnapshot(date);
    });

    ipcMain.handle(
        "journal:morning:saveDay",
        (_event, snapshot: MorningDaySnapshot) => {
            saveDaySnapshot(snapshot);
        },
    );

    ipcMain.handle("journal:morning:listDays", () => {
        return listDaySummaries();
    });
}

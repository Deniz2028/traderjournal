// src/main/morningMtfStore.ts
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { MorningMtfDaySnapshot } from "../shared/morningMtfTypes";

interface MorningMtfStoreFile {
    [date: string]: MorningMtfDaySnapshot;
}

function getFilePath() {
    const userData = app.getPath("userData");
    return path.join(userData, "morning_mtf.json");
}

function readStore(): MorningMtfStoreFile {
    try {
        const filePath = getFilePath();
        if (!fs.existsSync(filePath)) return {};
        const raw = fs.readFileSync(filePath, "utf-8");
        if (!raw.trim()) return {};
        return JSON.parse(raw) as MorningMtfStoreFile;
    } catch {
        return {};
    }
}

function writeStore(store: MorningMtfStoreFile) {
    const filePath = getFilePath();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
}

export function getMorningMtfForDate(
    date: string,
): MorningMtfDaySnapshot | null {
    const store = readStore();
    return store[date] ?? null;
}

export function saveMorningMtfForDate(snapshot: MorningMtfDaySnapshot): void {
    const store = readStore();
    store[snapshot.date] = snapshot;
    writeStore(store);
}

export function getMorningMtfForMonth(
    year: number,
    month: number, // 1-12
): MorningMtfDaySnapshot[] {
    const store = readStore();
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    return Object.values(store).filter((s) => s.date.startsWith(prefix));
}

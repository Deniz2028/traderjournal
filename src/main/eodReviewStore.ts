import { app } from "electron";
import path from "path";
import fs from "fs";
import { EODReview } from "../shared/eodTypes";

const filePath = path.join(app.getPath("userData"), "eod_review.json");

function loadFile(): Record<string, EODReview> {
    try {
        if (!fs.existsSync(filePath)) return {};
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
        return {};
    }
}

function saveFile(data: Record<string, EODReview>) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export const eodStorage = {
    getForDate(date: string): EODReview | null {
        const db = loadFile();
        return db[date] || null;
    },

    saveForDate(date: string, value: EODReview) {
        const db = loadFile();
        db[date] = value;
        saveFile(db);
    },

    getForMonth(yyyyMM: string): EODReview[] {
        const db = loadFile();
        return Object.values(db).filter(r => r.date.startsWith(yyyyMM));
    }
};

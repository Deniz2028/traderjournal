import { app, dialog } from "electron";
import fs from "fs";
import path from "path";

const USER_DATA = app.getPath("userData");
const TRADES_FILE = path.join(USER_DATA, "trade-journal-data", "trades.json");
const MORNING_MTF_FILE = path.join(USER_DATA, "morning_mtf.json");
const EOD_FILE = path.join(USER_DATA, "eod_review.json");
// Checking task list: "Create rulesStorage.ts" for Advanced Rules Coach.
// If rulesStorage is in renderer (localStorage), main doesn't see it.
// If it's in main, we need its path. "Create rulesStorage.ts" logic was "in Main"?
// Re-checking task.md: "Create rulesStorage.ts" -> "Update RulesPage.tsx".
// Actually, earlier "Implement Trade Rules Page v1" said "Create utils/tradeRulesStorage.ts".
// The "Advanced Rules Coach" used "rulesStorage.ts".
// Let's assume renderer/localStorage for simplicity unless I see a `rulesRepo.ts` in main. I didn't see one in main.
// So rules are likely in localStorage.

export async function exportAllData(rendererLocalStorage: Record<string, any>) {
    // 1. Read files
    const trades = fs.existsSync(TRADES_FILE) ? JSON.parse(fs.readFileSync(TRADES_FILE, "utf-8")) : [];
    const morningMtf = fs.existsSync(MORNING_MTF_FILE) ? JSON.parse(fs.readFileSync(MORNING_MTF_FILE, "utf-8")) : {};
    const eod = fs.existsSync(EOD_FILE) ? JSON.parse(fs.readFileSync(EOD_FILE, "utf-8")) : {};

    // 2. Combine with renderer data
    const exportObject = {
        meta: {
            appName: "TradeJournal",
            version: "1.0",
            timestamp: new Date().toISOString(),
        },
        data: {
            trades,
            morningMtf,
            eod,
            localStorage: rendererLocalStorage,
        }
    };

    // 3. Show Save Dialog
    const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Export Journal Data",
        defaultPath: `trade-journal-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }]
    });

    if (canceled || !filePath) return { success: false };

    // 4. Write
    fs.writeFileSync(filePath, JSON.stringify(exportObject, null, 2), "utf-8");
    return { success: true, path: filePath };
}

export async function importAllData() {
    // 1. Show Open Dialog
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Import Journal Data",
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }]
    });

    if (canceled || filePaths.length === 0) return { success: false };
    const filePath = filePaths[0];

    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const json = JSON.parse(raw);

        if (!json.meta || !json.data) throw new Error("Invalid backup format");

        const { trades, morningMtf, eod, localStorage } = json.data;

        // 2. Restore Files
        // Ensure dirs
        if (trades) {
            const dir = path.dirname(TRADES_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2), "utf-8");
        }
        if (morningMtf) {
            fs.writeFileSync(MORNING_MTF_FILE, JSON.stringify(morningMtf, null, 2), "utf-8");
        }
        if (eod) {
            fs.writeFileSync(EOD_FILE, JSON.stringify(eod, null, 2), "utf-8");
        }

        // 3. Return localStorage data to renderer
        return { success: true, localStorage: localStorage || {} };
    } catch (e: any) {
        console.error("Import failed:", e);
        return { success: false, error: e.message };
    }
}

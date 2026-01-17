// Main Process - Trigger Restart 2
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs';
import {
    loadTrades,
    addTrade as repoAddTrade,
    getTradesForMonth,
    Trade as MainTrade,
} from "./tradeRepo";
import { registerMorningHandlers } from "./morningStore";
import { registerDashboardIpc } from "./dashboardSummary";
import {
    getMorningMtfForDate,
    saveMorningMtfForDate,
    getMorningMtfForMonth,
} from "./morningMtfStore";
import type { MorningMtfDaySnapshot } from "../shared/morningMtfTypes";
import { eodStorage } from "./eodReviewStore";
import { runMt5Summary } from "./mt5Process";
import { exportAllData, importAllData } from "./backupManager";
import {
    loadBacktests, addBacktest, deleteBacktest, updateBacktest,
    loadSessions, addSession, deleteSession
} from "./backtestRepo";

function createWindow(): void {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // IGNORING SSL ERRORS (Fix for Antivirus/Firewall SSL Scanning)
    app.commandLine.appendSwitch('ignore-certificate-errors');
    app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // IPC handlers for trades
    ipcMain.handle("trades:getAll", () => {
        const trades = loadTrades();
        return trades;
    });

    ipcMain.handle(
        "trades:add",
        (_event, trade: MainTrade) => {
            repoAddTrade(trade);
            return { ok: true };
        },
    );

    ipcMain.handle(
        "trades:getForMonth",
        (_event, year: number, monthIndex0: number) => {
            return getTradesForMonth(year, monthIndex0);
        },
    );

    registerMorningHandlers();

    // MTF Morning Analysis Handlers
    registerDashboardIpc();
    ipcMain.handle("morningMtf:getForDate", async (_event, date: string) => {
        return getMorningMtfForDate(date);
    });

    ipcMain.handle(
        "morningMtf:saveForDate",
        async (_event, snapshot: MorningMtfDaySnapshot) => {
            saveMorningMtfForDate(snapshot);
        },
    );

    ipcMain.handle(
        "morningMtf:getForMonth",
        async (_event, { year, month }) => {
            return getMorningMtfForMonth(year, month);
        },
    );

    // EOD Review Handlers
    ipcMain.handle("eod:getForDate", (_, date) => {
        return eodStorage.getForDate(date);
    });

    ipcMain.handle("eod:saveForDate", (_, payload) => {
        const { date, data } = payload;
        return eodStorage.saveForDate(date, data);
    });

    ipcMain.handle("eod:getForMonth", (_, yyyyMM) => {
        return eodStorage.getForMonth(yyyyMM);
    });

    // --- Backtest Mode Handlers ---
    // imported at top level

    ipcMain.handle("backtest:getAll", () => {
        return loadBacktests();
    });

    ipcMain.handle("backtest:add", (_event, trade) => {
        return addBacktest(trade);
    });

    ipcMain.handle("backtest:update", (_event, trade) => {
        return updateBacktest(trade);
    });

    ipcMain.handle("backtest:delete", (_event, id) => {
        deleteBacktest(id);
        return { ok: true };
    });

    // Sessions
    ipcMain.handle("backtest:getSessions", () => {
        return loadSessions();
    });

    ipcMain.handle("backtest:createSession", (_event, session) => {
        return addSession(session);
    });

    ipcMain.handle("backtest:deleteSession", (_event, id) => {
        deleteSession(id);
        return { ok: true };
    });

    // --- News API ---
    // --- News API ---
    let cachedNewsData: any = null;
    let lastNewsFetchTime: number = 0;
    const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

    // Backoff state
    let rateLimitedUntil: number = 0;

    ipcMain.handle("news:getThisWeek", async () => {
        try {
            // Check backoff
            if (Date.now() < rateLimitedUntil) {
                console.warn("News API rate limited. Returning empty/cached or error.");
                // Return cached if available, else empty (don't throw to avoid UI crashes)
                return cachedNewsData || [];
            }

            // Check cache
            if (cachedNewsData && (Date.now() - lastNewsFetchTime < CACHE_DURATION)) {
                return cachedNewsData;
            }

            return new Promise((resolve, reject) => {
                const { net } = require("electron");
                const request = net.request("https://nfs.faireconomy.media/ff_calendar_thisweek.json");
                request.setHeader("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

                request.on("response", (response) => {
                    let data = "";
                    response.on("data", (chunk) => {
                        data += chunk;
                    });
                    response.on("end", () => {
                        if (response.statusCode === 429) {
                            console.error("News API Rate Limit Hit (429). Backing off for 10 mins.");
                            rateLimitedUntil = Date.now() + (10 * 60 * 1000); // 10 min backoff
                            // Resolve with cache or empty to prevent client crash
                            resolve(cachedNewsData || []);
                            return;
                        }

                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            try {
                                const parsed = JSON.parse(data);
                                cachedNewsData = parsed;
                                lastNewsFetchTime = Date.now();
                                resolve(parsed);
                            } catch (e) {
                                reject(new Error("Failed to parse news JSON"));
                            }
                        } else {
                            reject(new Error(`HTTP ${response.statusCode}`));
                        }
                    });
                });
                request.on("error", (error) => {
                    reject(error);
                });
                request.end();
            });
        } catch (error) {
            console.error("News fetch error:", error);
            // Return empty array on error to keep UI stable
            return [];
        }
    });

    // MyFxBook Cache
    let cachedMyFxBookData: any = null;
    let lastMyFxBookFetchTime: number = 0;

    ipcMain.handle("news:getMyFxBook", async () => {
        try {
            // Cache check (1 hour)
            if (cachedMyFxBookData && (Date.now() - lastMyFxBookFetchTime < CACHE_DURATION)) {
                return cachedMyFxBookData;
            }

            return new Promise((resolve, _reject) => {
                const { net } = require("electron");
                const request = net.request("https://www.myfxbook.com/rss/forex-economic-calendar-events");
                request.setHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

                request.on("response", (response) => {
                    let data = "";
                    response.on("data", (chunk) => {
                        data += chunk;
                    });
                    response.on("end", () => {
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            try {
                                const parsed: any[] = [];
                                // Simple Regex Parse for RSS items
                                // <item> ... </item>
                                const itemRegex = /<item>([\s\S]*?)<\/item>/g;
                                let match;
                                while ((match = itemRegex.exec(data)) !== null) {
                                    const content = match[1];
                                    const titleMatch = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(content);
                                    const descMatch = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/.exec(content);
                                    const dateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(content);

                                    if (titleMatch && descMatch) {
                                        const fullTitle = titleMatch[1];
                                        const description = descMatch[1];

                                        parsed.push({
                                            title: fullTitle,
                                            description: description, // Contains the HTML table
                                            date: dateMatch ? dateMatch[1] : "", // pubDate
                                            country: "", // Will extract in frontend
                                            impact: "Medium" // Placeholder
                                        });
                                    }
                                }

                                cachedMyFxBookData = parsed;
                                lastMyFxBookFetchTime = Date.now();
                                resolve(parsed);
                            } catch (e) {
                                resolve([]); // Fail safe
                            }
                        } else {
                            resolve([]);
                        }
                    });
                });
                request.on("error", () => {
                    resolve([]);
                });
                request.end();
            });
        } catch (error) {
            console.error("MyFxBook fetch error:", error);
            return [];
        }
    });

    // MT5 Analysis
    ipcMain.handle("mt5:getSummary", async (_event, params) => {
        // params: { dateFrom, dateTo }
        return await runMt5Summary(params);
    });

    // --- Backup & Restore ---
    ipcMain.handle("backup:export", async (_event, localStorageData) => {
        return await exportAllData(localStorageData);
    });

    ipcMain.handle("backup:import", async (_event) => {
        return await importAllData();
    });



    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

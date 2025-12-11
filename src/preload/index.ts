// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";

export type Direction = "Long" | "Short";
export type ReviewStatus = "Reviewed" | "Pending";

export interface Trade {
    id: string;
    date: string;
    symbol: string;
    dir: Direction;
    resultR: number;
    time: string;
    status: ReviewStatus;
}

const tjApi = {
    async getAllTrades(): Promise<Trade[]> {
        return ipcRenderer.invoke("trades:getAll");
    },
    async addTrade(trade: Trade): Promise<void> {
        await ipcRenderer.invoke("trades:add", trade);
    },
    async getTradesForMonth(year: number, monthIndex0: number): Promise<Trade[]> {
        return ipcRenderer.invoke("trades:getForMonth", year, monthIndex0);
    },
};

contextBridge.exposeInMainWorld("tjApi", tjApi);

// Morning MTF IPC bridge
const api = {
    morningMtf: {
        getForDate: (date: string) => ipcRenderer.invoke('morningMtf:getForDate', date),
        saveForDate: (snapshot: any) => ipcRenderer.invoke('morningMtf:saveForDate', snapshot),
        getForMonth: (year: number, month: number) => ipcRenderer.invoke('morningMtf:getForMonth', { year, month })
    },
    eodApi: {
        getForDate: (date: string) => ipcRenderer.invoke('eod:getForDate', date),
        saveForDate: (date: string, data: any) => ipcRenderer.invoke('eod:saveForDate', { date, data }),
        getForMonth: (yyyyMM: string) => ipcRenderer.invoke('eod:getForMonth', yyyyMM)
    },
    trades: {
        getForMonth: (year: number, month: number) => ipcRenderer.invoke("trades:getForMonth", year, month),
        getAll: () => ipcRenderer.invoke("trades:getAll"),
        add: (trade: any) => ipcRenderer.invoke("trades:add", trade)
    },
    morning: { // This seems to be the new 'journalMorning'
        getDay: (date: string) => ipcRenderer.invoke("journal:morning:getDay", date),
        saveDay: (snapshot: any) => ipcRenderer.invoke("journal:morning:saveDay", snapshot),
        listDays: () => ipcRenderer.invoke("journal:morning:listDays"),
    },
    news: {
        getThisWeek: () => ipcRenderer.invoke("news:getThisWeek"),
    },
    mt5: {
        getSummary: (params: any) => ipcRenderer.invoke("mt5:getSummary", params), // { dateFrom, dateTo }
    },
    backup: {
        exportData: (localStorageData: any) => ipcRenderer.invoke("backup:export", localStorageData),
        importData: () => ipcRenderer.invoke("backup:import"),
    },
    dashboard: {
        getSummary: () => ipcRenderer.invoke("dashboard:getSummary"),
    },
    mt5Api: {
        getSummary: (params?: { dateFrom?: string; dateTo?: string }) => {
            return ipcRenderer.invoke("mt5:getSummary", params ?? {});
        },
    }
};

if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('api', api) // expose our consolidated 'api'
        // Legacy exposures if needed, or keeping them for now
        contextBridge.exposeInMainWorld('tjApi', api.trades)
        contextBridge.exposeInMainWorld('journalMorning', api.morning)
        contextBridge.exposeInMainWorld('mt5Api', api.mt5Api)
        // expose eod? api.eodApi is available under window.api.eodApi
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    window.api = api
    // @ts-ignore
    window.tjApi = api.trades
    // @ts-ignore
    window.journalMorning = api.morning
    // @ts-ignore
    window.mt5Api = api.mt5Api
}

export type TjApi = typeof tjApi;

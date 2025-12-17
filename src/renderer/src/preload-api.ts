import type { Trade } from "../../preload";
import type {
    MorningMtfDaySnapshot,
} from "../../shared/morningMtfTypes";
import type { EODReview } from '../../shared/eodTypes';

export const tjApi = window.tjApi;
export type { Trade };

export interface MorningMtfApi {
    getForDate(date: string): Promise<MorningMtfDaySnapshot | null>;
    saveForDate(snapshot: MorningMtfDaySnapshot): Promise<void>;
    deleteForDate(date: string): Promise<void>;
    getForMonth(year: number, month: number): Promise<MorningMtfDaySnapshot[]>;
}

export interface EODApi {
    getForDate(date: string): Promise<EODReview | null>;
    saveForDate(date: string, data: EODReview): Promise<void>;
    getForMonth(yyyyMM: string): Promise<EODReview[]>;
}

export interface NewsApi {
    getThisWeek(): Promise<import("./types/news").FxNewsItem[]>;
}

export interface BackupApi {
    exportData(localStorageData: Record<string, any>): Promise<{ success: boolean; path?: string; error?: string }>;
    importData(): Promise<{ success: boolean; localStorage?: Record<string, any>; error?: string }>;
}

export interface Api {
    trades: {
        getForMonth(year: number, month: number): Promise<Trade[]>;
        getAll(): Promise<Trade[]>;
        add(trade: any): Promise<void>;
    };
    morningMtf: MorningMtfApi;
    eodApi: EODApi;
    news: NewsApi;
    backup: BackupApi;
    dashboard: {
        getSummary(): Promise<any>;
    };
    auth: {
        setItem(key: string, value: string): Promise<void>;
        getItem(key: string): Promise<string | null>;
        removeItem(key: string): Promise<void>;
    };
}

declare global {
    interface Window {
        api: Api;
    }
}


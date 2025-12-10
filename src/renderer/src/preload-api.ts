import type { TjApi, Trade } from "../../preload";
import type {
    MorningMtfDaySnapshot,
} from "../../shared/morningMtfTypes";
import type { EODReview } from '../../shared/eodTypes';

export const tjApi = window.tjApi;
export type { Trade };

export interface MorningMtfApi {
    getForDate(date: string): Promise<MorningMtfDaySnapshot | null>;
    saveForDate(snapshot: MorningMtfDaySnapshot): Promise<void>;
    getForMonth(year: number, month: number): Promise<MorningMtfDaySnapshot[]>;
}

export interface EODApi {
    getForDate(date: string): Promise<EODReview | null>;
    saveForDate(date: string, data: EODReview): Promise<void>;
    getForMonth(yyyyMM: string): Promise<EODReview[]>;
}

export interface Api {
    trades: {
        getForMonth(year: number, month: number): Promise<Trade[]>;
        getAll(): Promise<Trade[]>;
        add(trade: any): Promise<void>;
    };
    morningMtf: MorningMtfApi;
    eodApi: EODApi;
}

declare global {
    interface Window {
        api: Api;
    }
}


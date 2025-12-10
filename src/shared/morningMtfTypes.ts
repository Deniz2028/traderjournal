// src/shared/morningMtfTypes.ts

export type MorningMtfBias = "long" | "short" | "neutral";

// Sadece ihtiyaç duydukça genişlet
export type MorningMtfTimeframeId = "4H" | "1H" | "15M" | "5M" | "1M";

export interface MorningMtfTimeframeSnapshot {
    tf: MorningMtfTimeframeId;
    chartUrl: string;
    bias: MorningMtfBias;
    notes: string;
}

export interface MorningMtfInstrumentSnapshot {
    symbol: string; // Örn: "XAUUSD"
    dailyBias: MorningMtfBias;
    timeframes: MorningMtfTimeframeSnapshot[];
}

export interface MorningMtfDaySnapshot {
    date: string; // YYYY-MM-DD
    instruments: MorningMtfInstrumentSnapshot[];
}

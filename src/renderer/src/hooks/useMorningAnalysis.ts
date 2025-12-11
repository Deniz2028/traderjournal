import { useEffect, useState } from 'react';

export type Bias = 'bull' | 'neutral' | 'bear';

export interface MorningAnalysisEntry {
    symbol: string;            // e.g. "DXY", "XAUUSD", "EURUSD"
    date: string;              // ISO date "YYYY-MM-DD"
    chartLink: string;
    notes: string;
    bias: Bias;
}

interface UseMorningAnalysisResult {
    entries: MorningAnalysisEntry[];
    getEntry: (symbol: string, date: string) => MorningAnalysisEntry | undefined;
    upsertEntry: (entry: MorningAnalysisEntry) => void;
}

const STORAGE_KEY = 'trade_journal_morning_analysis_v1';

export function useMorningAnalysis(_currentDateISO: string): UseMorningAnalysisResult {
    const [entries, setEntries] = useState<MorningAnalysisEntry[]>([]);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as MorningAnalysisEntry[];
            setEntries(parsed);
        } catch (e) {
            console.error('Failed to load morning analysis from storage', e);
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        } catch (e) {
            console.error('Failed to save morning analysis to storage', e);
        }
    }, [entries]);

    const getEntry = (symbol: string, date: string): MorningAnalysisEntry | undefined =>
        entries.find(e => e.symbol === symbol && e.date === date);

    const upsertEntry = (entry: MorningAnalysisEntry) => {
        setEntries(prev => {
            const idx = prev.findIndex(
                e => e.symbol === entry.symbol && e.date === entry.date
            );
            if (idx === -1) return [...prev, entry];
            const copy = [...prev];
            copy[idx] = entry;
            return copy;
        });
    };

    return { entries, getEntry, upsertEntry };
}

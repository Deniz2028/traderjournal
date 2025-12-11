// src/renderer/src/types/advanced.ts

export interface EquityPoint {
    time: string;    // ISO string
    balance: number; // cumulative profit
    profit: number;  // trade profit
}

export interface DrawdownPoint {
    time: string;     // ISO string
    drawdown: number; // max peak - balance
}

export interface SymbolStat {
    symbol: string;
    trades: number;
    profit: number;
    winrate: number;
}

export interface SessionStat {
    session: string;
    trades: number;
    profit: number;
    winrate: number;
}

export interface HourStat {
    hour: number;     // 0-23
    trades: number;
    profit: number;
    winrate: number;
}

export interface WeekdayStat {
    weekday: number;  // 0 = Monday
    name: string;     // "Mon" ..."Sun"
    trades: number;
    profit: number;
    winrate: number;
}

export interface Mt5Summary {
    totalTrades: number;
    wins: number;
    losses: number;
    winrate: number;
    avgWinMoney: number;
    avgLossMoney: number;
    expectancyMoney: number;
    maxDrawdownMoney: number;

    equityCurve: EquityPoint[];
    drawdownCurve: DrawdownPoint[];

    symbols: SymbolStat[];
    sessions: SessionStat[];
    hours: HourStat[];
    weekdays: WeekdayStat[];

    longestWinStreak: number;
    longestLossStreak: number;

    useDummy?: boolean; // Python'dan gelirse Mac/demo modu
}

export interface Mt5SummaryResponse {
    ok: boolean;
    hasData?: boolean;
    message?: string;
    error?: string;
    summary?: Mt5Summary | null;
    useDummy?: boolean;
}

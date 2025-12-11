export interface EquityPoint {
    time: string;    // ISO string
    balance: number; // cumulative profit
    profit: number;  // trade profit
}

export interface SymbolStat {
    symbol: string;
    trades: number;
    profit: number;
    winrate: number;
}

export interface Mt5Summary {
    totalTrades: number;
    wins: number;
    losses: number;
    winrate: number;
    avgWin: number;
    avgLoss: number;
    expectancy: number;
    maxDrawdown: number;
    equityCurve: EquityPoint[];
    symbols: SymbolStat[];
}

export interface Mt5SummaryResponse {
    ok: boolean;
    hasData?: boolean;
    message?: string;
    error?: string;
    summary?: Mt5Summary | null;
}

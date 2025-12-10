export interface EODReview {
    date: string;          // YYYY-MM-DD
    dayDirection: "up" | "down" | "chop" | null;
    tradeSummary: {
        longCount: number;
        shortCount: number;
    };
    realDayBias: string;
    diary: string;
}

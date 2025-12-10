export type Direction = "Long" | "Short";
export type ReviewStatus = "Reviewed" | "Pending";

export interface Trade {
    id: string;          // unique id (uuid string)
    date: string;        // ISO date string, e.g. "2025-12-10"
    symbol: string;
    dir: Direction;
    resultR: number;     // result in R (1.5, -0.5, etc.)
    time: string;        // e.g. "09:30"
    status: ReviewStatus;
}
// --- Morning analysis shared types ---

export type Bias = "Long" | "Neutral" | "Short";

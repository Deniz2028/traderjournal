export type CurrencyCode = "USD" | "EUR" | "GBP" | "Other";

export type AchievementType = "account" | "payout";

export type EvaluationPhase = "Phase 1" | "Phase 2" | "Funded";
export type PhaseStatus = "Ongoing" | "Passed" | "Failed";

// Legacy support: "Phase 1" | "Phase 2" | "Funded" | "Lost"
export type AccountStatus = "Phase 1" | "Phase 2" | "Funded" | "Lost" | "Ongoing" | "Passed" | "Failed"; // Extended for safe parsing

export interface Achievement {
    id: string;
    type: AchievementType;

    // Common
    firm: string;
    date?: string;
    currency: CurrencyCode;
    notes?: string;

    // For Account
    title: string;
    accountSize: number;

    // New Fields
    phase?: EvaluationPhase;
    status?: PhaseStatus; // Replacing legacy 'status' concept which mixed phase/result

    // For Payout
    payoutAmount?: number;
    imageUrl?: string;
}

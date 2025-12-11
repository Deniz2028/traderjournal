export type CurrencyCode = "USD" | "EUR" | "GBP" | "Other";

export type AchievementType = "account" | "payout";

export type AccountStatus = "Phase 1" | "Phase 2" | "Funded" | "Lost";

export interface Achievement {
    id: string;
    type: AchievementType;

    // Common
    firm: string;
    date?: string;
    currency: CurrencyCode;
    notes?: string;

    // For Account
    title: string; // e.g. "200k Challenge"
    accountSize: number;
    status: AccountStatus;

    // For Payout
    payoutAmount?: number;
    imageUrl?: string;
}

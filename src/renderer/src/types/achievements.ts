// src/renderer/src/types/achievements.ts

export type CurrencyCode = "USD" | "EUR" | "GBP" | "Other";

export interface Achievement {
    id: string;          // örn. timestamp veya uuid string
    firm: string;        // Prop firm / broker adı (örn. "FTMO")
    title: string;       // Kısa başlık (örn. "200k Challenge Passed")
    accountSize: number; // Funded account büyüklüğü (ör: 200000)
    payout: number;      // Payout miktarı (ör: 3500)
    currency: CurrencyCode;
    date?: string;       // opsiyonel "2025-12-11"
    imageUrl?: string;   // Payout / sertifika PNG ya da JPG URL
    notes?: string;      // kısa not (opsiyonel)
}

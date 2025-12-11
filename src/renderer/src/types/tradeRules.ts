export interface TradeRule {
    id: string;        // örn. timestamp veya uuid
    text: string;      // Kural metni (örn. "Max 1R per trade")
    isActive: boolean; // EOD checklist'te kullanılacak mı? (v2'de)
}

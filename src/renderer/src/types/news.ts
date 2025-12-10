export type FxImpact = "Low" | "Medium" | "High" | "Holiday" | string;

export interface FxNewsItem {
    title: string;
    country: string; // USD, EUR, GBP...
    date: string;    // ISO string from ForexFactory
    impact: FxImpact;
    forecast: string;
    previous: string;
}

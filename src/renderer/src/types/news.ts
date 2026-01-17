export type FxImpact = "Low" | "Medium" | "High" | "Holiday" | string;

export interface FxNewsItem {
    title: string;
    country: string; // USD, EUR, GBP...
    date: string;    // ISO string from ForexFactory
    impact: FxImpact;
    forecast: string;
    previous: string;
}

export interface MyFxBookItem {
    title: string;
    date: string; // "YYYY-MM-DD HH:mm" usually or parseable string
    country: string;
    impact: "Low" | "Medium" | "High" | "Holiday" | string;
    description: string; // The RSS description usually contains "Vol., Actual, Consensus, Previous"
}

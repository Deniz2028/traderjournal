export { };

declare global {
    interface Window {
        mt5Api: {
            getSummary: (params?: { dateFrom?: string; dateTo?: string }) => Promise<any>;
        };
    }
}

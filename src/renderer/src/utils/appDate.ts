export const STORAGE_KEY_SIM_DATE = "tj_sim_date";

/**
 * Returns the "current" date for the app.
 * If a simulation date is set in localStorage, returns that.
 * Otherwise returns the real system date.
 * Returns in YYYY-MM-DD format.
 */
export const getAppToday = (): string => {
    const sim = localStorage.getItem(STORAGE_KEY_SIM_DATE);
    if (sim) {
        return sim;
    }
    const today = new Date();
    // Local date string YYYY-MM-DD
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

export const setAppToday = (dateStr: string | null) => {
    if (dateStr) {
        localStorage.setItem(STORAGE_KEY_SIM_DATE, dateStr);
    } else {
        localStorage.removeItem(STORAGE_KEY_SIM_DATE);
    }
    // We might need to reload or trigger an event, but for now specific components will just read it.
};

export const isSimulationMode = (): boolean => {
    return !!localStorage.getItem(STORAGE_KEY_SIM_DATE);
};

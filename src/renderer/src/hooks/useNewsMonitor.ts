import { useState, useEffect } from "react";

interface NewsAlertState {
    hasAlert: boolean;
    countdown: string | null; // "MM:SS"
    nextEventTitle: string | null;
}

export function useNewsMonitor(): NewsAlertState {
    const [state, setState] = useState<NewsAlertState>({
        hasAlert: false,
        countdown: null,
        nextEventTitle: null
    });

    const [newsData, setNewsData] = useState<any[]>([]);

    useEffect(() => {
        let mounted = true;

        async function fetchNews() {
            try {
                const data = await window.api.news.getThisWeek();
                if (mounted && data) {
                    setNewsData(data);
                }
            } catch (error) {
                console.error("News monitor fetch failed", error);
            }
        }

        fetchNews();
        // Poll infrequently (e.g. every 1 hour)
        const fetchInterval = setInterval(fetchNews, 60 * 60 * 1000);

        return () => {
            mounted = false;
            clearInterval(fetchInterval);
        };
    }, []);

    useEffect(() => {
        if (!newsData.length) return;

        const checkAlerts = () => {
            const now = Date.now();
            const fiveMins = 5 * 60 * 1000;

            // Filter for upcoming High Impact USD/EUR events
            const upcoming = newsData.map(raw => {
                const dt = new Date(raw.date);
                return { ...raw, timestamp: dt.getTime() };
            }).filter(n => {
                if (isNaN(n.timestamp)) return false;
                if (n.impact !== "High" && n.impact !== "Medium") return false;
                if (n.country !== "USD" && n.country !== "EUR") return false;
                const diff = n.timestamp - now;
                return diff > 0 && diff <= fiveMins;
            }).sort((a, b) => a.timestamp - b.timestamp);

            const next = upcoming[0];
            if (next) {
                const diff = next.timestamp - now;
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                const cd = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                setState({ hasAlert: true, countdown: cd, nextEventTitle: next.title });
            } else {
                setState({ hasAlert: false, countdown: null, nextEventTitle: null });
            }
        };

        checkAlerts();
        const timer = setInterval(checkAlerts, 1000);
        return () => clearInterval(timer);
    }, [newsData]);

    return state;
}

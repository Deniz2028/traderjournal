import { useState, useEffect } from "react";
import type { FxNewsItem } from "../types/news";

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

    useEffect(() => {
        let mounted = true;

        async function checkNews() {
            try {
                // Fetch cached news from main process
                const data = await window.api.news.getThisWeek();
                const now = Date.now();
                const fiveMins = 5 * 60 * 1000;

                // Filter for upcoming High Impact USD/EUR events
                const upcoming = data.map(raw => {
                    const dt = new Date(raw.date);
                    return {
                        ...raw,
                        timestamp: dt.getTime()
                    };
                }).filter(n => {
                    // Valid date
                    if (isNaN(n.timestamp)) return false;

                    // High impact only
                    if (n.impact !== "High" && n.impact !== "Medium") return false;
                    // Let's stick to High/Medium like NewsPanel, or maybe just High? 
                    // User said "habere 5 dk kala". Usually implies High. 
                    // Let's match NewsPanel's "Important": High/Medium and USD/EUR.
                    if (n.impact !== "High" && n.impact !== "Medium") return false;
                    if (n.country !== "USD" && n.country !== "EUR") return false;

                    // Future but close?
                    // We want to alert if it is within the next 5 minutes.
                    // Or if it's running right now (up to 0).
                    const diff = n.timestamp - now;
                    return diff > 0 && diff <= fiveMins;
                }).sort((a, b) => a.timestamp - b.timestamp);

                const next = upcoming[0];

                if (next && mounted) {
                    const diff = next.timestamp - now;
                    const mins = Math.floor(diff / 60000);
                    const secs = Math.floor((diff % 60000) / 1000);
                    const cd = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

                    setState({
                        hasAlert: true,
                        countdown: cd,
                        nextEventTitle: next.title
                    });
                } else if (mounted) {
                    setState({
                        hasAlert: false,
                        countdown: null,
                        nextEventTitle: null
                    });
                }

            } catch (error) {
                console.error("News monitor failed", error);
            }
        }

        // Check immediately
        checkNews();

        // Check every second for countdown precision
        const interval = setInterval(checkNews, 1000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    return state;
}

import React, { useEffect, useState } from "react";
import type { FxNewsItem } from "../types/news";

// FF JSON source
const FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

interface NormalizedNewsItem {
    id: string;
    time: string;      // "08:30"
    dateKey: string;   // "YYYY-MM-DD" (local)
    currency: string;  // USD / EUR / ...
    title: string;
    impact: "Low" | "Medium" | "High" | "Holiday" | string;
    forecast?: string;
    previous?: string;
    timestamp: number; // For time comparison
}

function getLocalDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatLocalTime(d: Date): string {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function normalizeItem(raw: FxNewsItem, idx: number): NormalizedNewsItem | null {
    try {
        const dt = new Date(raw.date);
        if (isNaN(dt.getTime())) return null;

        return {
            id: `${raw.country}-${idx}-${raw.title}`,
            time: formatLocalTime(dt),
            dateKey: getLocalDateKey(dt),
            currency: raw.country,
            title: raw.title,
            impact: raw.impact,
            forecast: raw.forecast,
            previous: raw.previous,
            timestamp: dt.getTime(),
        };
    } catch {
        return null;
    }
}

function impactColor(impact: string): string {
    if (impact === "High") return "#DC2626"; // red
    if (impact === "Medium") return "#F97316"; // orange
    if (impact === "Low") return "#9CA3AF"; // gray
    return "#6B7280";
}

export const NewsPanel: React.FC = () => {
    const [items, setItems] = useState<NormalizedNewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now());

    // Timer to update 'now' every 30 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    // Notification Logic
    useEffect(() => {
        // Request permission if not granted
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }

        const MIN_MS = 60 * 1000;

        // Check for upcoming events
        // Criteria: High/Medium impact, 5 mins before (window of 4-5 mins to avoid duplicates or misses)
        items.forEach(item => {
            // Only notify for High/Medium impact USD/EUR (Important ones)
            if (item.impact !== "High" && item.impact !== "Medium") return;
            if (item.currency !== "USD" && item.currency !== "EUR") return;

            const diff = item.timestamp - now;
            // Notify if between 4.5 and 5.5 minutes (approx 5 mins)
            // This relies on the 30s polling interval to catch it once.
            // A safer way is to mark notified IDs, but let's try a tight window first with 30s poll.
            if (diff > 4 * MIN_MS && diff <= 5 * MIN_MS) {
                // Check if we already notified this specific ID to avoid spam (simple in-memory check?)
                // Since 'items' changes rarely, we can just rely on the window. 
                // However, re-renders might re-trigger if 'now' updates. 
                // A ref for notified IDs is better.
                sendNotification(item);
            }
        });
    }, [now, items]);

    const notifiedRef = React.useRef<Set<string>>(new Set());

    const sendNotification = (item: NormalizedNewsItem) => {
        if (notifiedRef.current.has(item.id)) return;

        if (Notification.permission === "granted") {
            new Notification(`Upcoming News: ${item.currency}`, {
                body: `${item.title} (${item.impact}) in 5 minutes!`,
            });
            notifiedRef.current.add(item.id);
        }
    };

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError(null);

                // Use IPC bridge instead of direct fetch
                const data = await window.api.news.getThisWeek();

                const normalized: NormalizedNewsItem[] = [];
                data.forEach((raw, idx) => {
                    const n = normalizeItem(raw, idx);
                    if (n) normalized.push(n);
                });

                const todayKey = getLocalDateKey(new Date());
                const todays = normalized.filter((n) => n.dateKey === todayKey);

                if (!cancelled) {
                    setItems(todays);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(
                        err?.message
                            ? `Could not load news: ${err.message}`
                            : "Could not load news."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const important = items.filter(
        (n) =>
            n.impact === "High" &&
            (n.currency === "USD" || n.currency === "EUR")
    );

    // Style helper for past events
    const getRowStyle = (timestamp: number) => {
        const isPast = timestamp < now;
        return {
            opacity: isPast ? 0.5 : 1,
            textDecoration: isPast ? "line-through" : "none",
            transition: "all 0.3s ease",
        };
    };

    // Check for FOMC
    const hasFomc = items.some(n =>
        n.currency === "USD" &&
        n.impact === "High" &&
        (
            n.title.includes("FOMC") ||
            n.title.includes("Federal Funds Rate") ||
            n.title.includes("Fed Chair")
        )
    );

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <h1 className="page-title">News</h1>
                <p className="page-subtitle">
                    ForexFactory calendar – today&apos;s macro events
                </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Loading / error state */}
                {loading && (
                    <div className="card" style={{ padding: 16, fontSize: 13 }}>
                        Loading today&apos;s news...
                    </div>
                )}

                {/* FOMC Warning */}
                {!loading && !error && hasFomc && (
                    <div className="card" style={{ padding: 16, border: "1px solid #DC2626", backgroundColor: "#FEF2F2" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ fontSize: 24, lineHeight: 1 }}>🚨</div>
                            <div>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#991B1B", marginBottom: 4 }}>
                                    FOMC / FED EVENT TODAY
                                </h3>
                                <p style={{ fontSize: 13, color: "#B91C1C", fontWeight: 500 }}>
                                    High impact Fed event detected. Market structure may be messy or ranging.
                                    <strong> Avoid trading </strong> or reduce risk significantly.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {error && !loading && (
                    <div
                        className="card"
                        style={{ padding: 16, fontSize: 13, color: "var(--color-red)" }}
                    >
                        {error}
                    </div>
                )}

                {/* Important news – USD & EUR, High impact */}
                {!loading && !error && (
                    <div className="card" style={{ padding: 16 }}>
                        <h3
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                                color: "var(--text-primary)",
                            }}
                        >
                            Important news (USD &amp; EUR)
                        </h3>
                        {important.length === 0 ? (
                            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                There are no high impact USD/EUR events today.
                            </p>
                        ) : (
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                {important.map((n) => (
                                    <li
                                        key={n.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "6px 0",
                                            borderBottom: "1px solid var(--border-subtle)",
                                            ...getRowStyle(n.timestamp),
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 2,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 500,
                                                    color: "var(--text-primary)",
                                                }}
                                            >
                                                {n.time} — {n.currency} — {n.title}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    color: "var(--text-secondary)",
                                                }}
                                            >
                                                Forecast: {n.forecast || "-"} | Previous:{" "}
                                                {n.previous || "-"}
                                            </span>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                padding: "4px 8px",
                                                borderRadius: 999,
                                                border: `1px solid ${impactColor(n.impact)}`,
                                                color: impactColor(n.impact),
                                            }}
                                        >
                                            {n.impact}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* All news for today */}
                {!loading && !error && (
                    <div className="card" style={{ padding: 16 }}>
                        <h3
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                                color: "var(--text-primary)",
                            }}
                        >
                            Today – all news
                        </h3>

                        {items.length === 0 ? (
                            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                There are no events today in the ForexFactory calendar feed.
                            </p>
                        ) : (
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: 13,
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            borderBottom: "1px solid var(--border-subtle)",
                                            backgroundColor: "#F9FAFB",
                                        }}
                                    >
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: "8px 8px",
                                                fontWeight: 600,
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            Time
                                        </th>
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: "8px 8px",
                                                fontWeight: 600,
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            Curr.
                                        </th>
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: "8px 8px",
                                                fontWeight: 600,
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            Event
                                        </th>
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: "8px 8px",
                                                fontWeight: 600,
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            Impact
                                        </th>
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: "8px 8px",
                                                fontWeight: 600,
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            Forecast / Prev.
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((n) => (
                                        <tr
                                            key={n.id}
                                            style={{
                                                borderBottom: "1px solid var(--border-subtle)",
                                                ...getRowStyle(n.timestamp),
                                            }}
                                        >
                                            <td style={{ padding: "6px 8px" }}>{n.time}</td>
                                            <td style={{ padding: "6px 8px" }}>{n.currency}</td>
                                            <td style={{ padding: "6px 8px" }}>{n.title}</td>
                                            <td style={{ padding: "6px 8px" }}>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: "2px 6px",
                                                        borderRadius: 999,
                                                        border: `1px solid ${impactColor(n.impact)}`,
                                                        color: impactColor(n.impact),
                                                    }}
                                                >
                                                    {n.impact}
                                                </span>
                                            </td>
                                            <td style={{ padding: "6px 8px", fontSize: 11 }}>
                                                {n.forecast || "-"} / {n.previous || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

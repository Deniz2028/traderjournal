import React, { useEffect, useState } from "react";
import type { FxNewsItem, MyFxBookItem } from "../types/news";

// FF JSON source

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

// Helper to normalize FF items
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

// MyFxBook Helper
// Returns clean impact and country from title/desc if possible
function processMyFxBookItem(raw: MyFxBookItem, idx: number): NormalizedNewsItem | null {
    try {
        // Raw date is usually like "Thu, 19 Dec 2024 14:30:00 GMT" or similar
        const dt = new Date(raw.date);
        if (isNaN(dt.getTime())) return null;

        // Extract Country from Title: "USD - GDP" or "GDP (USD)"
        // Common format in RSS: "Currency: Event" e.g. "USD: Initial Jobless Claims"
        let country = "ALL";
        let title = raw.title;

        if (raw.title.includes(":")) {
            const parts = raw.title.split(":");
            if (parts.length > 1) {
                country = parts[0].trim().toUpperCase();
                title = parts.slice(1).join(":").trim();
            }
        }

        // Impact detection from Description HTML
        // Very rudimentary: Check keywords. MyFxBook impact isn't always clear in text.
        // But often they have "High", "Medium", "Low" in the table? 
        // Actually, without parsing the graphic in RSS, we might guess.
        // For now, let's default to "Medium" unless we find keywords.
        // OR better: Just display what we have.
        // User requested: "sap üste bi böyle açılır kapanır bişi yap sağ tarafa fx factory koy sol tarafa myfxbook koy"

        let impact = "Medium";
        if (raw.description.includes("High Impact")) impact = "High";
        if (raw.description.includes("Low Impact")) impact = "Low";

        return {
            id: `mfb-${idx}`,
            time: formatLocalTime(dt),
            dateKey: getLocalDateKey(dt),
            currency: country,
            title: title,
            impact: impact,
            forecast: "-",
            previous: "-",
            timestamp: dt.getTime()
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

type NewsSource = "ff" | "mfb";

export const NewsPanel: React.FC = () => {
    const [ffItems, setFfItems] = useState<NormalizedNewsItem[]>([]);
    const [mfbItems, setMfbItems] = useState<NormalizedNewsItem[]>([]);

    const [source, setSource] = useState<NewsSource>("ff");

    const [loading, setLoading] = useState(true);
    // const [error, setError] = useState<string | null>(null); // Removed since we handle errors locally/silently
    const [now, setNow] = useState(Date.now());

    // Timer to update 'now' every 30 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            // setError(null); // Removed

            const todayKey = getLocalDateKey(new Date());
            const newFfItems: NormalizedNewsItem[] = [];
            const newMfbItems: NormalizedNewsItem[] = [];

            // 1. ForexFactory
            try {
                // @ts-ignore
                const ffData = await window.api.news.getThisWeek();
                if (Array.isArray(ffData)) {
                    ffData.forEach((raw, idx) => {
                        const n = normalizeItem(raw, idx);
                        if (n && n.dateKey === todayKey) newFfItems.push(n);
                    });
                }
            } catch (e) {
                console.warn("FF Fetch Error", e);
                // Don't fail everything if FF fails
            }

            // 2. MyFxBook
            try {
                // @ts-ignore
                const mfbData: MyFxBookItem[] = await window.api.news.getMyFxBook();
                if (Array.isArray(mfbData)) {
                    mfbData.forEach((raw, idx) => {
                        const n = processMyFxBookItem(raw, idx);
                        if (n && n.dateKey === todayKey) {
                            if (["USD", "EUR", "GBP", "JPY"].includes(n.currency)) {
                                newMfbItems.push(n);
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn("MFB Fetch Error", e);
                // Don't fail everything if MFB fails
            }

            // Sort
            newFfItems.sort((a, b) => a.timestamp - b.timestamp);
            newMfbItems.sort((a, b) => a.timestamp - b.timestamp);

            if (!cancelled) {
                setFfItems(newFfItems);
                setMfbItems(newMfbItems);
                setLoading(false);

                // Only set error if BOTH failed to show anything (or truly empty day)
                // But we can just leave it empty. The "No events found" message handles this.
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    // Style helper for past events
    const getRowStyle = (timestamp: number) => {
        const isPast = timestamp < now;
        return {
            opacity: isPast ? 0.5 : 1,
            textDecoration: isPast ? "line-through" : "none",
            transition: "all 0.3s ease",
        };
    };

    const activeItems = source === "ff" ? ffItems : mfbItems;
    const sourceName = source === "ff" ? "ForexFactory" : "MyFxBook";

    // Important news filter (for the separate card if we keep it, but user said "just toggle")
    // Let's just keep the single list view.

    // BUT we might want to highlight important ones?
    // Let's stick to the list view as requested.

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 className="page-title">News</h1>
                    <p className="page-subtitle">
                        Today&apos;s macro events from {sourceName}
                    </p>
                </div>

                {/* Toggle Switch - Enhanced Segmented Control Style */}
                <div style={{
                    display: "flex",
                    backgroundColor: "#E5E7EB", // Gray-200 like
                    padding: 4,
                    borderRadius: 8,
                    gap: 2
                }}>
                    <button
                        onClick={() => setSource("ff")}
                        style={{
                            padding: "6px 16px",
                            borderRadius: 6,
                            border: "none",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            backgroundColor: source === "ff" ? "#FFFFFF" : "transparent",
                            color: source === "ff" ? "#111827" : "#6B7280", // Dark text if active, gray if not
                            boxShadow: source === "ff" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.2s ease"
                        }}
                    >
                        ForexFactory
                    </button>
                    <button
                        onClick={() => setSource("mfb")}
                        style={{
                            padding: "6px 16px",
                            borderRadius: 6,
                            border: "none",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            backgroundColor: source === "mfb" ? "#FFFFFF" : "transparent",
                            color: source === "mfb" ? "#111827" : "#6B7280",
                            boxShadow: source === "mfb" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.2s ease"
                        }}
                    >
                        MyFxBook
                    </button>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {loading && (
                    <div className="card" style={{ padding: 16, fontSize: 13 }}>
                        Loading calendars...
                    </div>
                )}

                {/* Remove generic error block since we handle per-source or empty list below */}

                {!loading && (
                    <div className="card" style={{ padding: 16 }}>
                        {activeItems.length === 0 ? (
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
                                No events found for {sourceName} today.
                            </p>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}>
                                        <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600, color: "var(--text-secondary)" }}>Time</th>
                                        <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600, color: "var(--text-secondary)" }}>Curr.</th>
                                        <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600, color: "var(--text-secondary)" }}>Event</th>
                                        <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600, color: "var(--text-secondary)" }}>Impact</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeItems.map((n) => (
                                        <tr key={n.id} style={{ borderBottom: "1px solid var(--border-subtle)", ...getRowStyle(n.timestamp) }}>
                                            <td style={{ padding: "8px 8px" }}>{n.time}</td>
                                            <td style={{ padding: "8px 8px", fontWeight: 600 }}>{n.currency}</td>
                                            <td style={{ padding: "8px 8px" }}>{n.title}</td>
                                            <td style={{ padding: "8px 8px" }}>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    padding: "2px 8px",
                                                    borderRadius: 999,
                                                    backgroundColor: impactColor(n.impact) + "20", // 20% opacity bg
                                                    border: `1px solid ${impactColor(n.impact)}`,
                                                    color: impactColor(n.impact),
                                                }}>
                                                    {n.impact}
                                                </span>
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

// src/renderer/src/pages/DashboardPage.tsx
import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from "recharts";
import { loadStore, MtfTrade } from "../utils/journalStorage";


type BiasStatus = "hit" | "miss" | "neutral" | "no-data";

interface DashboardDaySummary {
    date: string;
    label: string;
    totalR: number;
    tradeCount: number;
}

interface BiasHistoryItem {
    date: string;
    morningBias?: "Long" | "Short" | "Neutral";
    dayDirection?: "UP" | "DOWN" | "CHOP";
    status: BiasStatus;
}

interface DashboardRecentTrade {
    id: string;
    date: string;
    symbol: string;
    resultR: number;
}

interface DashboardSummary {
    days: DashboardDaySummary[];
    totalR: number;
    totalTrades: number;
    winrate: number | null;
    avgRPerTrade: number | null;
    biasAccuracy: number | null;
    biasHistory: BiasHistoryItem[];
    recentTrades: DashboardRecentTrade[];
    isDemoMode?: boolean;
}

export const DashboardPage: React.FC = () => {
    const [data, setData] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                if (!window.api?.dashboard?.getSummary) {
                    // API yoksa boş bırak.
                    setLoading(false);
                    return;
                }

                // --- MIGRATION LOGIC START ---
                try {
                    // Check if backend is empty and migration is needed
                    const tradesApi = (window.api as any).trades;
                    if (tradesApi && tradesApi.getAll && tradesApi.add) {
                        const existing = await tradesApi.getAll();
                        if (Array.isArray(existing) && existing.length === 0) {
                            const store = loadStore();
                            const allLegacy = Object.values(store).flat() as MtfTrade[];

                            if (allLegacy.length > 0) {
                                console.log("Migrating legacy trades to backend...", allLegacy.length);
                                for (const t of allLegacy) {
                                    const newTrade = {
                                        id: t.id,
                                        date: t.dateISO,
                                        symbol: t.symbol,
                                        dir: t.tradeBias,
                                        resultR: t.resultR || 0,
                                        time: "12:00",
                                        status: "Reviewed",
                                        outcome: t.outcome
                                    };
                                    await tradesApi.add(newTrade);
                                }
                                console.log("Migration complete.");
                            }
                        }
                    }
                } catch (migErr) {
                    console.error("Migration failed:", migErr);
                }
                // --- MIGRATION LOGIC END ---

                const result = await window.api.dashboard.getSummary();
                if (!cancelled) {
                    setData(result);
                    setLoading(false);
                }
            } catch (e) {
                console.error("Failed to load dashboard summary:", e);
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const weekLabel = "Weekly overview";

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">{weekLabel}</p>
            </div>

            {loading && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Loading summary…
                </p>
            )}

            {!loading && !data && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    No dashboard data yet. Add some trades and EOD reviews.
                </p>
            )}

            {!loading && data && (
                <>
                    {/* Demo Warning */}
                    {data.isDemoMode && (
                        <div className="card" style={{ marginBottom: 24, padding: "12px 16px", backgroundColor: "#FEFCE8", border: "1px solid #FEF08A" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 20 }}>🚧</span>
                                <div>
                                    <strong style={{ fontSize: 13, color: "#854D0E" }}>DEMO MODE: Showing Sample Data</strong>
                                    <p style={{ fontSize: 12, color: "#A16207", margin: 0 }}>
                                        Add at least 2 trades to see your real data.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Top KPI row */}
                    <div style={styles.kpiRow}>
                        <div className="card" style={styles.kpiCard}>
                            <span style={styles.kpiLabel}>Total R (this week)</span>
                            <span
                                style={{
                                    ...styles.kpiValue,
                                    color:
                                        data.totalR > 0
                                            ? "var(--color-green)"
                                            : data.totalR < 0
                                                ? "var(--color-red)"
                                                : "var(--text-primary)",
                                }}
                            >
                                {data.totalR >= 0 ? "+" : ""}
                                {data.totalR.toFixed(2)} R
                            </span>
                        </div>

                        <div className="card" style={styles.kpiCard}>
                            <span style={styles.kpiLabel}>Winrate</span>
                            <span style={styles.kpiValue}>
                                {data.winrate != null ? `${data.winrate.toFixed(1)} %` : "–"}
                            </span>
                        </div>

                        <div className="card" style={styles.kpiCard}>
                            <span style={styles.kpiLabel}>Avg R / trade</span>
                            <span style={styles.kpiValue}>
                                {data.avgRPerTrade != null
                                    ? `${data.avgRPerTrade.toFixed(2)} R`
                                    : "–"}
                            </span>
                        </div>

                        <div className="card" style={styles.kpiCard}>
                            <span style={styles.kpiLabel}>Bias accuracy (last 10 days)</span>
                            <span style={styles.kpiValue}>
                                {data.biasAccuracy != null
                                    ? `${data.biasAccuracy.toFixed(1)} %`
                                    : "–"}
                            </span>
                        </div>
                    </div>

                    {/* Weekly bar row */}
                    <div style={{ marginTop: 24 }}>
                        <h3 style={styles.sectionTitle}>Week by day</h3>
                        <div className="card" style={{ marginBottom: 16, height: 260, padding: "20px 24px" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.days} barSize={32}>
                                    <defs>
                                        <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#22C55E" stopOpacity={0.3} />
                                        </linearGradient>
                                        <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                                    <XAxis
                                        dataKey="label"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                        tick={{ fill: "#6B7280" }}
                                    />
                                    <YAxis
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val}R`}
                                        tick={{ fill: "#6B7280" }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            padding: "8px 12px"
                                        }}
                                        formatter={(value: number) => [<span style={{ fontWeight: 600 }}>{value.toFixed(2)} R</span>, "PnL"]}
                                    />
                                    <ReferenceLine y={0} stroke="#9CA3AF" strokeWidth={1} />
                                    <Bar dataKey="totalR" radius={[6, 6, 0, 0]} animationDuration={1000}>
                                        {data.days.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.totalR >= 0 ? "url(#colorGreen)" : "url(#colorRed)"}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={styles.weekRow}>
                            {data.days.map((day) => (
                                <div key={day.date} className="card" style={styles.dayCard}>
                                    <div style={styles.dayHeader}>
                                        <span style={styles.dayLabel}>{day.label}</span>
                                        <span style={styles.dayDate}>
                                            {day.date.slice(5 /* mm-dd */)}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            ...styles.dayResult,
                                            color:
                                                day.totalR > 0
                                                    ? "var(--color-green)"
                                                    : day.totalR < 0
                                                        ? "var(--color-red)"
                                                        : "var(--text-secondary)",
                                        }}
                                    >
                                        {day.totalR >= 0 ? "+" : ""}
                                        {day.totalR.toFixed(2)} R
                                    </div>
                                    <div style={styles.dayTrades}>
                                        {day.tradeCount} trade{day.tradeCount === 1 ? "" : "s"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bias history strip */}
                    <div style={{ marginTop: 32 }}>
                        <h3 style={styles.sectionTitle}>Bias history (last 10 days)</h3>
                        <div style={styles.biasStrip}>
                            {data.biasHistory.map((item) => (
                                <div key={item.date} style={styles.biasItem}>
                                    <span style={styles.biasDate}>
                                        {item.date.slice(5 /* mm-dd */)}
                                    </span>
                                    <span style={styles.biasDotWrapper}>
                                        <span
                                            style={{
                                                ...styles.biasDot,
                                                backgroundColor: biasStatusColor(item.status),
                                            }}
                                        />
                                    </span>
                                    <span style={styles.biasLabel}>
                                        {item.morningBias ?? "-"} / {item.dayDirection ?? "-"}
                                    </span>
                                </div>
                            ))}
                            {data.biasHistory.length === 0 && (
                                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                    No bias data yet. Save Morning main bias and EOD day
                                    direction to see accuracy here.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Recent trades list */}
                    <div style={{ marginTop: 32 }}>
                        <h3 style={styles.sectionTitle}>Recent trades</h3>
                        <div className="card" style={styles.recentBox}>
                            {data.recentTrades.length === 0 && (
                                <div style={styles.recentRow}>
                                    <span
                                        style={{ fontSize: 13, color: "var(--text-secondary)" }}
                                    >
                                        No trades yet.
                                    </span>
                                </div>
                            )}

                            {data.recentTrades.map((t, idx) => (
                                <div
                                    key={t.id}
                                    style={{
                                        ...styles.recentRow,
                                        borderBottom:
                                            idx === data.recentTrades.length - 1
                                                ? "none"
                                                : "1px solid var(--border-subtle)",
                                    }}
                                >
                                    <div style={styles.recentLeft}>
                                        <span style={styles.recentSymbol}>{t.symbol}</span>
                                        <span style={styles.recentDate}>{t.date}</span>
                                    </div>
                                    <div
                                        style={{
                                            ...styles.recentResult,
                                            color:
                                                t.resultR > 0
                                                    ? "var(--color-green)"
                                                    : t.resultR < 0
                                                        ? "var(--color-red)"
                                                        : "var(--text-secondary)",
                                        }}
                                    >
                                        {t.resultR >= 0 ? "+" : ""}
                                        {t.resultR.toFixed(2)} R
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

function biasStatusColor(status: BiasStatus): string {
    switch (status) {
        case "hit":
            return "#22C55E"; // green
        case "miss":
            return "#EF4444"; // red
        case "neutral":
            return "#9CA3AF"; // gray
        case "no-data":
        default:
            return "#E5E7EB"; // light gray
    }
}

const styles: Record<string, React.CSSProperties> = {
    kpiRow: {
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 16,
    },
    kpiCard: {
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    kpiLabel: {
        fontSize: 12,
        fontWeight: 500,
        color: "var(--text-secondary)",
    },
    kpiValue: {
        fontSize: 20,
        fontWeight: 700,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 600,
        marginBottom: 12,
        color: "var(--text-primary)",
    },
    weekRow: {
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: 16,
    },
    dayCard: {
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    dayHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    dayLabel: {
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        color: "var(--text-secondary)",
    },
    dayDate: {
        fontSize: 11,
        color: "#9CA3AF",
    },
    dayResult: {
        fontSize: 18,
        fontWeight: 700,
    },
    dayTrades: {
        fontSize: 12,
        color: "var(--text-secondary)",
    },
    biasStrip: {
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
    },
    biasItem: {
        display: "flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        backgroundColor: "#F9FAFB",
        border: "1px solid var(--border-subtle)",
        fontSize: 11,
        gap: 6,
    },
    biasDate: {
        fontWeight: 600,
        color: "var(--text-secondary)",
    },
    biasDotWrapper: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    biasDot: {
        width: 10,
        height: 10,
        borderRadius: "999px",
    },
    biasLabel: {
        color: "var(--text-secondary)",
    },
    recentBox: {
        padding: 0,
    },
    recentRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 20px",
    },
    recentLeft: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
    },
    recentSymbol: {
        fontSize: 14,
        fontWeight: 600,
    },
    recentDate: {
        fontSize: 12,
        color: "var(--text-secondary)",
    },
    recentResult: {
        fontSize: 14,
        fontWeight: 600,
    },
};

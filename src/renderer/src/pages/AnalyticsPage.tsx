// src/renderer/src/pages/AnalyticsPage.tsx
import React, { useEffect, useState } from "react";
import { getTrades } from "../utils/tradeStorage";
import type { Trade } from "../types";
import {
    buildDailyPnL,
    buildSymbolStats,
    buildWeekdayStats,
    buildSummary,
} from "../utils/analytics";

export const AnalyticsPage: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([]);

    useEffect(() => {
        // tradeStorage backend ile konuşuyor, buradan okumamız yeterli
        // Fix: getTrades is async, handling promise here
        getTrades().then(all => {
            setTrades(all);
        }).catch(err => {
            console.error("Failed to load trades for analytics:", err);
            setTrades([]);
        });
    }, []);

    const hasData = trades.length > 0;

    const daily = buildDailyPnL(trades);
    const symbols = buildSymbolStats(trades);
    const weekdays = buildWeekdayStats(trades);
    const summary = buildSummary(trades);

    const last10 = daily.slice(-10);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">
                    Performance overview based on your trade history (all R values).
                </p>
            </div>

            {!hasData && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                        You don&apos;t have any stored trades yet. Start by adding trades on
                        the <strong>Daily Journal</strong> page – analytics will update
                        automatically.
                    </p>
                </div>
            )}

            {hasData && (
                <>
                    {/* Top summary row */}
                    <div style={styles.summaryRow}>
                        <div className="card" style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>Total PnL (R)</span>
                            <span
                                style={{
                                    ...styles.summaryValue,
                                    color:
                                        summary.totalR >= 0
                                            ? "var(--color-green)"
                                            : "var(--color-red)",
                                }}
                            >
                                {summary.totalR.toFixed(2)} R
                            </span>
                        </div>

                        <div className="card" style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>Total trades</span>
                            <span style={styles.summaryValue}>{summary.totalTrades}</span>
                        </div>

                        <div className="card" style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>Avg R / trade</span>
                            <span style={styles.summaryValue}>
                                {summary.avgR.toFixed(2)} R
                            </span>
                        </div>

                        <div className="card" style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>Winrate</span>
                            <span style={styles.summaryValue}>
                                {(summary.winRate * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Equity-ish list */}
                    <div className="card" style={{ marginTop: 24 }}>
                        <h3 style={styles.sectionTitle}>Last 10 days – daily &amp; equity</h3>
                        <p style={styles.sectionHint}>
                            Simple table instead of charts for now. Each row shows daily R and
                            cumulative equity.
                        </p>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Date</th>
                                    <th style={styles.th}>Daily R</th>
                                    <th style={styles.th}>Cumulative R</th>
                                </tr>
                            </thead>
                            <tbody>
                                {last10.map((d) => (
                                    <tr key={d.date}>
                                        <td style={styles.td}>{d.date}</td>
                                        <td
                                            style={{
                                                ...styles.td,
                                                color:
                                                    d.totalR >= 0
                                                        ? "var(--color-green)"
                                                        : "var(--color-red)",
                                            }}
                                        >
                                            {d.totalR >= 0 ? "+" : ""}
                                            {d.totalR.toFixed(2)} R
                                        </td>
                                        <td
                                            style={{
                                                ...styles.td,
                                                fontWeight: 600,
                                                color:
                                                    d.cumulativeR >= 0
                                                        ? "var(--color-green)"
                                                        : "var(--color-red)",
                                            }}
                                        >
                                            {d.cumulativeR >= 0 ? "+" : ""}
                                            {d.cumulativeR.toFixed(2)} R
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Symbol performance */}
                    <div className="card" style={{ marginTop: 24 }}>
                        <h3 style={styles.sectionTitle}>Symbol performance</h3>
                        <p style={styles.sectionHint}>
                            How each instrument performs: trades, winrate and total R.
                        </p>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Symbol</th>
                                    <th style={styles.th}>Trades</th>
                                    <th style={styles.th}>Winrate</th>
                                    <th style={styles.th}>Avg R</th>
                                    <th style={styles.th}>Total R</th>
                                </tr>
                            </thead>
                            <tbody>
                                {symbols.map((s) => (
                                    <tr key={s.symbol}>
                                        <td style={styles.td}>{s.symbol}</td>
                                        <td style={styles.td}>{s.trades}</td>
                                        <td style={styles.td}>
                                            {(s.winRate * 100).toFixed(1)}%
                                        </td>
                                        <td style={styles.td}>{s.avgR.toFixed(2)}</td>
                                        <td
                                            style={{
                                                ...styles.td,
                                                fontWeight: 600,
                                                color:
                                                    s.totalR >= 0
                                                        ? "var(--color-green)"
                                                        : "var(--color-red)",
                                            }}
                                        >
                                            {s.totalR >= 0 ? "+" : ""}
                                            {s.totalR.toFixed(2)} R
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Weekday stats */}
                    <div className="card" style={{ marginTop: 24, marginBottom: 32 }}>
                        <h3 style={styles.sectionTitle}>Day of week performance</h3>
                        <p style={styles.sectionHint}>
                            Which weekdays you perform better or worse on.
                        </p>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Day</th>
                                    <th style={styles.th}>Trades</th>
                                    <th style={styles.th}>Avg R</th>
                                    <th style={styles.th}>Total R</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weekdays.map((w) => (
                                    <tr key={w.weekdayLabel}>
                                        <td style={styles.td}>{w.weekdayLabel}</td>
                                        <td style={styles.td}>{w.trades}</td>
                                        <td
                                            style={{
                                                ...styles.td,
                                                color:
                                                    w.avgR >= 0
                                                        ? "var(--color-green)"
                                                        : "var(--color-red)",
                                            }}
                                        >
                                            {w.avgR.toFixed(2)}
                                        </td>
                                        <td
                                            style={{
                                                ...styles.td,
                                                fontWeight: 600,
                                                color:
                                                    w.totalR >= 0
                                                        ? "var(--color-green)"
                                                        : "var(--color-red)",
                                            }}
                                        >
                                            {w.totalR >= 0 ? "+" : ""}
                                            {w.totalR.toFixed(2)} R
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    summaryRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16,
    },
    summaryCard: {
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: 700,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 600,
        marginBottom: 4,
    },
    sectionHint: {
        fontSize: 12,
        color: "var(--text-secondary)",
        marginBottom: 12,
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 13,
    },
    th: {
        textAlign: "left",
        padding: "10px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)",
        fontWeight: 600,
    },
    td: {
        padding: "8px 16px",
        borderBottom: "1px solid var(--border-subtle)",
    },
};

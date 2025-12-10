import React from "react";
import { getDashboardInstruments } from "../utils/settingsStorage";

// Imports at top needed
import { Link } from "wouter";
import { getAppToday } from "../utils/appDate";
import { NewsPanel } from "../components/NewsPanel";

export const DashboardPage: React.FC = () => {
    const focus = getDashboardInstruments();

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Weekly overview</p>
            </div>

            {/* Weekly stats row (unchanged dummy data) */}
            <div style={styles.statsRow}>
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, idx) => (
                    <div key={day} className="card" style={styles.statCard}>
                        <span style={styles.dayLabel}>{day}</span>
                        <span
                            style={{
                                ...styles.resultText,
                                color:
                                    idx === 2
                                        ? "var(--color-red)"
                                        : idx === 4
                                            ? "var(--text-secondary)"
                                            : "var(--color-green)",
                            }}
                        >
                            {idx === 2 ? "-2.1 R" : idx === 4 ? "0 R" : "+1.2 R"}
                        </span>
                        <span style={styles.tradeCount}>3 trades</span>
                    </div>
                ))}
            </div>

            {/* Today's focus instruments driven by Settings */}
            <div style={{ marginTop: 32 }}>
                <h3 style={styles.sectionTitle}>Today&apos;s focus</h3>
                <div style={styles.focusRow}>
                    {focus.map((symbol) => (
                        <div key={symbol} className="card" style={styles.focusCard}>
                            <span style={styles.focusSymbol}>{symbol}</span>
                            <span style={styles.focusNote}>Watch plan for today</span>
                        </div>
                    ))}
                    {focus.length === 0 && (
                        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                            Select instruments in Settings to see them here.
                        </p>
                    )}
                </div>

                <div style={{ marginTop: 12 }}>
                    <Link href={`/morning/${getAppToday()}`} style={styles.viewAnalysisButton}>
                        View today’s analysis
                    </Link>
                </div>
            </div>

            {/* Recent trades (unchanged simple list) */}
            <div style={{ marginTop: 32 }}>
                <h3 style={styles.sectionTitle}>Recent trades</h3>
                <div className="card" style={styles.recentBox}>
                    <div style={styles.recentRow}>
                        <span style={styles.symbol}>XAUUSD</span>
                        <span style={{ color: "var(--color-green)", fontWeight: 600 }}>
                            +1.2 R
                        </span>
                    </div>
                    <div style={{ ...styles.recentRow, border: "none" }}>
                        <span style={styles.symbol}>EURUSD</span>
                        <span style={{ color: "var(--color-red)", fontWeight: 600 }}>
                            -0.6 R
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, any> = {
    statsRow: {
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 16,
    },
    statCard: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
    },
    dayLabel: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-secondary)",
        marginBottom: 8,
        textTransform: "uppercase",
    },
    resultText: {
        fontSize: 20,
        fontWeight: 700,
        marginBottom: 4,
    },
    tradeCount: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 600,
        marginBottom: 16,
        color: "var(--text-primary)",
    },
    focusRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
    },
    focusCard: {
        minWidth: 120,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    focusSymbol: {
        fontSize: 14,
        fontWeight: 600,
    },
    focusNote: {
        fontSize: 12,
        color: "var(--text-secondary)",
    },
    recentBox: {
        padding: 0,
    },
    recentRow: {
        display: "flex",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border-subtle)",
    },
    symbol: {
        fontWeight: 500,
    },
    viewAnalysisButton: {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--accent-primary)',
        backgroundColor: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
    },
};

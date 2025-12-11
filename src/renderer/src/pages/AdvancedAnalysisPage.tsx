import React, { useState } from "react";
import type { Mt5SummaryResponse, Mt5Summary, EquityPoint, SymbolStat } from "../types/advanced";

const todayStr = () => new Date().toISOString().slice(0, 10);

const minusDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
};

// --- DUMMY DATA FOR MAC USERS ---
const DUMMY_SUMMARY: Mt5Summary = {
    totalTrades: 142,
    wins: 84,
    losses: 58,
    winrate: 59.1,
    avgWin: 450.0,
    avgLoss: 220.0,
    expectancy: 175.5,
    maxDrawdown: 1200.5,
    equityCurve: Array.from({ length: 30 }).map((_, i) => ({
        time: minusDays(30 - i),
        balance: 5000 + i * 150 + (Math.random() * 400 - 200),
        profit: 0
    })),
    symbols: [
        { symbol: "XAUUSD", trades: 55, profit: 4200, winrate: 62 },
        { symbol: "EURUSD", trades: 40, profit: 1250, winrate: 55 },
        { symbol: "BTCUSD", trades: 25, profit: -800, winrate: 44 },
        { symbol: "US30", trades: 22, profit: 3200, winrate: 68 },
    ]
};

export const AdvancedAnalysisPage: React.FC = () => {
    const [dateFrom, setDateFrom] = useState(minusDays(90));
    const [dateTo, setDateTo] = useState(todayStr());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Mt5SummaryResponse | null>(null);

    const handleFetch = async () => {
        // For Mac users who cannot run MT5 Python, we use dummy data if fetch fails
        setLoading(true);
        setError(null);
        try {
            if (!window.mt5Api) {
                throw new Error("mt5Api not available");
            }

            // Try fetching real data (will fail on Mac if no python/mt5)
            // For now, let's artificially force failure or just use dummy data as requested
            // The user said: "macde veri olmucak o yüzden şimdilik dumy koyar mısın"

            // Simulate fetch delay
            await new Promise(r => setTimeout(r, 800));

            // Uncomment this block to enable real fetch attempt:
            /*
            const resp = (await window.mt5Api.getSummary({
              dateFrom,
              dateTo,
            })) as Mt5SummaryResponse;
            if (resp.ok) {
              setResult(resp);
            } else {
              // Fallback or show error
              console.warn("MT5 Service error, falling back to dummy?", resp.error);
              throw new Error(resp.error || "Service error");
            }
            */

            // Using dummy data directly as requested:
            setResult({
                ok: true,
                hasData: true,
                summary: DUMMY_SUMMARY
            });

        } catch (err: any) {
            console.error(err);
            // Fallback to dummy data on error anyway
            setResult({
                ok: true,
                hasData: true,
                summary: DUMMY_SUMMARY
            });
            // Keep error null to show data cleanly
        } finally {
            setLoading(false);
        }
    };

    const summary: Mt5Summary | null | undefined = result?.summary;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Advanced Analysis</h1>
                <p className="page-subtitle">
                    MT5 account performance overview (Python service)
                </p>
            </div>

            {/* Date range + fetch button */}
            <div
                className="card"
                style={{
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={styles.label}>From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        style={styles.input}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={styles.label}>To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        style={styles.input}
                    />
                </div>
                <div style={{ marginLeft: "auto" }}>
                    <button
                        type="button"
                        onClick={handleFetch}
                        style={styles.fetchBtn}
                        disabled={loading}
                    >
                        {loading ? "Fetching..." : "Fetch from MT5 (Dummy for Mac)"}
                    </button>
                </div>
            </div>

            {error && (
                <div
                    className="card"
                    style={{ marginBottom: 16, borderColor: "#FCA5A5", color: "#B91C1C" }}
                >
                    <strong>Error:</strong> {error}
                </div>
            )}

            {result && !result.ok && !error && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <p style={{ color: "var(--text-secondary)" }}>
                        Service returned an error.
                    </p>
                </div>
            )}

            {/* Intro message if no result yet */}
            {!result && !loading && (
                <div className="card">
                    <p style={{ color: "var(--text-secondary)" }}>
                        Click "Fetch" to load analysis data.
                    </p>
                </div>
            )}

            {summary && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {/* Top metrics */}
                    <div style={styles.metricsRow}>
                        <MetricCard
                            label="Total trades"
                            value={summary.totalTrades}
                        />
                        <MetricCard
                            label="Winrate"
                            value={summary.winrate.toFixed(1) + " %"}
                        />
                        <MetricCard
                            label="Expectancy"
                            value={summary.expectancy.toFixed(2)}
                            hint="Per trade"
                        />
                        <MetricCard
                            label="Max Drawdown"
                            value={summary.maxDrawdown.toFixed(2)}
                        />
                    </div>

                    {/* Equity curve */}
                    <div className="card">
                        <h3 style={styles.sectionTitle}>Equity Curve</h3>
                        <EquityChart points={summary.equityCurve} />
                    </div>

                    {/* Symbol stats */}
                    <div className="card">
                        <h3 style={styles.sectionTitle}>By Symbol</h3>
                        <SymbolTable symbols={summary.symbols} />
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricCard: React.FC<{ label: string; value: string | number; hint?: string }> = ({
    label,
    value,
    hint,
}) => (
    <div className="card" style={styles.metricCard}>
        <span style={styles.metricLabel}>{label}</span>
        <span style={styles.metricValue}>{value}</span>
        {hint && <span style={styles.metricHint}>{hint}</span>}
    </div>
);

// Basit CSS tabanlı "area" tarzı equity grafiği
const EquityChart: React.FC<{ points: EquityPoint[] }> = ({ points }) => {
    if (!points || points.length === 0) {
        return <p style={{ color: "var(--text-secondary)" }}>No data.</p>;
    }

    const balances = points.map((p) => p.balance);
    const minB = Math.min(...balances);
    const maxB = Math.max(...balances);
    const range = maxB - minB || 1;

    return (
        <div style={styles.chartContainer}>
            {points.map((p, idx) => {
                const normalized = (p.balance - minB) / range;
                const height = 10 + normalized * 80;
                return (
                    <div
                        key={idx}
                        style={{
                            ...styles.chartBar,
                            height: `${height}%`,
                        }}
                        title={`${p.time}\nBalance: ${p.balance.toFixed(2)}`}
                    />
                );
            })}
        </div>
    );
};

const SymbolTable: React.FC<{ symbols: SymbolStat[] }> = ({ symbols }) => {
    if (!symbols || symbols.length === 0) {
        return <p style={{ color: "var(--text-secondary)" }}>No symbol stats.</p>;
    }
    return (
        <table style={styles.table}>
            <thead>
                <tr style={styles.headerRow}>
                    <th style={styles.th}>Symbol</th>
                    <th style={styles.th}>Trades</th>
                    <th style={styles.th}>Profit</th>
                    <th style={styles.th}>Winrate</th>
                </tr>
            </thead>
            <tbody>
                {symbols.map((s) => (
                    <tr key={s.symbol} style={styles.row}>
                        <td style={styles.td}>{s.symbol}</td>
                        <td style={styles.td}>{s.trades}</td>
                        <td style={styles.td}>{s.profit.toFixed(2)}</td>
                        <td style={styles.td}>{s.winrate.toFixed(1)} %</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const styles: Record<string, React.CSSProperties> = {
    label: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-secondary)",
    },
    input: {
        padding: "6px 10px",
        borderRadius: 6,
        border: "1px solid var(--border-subtle)",
        fontSize: 13,
        fontFamily: "inherit",
    },
    fetchBtn: {
        backgroundColor: "var(--accent-primary)",
        color: "#ffffff",
        padding: "8px 16px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        border: "none",
        cursor: "pointer",
    },
    metricsRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 16,
    },
    metricCard: {
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: "var(--text-secondary)",
    },
    metricValue: {
        fontSize: 20,
        fontWeight: 700,
    },
    metricHint: {
        fontSize: 11,
        color: "var(--text-secondary)",
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: 600,
        marginBottom: 12,
    },
    chartContainer: {
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        height: 160,
        padding: "8px 0",
        borderBottom: "1px solid var(--border-subtle)",
    },
    chartBar: {
        flex: 1,
        background: "linear-gradient(to top, rgba(37,99,235,0.6), rgba(191,219,254,0.1))",
        borderRadius: "4px 4px 0 0",
        minWidth: 4,
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 13,
    },
    headerRow: {
        backgroundColor: "#F9FAFB",
        borderBottom: "1px solid var(--border-subtle)",
    },
    th: {
        textAlign: "left",
        padding: "10px 16px",
        fontWeight: 600,
        color: "var(--text-secondary)",
    },
    row: {
        borderBottom: "1px solid var(--border-subtle)",
    },
    td: {
        padding: "10px 16px",
        color: "var(--text-primary)",
    },
};

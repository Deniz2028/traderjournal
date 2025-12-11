// src/renderer/src/pages/AdvancedAnalysisPage.tsx
import React, { useEffect, useState } from "react";
import type {
    Mt5SummaryResponse,
    Mt5Summary,
    EquityPoint,
    DrawdownPoint,
    SymbolStat,
    SessionStat,
    HourStat,
    WeekdayStat,
} from "../types/advanced";
import { getRules } from "../utils/rulesStorage";
import { generateCoachingAdvice } from "../utils/coachingEngine";

const todayStr = () => new Date().toISOString().slice(0, 10);

const minusDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
};

export const AdvancedAnalysisPage: React.FC = () => {
    const [dateFrom, setDateFrom] = useState(minusDays(90));
    const [dateTo, setDateTo] = useState(todayStr());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Mt5SummaryResponse | null>(null);
    const [coaching, setCoaching] = useState<ReturnType<typeof generateCoachingAdvice> | null>(null);

    useEffect(() => {
        handleFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFetch = async () => {
        // Debug logging
        console.log("Checking mt5Api availability...");
        console.log("window.mt5Api:", window.mt5Api);
        console.log("window.api:", window.api);

        // Defensive check: prefer direct exposure, fallback to nested if exists
        const mt5Api = window.mt5Api || (window.api && (window.api as any).mt5Api);

        if (!mt5Api) {
            console.error("mt5Api missing from window object");
            setError("mt5Api is not available from preload (check console for details).");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const resp = (await mt5Api.getSummary({
                dateFrom,
                dateTo,
            })) as Mt5SummaryResponse;
            setResult(resp);

            // Generate coaching advice
            const rules = getRules();
            if (resp.ok && resp.summary) {
                const advice = generateCoachingAdvice(resp.summary, rules);
                setCoaching(advice);
            } else {
                setCoaching(null);
            }

            if (!resp.ok && resp.error) {
                setError(resp.error);
            }
        } catch (err: any) {
            setError(String(err?.message ?? err));
        } finally {
            setLoading(false);
        }
    };

    const summary: Mt5Summary | null | undefined = result?.summary;
    const isDummy = summary?.useDummy || result?.useDummy;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Advanced Analysis</h1>
                <p className="page-subtitle">
                    MT5 account performance overview – live on Windows, dummy on Mac.
                </p>
            </div>

            {/* Date range + fetch */}
            <div
                className="card"
                style={{
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                }}
            >
                <div style={styles.fieldCol}>
                    <label style={styles.label}>From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        style={styles.input}
                    />
                </div>
                <div style={styles.fieldCol}>
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
                        {loading ? "Fetching..." : "Fetch from MT5"}
                    </button>
                </div>
            </div>

            {error && (
                <div
                    className="card"
                    style={{
                        marginBottom: 12,
                        borderColor: "#FCA5A5",
                        color: "#B91C1C",
                    }}
                >
                    <strong>Error:</strong> {error}
                </div>
            )}

            {result && !error && !result.ok && (
                <div className="card" style={{ marginBottom: 12 }}>
                    <p style={{ color: "var(--text-secondary)" }}>
                        Service returned an error.
                    </p>
                </div>
            )}

            {result && result.ok && result.hasData === false && (
                <div className="card" style={{ marginBottom: 12 }}>
                    <p style={{ color: "var(--text-secondary)" }}>
                        No trades found for this range.
                    </p>
                </div>
            )}

            {isDummy && (
                <div
                    className="card"
                    style={{
                        marginBottom: 12,
                        borderColor: "#BFDBFE",
                        background:
                            "linear-gradient(90deg, rgba(191,219,254,0.3), rgba(219,234,254,0.1))",
                    }}
                >
                    <p style={{ fontSize: 13, color: "#1D4ED8" }}>
                        You&apos;re currently seeing <strong>dummy demo data</strong> –
                        on Windows with MT5 + MetaTrader5 Python package, this panel will
                        use your real account history.
                    </p>
                </div>
            )}

            {summary && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {/* Top metrics */}
                    <div style={styles.metricsRow}>
                        <MetricCard label="Total trades" value={summary.totalTrades} />
                        <MetricCard
                            label="Winrate"
                            value={summary.winrate.toFixed(1) + " %"}
                        />
                        <MetricCard
                            label="Expectancy"
                            value={summary.expectancyMoney.toFixed(2)}
                            hint="Per trade (account currency)"
                        />
                        <MetricCard
                            label="Max Drawdown"
                            value={summary.maxDrawdownMoney.toFixed(2)}
                        />
                        <MetricCard
                            label="Avg Win"
                            value={summary.avgWinMoney.toFixed(2)}
                        />
                        <MetricCard
                            label="Avg Loss"
                            value={summary.avgLossMoney.toFixed(2)}
                        />
                        <MetricCard
                            label="Longest Win Streak"
                            value={summary.longestWinStreak}
                        />
                        <MetricCard
                            label="Longest Loss Streak"
                            value={summary.longestLossStreak}
                        />
                    </div>

                    {/* Charts row */}
                    <div style={styles.chartsRow}>
                        <div className="card" style={styles.chartCard}>
                            <h3 style={styles.sectionTitle}>Equity Curve</h3>
                            <EquityChart points={summary.equityCurve} />
                        </div>
                        <div className="card" style={styles.chartCard}>
                            <h3 style={styles.sectionTitle}>Drawdown Curve</h3>
                            <DrawdownChart points={summary.drawdownCurve} />
                        </div>
                    </div>

                    {/* Symbol stats */}
                    <div className="card">
                        <h3 style={styles.sectionTitle}>By Symbol</h3>
                        <SymbolTable symbols={summary.symbols} />
                    </div>

                    {/* Session + Hour + Weekday */}
                    <div style={styles.bottomGrid}>
                        <div className="card">
                            <h3 style={styles.sectionTitle}>By Session</h3>
                            <SessionTable sessions={summary.sessions} />
                        </div>
                        <div className="card">
                            <h3 style={styles.sectionTitle}>By Hour of Day</h3>
                            <HourTable hours={summary.hours} />
                        </div>
                        <div className="card">
                            <h3 style={styles.sectionTitle}>By Weekday</h3>
                            <WeekdayTable weekdays={summary.weekdays} />
                        </div>
                    </div>
                </div>
                    {/* Coaching panel */}
            <div className="card">
                <h3 style={styles.sectionTitle}>Coach</h3>
                {coaching ? (
                    <div>
                        <p
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                            }}
                        >
                            {coaching.headline}
                        </p>
                        <ul
                            style={{
                                marginLeft: 18,
                                fontSize: 13,
                                color: "var(--text-secondary)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                            }}
                        >
                            {coaching.bullets.map((b, idx) => (
                                <li key={idx}>{b}</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Tavsiye üretmek için önce "Fetch from MT5" ile veri çekmelisin.
                    </p>
                )}
            </div>
        </div>
    )
}
        </div >
    );
};

const MetricCard: React.FC<{
    label: string;
    value: string | number;
    hint?: string;
}> = ({ label, value, hint }) => (
    <div className="card" style={styles.metricCard}>
        <span style={styles.metricLabel}>{label}</span>
        <span style={styles.metricValue}>{value}</span>
        {hint && <span style={styles.metricHint}>{hint}</span>}
    </div>
);

const EquityChart: React.FC<{ points: EquityPoint[] }> = ({ points }) => {
    if (!points || points.length === 0) {
        return <p style={styles.mutedText}>No data.</p>;
    }

    const balances = points.map((p) => p.balance);
    const minB = Math.min(...balances);
    const maxB = Math.max(...balances);
    const range = maxB - minB || 1;

    return (
        <div style={styles.chartContainer}>
            {points.map((p, idx) => {
                const normalized = (p.balance - minB) / range;
                const height = 20 + normalized * 80; // 20% - 100%
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

const DrawdownChart: React.FC<{ points: DrawdownPoint[] }> = ({ points }) => {
    if (!points || points.length === 0) {
        return <p style={styles.mutedText}>No data.</p>;
    }

    const dds = points.map((p) => p.drawdown);
    const maxDD = Math.max(...dds);
    const range = maxDD || 1;

    return (
        <div style={styles.chartContainer}>
            {points.map((p, idx) => {
                const normalized = p.drawdown / range;
                const height = normalized * 100;
                return (
                    <div
                        key={idx}
                        style={{
                            ...styles.chartBarDD,
                            height: `${height}%`,
                        }}
                        title={`${p.time}\nDrawdown: ${p.drawdown.toFixed(2)}`}
                    />
                );
            })}
        </div>
    );
};

const SymbolTable: React.FC<{ symbols: SymbolStat[] }> = ({ symbols }) => {
    if (!symbols || symbols.length === 0) {
        return <p style={styles.mutedText}>No symbol stats.</p>;
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

const SessionTable: React.FC<{ sessions: SessionStat[] }> = ({ sessions }) => {
    if (!sessions || sessions.length === 0) {
        return <p style={styles.mutedText}>No session stats.</p>;
    }
    return (
        <table style={styles.tableSmall}>
            <thead>
                <tr style={styles.headerRow}>
                    <th style={styles.th}>Session</th>
                    <th style={styles.th}>Trades</th>
                    <th style={styles.th}>Profit</th>
                    <th style={styles.th}>Winrate</th>
                </tr>
            </thead>
            <tbody>
                {sessions.map((s) => (
                    <tr key={s.session} style={styles.row}>
                        <td style={styles.td}>{s.session}</td>
                        <td style={styles.td}>{s.trades}</td>
                        <td style={styles.td}>{s.profit.toFixed(2)}</td>
                        <td style={styles.td}>{s.winrate.toFixed(1)} %</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const HourTable: React.FC<{ hours: HourStat[] }> = ({ hours }) => {
    if (!hours || hours.length === 0) {
        return <p style={styles.mutedText}>No hour stats.</p>;
    }
    return (
        <table style={styles.tableSmall}>
            <thead>
                <tr style={styles.headerRow}>
                    <th style={styles.th}>Hour</th>
                    <th style={styles.th}>Trades</th>
                    <th style={styles.th}>Profit</th>
                    <th style={styles.th}>Winrate</th>
                </tr>
            </thead>
            <tbody>
                {hours.map((h) => (
                    <tr key={h.hour} style={styles.row}>
                        <td style={styles.td}>{h.hour}:00</td>
                        <td style={styles.td}>{h.trades}</td>
                        <td style={styles.td}>{h.profit.toFixed(2)}</td>
                        <td style={styles.td}>{h.winrate.toFixed(1)} %</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const WeekdayTable: React.FC<{ weekdays: WeekdayStat[] }> = ({ weekdays }) => {
    if (!weekdays || weekdays.length === 0) {
        return <p style={styles.mutedText}>No weekday stats.</p>;
    }
    return (
        <table style={styles.tableSmall}>
            <thead>
                <tr style={styles.headerRow}>
                    <th style={styles.th}>Day</th>
                    <th style={styles.th}>Trades</th>
                    <th style={styles.th}>Profit</th>
                    <th style={styles.th}>Winrate</th>
                </tr>
            </thead>
            <tbody>
                {weekdays.map((w) => (
                    <tr key={w.weekday} style={styles.row}>
                        <td style={styles.td}>{w.name}</td>
                        <td style={styles.td}>{w.trades}</td>
                        <td style={styles.td}>{w.profit.toFixed(2)}</td>
                        <td style={styles.td}>{w.winrate.toFixed(1)} %</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const styles: Record<string, React.CSSProperties> = {
    fieldCol: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
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
    },
    metricsRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 16,
    },
    metricCard: {
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: "var(--text-secondary)",
    },
    metricValue: {
        fontSize: 18,
        fontWeight: 700,
    },
    metricHint: {
        fontSize: 11,
        color: "var(--text-secondary)",
    },
    chartsRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
    },
    chartCard: {
        padding: "14px 16px",
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: 600,
        marginBottom: 10,
    },
    chartContainer: {
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        height: 160,
        padding: "8px 0",
    },
    chartBar: {
        flex: 1,
        background:
            "linear-gradient(to top, rgba(37,99,235,0.75), rgba(191,219,254,0.1))",
        borderRadius: 999,
    },
    chartBarDD: {
        flex: 1,
        background:
            "linear-gradient(to top, rgba(248,113,113,0.8), rgba(254,226,226,0.1))",
        borderRadius: 999,
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 13,
    },
    tableSmall: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 12,
    },
    headerRow: {
        backgroundColor: "#F9FAFB",
        borderBottom: "1px solid var(--border-subtle)",
    },
    th: {
        textAlign: "left",
        padding: "8px 12px",
        fontWeight: 600,
        color: "var(--text-secondary)",
    },
    row: {
        borderBottom: "1px solid var(--border-subtle)",
    },
    td: {
        padding: "8px 12px",
        color: "var(--text-primary)",
    },
    mutedText: {
        fontSize: 13,
        color: "var(--text-secondary)",
    },
    bottomGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
    },
};

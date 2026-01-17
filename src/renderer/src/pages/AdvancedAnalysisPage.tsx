// src/renderer/src/pages/AdvancedAnalysisPage.tsx
import React, { useState } from "react";
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
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
    ResponsiveContainer
} from "recharts";

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

    // useEffect(() => {
    //     handleFetch();
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, []);

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
                        onClick={() => {
                            if (confirm("MT5 terminali açılacak ve veriler çekilecektir. Devam etmek istiyor musunuz?")) {
                                handleFetch();
                            }
                        }}
                        style={styles.fetchBtn}
                        disabled={loading}
                    >
                        {loading ? "Yükleniyor..." : "Verileri Çek"}
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
                <div className="alert-info" style={{ marginBottom: 12 }}>
                    <p>
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
                        <SymbolChart symbols={summary.symbols} />
                        <div style={{ marginTop: 24 }}>
                            <h4 style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Details</h4>
                            <SymbolTable symbols={summary.symbols} />
                        </div>
                    </div>

                    {/* Session + Hour + Weekday */}
                    <div style={styles.bottomGrid}>
                        <div className="card">
                            <h3 style={styles.sectionTitle}>By Session</h3>
                            <SessionChart sessions={summary.sessions} />
                            <div style={{ marginTop: 16 }}>
                                <SessionTable sessions={summary.sessions} />
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={styles.sectionTitle}>By Hour of Day</h3>
                            <HourChart hours={summary.hours} />
                            <div style={{ marginTop: 16 }}>
                                <HourTable hours={summary.hours} />
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={styles.sectionTitle}>By Weekday</h3>
                            <WeekdayChart weekdays={summary.weekdays} />
                            <div style={{ marginTop: 16 }}>
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
            )}
        </div>
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

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <AreaChart data={points}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={['auto', 'auto']} fontSize={12} tickFormatter={(val) => val.toFixed(0)} />
                    <Tooltip
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [value.toFixed(2), "Balance"]}
                        labelFormatter={(label) => label.substring(0, 10)}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#2563EB" fillOpacity={1} fill="url(#colorBalance)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const DrawdownChart: React.FC<{ points: DrawdownPoint[] }> = ({ points }) => {
    if (!points || points.length === 0) {
        return <p style={styles.mutedText}>No data.</p>;
    }

    const data = points.map(p => ({ ...p, value: -p.drawdown }));

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="time" hide />
                    <YAxis fontSize={12} />
                    <Tooltip
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [Math.abs(value).toFixed(2), "Drawdown"]}
                        labelFormatter={(label) => label.substring(0, 10)}
                    />
                    <Area type="monotone" dataKey="value" stroke="#dc2626" fillOpacity={1} fill="url(#colorDD)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const SymbolChart: React.FC<{ symbols: SymbolStat[] }> = ({ symbols }) => {
    if (!symbols || symbols.length === 0) return null;

    return (
        <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={symbols} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="symbol" type="category" width={60} fontSize={12} tick={{ fill: "var(--text-secondary)" }} />
                    <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        formatter={(value: number) => [value.toFixed(2), "Profit"]}
                    />
                    <ReferenceLine x={0} stroke="#9CA3AF" />
                    <Bar dataKey="profit" radius={[0, 4, 4, 0]} barSize={20}>
                        {symbols.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "#22C55E" : "#EF4444"} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const SessionChart: React.FC<{ sessions: SessionStat[] }> = ({ sessions }) => {
    if (!sessions || sessions.length === 0) return null;

    const data = sessions.filter(s => s.trades > 0);
    const COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981"];

    return (
        <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data as any[]}
                        dataKey="trades"
                        nameKey="session"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

const HourChart: React.FC<{ hours: HourStat[] }> = ({ hours }) => {
    if (!hours || hours.length === 0) return null;

    return (
        <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
                <BarChart data={hours}>
                    <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                        cursor={{ fill: "#F3F4F6" }}
                        contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        formatter={(value: number) => [value.toFixed(2), "Profit"]}
                        labelFormatter={(label) => `${label}:00`}
                    />
                    <ReferenceLine y={0} stroke="#E5E7EB" />
                    <Bar dataKey="profit">
                        {hours.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "#3B82F6" : "#EF4444"} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const WeekdayChart: React.FC<{ weekdays: WeekdayStat[] }> = ({ weekdays }) => {
    if (!weekdays || weekdays.length === 0) return null;

    return (
        <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
                <BarChart data={weekdays}>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                        cursor={{ fill: "#F3F4F6" }}
                        contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        formatter={(value: number) => [value.toFixed(2), "Profit"]}
                    />
                    <ReferenceLine y={0} stroke="#E5E7EB" />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                        {weekdays.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "#10B981" : "#EF4444"} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
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
        backgroundColor: "var(--bg-input)",
        color: "var(--text-primary)",
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
        backgroundColor: "var(--bg-secondary)",
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

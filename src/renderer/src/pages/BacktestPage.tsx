import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CreateSessionModal, BacktestSession } from "../components/CreateSessionModal";
import { BacktestSessionCharts } from "../components/BacktestSessionCharts";
import { Clock, History, Trophy, TrendingUp, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const BacktestPage: React.FC = () => {
    const [sessions, setSessions] = useState<BacktestSession[]>([]);
    // const [allTrades, setAllTrades] = useState<any[]>([]); // Not used for now in global stats directly if we just load all
    const [trades, setTrades] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [_, setLocation] = useLocation();

    const loadData = async () => {
        try {
            // @ts-ignore
            const s = await window.api.backtest.getSessions();
            setSessions(s);
            // @ts-ignore
            const t = await window.api.backtest.getAll();
            setTrades(t);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async (sessionData: any) => {
        // @ts-ignore
        await window.api.backtest.createSession(sessionData);
        loadData();
    };

    const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Delete this session?")) {
            // @ts-ignore
            await window.api.backtest.deleteSession(id);
            loadData();
        }
    };

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedSession(expandedSession === id ? null : id);
    };

    // --- Stats Calculation ---
    const totalTimeInvestedMinutes = sessions.reduce((acc, s) => acc + (s.timeInvested || 0), 0);
    const hours = Math.floor(totalTimeInvestedMinutes / 60);
    const mins = totalTimeInvestedMinutes % 60;

    // Historical Time Replayed
    let totalHistoricalDays = 0;
    sessions.forEach(s => {
        if (s.startDate && s.endDate) {
            const start = new Date(s.startDate);
            const end = new Date(s.endDate);
            const diff = end.getTime() - start.getTime();
            const d = diff / (1000 * 3600 * 24);
            if (d > 0) totalHistoricalDays += d;
        }
    });
    const histMonths = Math.floor(totalHistoricalDays / 30);
    const remainingDays = Math.floor(totalHistoricalDays % 30);

    const totalTrades = trades.length;
    const wins = trades.filter(t => t.outcome === "TP").length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : "0";

    // Charts Data
    // Trades by Symbol
    const tradesBySymbol = trades.reduce((acc, t) => {
        acc[t.symbol] = (acc[t.symbol] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const symbolChartData = Object.entries(tradesBySymbol).map(([name, value]) => ({ name, value }));

    // Activity
    const activityMap = sessions.reduce((acc, s) => {
        const d = new Date(s.creationDate);
        const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
        acc[key] = (acc[key] || 0) + (s.timeInvested || 0); // minutes
        return acc;
    }, {} as Record<string, number>);
    // Convert minutes to hours for chart
    const activityChartData = Object.entries(activityMap).map(([name, value]) => ({ name, value: Math.round(value / 60 * 10) / 10 }));


    return (
        <div className="page-container">
            <h1 className="page-title" style={{ marginBottom: 24 }}>Backtesting</h1>

            {/* Dashboard Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {/* Stats Cards */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        <Clock size={16} /> <span style={{ fontSize: 13 }}>Time Invested</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>
                        {hours}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>hr</span> {mins}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>min</span>
                    </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        <History size={16} /> <span style={{ fontSize: 13 }}>Historical Time Replayed</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>
                        {histMonths > 0 && <>{histMonths}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>mo</span> </>}
                        {remainingDays}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>d</span>
                    </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        <TrendingUp size={16} /> <span style={{ fontSize: 13 }}>Trades Taken</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>
                        {totalTrades}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        From {sessions.length} sessions
                    </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        <Trophy size={16} /> <span style={{ fontSize: 13 }}>Overall Win Rate</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: parseFloat(winRate) >= 50 ? '#10B981' : 'var(--text-primary)' }}>
                        {winRate}%
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
                <div className="card" style={{ padding: 20, minHeight: 250 }}>
                    <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>Time Invested (Hours)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={activityChartData}>
                            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', borderRadius: 8 }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                cursor={{ fill: 'var(--bg-element)' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {activityChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="url(#colorGradient)" />
                                ))}
                                <Cell fill="#F59E0B" />
                            </Bar>
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card" style={{ padding: 20, minHeight: 250 }}>
                    <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>Trades by Symbol</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={symbolChartData}>
                            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', borderRadius: 8 }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                cursor={{ fill: 'var(--bg-element)' }}
                            />
                            <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Sessions List Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 600 }}>Backtest Sessions</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Manage your backtesting and prop firm sessions</p>
                </div>
                <button className="btn-primary" onClick={() => setIsCreateOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} /> Add Session
                </button>
            </div>

            {/* Sessions List */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                {sessions.map(s => {
                    const isExpanded = expandedSession === s.id;
                    return (
                        <div
                            key={s.id}
                            className="card"
                            style={{ transition: "all 0.2s" }}
                        >
                            <div
                                style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                onClick={() => setLocation(`/backtest/${s.id}`)}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: "50%",
                                        backgroundColor: s.type === "Prop Firm" ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
                                        color: s.type === "Prop Firm" ? "#EF4444" : "#3B82F6",
                                        display: "flex", alignItems: "center", justifyContent: "center"
                                    }}>
                                        {s.type === "Prop Firm" ? <Trophy size={20} /> : <History size={20} />}
                                    </div>
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</span>
                                            <span style={{
                                                fontSize: 10, padding: "2px 6px", borderRadius: 4,
                                                backgroundColor: "var(--bg-element)", color: "var(--text-secondary)", textTransform: 'uppercase'
                                            }}>
                                                {s.type}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                                            {s.startDate} - {s.endDate} • {s.assets.join(", ")}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Balance</div>
                                        <div style={{ fontWeight: 600 }}>${s.balance.toLocaleString()}</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                                        <button
                                            className="btn-secondary"
                                            onClick={(e) => toggleExpand(e, s.id)}
                                            style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            Summary {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteSession(e, s.id)}
                                            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "var(--text-tertiary)" }}
                                            title="Delete Session"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Area */}
                            {isExpanded && (
                                <div style={{
                                    backgroundColor: "var(--bg-secondary)",
                                    borderTop: "1px solid var(--border-subtle)",
                                    padding: 20
                                }}>
                                    <BacktestSessionCharts sessionId={s.id} />
                                </div>
                            )}
                        </div>
                    )
                })}
                {sessions.length === 0 && (
                    <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>
                        No sessions yet. Create one to start backtesting.
                    </div>
                )}
            </div>

            <CreateSessionModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSave={handleCreate}
            />
        </div>
    );
};

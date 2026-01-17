import React, { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { BacktestModal, BacktestTrade } from "../components/BacktestModal";
// Ah, the session list in BacktestPage uses icons.
// BacktestSessionPage uses no icons currently?
// Let's check the code I wrote.
// I see ArrowRight/Left logic...
// The context menu has text.
// The header has text.
// The cards have text.
// It seems I don't use any icons in the current version of BacktestSessionPage. 
// So I can remove the import entirely.


interface BacktestSession {
    id: string;
    name: string;
    type: "Backtesting" | "Prop Firm";
    balance: number;
    assets: string[];
    startDate: string;
    endDate: string;
    creationDate: string;
    status: "Active" | "Ended";
    profitTarget?: number;
    maxDailyLoss?: number;
    maxTotalLoss?: number;
}

export const BacktestSessionPage: React.FC = () => {
    const [match, params] = useRoute("/backtest/:id");
    const id = match ? params!.id : "";
    const [_, setLocation] = useLocation();

    const [session, setSession] = useState<BacktestSession | null>(null);
    const [trades, setTrades] = useState<BacktestTrade[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrade, setEditingTrade] = useState<BacktestTrade | null>(null);

    // Lightbox State
    const [lightboxIndex, setLightboxIndex] = useState<{ tradeIndex: number, type: 'before' | 'after' } | null>(null);

    const loadData = async () => {
        try {
            // @ts-ignore
            const sessions: BacktestSession[] = await window.api.backtest.getSessions();
            const s = sessions.find(x => x.id === id);
            if (s) setSession(s);

            // @ts-ignore
            const allTrades: BacktestTrade[] = await window.api.backtest.getAll();
            setTrades(allTrades.filter(t => t.sessionId === id).reverse());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const handleSaveTrade = async (trade: Partial<BacktestTrade>) => {
        if (trade.id) {
            // @ts-ignore
            await window.api.backtest.update(trade);
        } else {
            // @ts-ignore
            await window.api.backtest.add({ ...trade, sessionId: id });
        }
        setIsModalOpen(false);
        setEditingTrade(null);
        loadData();
    };

    const handleDeleteTrade = async (e: React.MouseEvent, tradeId: string) => {
        e.stopPropagation();
        if (confirm("Delete this trade?")) {
            // @ts-ignore
            await window.api.backtest.delete(tradeId);
            loadData();
        }
    };

    const openEdit = (trade: BacktestTrade) => {
        setEditingTrade(trade);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingTrade(null);
        setIsModalOpen(true);
    };

    // Calculate metrics
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.outcome === "TP").length;
    const losses = trades.filter(t => t.outcome === "SL").length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : "0.0";

    // Calculate PnL with 1% risk per trade logic
    // 1% of Session Balance
    const initialBalance = session?.balance || 100000;
    const onePercent = initialBalance * 0.01;
    let currentBalance = initialBalance;

    // We need to sum up PnL from trades. 
    // Since trades is reversed (newest first), let's calculate standard sum
    const totalPnL = trades.reduce((acc, t) => {
        const r = t.resultR || 0;
        return acc + (r * onePercent);
    }, 0);

    currentBalance += totalPnL;


    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, trade: BacktestTrade } | null>(null);

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, trade: BacktestTrade) => {
        e.preventDefault();
        setContextMenu({ x: e.pageX, y: e.pageY, trade });
    };

    // Lightbox Handlers
    const openLightbox = (tradeIndex: number, type: 'before' | 'after') => {
        setLightboxIndex({ tradeIndex, type });
    };

    const closeLightbox = () => {
        setLightboxIndex(null);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!lightboxIndex) return;
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowRight") {
                // Navigate forward: Before -> After -> Next Trade Before
                if (lightboxIndex.type === 'before') {
                    // Check if current trade has after
                    const trade = trades[lightboxIndex.tradeIndex];
                    if (trade.afterChart) setLightboxIndex({ ...lightboxIndex, type: 'after' });
                    else if (lightboxIndex.tradeIndex < trades.length - 1) setLightboxIndex({ tradeIndex: lightboxIndex.tradeIndex + 1, type: 'before' });
                } else {
                    // After -> Next Trade Before
                    if (lightboxIndex.tradeIndex < trades.length - 1) setLightboxIndex({ tradeIndex: lightboxIndex.tradeIndex + 1, type: 'before' });
                }
            }
            if (e.key === "ArrowLeft") {
                // Navigate back
                if (lightboxIndex.type === 'after') {
                    // After -> Before
                    const trade = trades[lightboxIndex.tradeIndex];
                    if (trade.beforeChart) setLightboxIndex({ ...lightboxIndex, type: 'before' });
                    else if (lightboxIndex.tradeIndex > 0) setLightboxIndex({ tradeIndex: lightboxIndex.tradeIndex - 1, type: 'after' }); // fallback to prev after
                } else {
                    // Before -> Prev Trade After
                    if (lightboxIndex.tradeIndex > 0) {
                        const prevTrade = trades[lightboxIndex.tradeIndex - 1];
                        setLightboxIndex({ tradeIndex: lightboxIndex.tradeIndex - 1, type: prevTrade.afterChart ? 'after' : 'before' });
                    }
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxIndex, trades]);


    if (!session) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading or session not found...</div>;

    return (
        <div className="page-container">
            {/* Nav Back */}
            <div style={{ marginBottom: 16 }}>
                <button onClick={() => setLocation("/backtest")} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ← Back to Sessions
                </button>
            </div>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">{session.name} <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 400 }}>{session.type}</span></h1>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{session.assets.join(", ")} • {session.startDate} - {session.endDate}</p>
                </div>
                <button className="btn-primary" onClick={openAdd}>+ Add Trade</button>
            </div>

            {/* Metrics Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Current Balance</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>${currentBalance.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Win Rate</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: parseFloat(winRate) >= 50 ? "#10B981" : "#EF4444" }}>{winRate}%</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Total Trades</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{totalTrades}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Wins / Losses</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{wins}W - {losses}L</div>
                </div>
            </div>

            {/* Prop Firm Limits */}
            {session.type === "Prop Firm" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                    <div className="card" style={{ padding: 16, borderLeft: "4px solid #F59E0B" }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Profit Target ({session.profitTarget}%)</div>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>${(session.balance * (session.profitTarget || 10) / 100).toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: 16, borderLeft: "4px solid #EF4444" }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Max Daily Loss</div>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>${session.maxDailyLoss?.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: 16, borderLeft: "4px solid #7F1D1D" }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Max Total Loss</div>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>${session.maxTotalLoss?.toLocaleString()}</div>
                    </div>
                </div>
            )}

            {/* Trades Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {trades.map((t, idx) => {
                    const tradeOnePercent = onePercent; // Fixed risk amount
                    const tradePnL = (t.resultR || 0) * tradeOnePercent;

                    return (
                        <div
                            key={t.id}
                            className="card"
                            style={{ overflow: "hidden", display: 'flex', flexDirection: 'column', cursor: 'context-menu' }}
                            onContextMenu={(e) => handleContextMenu(e, t)}
                        >
                            {/* Header */}
                            <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)" }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{t.symbol}</span>
                                    <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 6px", borderRadius: 4, backgroundColor: t.direction === "Long" ? "#DCFCE7" : "#FEE2E2", color: t.direction === "Long" ? "#16A34A" : "#EF4444" }}>{t.direction}</span>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: t.outcome === "TP" ? "#10B981" : t.outcome === "SL" ? "#EF4444" : "var(--text-secondary)" }}>
                                    {t.outcome}
                                </div>
                            </div>

                            {/* Date */}
                            <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-secondary)" }}>{t.date}</div>

                            {/* Images */}
                            <div style={{ display: "flex", height: 120, borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
                                <div
                                    style={{ flex: 1, borderRight: "1px solid var(--border-subtle)", position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
                                    onClick={() => openLightbox(idx, 'before')}
                                >
                                    {t.beforeChart ? (
                                        <img src={t.beforeChart.startsWith('http') ? t.beforeChart : `file://${t.beforeChart}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{ width: "100%", height: "100%", backgroundColor: "var(--bg-element)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 10 }}>No Before</div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 10, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '1px 4px', borderRadius: 4 }}>Before</div>
                                </div>
                                <div
                                    style={{ flex: 1, position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
                                    onClick={() => openLightbox(idx, 'after')}
                                >
                                    {t.afterChart ? (
                                        <img src={t.afterChart.startsWith('http') ? t.afterChart : `file://${t.afterChart}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{ width: "100%", height: "100%", backgroundColor: "var(--bg-element)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 10 }}>No After</div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 10, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '1px 4px', borderRadius: 4 }}>After</div>
                                </div>
                            </div>

                            {/* Footer: R and PnL */}
                            <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                    {t.resultR != null ? (
                                        <>
                                            <span style={{ color: t.resultR > 0 ? "var(--color-green)" : t.resultR < 0 ? "var(--color-red)" : "var(--text-primary)" }}>
                                                {t.resultR > 0 ? "+" : ""}{t.resultR}R
                                            </span>
                                        </>
                                    ) : "-"}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>
                                    <span style={{ color: tradePnL > 0 ? "var(--color-green)" : tradePnL < 0 ? "var(--color-red)" : "var(--text-primary)" }}>
                                        {tradePnL > 0 ? "+" : ""}${tradePnL.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            {/* Buttons Removed */}
                        </div>
                    );
                })}
                {trades.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                        No trades in this session yet. Add one to see stats.
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    style={{
                        position: "absolute",
                        top: contextMenu.y,
                        left: contextMenu.x,
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 8,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        zIndex: 10000,
                        overflow: 'hidden',
                        minWidth: 120
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        style={{ padding: "10px 16px", cursor: "pointer", fontSize: 13, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}
                        onClick={() => { openEdit(contextMenu.trade); setContextMenu(null); }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-element)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        Edit Trade
                    </div>
                    <div
                        style={{ padding: "10px 16px", cursor: "pointer", fontSize: 13, color: "#EF4444", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--border-subtle)" }}
                        onClick={(e) => { handleDeleteTrade(e, contextMenu.trade.id); setContextMenu(null); }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-element)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        Delete Trade
                    </div>
                </div>
            )}

            <BacktestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTrade}
                initialData={editingTrade}
                sessionBalance={session.balance}
            />

            {/* Lightbox Overlay */}
            {lightboxIndex && (() => {
                const t = trades[lightboxIndex.tradeIndex];
                const src = lightboxIndex.type === 'before' ? t.beforeChart : t.afterChart;
                const url = src?.startsWith('http') ? src : `file://${src}`;
                return (
                    <div
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        onClick={closeLightbox}
                    >
                        <img
                            src={url}
                            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain' }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'white', fontSize: 30, cursor: 'pointer' }}
                            onClick={closeLightbox}
                        >
                            ×
                        </button>
                        <div style={{ position: 'absolute', bottom: 20, color: 'white', fontSize: 14 }}>
                            {t.symbol} - {lightboxIndex.type.toUpperCase()} (Use Arrows ← → to navigate)
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

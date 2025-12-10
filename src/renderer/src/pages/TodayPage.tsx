// src/renderer/src/pages/TodayPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
    Bias3,
    Outcome,
    MtfFrame,
    MtfTrade,
    loadTradesForDate,
    saveTrade,
    createNewTrade,
    deleteTrade,
    hasPostReview,
} from "../utils/journalStorage";
import { getAppToday } from "../utils/appDate";

type ViewMode = "list" | "editingPre" | "preSummary" | "editingPost" | "postSummary";

const biasOptions: Bias3[] = ["Long", "Short", "Neutral"];
const outcomeOptions: Outcome[] = ["TP", "SL", "BE"];

export const TodayPage: React.FC = () => {
    const todayISO = getAppToday();
    const [trades, setTrades] = useState<MtfTrade[]>([]);

    // Active trade being edited/viewed
    const [activeTrade, setActiveTrade] = useState<MtfTrade | null>(null);

    // Current view mode
    const [viewMode, setViewMode] = useState<ViewMode>("list");

    // Load trades on mount
    useEffect(() => {
        setTrades(loadTradesForDate(todayISO));
    }, [todayISO]);

    // When active trade changes (and is valid), save it
    useEffect(() => {
        if (activeTrade) {
            saveTrade(activeTrade);
            // Also update the list state to reflect changes immediately in list view (if we were to show both)
            setTrades(prev => prev.map(t => t.id === activeTrade.id ? activeTrade : t));
        }
    }, [activeTrade]);

    // --- Handlers ---

    const handleCreateTrade = () => {
        const newTrade = createNewTrade(todayISO);
        // Add to list immediately
        setTrades(prev => [...prev, newTrade]);
        // Set active
        setActiveTrade(newTrade);
        setViewMode("editingPre");
    };

    const handleSelectTrade = (trade: MtfTrade) => {
        setActiveTrade(trade);
        // Determine appropriate view mode
        if (!trade.preSaved) {
            setViewMode("editingPre");
        } else if (hasPostReview(trade)) {
            setViewMode("postSummary");
        } else {
            setViewMode("preSummary");
        }
    };

    const handleBackToList = () => {
        setActiveTrade(null);
        setViewMode("list");
        // Reload to ensure sync
        setTrades(loadTradesForDate(todayISO));
    };

    const handleDeleteTrade = (e: React.MouseEvent, tradeId: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this trade?")) {
            deleteTrade(tradeId, todayISO);
            setTrades(prev => prev.filter(t => t.id !== tradeId));
            if (activeTrade?.id === tradeId) {
                // Return to list if we deleted the active trade
                setActiveTrade(null);
                setViewMode("list");
            }
        }
    };

    // --- Render logic for the Active Trade ---
    // (Most logic from previous v3 implementation, adapted for activeTrade state)

    // Use a derived state for smallestFrame to separate hooks from conditional rendering risk?
    // Actually, we can just compute it inline since activeTrade might be null.

    // helper to update active trade
    const updateActiveTrade = (patch: Partial<MtfTrade>) => {
        setActiveTrade(prev => prev ? ({ ...prev, ...patch }) : null);
    };

    const updateFrame = (frameId: string, patch: Partial<MtfFrame>) => {
        setActiveTrade(prev => {
            if (!prev) return null;
            return {
                ...prev,
                frames: prev.frames.map(f => f.id === frameId ? { ...f, ...patch } : f)
            };
        });
    };

    // State for frame tab
    const [activeFrameId, setActiveFrameId] = useState<string>("0");
    // State for result input (managed locally while editing)
    const [resultRInput, setResultRInput] = useState("");

    // Sync internal UI states when activeTrade changes
    useEffect(() => {
        if (activeTrade) {
            // Default to first frame if ID not found, etc.
            if (!activeTrade.frames.find(f => f.id === activeFrameId)) {
                setActiveFrameId(activeTrade.frames[0]?.id ?? "0");
            }
            if (activeTrade.resultR != null) {
                setResultRInput(String(activeTrade.resultR));
            } else {
                setResultRInput("");
            }
        }
    }, [activeTrade?.id]); // Only reset when switching trades

    // Smallest frame helper
    const smallestFrame = activeTrade
        ? (activeTrade.frames[activeTrade.frames.length - 1] ?? activeTrade.frames[0])
        : null;

    const handleSavePreTrade = () => {
        if (!activeTrade) return;
        updateActiveTrade({ preSaved: true });
        setViewMode(hasPostReview(activeTrade) ? "postSummary" : "preSummary");
    };

    const handleSavePostTrade = () => {
        if (!activeTrade) return;
        const cleaned = resultRInput.replace(",", ".").trim();
        const value = cleaned === "" || Number.isNaN(Number(cleaned)) ? null : Number(cleaned);

        updateActiveTrade({ resultR: value });
        setViewMode("postSummary");
    };

    // --- UI Components ---

    const renderBiasToggle = (current: Bias3, onChange: (b: Bias3) => void) => (
        <div style={{ display: "flex", gap: 8 }}>
            {biasOptions.map((b) => {
                const active = current === b;
                return (
                    <button
                        key={b}
                        type="button"
                        onClick={() => onChange(b)}
                        style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: active ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                            backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
                            fontSize: 13,
                            fontWeight: 500,
                        }}
                    >
                        {b}
                    </button>
                );
            })}
        </div>
    );

    const renderOutcomeToggle = (current: Outcome | undefined, onChange: (o: Outcome) => void) => (
        <div style={{ display: "flex", gap: 8 }}>
            {outcomeOptions.map((o) => {
                const active = current === o;
                return (
                    <button
                        key={o}
                        type="button"
                        onClick={() => onChange(o)}
                        style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: active ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                            backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
                            fontSize: 13,
                            fontWeight: 500,
                        }}
                    >
                        {o}
                    </button>
                );
            })}
        </div>
    );

    // --- View: List of Trades ---

    const renderTradeList = () => {
        return (
            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600 }}>Trades</h2>
                    {/* This section left empty, button is in main header */}
                </div>

                {trades.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                        No trades recorded for today. Click "+ Add Trade" to start.
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
                                <th style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>Symbol</th>
                                <th style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>Bias</th>
                                <th style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>Status</th>
                                <th style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>Outcome</th>
                                <th style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>Result (R)</th>
                                <th style={{ padding: "12px 8px", color: "var(--text-secondary)", width: 40 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map(trade => (
                                <tr
                                    key={trade.id}
                                    onClick={() => handleSelectTrade(trade)}
                                    style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F9FAFB"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <td style={{ padding: "12px 8px", fontWeight: 500 }}>{trade.symbol}</td>
                                    <td style={{ padding: "12px 8px" }}>
                                        <span style={{
                                            padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                                            backgroundColor: trade.tradeBias === "Long" ? "#ECFDF5" : trade.tradeBias === "Short" ? "#FEF2F2" : "#F3F4F6",
                                            color: trade.tradeBias === "Long" ? "#047857" : trade.tradeBias === "Short" ? "#B91C1C" : "#4B5563"
                                        }}>
                                            {trade.tradeBias}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 8px" }}>
                                        {trade.preSaved ? (hasPostReview(trade) ? "Completed" : "Open") : "Drafting"}
                                    </td>
                                    <td style={{ padding: "12px 8px" }}>
                                        {trade.outcome ? (
                                            <span style={{ fontWeight: 600, color: trade.outcome === "TP" ? "#047857" : trade.outcome === "SL" ? "#B91C1C" : "#D97706" }}>
                                                {trade.outcome}
                                            </span>
                                        ) : "—"}
                                    </td>
                                    <td style={{ padding: "12px 8px", fontWeight: 600 }}>
                                        {trade.resultR != null ? `${trade.resultR}R` : "—"}
                                    </td>
                                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                                        <button
                                            onClick={(e) => handleDeleteTrade(e, trade.id)}
                                            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 16 }}
                                            title="Delete Trade"
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        )
    };

    // --- Detail Views (similar to before, but using activeTrade) ---

    const SYMBOL_OPTIONS = ["XAUUSD", "EURUSD", "GBPUSD", "DXY", "BTCUSD", "ETHUSD", "NQ", "ES"];

    // ... (rest of imports)

    // ... inside TodayPage component ...

    const renderPreTradeEditing = () => {
        if (!activeTrade) return null;
        const activeFrame = activeTrade.frames.find((f) => f.id === activeFrameId) ?? activeTrade.frames[0];

        // Combined list of symbols for dropdown
        const allSymbols = [
            "XAUUSD", "EURUSD", "GBPUSD", "DXY", "BTCUSD", "ETHUSD", "NQ", "ES", "US30", "GER30"
        ];
        // Standard sort or custom order requested: "en önde gold eur olsun" -> XAUUSD, EURUSD...
        // so I will keep the custom order above.

        return (
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <button onClick={handleBackToList} style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer", padding: 0 }}>←</button>
                            <h2 style={{ fontSize: 16, fontWeight: 600 }}>New Trade Plan</h2>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{todayISO}</p>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Trade bias</span>
                            <div>{renderBiasToggle(activeTrade.tradeBias, (b) => updateActiveTrade({ tradeBias: b }))}</div>
                        </div>
                        <button
                            onClick={(e) => handleDeleteTrade(e, activeTrade.id)}
                            style={{ color: "#EF4444", background: "none", border: "none", fontSize: 12, cursor: "pointer", textDecoration: "underline", alignSelf: "center" }}
                        >
                            Delete
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Symbol</label>
                    <select
                        value={activeTrade.symbol}
                        onChange={(e) => updateActiveTrade({ symbol: e.target.value })}
                        style={{
                            width: 260,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--border-subtle)",
                            fontSize: 13,
                            backgroundColor: "#FFFFFF"
                        }}
                    >
                        {allSymbols.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {activeTrade.frames.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFrameId(f.id)}
                            style={{
                                padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
                                border: f.id === activeFrameId ? "1px solid #FB923C" : "1px solid var(--border-subtle)",
                                backgroundColor: f.id === activeFrameId ? "#FFF7ED" : "#FFFFFF",
                            }}
                        >
                            {f.timeframe}
                        </button>
                    ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.4fr)", gap: 24 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Chart link</label>
                        <input
                            value={activeFrame.link}
                            onChange={(e) => updateFrame(activeFrame.id, { link: e.target.value })}
                            placeholder="TradingView snapshot URL..."
                            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)", fontSize: 13, marginBottom: 12 }}
                        />
                        {renderChartPreview(activeFrame.link, `${activeTrade.symbol} ${activeFrame.timeframe} plan`)}
                    </div>
                    <div>
                        <div style={{ marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{activeFrame.timeframe} bias</span>
                            {renderBiasToggle(activeFrame.bias, (b) => updateFrame(activeFrame.id, { bias: b }))}
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Notes</label>
                            <textarea
                                value={activeFrame.notes}
                                onChange={(e) => updateFrame(activeFrame.id, { notes: e.target.value })}
                                rows={10}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)", fontSize: 13, resize: "vertical" }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={handleSavePreTrade} style={{ backgroundColor: "var(--accent-primary)", color: "#FFFFFF", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                        Save pre-trade plan
                    </button>
                </div>
            </div>
        );
    };

    const renderPreTradeSummary = () => {
        if (!activeTrade || !smallestFrame) return null;
        return (
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={handleBackToList} style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer", padding: 0 }}>←</button>
                            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{activeTrade.symbol} Plan</h2>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 24 }}>Showing {smallestFrame.timeframe} view</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Trade Bias</span>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid var(--border-subtle)", backgroundColor: "#F3F4F6", fontSize: 12, fontWeight: 600 }}>
                            {activeTrade.tradeBias}
                        </span>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3.5fr) minmax(0, 1.2fr)", gap: 24 }}>
                    <div>{renderChartPreview(smallestFrame.link, `${activeTrade.symbol} ${smallestFrame.timeframe} plan`)}</div>
                    <div>
                        <div style={{ marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{smallestFrame.timeframe} notes</span></div>
                        <div style={{ borderRadius: 8, border: "1px solid var(--border-subtle)", padding: 8, fontSize: 13, minHeight: 120, whiteSpace: "pre-wrap" }}>
                            {smallestFrame.notes || <span style={{ color: "var(--text-secondary)" }}>No notes.</span>}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
                    <button onClick={() => setViewMode("editingPre")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", backgroundColor: "#FFFFFF", fontSize: 13 }}>Edit plan</button>
                    <div>
                        <button onClick={(e) => handleDeleteTrade(e, activeTrade.id)} style={{ color: "#EF4444", background: "none", border: "none", fontSize: 12, cursor: "pointer", marginRight: 16 }}>Delete</button>
                        <button onClick={() => setViewMode("editingPost")} style={{ backgroundColor: "#111827", color: "#FFFFFF", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Trade closed → Review</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderPostTradeEditing = () => {
        if (!activeTrade) return null;
        return (
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={handleBackToList} style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer", padding: 0 }}>←</button>
                            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Post-trade Review</h2>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 24 }}>{activeTrade.symbol}</p>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <button onClick={(e) => handleDeleteTrade(e, activeTrade.id)} style={{ color: "#EF4444", background: "none", border: "none", fontSize: 12, cursor: "pointer" }}>Delete</button>
                        <button onClick={() => setViewMode(hasPostReview(activeTrade) ? "postSummary" : "preSummary")} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", backgroundColor: "#FFFFFF", fontSize: 12 }}>Cancel</button>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 2fr)", gap: 24 }}>
                    <div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Outcome</label>
                            {renderOutcomeToggle(activeTrade.outcome, (o) => updateActiveTrade({ outcome: o }))}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Result (R)</label>
                            <input value={resultRInput} onChange={(e) => setResultRInput(e.target.value)} placeholder="1.0, -0.5..." style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)", fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Exit chart link</label>
                            <input value={activeTrade.exitLink ?? ""} onChange={(e) => updateActiveTrade({ exitLink: e.target.value })} placeholder="URL..." style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)", fontSize: 13, marginBottom: 12 }} />
                            {renderChartPreview(activeTrade.exitLink ?? "", "Exit snapshot")}
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Learnings & Notes</label>
                        <textarea value={activeTrade.exitNotes ?? ""} onChange={(e) => updateActiveTrade({ exitNotes: e.target.value })} rows={16} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)", fontSize: 13, resize: "vertical" }} />
                    </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={handleSavePostTrade} style={{ backgroundColor: "var(--accent-primary)", color: "#FFFFFF", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Save Review</button>
                </div>
            </div>
        );
    };

    const renderPostTradeSummary = () => {
        if (!activeTrade) return null;
        return (
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={handleBackToList} style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer", padding: 0 }}>←</button>
                            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Review Summary</h2>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 24 }}>{activeTrade.symbol}</p>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <button onClick={(e) => handleDeleteTrade(e, activeTrade.id)} style={{ color: "#EF4444", background: "none", border: "none", fontSize: 12, cursor: "pointer" }}>Delete</button>
                        <button onClick={() => setViewMode("editingPost")} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)", backgroundColor: "#F3F4F6", fontSize: 12 }}>Edit Review</button>

                        {/* Right arrow "Done" button */}
                        <button
                            onClick={handleBackToList}
                            title="Back to Journal List"
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: 32, height: 32, borderRadius: "50%",
                                backgroundColor: "var(--accent-primary)", color: "#fff",
                                border: "none", cursor: "pointer",
                                fontSize: 16
                            }}
                        >
                            →
                        </button>
                    </div>
                </div>

                {/* Large Exit Chart Preview */}
                <div style={{ marginBottom: 16 }}>
                    {renderChartPreview(activeTrade.exitLink ?? "", "Exit")}
                </div>

                {/* Compact Info & Notes - "Sıkıştırılmış" Layout */}
                <div style={{
                    display: "flex",
                    gap: 16,
                    backgroundColor: "#F9FAFB",
                    borderRadius: 8,
                    padding: 12,
                    border: "1px solid var(--border-subtle)",
                    alignItems: "flex-start"
                }}>
                    {/* Compact Stats Column */}
                    <div style={{
                        flexShrink: 0,
                        width: 140,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        borderRight: "1px solid var(--border-subtle)",
                        paddingRight: 16
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Outcome</span>
                            <span style={{ fontWeight: 700, fontSize: 14, color: activeTrade.outcome === "TP" ? "var(--color-green)" : activeTrade.outcome === "SL" ? "var(--color-red)" : "var(--text-primary)" }}>{activeTrade.outcome}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Result</span>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{activeTrade.resultR} R</span>
                        </div>
                    </div>

                    {/* Notes Area - Expanding to fill rest */}
                    <div style={{ flex: 1, minHeight: 60 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase" }}>Notes</div>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.4, color: "#374151" }}>
                            {activeTrade.exitNotes || <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>No notes added.</span>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Lightbox state ---
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Close lightbox on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setLightboxImage(null);
            }
        };
        if (lightboxImage) {
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxImage]);

    const renderChartPreview = (url: string, alt: string) => {
        if (!url) {
            return (
                <div style={{
                    width: "100%", height: 600, backgroundColor: "#F9FAFB", borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-tertiary)", fontSize: 13, border: "1px dashed var(--border-subtle)"
                }}>
                    No chart preview
                </div>
            );
        }
        return (
            <div
                style={{
                    borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-subtle)",
                    height: 600, backgroundColor: "#F9FAFB", position: "relative",
                    cursor: "zoom-in", display: "flex", alignItems: "center", justifyContent: "center"
                }}
                onClick={() => setLightboxImage(url)}
            >
                {/* Background blur effect for "nice transition" feel even in preview */}
                <div
                    style={{
                        position: "absolute", inset: 0,
                        backgroundImage: `url(${url})`, backgroundSize: "cover",
                        filter: "blur(20px)", opacity: 0.3, zIndex: 0
                    }}
                />

                <img
                    src={url}
                    alt={alt}
                    style={{
                        maxWidth: "100%", maxHeight: "100%",
                        objectFit: "contain", position: "relative", zIndex: 1,
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}
                />
            </div>
        );
    };

    // Assuming renderValidationErrors is defined elsewhere or not relevant to this snippet.
    // const renderValidationErrors = () => { /* ... existing ... */ };


    return (
        <div className="page-container">
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>

            {/* Header & Trade List */}
            {viewMode === "list" && (
                <>
                    <div className="page-header" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h1 className="page-title">Today</h1>
                            <p className="page-subtitle">Today's trades ({todayISO})</p>
                        </div>
                        <button onClick={handleCreateTrade} style={{ backgroundColor: "#111827", color: "#FFFFFF", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>+ Add Trade</button>
                    </div>
                    {renderTradeList()}
                </>
            )}

            {/* Detail Views */}
            {(viewMode === "editingPre" || viewMode === "editingPost" || viewMode === "preSummary" || viewMode === "postSummary") && (
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    {viewMode === "editingPre" && renderPreTradeEditing()}
                    {viewMode === "preSummary" && renderPreTradeSummary()}
                    {viewMode === "editingPost" && renderPostTradeEditing()}
                    {viewMode === "postSummary" && renderPostTradeSummary()}
                </div>
            )}

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(12px)",
                        zIndex: 9999,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "zoom-out",
                        animation: "fadeIn 0.25s ease-out"
                    }}
                    onClick={() => setLightboxImage(null)}
                >
                    <img
                        src={lightboxImage}
                        style={{
                            maxWidth: "98vw", maxHeight: "98vh",
                            objectFit: "contain", borderRadius: 4,
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                        }}
                    />
                </div>
            )}
        </div>
    );
};


// src/renderer/src/pages/TodayPage.tsx
import React, { useEffect, useState } from "react";
import type { Trade, Direction, ReviewStatus } from "../types";
import { getTrades, addTrade } from "../utils/tradeStorage";

const directions: Direction[] = ["Long", "Short"];
const statuses: ReviewStatus[] = ["Pending", "Reviewed"];

export const TodayPage: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [showModal, setShowModal] = useState(false);

    const [symbol, setSymbol] = useState("XAUUSD");
    const [dir, setDir] = useState<Direction>("Long");
    const [resultR, setResultR] = useState<string>("1.0");
    const [time, setTime] = useState("09:30");
    const [status, setStatus] = useState<ReviewStatus>("Pending");

    const todayISO = new Date().toISOString().slice(0, 10);

    useEffect(() => {
        (async () => {
            const all = await getTrades();
            setTrades(all);
        })();
    }, []);

    const handleAddTrade = async (e: React.FormEvent) => {
        e.preventDefault();

        const parsedR = Number(resultR.replace(",", "."));
        if (Number.isNaN(parsedR)) {
            alert("Result (R) must be a number.");
            return;
        }

        const newTrade: Trade = {
            id: crypto.randomUUID(),
            date: todayISO,
            symbol: symbol.trim().toUpperCase(),
            dir,
            resultR: parsedR,
            time,
            status,
        };

        await addTrade(newTrade);
        setTrades((prev) => [...prev, newTrade]);
        setShowModal(false);
    };

    const todaysTrades = trades.filter((t) => t.date === todayISO);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Today</h1>
                <p className="page-subtitle">Today&apos;s trades &amp; review ({todayISO})</p>
            </div>

            <div
                style={{
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "flex-end",
                }}
            >
                <button style={styles.addBtn} onClick={() => setShowModal(true)}>
                    + Add trade
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.headerRow}>
                            <th style={styles.th}>Symbol</th>
                            <th style={styles.th}>Direction</th>
                            <th style={styles.th}>Result (R)</th>
                            <th style={styles.th}>Time</th>
                            <th style={styles.th}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todaysTrades.map((trade) => (
                            <tr key={trade.id} style={styles.row}>
                                <td style={styles.td}>{trade.symbol}</td>
                                <td style={styles.td}>
                                    <span
                                        style={{
                                            ...styles.badge,
                                            backgroundColor:
                                                trade.dir === "Long" ? "#ECFDF5" : "#FEF2F2",
                                            color: trade.dir === "Long" ? "#059669" : "#DC2626",
                                        }}
                                    >
                                        {trade.dir}
                                    </span>
                                </td>
                                <td
                                    style={{
                                        ...styles.td,
                                        fontWeight: 600,
                                        color:
                                            trade.resultR >= 0
                                                ? "var(--color-green)"
                                                : "var(--color-red)",
                                    }}
                                >
                                    {trade.resultR.toFixed(2)} R
                                </td>
                                <td style={styles.td}>{trade.time}</td>
                                <td style={styles.td}>{trade.status}</td>
                            </tr>
                        ))}

                        {todaysTrades.length === 0 && (
                            <tr>
                                <td style={styles.emptyTd} colSpan={5}>
                                    Today you have no trades yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div style={styles.modalOverlay}>
                    <div className="card" style={styles.modalContent}>
                        <h3 style={{ marginBottom: 12 }}>New trade</h3>
                        <form onSubmit={handleAddTrade} style={styles.form}>
                            <div style={styles.formRow}>
                                <label style={styles.label}>Symbol</label>
                                <input
                                    style={styles.input}
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                />
                            </div>

                            <div style={styles.formRow}>
                                <label style={styles.label}>Direction</label>
                                <select
                                    style={styles.input}
                                    value={dir}
                                    onChange={(e) => setDir(e.target.value as Direction)}
                                >
                                    {directions.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formRow}>
                                <label style={styles.label}>Result (R)</label>
                                <input
                                    style={styles.input}
                                    value={resultR}
                                    onChange={(e) => setResultR(e.target.value)}
                                    placeholder="1.5, -0.5..."
                                />
                            </div>

                            <div style={styles.formRow}>
                                <label style={styles.label}>Time</label>
                                <input
                                    style={styles.input}
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    placeholder="09:30"
                                />
                            </div>

                            <div style={styles.formRow}>
                                <label style={styles.label}>Status</label>
                                <select
                                    style={styles.input}
                                    value={status}
                                    onChange={(e) =>
                                        setStatus(e.target.value as ReviewStatus)
                                    }
                                >
                                    {statuses.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div
                                style={{
                                    marginTop: 12,
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: 8,
                                }}
                            >
                                <button
                                    type="button"
                                    style={styles.cancelBtn}
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" style={styles.saveBtn}>
                                    Save trade
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 14,
    },
    headerRow: {
        backgroundColor: "#F9FAFB",
        borderBottom: "1px solid var(--border-subtle)",
    },
    th: {
        textAlign: "left",
        padding: "16px 24px",
        fontWeight: 600,
        color: "var(--text-secondary)",
    },
    row: {
        borderBottom: "1px solid var(--border-subtle)",
    },
    td: {
        padding: "16px 24px",
        color: "var(--text-primary)",
    },
    emptyTd: {
        padding: "16px 24px",
        color: "var(--text-secondary)",
        textAlign: "center",
    },
    badge: {
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
    },
    addBtn: {
        backgroundColor: "var(--accent-primary)",
        color: "#ffffff",
        padding: "8px 16px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
    },
    modalContent: {
        width: 420,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    formRow: {
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
        width: "100%",
        padding: "8px 10px",
        borderRadius: 6,
        border: "1px solid var(--border-subtle)",
        fontSize: 13,
        fontFamily: "inherit",
        outline: "none",
    },
    cancelBtn: {
        backgroundColor: "#F3F4F6",
        color: "var(--text-primary)",
        padding: "8px 14px",
        borderRadius: 6,
        fontSize: 13,
    },
    saveBtn: {
        backgroundColor: "var(--accent-primary)",
        color: "#ffffff",
        padding: "8px 14px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
    },
};

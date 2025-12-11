import React, { useState, useEffect } from "react";
import type { Achievement, CurrencyCode, AchievementType, AccountStatus } from "../types/achievements";
import {
    loadAchievements,
    addAchievement,
    removeAchievement,
    getTotals,
} from "../utils/achievementsStorage";

const currencyOptions: CurrencyCode[] = ["USD", "EUR", "GBP", "Other"];
const statusOptions: AccountStatus[] = ["Phase 1", "Phase 2", "Funded", "Lost"];

export const AchievementsPage: React.FC = () => {
    const [items, setItems] = useState<Achievement[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form Type
    const [addType, setAddType] = useState<AchievementType>("account");

    // Form Fields
    const [firm, setFirm] = useState("");
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState(""); // Shared for Size or Payout
    const [currency, setCurrency] = useState<CurrencyCode>("USD");
    const [status, setStatus] = useState<AccountStatus>("Phase 1"); // For Account
    const [imageUrl, setImageUrl] = useState(""); // For Payout
    const [date, setDate] = useState("");

    useEffect(() => {
        setItems(loadAchievements());
    }, []);

    const totals = getTotals(items);

    const handleAdd = () => {
        if (!firm && !title) return;

        const now = new Date();
        const id = String(now.getTime());
        const numAmount = Number(amount) || 0;

        const newItem: Achievement = {
            id,
            type: addType,
            firm: firm || "Unknown Firm",
            title: title || (addType === "account" ? "New Account" : "Payout"),
            currency,
            date: date || now.toISOString().slice(0, 10),

            // Type specific
            accountSize: addType === "account" ? numAmount : 0,
            status: addType === "account" ? status : "Funded", // Payouts don't use status, default safe

            payoutAmount: addType === "payout" ? numAmount : 0,
            imageUrl: addType === "payout" ? imageUrl : undefined,
        };

        const next = addAchievement(newItem);
        setItems(next);
        setIsAddOpen(false);
        resetForm();
    };

    const handleRemove = (id: string) => {
        if (confirm("Are you sure?")) {
            const next = removeAchievement(id);
            setItems(next);
        }
    };

    const resetForm = () => {
        setFirm("");
        setTitle("");
        setAmount("");
        setImageUrl("");
        setDate("");
        setStatus("Phase 1");
    };

    // Filter lists
    const accounts = items.filter(i => !i.type || i.type === "account"); // Legacy fallback
    const payouts = items.filter(i => i.type === "payout");

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <h1 className="page-title">Achievements</h1>
                    <p className="page-subtitle">Track your funding journey & rewards</p>
                </div>
                <button
                    className="btn-primary"
                    style={{
                        backgroundColor: "var(--accent-primary)",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14
                    }}
                    onClick={() => setIsAddOpen(true)}
                >
                    + Add New
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>
                        Total Funded Capital
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
                        ${totals.totalFunded.toLocaleString()}
                    </div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>
                        Total Payouts
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-green)" }}>
                        ${totals.totalPayout.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Accounts Section */}
            <div style={{ marginBottom: 40 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Funded Accounts</h3>
                {accounts.length === 0 ? (
                    <div style={{ color: "var(--text-secondary)", fontSize: 14, fontStyle: "italic" }}>No accounts added yet.</div>
                ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                        {accounts.map(acc => (
                            <div key={acc.id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 8,
                                        backgroundColor: "var(--bg-subtle)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontWeight: 700, color: "var(--text-secondary)", fontSize: 18
                                    }}>
                                        {acc.firm.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 15 }}>{acc.firm}</div>
                                        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{acc.title} • {acc.accountSize.toLocaleString()} {acc.currency}</div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <StatusBadge status={acc.status || "Phase 1"} />
                                    <button
                                        onClick={() => handleRemove(acc.id)}
                                        style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-secondary)", opacity: 0.5 }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Payouts Gallery */}
            <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Payout Gallery</h3>
                {payouts.length === 0 ? (
                    <div style={{ color: "var(--text-secondary)", fontSize: 14, fontStyle: "italic" }}>No payouts recorded yet. Keep pushing!</div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
                        {payouts.map(pay => (
                            <div key={pay.id} className="card" style={{ overflow: "hidden", padding: 0 }}>
                                <div style={{ height: 160, backgroundColor: "#000", position: "relative" }}>
                                    {pay.imageUrl ? (
                                        <img src={pay.imageUrl} alt="Proof" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
                                            No Image
                                        </div>
                                    )}
                                    <div style={{
                                        position: "absolute", top: 10, right: 10,
                                        backgroundColor: "rgba(0,0,0,0.7)", color: "white",
                                        padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600
                                    }}>
                                        {pay.date}
                                    </div>
                                </div>
                                <div style={{ padding: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{pay.firm}</span>
                                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--color-green)" }}>
                                            +{pay.payoutAmount?.toLocaleString()} {pay.currency}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{pay.title}</span>
                                        <button
                                            onClick={() => handleRemove(pay.id)}
                                            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 11 }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {isAddOpen && (
                <div style={{
                    position: "fixed", inset: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 999
                }}>
                    <div className="card" style={{
                        width: 500, padding: 0, overflow: "hidden",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        border: "1px solid var(--border-subtle)"
                    }}>
                        <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", backgroundColor: "#f9fafb" }}>
                            <button
                                style={{
                                    flex: 1, padding: "16px 0",
                                    background: addType === "account" ? "#fff" : "transparent",
                                    border: "none",
                                    borderBottom: addType === "account" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    color: addType === "account" ? "var(--accent-primary)" : "var(--text-secondary)",
                                    fontSize: 14,
                                    transition: "all 0.2s"
                                }}
                                onClick={() => setAddType("account")}
                            >
                                Funded Account
                            </button>
                            <button
                                style={{
                                    flex: 1, padding: "16px 0",
                                    background: addType === "payout" ? "#fff" : "transparent",
                                    border: "none",
                                    borderBottom: addType === "payout" ? "2px solid var(--color-green)" : "2px solid transparent",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    color: addType === "payout" ? "var(--color-green)" : "var(--text-secondary)",
                                    fontSize: 14,
                                    transition: "all 0.2s"
                                }}
                                onClick={() => setAddType("payout")}
                            >
                                Payout
                            </button>
                        </div>

                        <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
                            {/* Firm */}
                            <div>
                                <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Prop Firm</label>
                                <input
                                    className="input"
                                    placeholder="e.g. FTMO, MyForexFunds"
                                    style={{ width: "100%", padding: "10px 12px" }}
                                    value={firm}
                                    onChange={e => setFirm(e.target.value)}
                                />
                            </div>

                            {/* Title */}
                            <div>
                                <label className="form-label" style={{ marginBottom: 6, display: "block" }}>
                                    {addType === "account" ? "Challenge Title" : "Payout Title"}
                                </label>
                                <input
                                    className="input"
                                    placeholder={addType === "account" ? "200k Swing Challenge" : "First Withdrawal"}
                                    style={{ width: "100%", padding: "10px 12px" }}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>

                            {/* Amount Row */}
                            <div style={{ display: "flex", gap: 16 }}>
                                <div style={{ flex: 2 }}>
                                    <label className="form-label" style={{ marginBottom: 6, display: "block" }}>
                                        {addType === "account" ? "Account Size" : "Payout Amount"}
                                    </label>
                                    <div style={{ position: "relative" }}>
                                        <span style={{ position: "absolute", left: 12, top: 10, color: "var(--text-secondary)" }}>$</span>
                                        <input
                                            className="input"
                                            type="number"
                                            placeholder="0.00"
                                            style={{ width: "100%", padding: "10px 12px 10px 24px" }}
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Currency</label>
                                    <select
                                        className="input"
                                        style={{ width: "100%", padding: "10px 12px" }}
                                        value={currency}
                                        onChange={e => setCurrency(e.target.value as CurrencyCode)}
                                    >
                                        {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Type Specific */}
                            {addType === "account" ? (
                                <div>
                                    <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Current Status</label>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {statusOptions.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setStatus(s as AccountStatus)}
                                                style={{
                                                    padding: "6px 12px",
                                                    borderRadius: 6,
                                                    border: status === s ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                                                    background: status === s ? "var(--bg-active)" : "white",
                                                    color: status === s ? "var(--accent-primary)" : "var(--text-secondary)",
                                                    cursor: "pointer",
                                                    fontSize: 13,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Proof Image URL</label>
                                    <input
                                        className="input"
                                        placeholder="https://i.imgur.com/..."
                                        style={{ width: "100%", padding: "10px 12px" }}
                                        value={imageUrl}
                                        onChange={e => setImageUrl(e.target.value)}
                                    />
                                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                                        Paste a direct link to your Certificate or Payout screenshot (PNG/JPG).
                                    </div>
                                </div>
                            )}

                            {/* Date */}
                            <div>
                                <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Date</label>
                                <input
                                    className="input"
                                    type="date"
                                    style={{ width: "100%", padding: "10px 12px" }}
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ padding: "20px 32px", background: "#f9fafb", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                            <button
                                className="btn-ghost"
                                onClick={() => setIsAddOpen(false)}
                                style={{ padding: "8px 16px" }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleAdd}
                                style={{
                                    backgroundColor: addType === "account" ? "var(--accent-primary)" : "var(--color-green)",
                                    color: "white",
                                    padding: "8px 20px",
                                    borderRadius: 6,
                                    border: "none",
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: "pointer",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                }}
                            >
                                Save {addType === "account" ? "Account" : "Payout"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge: React.FC<{ status: AccountStatus }> = ({ status }) => {
    let color = "#6B7280";
    let bg = "rgba(107, 114, 128, 0.1)";

    switch (status) {
        case "Funded":
            color = "#10B981";
            bg = "rgba(16, 185, 129, 0.15)";
            break;
        case "Phase 2":
            color = "#F59E0B";
            bg = "rgba(245, 158, 11, 0.15)";
            break;
        case "Phase 1":
            color = "#3B82F6";
            bg = "rgba(59, 130, 246, 0.15)";
            break;
        case "Lost":
            color = "#EF4444";
            bg = "rgba(239, 68, 68, 0.15)";
            break;
    }

    return (
        <span style={{
            color, backgroundColor: bg,
            padding: "4px 8px", borderRadius: 4,
            fontSize: 12, fontWeight: 600
        }}>
            {status}
        </span>
    );
};

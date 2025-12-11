```
import React, { useState, useEffect } from "react";
import type { Achievement, CurrencyCode } from "../types/achievements";
import {
    loadAchievements,
    addAchievement,
    removeAchievement,
    getTotals,
} from "../utils/achievementsStorage";

const currencyOptions: { value: CurrencyCode; label: string }[] = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
    { value: "Other", label: "Other" },
];

export const AchievementsPage: React.FC = () => {
    const [items, setItems] = useState<Achievement[]>([]);
    const [firm, setFirm] = useState("");
    const [title, setTitle] = useState("");
    const [accountSize, setAccountSize] = useState("");
    const [payout, setPayout] = useState("");
    const [currency, setCurrency] = useState<CurrencyCode>("USD");
    const [imageUrl, setImageUrl] = useState("");
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        setItems(loadAchievements());
    }, []);

    const handleAdd = () => {
        if (!firm.trim() && !title.trim()) return;

        const now = new Date();
        const id = String(now.getTime());

        const newItem: Achievement = {
            id,
            firm: firm.trim() || "Unknown",
            title: title.trim() || "Funded account",
            accountSize: Number(accountSize) || 0,
            payout: Number(payout) || 0,
            currency,
            imageUrl: imageUrl.trim() || undefined,
            date: date || undefined,
            notes: notes.trim() || undefined,
        };

        const next = addAchievement(newItem);
        setItems(next);

        // formu temizle
        setFirm("");
        setTitle("");
        setAccountSize("");
        setPayout("");
        setImageUrl("");
        setDate("");
        setNotes("");
    };

    const handleRemove = (id: string) => {
        const next = removeAchievement(id);
        setItems(next);
    };

    const totals = getTotals(items);

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Achievements</h1>
                <p className="page-subtitle">Track your funded accounts & payouts</p>
            </div>

            <div className="card" style={{ padding: "20px 24px" }}>
                {/* Header totals */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 12,
                        marginBottom: 20,
                    }}
                >
                    <div
                        style={{
                            padding: "12px 14px",
                            borderRadius: 8,
                            background: "var(--bg-subtle)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                                color: "var(--text-secondary)",
                                fontWeight: 600,
                            }}
                        >
                            Total funded size
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>
                            {totals.totalFunded.toLocaleString()}{" "}
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                (sum of account sizes)
                            </span>
                        </span>
                    </div>

                    <div
                        style={{
                            padding: "12px 14px",
                            borderRadius: 8,
                            background: "var(--bg-subtle)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                                color: "var(--text-secondary)",
                                fontWeight: 600,
                            }}
                        >
                            Total payouts
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>
                            {totals.totalPayout.toLocaleString()}{" "}
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                (sum of payouts)
                            </span>
                        </span>
                    </div>
                </div>

                {/* Add new achievement form */}
                <div
                    style={{
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 10,
                        padding: 16,
                        marginBottom: 20,
                        display: "grid",
                        gridTemplateColumns: "3fr 2fr",
                        gap: 12,
                    }}
                >
                    {/* Left column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Prop firm / broker</label>
                                <input
                                    className="input"
                                    value={firm}
                                    onChange={(e) => setFirm(e.target.value)}
                                    placeholder="FTMO, MyForexFunds..."
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Title</label>
                                <input
                                    className="input"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="200k Challenge Passed"
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Account size</label>
                                <input
                                    className="input"
                                    type="number"
                                    value={accountSize}
                                    onChange={(e) => setAccountSize(e.target.value)}
                                    placeholder="200000"
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Payout</label>
                                <input
                                    className="input"
                                    type="number"
                                    value={payout}
                                    onChange={(e) => setPayout(e.target.value)}
                                    placeholder="3500"
                                />
                            </div>
                            <div style={{ width: 110 }}>
                                <label className="form-label">Currency</label>
                                <select
                                    className="input"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                                >
                                    {currencyOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">Image URL (PNG/JPG)</label>
                                <input
                                    className="input"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            <div style={{ width: 140 }}>
                                <label className="form-label">Date</label>
                                <input
                                    className="input"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Notes (optional)</label>
                            <textarea
                                className="input"
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Short note about this payout / account..."
                            />
                        </div>

                        <div style={{ marginTop: 8 }}>
                            <button
                                className="btn btn-primary"
                                type="button"
                                onClick={handleAdd}
                            >
                                + Add achievement
                            </button>
                        </div>
                    </div>

                    {/* Right column – small preview */}
                    <div
                        style={{
                            borderLeft: "1px dashed var(--border-subtle)",
                            paddingLeft: 12,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 12,
                                color: "var(--text-secondary)",
                                marginBottom: 4,
                            }}
                        >
                            Preview
                        </span>
                        {imageUrl ? (
                            <div
                                style={{
                                    borderRadius: 10,
                                    overflow: "hidden",
                                    border: "1px solid var(--border-subtle)",
                                    maxHeight: 200,
                                }}
                            >
                                <img
                                    src={imageUrl}
                                    alt="Achievement preview"
                                    style={{ width: "100%", display: "block", objectFit: "cover" }}
                                />
                            </div>
                        ) : (
                            <div
                                style={{
                                    borderRadius: 10,
                                    border: "1px dashed var(--border-subtle)",
                                    padding: 12,
                                    fontSize: 12,
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Paste a PNG/JPG URL to preview it here. (Local file upload can be
                                added in a future version.)
                            </div>
                        )}
                    </div>
                </div>

                {/* Existing achievements list */}
                {items.length > 0 && (
                    <>
                        <h3
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                            }}
                        >
                            Saved achievements
                        </h3>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: 13,
                                marginBottom: 16,
                            }}
                        >
                            <thead>
                                <tr>
                                    <th style={thStyle}>Firm</th>
                                    <th style={thStyle}>Title</th>
                                    <th style={thStyle}>Account</th>
                                    <th style={thStyle}>Payout</th>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((a) => (
                                    <tr key={a.id}>
                                        <td style={tdStyle}>{a.firm}</td>
                                        <td style={tdStyle}>{a.title}</td>
                                        <td style={tdStyle}>
                                            {a.accountSize.toLocaleString()} {a.currency}
                                        </td>
                                        <td style={tdStyle}>
                                            {a.payout.toLocaleString()} {a.currency}
                                        </td>
                                        <td style={tdStyle}>{a.date || "—"}</td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => handleRemove(a.id)}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Image gallery */}
                        <h3
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                            }}
                        >
                            Achievement gallery
                        </h3>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                                gap: 12,
                            }}
                        >
                            {items
                                .filter((a) => a.imageUrl)
                                .map((a) => (
                                    <div
                                        key={a.id}
                                        style={{
                                            borderRadius: 10,
                                            border: "1px solid var(--border-subtle)",
                                            overflow: "hidden",
                                            background: "var(--bg-subtle)",
                                        }}
                                    >
                                        <div style={{ maxHeight: 140, overflow: "hidden" }}>
                                            <img
                                                src={a.imageUrl}
                                                alt={a.title}
                                                style={{
                                                    width: "100%",
                                                    display: "block",
                                                    objectFit: "cover",
                                                }}
                                            />
                                        </div>
                                        <div style={{ padding: 8 }}>
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    marginBottom: 2,
                                                }}
                                            >
                                                {a.title}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: "var(--text-secondary)",
                                                }}
                                            >
                                                {a.firm} – {a.payout.toLocaleString()} {a.currency}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </>
                )}

                {items.length === 0 && (
                    <p
                        style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            marginTop: 4,
                        }}
                    >
                        No achievements saved yet. Add your first funded account or payout
                        above.
                    </p>
                )}
            </div>
        </div>
    );
};

const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderBottom: "1px solid var(--border-subtle)",
};

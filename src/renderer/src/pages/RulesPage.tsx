
// src/renderer/src/pages/RulesPage.tsx
import React, { useEffect, useState } from "react";
import {
    getRules,
    saveRules,
    type TradeRule,
} from "../utils/rulesStorage";

export const RulesPage: React.FC = () => {
    const [rules, setRules] = useState<TradeRule[]>([]);
    const [newLabel, setNewLabel] = useState("");

    useEffect(() => {
        setRules(getRules());
    }, []);

    const handleToggleEnabled = (id: string) => {
        setRules((prev) =>
            prev.map((r) =>
                r.id === id ? { ...r, enabled: !r.enabled } : r,
            ),
        );
    };

    const handleWeightChange = (id: string, weight: number) => {
        setRules((prev) =>
            prev.map((r) =>
                r.id === id ? { ...r, weight } : r,
            ),
        );
    };

    const handleLabelChange = (id: string, label: string) => {
        setRules((prev) =>
            prev.map((r) =>
                r.id === id ? { ...r, label } : r,
            ),
        );
    };

    const handleDescriptionChange = (id: string, description: string) => {
        setRules((prev) =>
            prev.map((r) =>
                r.id === id ? { ...r, description } : r,
            ),
        );
    };

    const handleDelete = (id: string) => {
        if (!window.confirm("Bu kuralı silmek istediğine emin misin?")) return;
        setRules((prev) => prev.filter((r) => r.id !== id));
    };

    const handleAddRule = () => {
        const label = newLabel.trim();
        if (!label) return;
        const id = `rule_${Date.now()}`;
        const newRule: TradeRule = {
            id,
            label,
            description: "",
            enabled: true,
            weight: 3,
        };
        setRules((prev) => [...prev, newRule]);
        setNewLabel("");
    };

    const handleSaveAll = () => {
        saveRules(rules);
        alert("Rules saved.");
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Trade Rules</h1>
                <p className="page-subtitle">
                    Günlük disiplinini takip etmek için kişisel kurallarını yaz.
                </p>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Buraya yazdığın kurallar, gün sonunda EOD Review ekranında checklist
                    olarak görünecek. Her kural için uydum/uymadım işaretleyip
                    <strong> discipline score</strong> oluşturabilirsin.
                </p>
            </div>

            {/* Yeni kural ekleme */}
            <div
                className="card"
                style={{
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                }}
            >
                <input
                    style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--border-subtle)",

                        fontSize: 13,
                        backgroundColor: "var(--bg-input)",
                        color: "var(--text-primary)"
                    }}
                    placeholder="Örn: Plan dışı saatlerde işlem açma"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                />
                <button
                    type="button"
                    onClick={handleAddRule}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        backgroundColor: "var(--accent-primary)",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 500,
                    }}
                >
                    + Add Rule
                </button>
            </div>

            {/* Kural listesi */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {rules.length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Henüz kural yok. Yukarıdan yeni kural ekleyebilirsin.
                    </p>
                )}

                {rules.map((rule) => (
                    <div
                        key={rule.id}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "min-content 1fr min-content",
                            gap: 12,
                            alignItems: "flex-start",
                            padding: "8px 0",
                            borderBottom: "1px solid var(--border-subtle)",
                        }}
                    >
                        <div>
                            <input
                                type="checkbox"
                                checked={rule.enabled}
                                onChange={() => handleToggleEnabled(rule.id)}
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <input
                                style={{
                                    padding: "6px 8px",
                                    borderRadius: 6,
                                    border: "1px solid var(--border-subtle)",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    backgroundColor: "var(--bg-input)",
                                    color: "var(--text-primary)"
                                }}
                                value={rule.label}
                                onChange={(e) => handleLabelChange(rule.id, e.target.value)}
                            />
                            <textarea
                                style={{
                                    padding: "6px 8px",
                                    borderRadius: 6,
                                    border: "1px solid var(--border-subtle)",
                                    fontSize: 12,
                                    resize: "vertical",
                                    minHeight: 40,
                                    backgroundColor: "var(--bg-input)",
                                    color: "var(--text-primary)",
                                    fontFamily: "inherit"
                                }}
                                placeholder="İstersen bu kuralı biraz daha detaylandır..."
                                value={rule.description ?? ""}
                                onChange={(e) =>
                                    handleDescriptionChange(rule.id, e.target.value)
                                }
                            />
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                                alignItems: "flex-end",
                            }}
                        >
                            <label
                                style={{
                                    fontSize: 11,
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Weight
                            </label>
                            <select
                                value={rule.weight}
                                onChange={(e) =>
                                    handleWeightChange(rule.id, Number(e.target.value))
                                }
                                style={{
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    border: "1px solid var(--border-subtle)",

                                    fontSize: 12,
                                    backgroundColor: "var(--bg-input)",
                                    color: "var(--text-primary)"
                                }}
                            >
                                {[1, 2, 3, 4, 5].map((w) => (
                                    <option key={w} value={w}>
                                        {w}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => handleDelete(rule.id)}
                                style={{
                                    marginTop: 8,
                                    fontSize: 11,
                                    color: "#EF4444",
                                    backgroundColor: "var(--bg-red-subtle)",
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}

                {rules.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 8,
                                backgroundColor: "var(--accent-primary)",
                                color: "#fff",
                                fontSize: 13,
                                fontWeight: 500,
                            }}
                        >
                            Save All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

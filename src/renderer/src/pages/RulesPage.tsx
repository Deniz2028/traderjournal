import React from "react";
import type { TradeRule } from "../types/tradeRules";
import {
    loadTradeRules,
    addTradeRule,
    removeTradeRule,
    toggleTradeRule,
} from "../utils/tradeRulesStorage";

export const RulesPage: React.FC = () => {
    const [rules, setRules] = React.useState<TradeRule[]>([]);
    const [newRule, setNewRule] = React.useState("");

    React.useEffect(() => {
        setRules(loadTradeRules());
    }, []);

    const handleAdd = () => {
        const next = addTradeRule(newRule);
        setRules(next);
        setNewRule("");
    };

    const handleRemove = (id: string) => {
        const next = removeTradeRule(id);
        setRules(next);
    };

    const handleToggle = (id: string) => {
        const next = toggleTradeRule(id);
        setRules(next);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
        }
    };

    const hasRules = rules.length > 0;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Trade Rules</h1>
                <p className="page-subtitle">
                    Define and maintain your core trading rules. Later we can connect
                    these to your EOD review.
                </p>
            </div>

            {/* Kural ekleme alanı */}
            <div
                className="card"
                style={{
                    marginBottom: 24,
                    padding: "16px 18px",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                }}
            >
                <input
                    style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--border-subtle)",
                        fontSize: 13,
                        fontFamily: "inherit",
                        outline: "none",
                    }}
                    placeholder='Example: "Max 1R per trade", "No trades during red news"...'
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newRule.trim()}
                    style={{
                        backgroundColor: "var(--accent-primary)",
                        color: "#ffffff",
                        padding: "8px 14px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        border: "none",
                        cursor: newRule.trim() ? "pointer" : "not-allowed",
                        opacity: newRule.trim() ? 1 : 0.6,
                    }}
                >
                    + Add rule
                </button>
            </div>

            {/* Kural listesi */}
            <div className="card" style={{ padding: 0 }}>
                {hasRules ? (
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 13,
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={thStyle}>Active</th>
                                <th style={thStyle}>Rule</th>
                                <th style={{ ...thStyle, width: 90 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((rule) => (
                                <tr key={rule.id}>
                                    <td style={tdStyle}>
                                        <label
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 6,
                                                cursor: "pointer",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={rule.isActive}
                                                onChange={() => handleToggle(rule.id)}
                                            />
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    color: "var(--text-secondary)",
                                                }}
                                            >
                                                {rule.isActive ? "On" : "Off"}
                                            </span>
                                        </label>
                                    </td>
                                    <td style={tdStyle}>{rule.text}</td>
                                    <td style={{ ...tdStyle, textAlign: "right" }}>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(rule.id)}
                                            style={{
                                                backgroundColor: "transparent",
                                                border: "none",
                                                fontSize: 12,
                                                color: "var(--text-secondary)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: "14px 16px" }}>
                        <p
                            style={{
                                fontSize: 12,
                                color: "var(--text-secondary)",
                            }}
                        >
                            You don&apos;t have any rules yet. Add your core trading rules
                            above. In a future version, we can use them as a checklist in your
                            end-of-day review.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 14px",
    borderBottom: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderBottom: "1px solid var(--border-subtle)",
};

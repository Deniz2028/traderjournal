import React, { useState } from "react";

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (session: any) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [activeTab, setActiveTab] = useState<"Backtesting" | "Prop Firm">("Backtesting");
    const [name, setName] = useState("");
    const [balance, setBalance] = useState(100000);
    const [assets, setAssets] = useState("XAUUSD");

    // Dates
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

    // Prop firm
    const [profitTarget, setProfitTarget] = useState(10);
    const [maxDailyLoss, setMaxDailyLoss] = useState(5000);
    const [maxTotalLoss, setMaxTotalLoss] = useState(10000);

    // Stats
    const [timeInvested, setTimeInvested] = useState(0);

    const handleSubmit = () => {
        if (!name) return alert("Please enter a session name");

        const assetList = assets.split(",").map(s => s.trim()).filter(Boolean);

        const sessionData: any = {
            name,
            type: activeTab,
            balance: Number(balance),
            assets: assetList.length > 0 ? assetList : ["XAUUSD"],
            startDate: startDate,
            endDate: endDate,
            timeInvested: Number(timeInvested)
        };

        if (activeTab === "Prop Firm") {
            sessionData.profitTarget = Number(profitTarget);
            sessionData.maxDailyLoss = Number(maxDailyLoss);
            sessionData.maxTotalLoss = Number(maxTotalLoss);
        }

        onCreate(sessionData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay visible">
            <div className="card" style={{
                width: "100%",
                maxWidth: 500,
                padding: 0,
                overflow: "hidden",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}>
                {/* Header */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Create a quick session</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 20 }}>×</button>
                </div>

                <div style={{ padding: "24px" }}>
                    {/* Tabs */}
                    <div style={{ display: "flex", backgroundColor: "var(--bg-element)", borderRadius: 8, padding: 4, marginBottom: 24 }}>
                        <button
                            onClick={() => setActiveTab("Backtesting")}
                            style={{
                                flex: 1,
                                padding: "8px",
                                borderRadius: 6,
                                border: "none",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 500,
                                backgroundColor: activeTab === "Backtesting" ? "var(--bg-card)" : "transparent",
                                color: activeTab === "Backtesting" ? "var(--text-primary)" : "var(--text-secondary)",
                                boxShadow: activeTab === "Backtesting" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                                transition: "all 0.2s"
                            }}
                        >
                            Backtesting Session
                        </button>
                        <button
                            onClick={() => setActiveTab("Prop Firm")}
                            style={{
                                flex: 1,
                                padding: "8px",
                                borderRadius: 6,
                                border: "none",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 500,
                                backgroundColor: activeTab === "Prop Firm" ? "var(--bg-card)" : "transparent",
                                color: activeTab === "Prop Firm" ? "var(--text-primary)" : "var(--text-secondary)",
                                boxShadow: activeTab === "Prop Firm" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                                transition: "all 0.2s"
                            }}
                        >
                            Prop Firm Session
                        </button>
                    </div>

                    {/* Form */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {activeTab === "Prop Firm" && (
                            <div className="alert-info" style={{ marginBottom: 0 }}>
                                Set up a session that mirrors your prop firm's rules.
                            </div>
                        )}

                        <div className="form-group">
                            <label style={styles.label}>Name <span style={{ color: "var(--color-red)" }}>*</span></label>
                            <input
                                type="text"
                                placeholder="Name your session"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={styles.input}
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label style={styles.label}>Account Balance <span style={{ color: "var(--color-red)" }}>*</span></label>
                            <div style={{ position: "relative" }}>
                                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>$</span>
                                <input
                                    type="number"
                                    value={balance}
                                    onChange={e => setBalance(Number(e.target.value))}
                                    style={{ ...styles.input, paddingLeft: 24 }}
                                />
                            </div>
                        </div>

                        {activeTab === "Prop Firm" && (
                            <div style={{ border: "1px solid #1E3A8A", borderRadius: 8, padding: 12, backgroundColor: "rgba(30, 58, 138, 0.1)" }}>
                                <div className="form-group" style={{ marginBottom: 12 }}>
                                    <label style={styles.label}>Profit Target (%)</label>
                                    <input
                                        type="number"
                                        value={profitTarget}
                                        onChange={e => setProfitTarget(Number(e.target.value))}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label style={styles.label}>Max Daily Loss ($)</label>
                                        <input
                                            type="number"
                                            value={maxDailyLoss}
                                            onChange={e => setMaxDailyLoss(Number(e.target.value))}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label style={styles.label}>Max Total Loss ($)</label>
                                        <input
                                            type="number"
                                            value={maxTotalLoss}
                                            onChange={e => setMaxTotalLoss(Number(e.target.value))}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label style={styles.label}>Assets <span style={{ color: "var(--color-red)" }}>*</span></label>
                            <input
                                type="text"
                                placeholder="e.g. XAUUSD, EURUSD"
                                value={assets}
                                onChange={e => setAssets(e.target.value)}
                                style={styles.input}
                            />
                            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Separate multiple assets with commas.</p>
                        </div>

                        <div style={{ display: "flex", gap: 16 }}>
                            <div style={{ flex: 1 }} className="form-group">
                                <label style={styles.label}>Initial Date <span style={{ color: "var(--color-red)" }}>*</span></label>
                                <input
                                    type="date"
                                    value={initialDate}
                                    onChange={e => setInitialDate(e.target.value)}
                                    style={styles.input}
                                />
                            </div>
                            <div style={{ flex: 1 }} className="form-group">
                                <label style={styles.label}>End Date <span style={{ color: "var(--color-red)" }}>*</span></label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={styles.label}>Time Invested (Minutes)</label>
                            <input
                                type="number"
                                value={timeInvested}
                                onChange={e => setTimeInvested(parseInt(e.target.value) || 0)}
                                style={styles.input}
                                placeholder="e.g. 120"
                            />
                        </div>
                    </div>
                </div>

                <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: 12, backgroundColor: "var(--bg-secondary)" }}>
                    <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontWeight: 500 }}>Cancel</button>
                    <button onClick={handleSubmit} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--accent-primary)", border: "none", color: "#fff", fontWeight: 500, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>Create session</button>
                </div>
            </div>
            <style>{`
                .modal-overlay.visible {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
            `}</style>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    label: {
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-primary)",
    },
    input: {
        width: "100%",
        backgroundColor: "var(--bg-input)",
        border: "1px solid var(--border-input)",
        color: "var(--text-primary)",
        padding: "10px 12px",
        borderRadius: 8,
        fontSize: 14,
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s"
    }
};

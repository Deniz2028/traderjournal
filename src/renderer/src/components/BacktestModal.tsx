import React, { useState, useEffect, useRef } from "react";

export interface BacktestTrade {
    id: string;
    date: string;
    symbol: string;
    direction: "Long" | "Short";
    outcome: "TP" | "SL" | "BE";
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    beforeChart?: string;
    afterChart?: string;
    notes?: string;
    resultR?: number;
    sessionId?: string;
}

interface BacktestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (trade: Partial<BacktestTrade>) => void;
    initialData?: BacktestTrade | null;
    sessionBalance?: number; // Needed for 1% calc
}

export const BacktestModal: React.FC<BacktestModalProps> = ({ isOpen, onClose, onSave, initialData, sessionBalance = 100000 }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [symbol, setSymbol] = useState("XAUUSD");
    const [direction, setDirection] = useState<"Long" | "Short">("Long");
    const [outcome, setOutcome] = useState<"TP" | "SL" | "BE">("TP");
    const [beforeChart, setBeforeChart] = useState("");
    const [afterChart, setAfterChart] = useState("");
    const [notes, setNotes] = useState("");
    const [resultR, setResultR] = useState<string>("");

    // Modal close refs
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialData) {
            setDate(initialData.date);
            setSymbol(initialData.symbol);
            setDirection(initialData.direction);
            setOutcome(initialData.outcome);
            setBeforeChart(initialData.beforeChart || "");
            setAfterChart(initialData.afterChart || "");
            setNotes(initialData.notes || "");
            setResultR(initialData.resultR != null ? String(initialData.resultR) : "2");
        } else {
            setDate(new Date().toISOString().split('T')[0]);
            setSymbol("XAUUSD");
            setDirection("Long");
            setOutcome("TP");
            setBeforeChart("");
            setAfterChart("");
            setNotes("");
            setResultR("2"); // Default TP R
        }
    }, [initialData, isOpen]);

    // Close on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Auto-update Result R based on Outcome changes (if user hasn't manually set a weird value?)
    // Actually, user wants to enter value, let's just set helpful defaults when outcome buttons clicked
    const handleOutcomeChange = (newOutcome: "TP" | "SL" | "BE") => {
        setOutcome(newOutcome);
        if (newOutcome === "TP") setResultR("2"); // Default TP
        if (newOutcome === "SL") setResultR("-1"); // Default SL
        if (newOutcome === "BE") setResultR("0"); // Default BE
    };

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            ...(initialData || {}),
            date,
            symbol,
            direction,
            outcome,
            beforeChart,
            afterChart,
            notes,
            resultR: parseFloat(resultR) || 0
        });
        onClose();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0] as any;
            if (file.path) {
                setter(file.path);
            }
        }
    };

    // PnL Calculation based on 1% fixed risk
    const onePercentValue = sessionBalance * 0.01;
    const currentPnL = (parseFloat(resultR) || 0) * onePercentValue;
    const pnlColor = currentPnL > 0 ? "var(--color-green)" : currentPnL < 0 ? "var(--color-red)" : "var(--text-primary)";

    const renderChartPreview = (path: string, placeholder: string) => {
        // Handle potential web URL vs file path
        // If path starts with http/https, use as is. If Local path, prepend file://
        const isUrl = path.startsWith("http");
        const src = isUrl ? path : `file://${path}`;

        return (
            <div style={{
                marginTop: 8,
                height: 140,
                backgroundColor: 'var(--bg-element)',
                borderRadius: 8,
                border: '1px dashed var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {path ? (
                    <img
                        src={src}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                            // If load fails, show error or fallback
                            (e.target as HTMLImageElement).style.display = 'none';
                            // Show text instead
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:12px;color:red">Failed to load image</span>';
                        }}
                    />
                ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{placeholder}</span>
                )}
            </div>
        );
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose} // Close on backdrop click
        >
            <div
                ref={modalRef}
                className="modal-content"
                onClick={e => e.stopPropagation()} // Prevent close when clicking content
                style={{
                    maxWidth: 800,
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    borderRadius: 12,
                    padding: 0
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{initialData ? "Edit Trade" : "New Trade"}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 24 }}>×</button>
                </div>

                <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, maxHeight: '80vh', overflowY: 'auto' }}>

                    {/* Row 1: Date, Symbol, Direction, Outcome */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label style={labelStyle}>Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
                        </div>
                        <div className="form-group">
                            <label style={labelStyle}>Symbol</label>
                            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)} style={inputStyle} />
                        </div>
                        <div className="form-group">
                            <label style={labelStyle}>Direction</label>
                            <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg-input)', padding: 4, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                {['Long', 'Short'].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDirection(d as any)}
                                        style={{
                                            flex: 1,
                                            border: 'none',
                                            padding: '6px',
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            backgroundColor: direction === d ? (d === 'Long' ? '#DCFCE7' : '#FEE2E2') : 'transparent',
                                            color: direction === d ? (d === 'Long' ? '#16A34A' : '#EF4444') : 'var(--text-secondary)'
                                        }}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label style={labelStyle}>Outcome</label>
                            <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg-input)', padding: 4, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                {['TP', 'SL', 'BE'].map(o => (
                                    <button
                                        key={o}
                                        onClick={() => handleOutcomeChange(o as any)}
                                        style={{
                                            flex: 1,
                                            border: 'none',
                                            padding: '6px',
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            backgroundColor: outcome === o ? (o === 'TP' ? '#DCFCE7' : o === 'SL' ? '#FEE2E2' : '#F3F4F6') : 'transparent',
                                            color: outcome === o ? (o === 'TP' ? '#16A34A' : o === 'SL' ? '#EF4444' : '#4B5563') : 'var(--text-secondary)'
                                        }}
                                    >
                                        {o}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Result Input & PnL Preview */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label style={labelStyle}>Result (R)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={resultR}
                                onChange={e => setResultR(e.target.value)}
                                style={inputStyle}
                                placeholder="e.g. 2, -1, 0..."
                            />
                        </div>
                        <div style={{ flex: 2, paddingBottom: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>Estimated PnL (1% Risk): </span>
                            <span style={{ color: pnlColor, fontSize: 14, fontWeight: 700 }}>
                                {currentPnL >= 0 ? "+" : ""}${currentPnL.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Row 3: Charts (Before / After) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        {/* Before */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <label style={labelStyle}>Before Chart</label>
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <span style={{ fontSize: 12, color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}>Upload / Paste</span>
                                    <input type="file" accept="image/*" onChange={e => handleFileSelect(e, setBeforeChart)} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Paste file path or URL..."
                                value={beforeChart}
                                onChange={e => setBeforeChart(e.target.value)}
                                style={{ ...inputStyle, marginBottom: 0 }}
                            />
                            {renderChartPreview(beforeChart, "No before chart")}
                        </div>

                        {/* After */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <label style={labelStyle}>After Chart</label>
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <span style={{ fontSize: 12, color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}>Upload / Paste</span>
                                    <input type="file" accept="image/*" onChange={e => handleFileSelect(e, setAfterChart)} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Paste file path or URL..."
                                value={afterChart}
                                onChange={e => setAfterChart(e.target.value)}
                                style={{ ...inputStyle, marginBottom: 0 }}
                            />
                            {renderChartPreview(afterChart, "No after chart")}
                        </div>
                    </div>

                    {/* Row 4: Notes */}
                    <div className="form-group">
                        <label style={labelStyle}>Notes & Learnings</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                            placeholder="What did you learn from this trade?"
                        />
                    </div>
                </div>

                <div className="modal-footer" style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottomLeftRadius: 12,
                    borderBottomRightRadius: 12
                }}>
                    <button onClick={onClose} style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500
                    }}>Cancel</button>
                    <button onClick={handleSave} style={{
                        padding: '8px 24px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500
                    }}>Save Trade</button>
                </div>
            </div>
            <style>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background-color: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 1000;
                    display: flex; align-items: center; justify-content: center;
                    animation: fadeIn 0.2s ease-out;
                }
                .modal-content {
                    width: 90%;
                    max-width: 800px;
                    animation: slideUp 0.3s ease-out;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

// Styles
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s'
};

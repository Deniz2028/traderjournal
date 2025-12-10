// src/renderer/src/components/TodayJournalSection.tsx
import React, { useEffect, useState } from "react";
import {
    Bias3,
    Outcome,
    MtfFrame,
    TodayJournal,
    getJournalForDate,
    saveJournalForDate,
} from "../utils/journalStorage";
import { getAppToday } from "../utils/appDate";

const biasOptions: Bias3[] = ["Long", "Short", "Neutral"];
const outcomeOptions: Outcome[] = ["TP", "SL", "BE"];

export const TodayJournalSection: React.FC = () => {
    const todayISO = getAppToday();

    const [journal, setJournal] = useState<TodayJournal | null>(null);
    const [activeFrameId, setActiveFrameId] = useState<string>("4H");

    useEffect(() => {
        const initial = getJournalForDate(todayISO);
        setJournal(initial);
        if (initial.mtfFrames.length > 0) {
            setActiveFrameId(initial.mtfFrames[0].id);
        }
    }, [todayISO]);

    if (!journal) return null;

    const handleSymbolChange = (value: string) => {
        setJournal((prev) =>
            prev ? { ...prev, symbol: value.toUpperCase() } : prev,
        );
    };

    const handleDailyBiasChange = (bias: Bias3) => {
        setJournal((prev) => (prev ? { ...prev, dailyBias: bias } : prev));
    };

    const updateFrame = (id: string, patch: Partial<MtfFrame>) => {
        setJournal((prev) => {
            if (!prev) return prev;
            const frames = prev.mtfFrames.map((f) =>
                f.id === id ? { ...f, ...patch } : f,
            );
            return { ...prev, mtfFrames: frames };
        });
    };

    const handlePostReviewChange = (
        patch: Partial<TodayJournal["postReview"]>,
    ) => {
        setJournal((prev) => {
            if (!prev) return prev;
            return { ...prev, postReview: { ...prev.postReview, ...patch } };
        });
    };

    const handleSavePlan = () => {
        if (!journal) return;
        saveJournalForDate(journal);
        alert("Pre-trade MTF plan saved for today.");
    };

    const handleSaveReview = () => {
        if (!journal) return;
        saveJournalForDate(journal);
        alert("Post-trade review saved for today.");
    };

    const activeFrame =
        journal.mtfFrames.find((f) => f.id === activeFrameId) ??
        journal.mtfFrames[0];

    return (
        <div style={{ marginBottom: 32 }}>
            {/* PRE-TRADE CARD */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="page-header" style={{ paddingBottom: 12 }}>
                    <h2 className="page-title" style={{ fontSize: 18 }}>
                        Today&apos;s MTF Plan
                    </h2>
                    <p className="page-subtitle">
                        Date: {journal.date} • Symbol &amp; intraday multi-timeframe plan
                    </p>
                </div>

                {/* Symbol + Daily Bias */}
                <div
                    style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "center",
                        marginBottom: 16,
                    }}
                >
                    <div style={{ flex: "0 0 200px" }}>
                        <label
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                display: "block",
                                marginBottom: 4,
                            }}
                        >
                            Symbol
                        </label>
                        <input
                            value={journal.symbol}
                            onChange={(e) => handleSymbolChange(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: 6,
                                border: "1px solid var(--border-subtle)",
                                fontSize: 13,
                            }}
                        />
                    </div>

                    <div style={{ flex: "0 0 auto" }}>
                        <label
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                display: "block",
                                marginBottom: 4,
                            }}
                        >
                            Daily bias
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                            {biasOptions.map((b) => {
                                const isActive = journal.dailyBias === b;
                                return (
                                    <button
                                        key={b}
                                        type="button"
                                        onClick={() => handleDailyBiasChange(b)}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: 999,
                                            border: isActive
                                                ? "1px solid var(--accent-primary)"
                                                : "1px solid var(--border-subtle)",
                                            backgroundColor: isActive ? "#EFF6FF" : "#FFFFFF",
                                            fontSize: 12,
                                            fontWeight: 500,
                                        }}
                                    >
                                        {b}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ flexGrow: 1 }} />

                    <div>
                        <span
                            style={{
                                fontSize: 12,
                                padding: "4px 8px",
                                borderRadius: 999,
                                backgroundColor: "#F3F4F6",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Today bias: <strong>{journal.dailyBias}</strong>
                        </span>
                    </div>
                </div>

                {/* MTF Tabs */}
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        {journal.mtfFrames.map((frame) => {
                            const isActive = frame.id === activeFrameId;
                            return (
                                <button
                                    key={frame.id}
                                    type="button"
                                    onClick={() => setActiveFrameId(frame.id)}
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: 999,
                                        fontSize: 12,
                                        border: isActive
                                            ? "1px solid var(--accent-primary)"
                                            : "1px solid var(--border-subtle)",
                                        backgroundColor: isActive ? "#EFF6FF" : "#FFFFFF",
                                    }}
                                >
                                    {frame.timeframe}
                                </button>
                            );
                        })}
                    </div>

                    {/* Active timeframe content */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
                            gap: 16,
                        }}
                    >
                        {/* Chart preview column */}
                        <div>
                            <label
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Chart link (TradingView snapshot URL)
                            </label>
                            <input
                                value={activeFrame.chartUrl}
                                onChange={(e) =>
                                    updateFrame(activeFrame.id, { chartUrl: e.target.value })
                                }
                                placeholder="https://s3.tradingview.com/snapshots/..."
                                style={{
                                    width: "100%",
                                    marginTop: 4,
                                    marginBottom: 8,
                                    padding: "8px 10px",
                                    borderRadius: 6,
                                    border: "1px solid var(--border-subtle)",
                                    fontSize: 13,
                                }}
                            />
                            <div
                                style={{
                                    borderRadius: 12,
                                    border: "1px solid #E5E7EB",
                                    backgroundColor: "#F9FAFB",
                                    minHeight: 200,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                }}
                            >
                                {activeFrame.chartUrl ? (
                                    <img
                                        src={activeFrame.chartUrl}
                                        alt={`${activeFrame.timeframe} chart`}
                                        style={{ maxWidth: "100%", maxHeight: 360, objectFit: "contain" }}
                                    />
                                ) : (
                                    <span
                                        style={{
                                            fontSize: 12,
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        Paste chart link to see preview.
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Bias + notes column */}
                        <div>
                            <div style={{ marginBottom: 12 }}>
                                <label
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--text-secondary)",
                                        display: "block",
                                        marginBottom: 4,
                                    }}
                                >
                                    {activeFrame.timeframe} bias
                                </label>
                                <div style={{ display: "flex", gap: 8 }}>
                                    {biasOptions.map((b) => {
                                        const isActive = activeFrame.bias === b;
                                        return (
                                            <button
                                                key={b}
                                                type="button"
                                                onClick={() =>
                                                    updateFrame(activeFrame.id, { bias: b })
                                                }
                                                style={{
                                                    padding: "6px 12px",
                                                    borderRadius: 999,
                                                    border: isActive
                                                        ? "1px solid var(--accent-primary)"
                                                        : "1px solid var(--border-subtle)",
                                                    backgroundColor: isActive ? "#EFF6FF" : "#FFFFFF",
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {b}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--text-secondary)",
                                        display: "block",
                                        marginBottom: 4,
                                    }}
                                >
                                    Notes for {activeFrame.timeframe}
                                </label>
                                <textarea
                                    value={activeFrame.notes}
                                    onChange={(e) =>
                                        updateFrame(activeFrame.id, { notes: e.target.value })
                                    }
                                    rows={8}
                                    placeholder="Liquidity, key levels, structure notes, what you expect..."
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        border: "1px solid var(--border-subtle)",
                                        fontSize: 13,
                                        resize: "vertical",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            marginTop: 16,
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        <button
                            type="button"
                            onClick={handleSavePlan}
                            style={{
                                backgroundColor: "var(--accent-primary)",
                                color: "#FFFFFF",
                                padding: "8px 16px",
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 500,
                            }}
                        >
                            Save pre-trade plan
                        </button>
                    </div>
                </div>
            </div>

            {/* POST-TRADE CARD */}
            <div className="card">
                <h3
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "var(--text-primary)",
                    }}
                >
                    Post-trade review (after session ends)
                </h3>
                <p
                    style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        marginBottom: 12,
                    }}
                >
                    Log the final outcome of the day and what you learned.
                </p>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
                        gap: 16,
                    }}
                >
                    {/* Outcome + R */}
                    <div>
                        <label
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                display: "block",
                                marginBottom: 4,
                            }}
                        >
                            Outcome
                        </label>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            {outcomeOptions.map((o) => {
                                const isActive = journal.postReview.outcome === o;
                                return (
                                    <button
                                        key={o}
                                        type="button"
                                        onClick={() =>
                                            handlePostReviewChange({ outcome: o })
                                        }
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: 999,
                                            border: isActive
                                                ? "1px solid var(--accent-primary)"
                                                : "1px solid var(--border-subtle)",
                                            backgroundColor: isActive ? "#EFF6FF" : "#FFFFFF",
                                            fontSize: 12,
                                        }}
                                    >
                                        {o}
                                    </button>
                                );
                            })}
                        </div>

                        <label
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                display: "block",
                                marginBottom: 4,
                            }}
                        >
                            Result (R)
                        </label>
                        <input
                            value={
                                journal.postReview.resultR === null
                                    ? ""
                                    : String(journal.postReview.resultR)
                            }
                            onChange={(e) => {
                                const value = e.target.value.trim();
                                const num =
                                    value === "" ? null : Number(value.replace(",", "."));
                                handlePostReviewChange({
                                    resultR:
                                        num === null || Number.isNaN(num) ? null : num,
                                });
                            }}
                            placeholder="1.0, -0.5..."
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: 6,
                                border: "1px solid var(--border-subtle)",
                                fontSize: 13,
                                marginBottom: 12,
                            }}
                        />

                        <label
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                display: "block",
                                marginBottom: 4,
                            }}
                        >
                            Exit chart link (optional)
                        </label>
                        <input
                            value={journal.postReview.chartUrl}
                            onChange={(e) =>
                                handlePostReviewChange({ chartUrl: e.target.value })
                            }
                            placeholder="https://s3.tradingview.com/snapshots/..."
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: 6,
                                border: "1px solid var(--border-subtle)",
                                fontSize: 13,
                            }}
                        />
                        <div
                            style={{
                                borderRadius: 12,
                                border: "1px solid #E5E7EB",
                                backgroundColor: "#F9FAFB",
                                minHeight: 160,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: 8,
                                overflow: "hidden",
                            }}
                        >
                            {journal.postReview.chartUrl ? (
                                <img
                                    src={journal.postReview.chartUrl}
                                    alt="Exit chart"
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: 280,
                                        objectFit: "contain",
                                    }}
                                />
                            ) : (
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-secondary)",
                                    }}
                                >
                                    Paste exit chart link to see preview.
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                display: "block",
                                marginBottom: 4,
                            }}
                        >
                            Why TP/SL? What did you learn?
                        </label>
                        <textarea
                            value={journal.postReview.notes}
                            onChange={(e) =>
                                handlePostReviewChange({ notes: e.target.value })
                            }
                            rows={16}
                            placeholder="Did you follow your MTF plan? Where did you execute well, what will you change tomorrow?"
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: 8,
                                border: "1px solid var(--border-subtle)",
                                fontSize: 13,
                                resize: "vertical",
                            }}
                        />
                    </div>
                </div>

                <div
                    style={{
                        marginTop: 16,
                        display: "flex",
                        justifyContent: "flex-end",
                    }}
                >
                    <button
                        type="button"
                        onClick={handleSaveReview}
                        style={{
                            backgroundColor: "var(--accent-primary)",
                            color: "#FFFFFF",
                            padding: "8px 16px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 500,
                        }}
                    >
                        Save post-trade review
                    </button>
                </div>
            </div>
        </div>
    );
};

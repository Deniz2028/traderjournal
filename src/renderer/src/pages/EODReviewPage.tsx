import { useRoute, useLocation } from "wouter";
import React, { useEffect, useState } from "react";
import { fetchEodForDate, saveEodForDate } from "../utils/eodClient";
import type { EODReview } from "../../../shared/eodTypes";

const EODReviewPage: React.FC = () => {
    const [match, params] = useRoute("/eod/:date");
    const date = match && params?.date ? params.date : new Date().toISOString().slice(0, 10);

    const [form, setForm] = useState<EODReview>({
        date,
        dayDirection: null,
        tradeSummary: { longCount: 0, shortCount: 0 },
        realDayBias: "",
        diary: ""
    });

    useEffect(() => {
        if (!date) return;
        setForm(prev => ({ ...prev, date })); // sync date
        fetchEodForDate(date).then((res) => {
            if (res) {
                setForm(res);
            } else {
                // reset to default if no data, but keep date
                setForm({
                    date,
                    dayDirection: null,
                    tradeSummary: { longCount: 0, shortCount: 0 },
                    realDayBias: "",
                    diary: ""
                });
            }
        });
    }, [date]);

    const [location, setLocation] = useLocation();

    const handleSave = async () => {
        await saveEodForDate(date, form);
        setLocation("/calendar");
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">End of Day Review</h1>
                <p className="page-subtitle">{date}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Day Direction Card */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                        Day Direction
                    </h3>
                    <div style={{ display: "flex", gap: 8 }}>
                        {(["up", "down", "chop"] as const).map((dir) => {
                            const isActive = form.dayDirection === dir;
                            let color = "#374151";
                            let bg = "#F3F4F6";
                            let border = "1px solid var(--border-subtle)";

                            if (isActive) {
                                if (dir === "up") { color = "#16A34A"; bg = "#DCFCE7"; border = "1px solid #16A34A"; }
                                else if (dir === "down") { color = "#DC2626"; bg = "#FEE2E2"; border = "1px solid #DC2626"; }
                                else { color = "#4B5563"; bg = "#E5E7EB"; border = "1px solid #4B5563"; }
                            }

                            return (
                                <button
                                    key={dir}
                                    type="button"
                                    onClick={() => setForm({ ...form, dayDirection: dir })}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: 8,
                                        border,
                                        backgroundColor: bg,
                                        color,
                                        fontWeight: isActive ? 600 : 500,
                                        cursor: "pointer",
                                        textTransform: "uppercase",
                                        fontSize: 13
                                    }}
                                >
                                    {dir}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Real Day Bias Card */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                        Real Day Bias / Narrative
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                        How did the day actually play out vs your morning plan?
                    </p>
                    <textarea
                        value={form.realDayBias}
                        onChange={(e) => setForm({ ...form, realDayBias: e.target.value })}
                        rows={4}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: 8,
                            border: "1px solid var(--border-subtle)",
                            resize: "vertical",
                            fontSize: 14,
                            fontFamily: "inherit",
                        }}
                    />
                </div>

                {/* Diary / Lessons Card */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                        Diary / Lessons
                    </h3>
                    <textarea
                        value={form.diary}
                        onChange={(e) => setForm({ ...form, diary: e.target.value })}
                        rows={6}
                        placeholder="Emotions, mistakes, good setups missed..."
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: 8,
                            border: "1px solid var(--border-subtle)",
                            resize: "vertical",
                            fontSize: 14,
                            fontFamily: "inherit",
                        }}
                    />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                        type="button"
                        onClick={handleSave}
                        style={{
                            backgroundColor: "var(--accent-primary)",
                            color: "#FFFFFF",
                            padding: "10px 24px",
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                            border: "none",
                            marginBottom: 32
                        }}
                    >
                        Save Review
                    </button>
                </div>

            </div>
        </div>
    );
};

export default EODReviewPage;

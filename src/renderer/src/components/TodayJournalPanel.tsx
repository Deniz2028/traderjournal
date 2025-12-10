import React, { useEffect, useState } from "react";
import { getJournalForDate, saveJournalForDate } from "../utils/journalStorage";
import { getAppToday } from "../utils/appDate";

export const TodayJournalPanel: React.FC = () => {
    // Bugünün tarihi (YYYY-MM-DD) - Use simulation capable date
    const todayISO = getAppToday();

    const [prePlan, setPrePlan] = useState("");
    const [postReview, setPostReview] = useState("");
    const [loadedDate, setLoadedDate] = useState<string | null>(null);

    // İlk açılışta localStorage'dan oku
    useEffect(() => {
        const j = getJournalForDate(todayISO);
        setPrePlan(j.prePlan);
        setPostReview(j.postReview);
        setLoadedDate(todayISO);
    }, [todayISO]);

    const handleSavePre = () => {
        saveJournalForDate(todayISO, { prePlan });
    };

    const handleSavePost = () => {
        saveJournalForDate(todayISO, { postReview });
    };

    // UI basit: tek kart içinde iki blok
    return (
        <div
            className="card"
            style={{
                marginBottom: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: "16px"
            }}
        >
            <div>
                <div
                    style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                    }}
                >
                    {loadedDate ?? todayISO}
                </div>
                <h2
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        marginBottom: 4,
                        color: "var(--text-primary)",
                    }}
                >
                    Today&apos;s Journal
                </h2>
                <p
                    style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                    }}
                >
                    Before you trade, write your plan. After you&apos;re done, review the
                    day.
                </p>
            </div>

            {/* Pre-trade plan */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                }}
            >
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                    }}
                >
                    Pre-trade plan (before entering trades)
                </div>
                <textarea
                    value={prePlan}
                    onChange={(e) => setPrePlan(e.target.value)}
                    rows={4}
                    placeholder="What is today’s bias, setup, and risk plan?"
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 8,
                        border: "1px solid var(--border-subtle)",
                        fontSize: 13,
                        fontFamily: "inherit",
                        resize: "vertical",
                        outline: "none",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)"
                    }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                        type="button"
                        onClick={handleSavePre}
                        className="btn-primary"
                        style={{ fontSize: 13 }}
                    >
                        Save pre-plan
                    </button>
                </div>
            </div>

            {/* Post-trade review */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: 12,
                }}
            >
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                    }}
                >
                    Post-trade review (after session ends)
                </div>
                <textarea
                    value={postReview}
                    onChange={(e) => setPostReview(e.target.value)}
                    rows={4}
                    placeholder="Did you follow the plan? What did you learn?"
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 8,
                        border: "1px solid var(--border-subtle)",
                        fontSize: 13,
                        fontFamily: "inherit",
                        resize: "vertical",
                        outline: "none",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)"
                    }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                        type="button"
                        onClick={handleSavePost}
                        className="btn-primary"
                        style={{ fontSize: 13 }}
                    >
                        Save review
                    </button>
                </div>
            </div>
        </div>
    );
};

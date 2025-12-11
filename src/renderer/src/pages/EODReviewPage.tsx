
// src/renderer/src/pages/EodReviewPage.tsx
import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import {
    getRules,
    getDailyCheck,
    saveDailyCheck,
    getDisciplineScore,
    type TradeRule,
    type DailyRuleCheck,
} from "../utils/rulesStorage";
import { fetchMorningForDate, saveMorningForDate } from "../utils/morningMtfClient";
import { fetchEodForDate, saveEodForDate } from "../utils/eodClient";
import type { MorningMtfDaySnapshot, MorningMtfBias } from "../../../shared/morningMtfTypes";

export const EodReviewPage: React.FC = () => {
    // Örn: path "/today/:date/eod"
    const [_match, params] = useRoute<{ date: string }>("/eod/:date");
    const date = params?.date ?? new Date().toISOString().slice(0, 10);

    // Burada, daha önceki EOD metin alanların için state'ler olabilir:
    const [eodNotes, setEodNotes] = useState("");
    const [loadedEod, setLoadedEod] = useState(false);

    // Rules checklist state
    const [rules, setRules] = useState<TradeRule[]>([]);
    const [dailyCheck, setDailyCheck] = useState<DailyRuleCheck>({
        date,
        checks: [],
    });
    const [disciplineScore, setDisciplineScore] = useState<number>(0);

    // Morning Analysis (Daily Bias) state
    const [morningSnapshot, setMorningSnapshot] = useState<MorningMtfDaySnapshot | null>(null);



    // Load Data
    useEffect(() => {
        async function loadData() {
            setLoadedEod(false);
            // 1. Rules
            const allRules = getRules();
            setRules(allRules);

            // 2. Daily Check
            const existingCheck = getDailyCheck(date);
            if (existingCheck) {
                setDailyCheck(existingCheck);
                setDisciplineScore(getDisciplineScore(date, allRules));
            } else {
                setDailyCheck({ date, checks: [] });
                setDisciplineScore(0);
            }

            // 3. EOD Content
            try {
                const eodData = await fetchEodForDate(date);
                if (eodData) {
                    setEodNotes(eodData.diary || "");
                } else {
                    setEodNotes("");
                }
            } catch (e) {
                console.error("Failed to load eod", e);
            } finally {
                setLoadedEod(true);
            }

            // 4. Morning Analysis
            try {
                const data = await fetchMorningForDate(date);
                setMorningSnapshot(data);
            } catch (e) {
                console.error("Failed to load morning snapshot", e);
            }
        }
        loadData();
    }, [date]);

    // Helpers
    const getObeyed = (ruleId: string) => {
        const check = dailyCheck.checks.find(c => c.ruleId === ruleId);
        return check ? check.obeyed : false;
    };

    const handleToggleRule = (ruleId: string) => {
        const currentObeyed = getObeyed(ruleId);
        const nextObeyed = !currentObeyed;

        const nextChecks = [...dailyCheck.checks];
        const idx = nextChecks.findIndex(c => c.ruleId === ruleId);
        if (idx >= 0) {
            nextChecks[idx] = { ruleId, obeyed: nextObeyed };
        } else {
            nextChecks.push({ ruleId, obeyed: nextObeyed });
        }

        const nextDailyCheck = { ...dailyCheck, checks: nextChecks };
        setDailyCheck(nextDailyCheck);
        saveDailyCheck(nextDailyCheck);

        // Recalc score
        setDisciplineScore(getDisciplineScore(date, rules));
    };

    const handleSaveEod = async () => {
        if (!loadedEod) return;
        try {
            await saveEodForDate(date, {
                date,
                diary: eodNotes,
                // We could save other things here if extended in future
            });
            // Also ensure daily check is saved (it's saved on toggle but safe to ensure)
            saveDailyCheck(dailyCheck);
            alert("EOD Review saved!");
        } catch (e) {
            console.error("Failed to save EOD", e);
            alert("Error saving EOD");
        }
    };

    // Extract bias (assuming single instrument or taking first)
    // If no instruments, we might need to scaffold one to allow editing
    const currentInstrument = morningSnapshot?.instruments?.[0];
    const dailyBias = currentInstrument?.dailyBias || "neutral";

    const handleBiasChange = async (newBias: MorningMtfBias) => {
        let nextSnapshot = morningSnapshot;

        // Create snapshot if doesn't exist
        if (!nextSnapshot) {
            nextSnapshot = {
                date,
                instruments: [
                    {
                        symbol: "XAUUSD", // Default
                        dailyBias: newBias,
                        timeframes: []
                    }
                ]
            };
        } else if (!nextSnapshot.instruments || nextSnapshot.instruments.length === 0) {
            nextSnapshot = {
                ...nextSnapshot,
                instruments: [
                    {
                        symbol: "XAUUSD",
                        dailyBias: newBias,
                        timeframes: []
                    }
                ]
            };
        } else {
            // Update existing
            nextSnapshot = {
                ...nextSnapshot,
                instruments: nextSnapshot.instruments.map((inst, idx) => {
                    // Update first one for now (single symbol support)
                    if (idx === 0) return { ...inst, dailyBias: newBias };
                    return inst;
                })
            };
        }

        setMorningSnapshot(nextSnapshot);
        await saveMorningForDate(nextSnapshot);
    };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 className="page-title">EOD Review</h1>
                        <p className="page-subtitle">
                            Gün sonu incelemesi – {date}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Daily Bias:</span>
                        <div style={{ display: "flex", background: "var(--bg-subtle)", padding: 2, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                            {(["long", "neutral", "short"] as const).map((b) => {
                                const isActive = dailyBias === b;
                                let color = "var(--text-secondary)";
                                let bg = "transparent";
                                let fontWeight = 500;

                                if (isActive) {
                                    fontWeight = 600;
                                    bg = "#fff"; // Default active bg
                                    if (b === "long") { color = "#059669"; bg = "#ECFDF5"; }
                                    if (b === "short") { color = "#DC2626"; bg = "#FEF2F2"; }
                                    if (b === "neutral") { color = "#4B5563"; bg = "#F3F4F6"; }
                                }

                                return (
                                    <button
                                        key={b}
                                        onClick={() => handleBiasChange(b)}
                                        style={{
                                            border: "none",
                                            background: bg,
                                            color: color,
                                            padding: "4px 12px",
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: fontWeight as any,
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                                        }}
                                    >
                                        {b.charAt(0).toUpperCase() + b.slice(1)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>


            <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                    Gün Sonu Notları
                </h3>
                <textarea
                    style={{
                        width: "100%",
                        minHeight: 120,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border-subtle)",
                        fontSize: 13,
                        resize: "vertical",
                    }}
                    placeholder="Bugün ne öğrendin? Hangi hataları yaptın? Neyi tekrar etmek istersin?"
                    value={eodNotes}
                    onChange={(e) => setEodNotes(e.target.value)}
                />
            </div>

            {/* Rules Checklist */}
            <div className="card">
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                    }}
                >
                    <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                            Rules Checklist
                        </h3>
                        <p
                            style={{
                                fontSize: 12,
                                color: "var(--text-secondary)",
                            }}
                        >
                            Aşağıdaki kurallar, <strong>Rules</strong> sayfasında tanımladıkların ile eşleşir.
                            Bugün bu kurallara uyup uymadığını işaretle.
                        </p>
                    </div>
                    <div
                        style={{
                            textAlign: "right",
                            minWidth: 120,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--text-secondary)",
                            }}
                        >
                            Discipline score
                        </div>
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 700,
                                color:
                                    disciplineScore >= 80
                                        ? "var(--color-green)"
                                        : disciplineScore >= 50
                                            ? "#F59E0B"
                                            : "var(--color-red)",
                            }}
                        >
                            {disciplineScore.toFixed(0)}%
                        </div>
                    </div>
                </div>

                {rules.filter((r) => r.enabled).length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Aktif kural bulunamadı. Rules sayfasından en az bir kuralı aktif et.
                    </p>
                )}

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginTop: 8,
                    }}
                >
                    {rules
                        .filter((r) => r.enabled)
                        .map((rule) => (
                            <label
                                key={rule.id}
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 8,
                                    padding: "6px 0",
                                    borderBottom: "1px solid var(--border-subtle)",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={getObeyed(rule.id)}
                                    onChange={() => handleToggleRule(rule.id)}
                                    style={{ marginTop: 2 }}
                                />
                                <div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 500,
                                        }}
                                    >
                                        {rule.label}
                                    </div>
                                    {rule.description && (
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "var(--text-secondary)",
                                                marginTop: 2,
                                            }}
                                        >
                                            {rule.description}
                                        </div>
                                    )}
                                </div>
                            </label>
                        ))}
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: 12,
                    }}
                >
                    <button
                        type="button"
                        onClick={handleSaveEod}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            backgroundColor: "var(--accent-primary)",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 500,
                        }}
                    >
                        Save EOD Review
                    </button>
                </div>
            </div>
        </div>
    );
};

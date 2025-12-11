
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

export const EodReviewPage: React.FC = () => {
    // Örn: path "/today/:date/eod"
    const [match, params] = useRoute<{ date: string }>("/today/:date/eod");
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

    useEffect(() => {
        setRules(getRules());
    }, []);

    // Gün değiştiğinde DailyRuleCheck yükle
    useEffect(() => {
        const existing = getDailyCheck(date);
        if (existing) {
            setDailyCheck(existing);
            setDisciplineScore(getDisciplineScore(date));
        } else {
            // Yeni gün için tüm kuralları obeyed=false ile başlat
            setDailyCheck({
                date,
                checks: getRules().map((r) => ({
                    ruleId: r.id,
                    obeyed: false,
                })),
            });
            setDisciplineScore(0);
        }
    }, [date]);

    const handleToggleRule = (ruleId: string) => {
        setDailyCheck((prev) => {
            const checks = [...prev.checks];
            const idx = checks.findIndex((c) => c.ruleId === ruleId);
            if (idx === -1) {
                checks.push({ ruleId, obeyed: true });
            } else {
                checks[idx] = {
                    ...checks[idx],
                    obeyed: !checks[idx].obeyed,
                };
            }
            const updated: DailyRuleCheck = { ...prev, checks };
            saveDailyCheck(updated);
            setDisciplineScore(getDisciplineScore(prev.date));
            return updated;
        });
    };

    const getObeyed = (ruleId: string): boolean => {
        const c = dailyCheck.checks.find((x) => x.ruleId === ruleId);
        return c?.obeyed ?? false;
    };

    const handleSaveEod = () => {
        // Burada EOD notlarını da localStorage veya backend'e kaydedebilirsin.
        // Şimdilik sadece alert:
        alert("EOD review saved (notes + rule checklist).");
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">EOD Review</h1>
                <p className="page-subtitle">
                    Gün sonu incelemesi – {date}
                </p>
            </div>

            {/* EOD notları için basit textarea (varsa mevcut yapını bununla değiştir) */}
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

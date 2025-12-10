// src/renderer/src/pages/MorningAnalysisPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import type {
    MorningMtfBias,
    MorningMtfDaySnapshot,
    MorningMtfInstrumentSnapshot,
    MorningMtfTimeframeId,
    MorningMtfTimeframeSnapshot,
} from "../../../shared/morningMtfTypes";
import {
    loadMorningMtfSettings,
    getTimeframesForSymbol,
} from "../utils/morningMtfSettings";
import {
    fetchMorningForDate,
    saveMorningForDate,
} from "../utils/morningMtfClient";

type Bias = MorningMtfBias;
type TF = MorningMtfTimeframeId;

// Default instruments if none selected, or just the base source of truth for titles
const INSTRUMENTS_META = [
    { symbol: "DXY", title: "DXY (Dollar Index)", subtitle: "Dollar strength context" },
    { symbol: "XAUUSD", title: "XAUUSD (Gold)", subtitle: "Gold bias & key levels" },
    { symbol: "EURUSD", title: "EURUSD (Euro)", subtitle: "Euro vs USD outlook" },
    { symbol: "GBPUSD", title: "GBPUSD", subtitle: "Cable outlook" },
    { symbol: "NQ", title: "NQ (Nasdaq)", subtitle: "Nasdaq futures" },
    { symbol: "ES", title: "ES (S&P 500)", subtitle: "E-mini S&P 500" },
    { symbol: "BTCUSD", title: "BTCUSD", subtitle: "Bitcoin" },
];

const biasLabel: Record<Bias, string> = {
    long: "Long",
    short: "Short",
    neutral: "Neutral",
};

const biasColor: Record<Bias, string> = {
    long: "#16A34A",
    short: "#DC2626",
    neutral: "#6B7280",
};

import { getAppToday } from "../utils/appDate";

const MorningAnalysisPage: React.FC = () => {
    // Parsing route params
    const [match, params] = useRoute("/morning/:date");
    const todayISO = getAppToday();
    const dateISO = match && params?.date ? params.date : todayISO;

    const [snapshot, setSnapshot] = useState<MorningMtfDaySnapshot | null>(null);
    const [activeTfBySymbol, setActiveTfBySymbol] = useState<Record<string, TF>>({});
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // Close lightbox on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setLightboxImage(null);
            }
        };
        if (lightboxImage) {
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxImage]);

    // Settings for instrument list and timeframes
    const mtfSettings = useMemo(() => loadMorningMtfSettings(), []);

    useEffect(() => {
        // Determine which instruments to show.
        // Logic: If settings have keys, use those keys. If empty, use defaults (DXY, XAUUSD, EURUSD).
        let symbolsToShow = Object.keys(mtfSettings);
        if (symbolsToShow.length === 0) {
            symbolsToShow = ["DXY", "XAUUSD", "EURUSD"];
        }
        // Sort them based on INSTRUMENTS_META order if possible, or alphabetical
        symbolsToShow.sort();

        fetchMorningForDate(dateISO).then((existing) => {
            if (existing) {
                setSnapshot(existing);
            } else {
                // Create new boilerplate snapshot
                const instruments: MorningMtfInstrumentSnapshot[] = symbolsToShow.map((symbol) => {
                    const tfs = getTimeframesForSymbol(symbol, mtfSettings);
                    const timeframes: MorningMtfTimeframeSnapshot[] = tfs.map((tf) => ({
                        tf,
                        chartUrl: "",
                        bias: "neutral",
                        notes: "",
                    }));
                    return {
                        symbol,
                        dailyBias: "neutral",
                        timeframes,
                    };
                },
                );
                setSnapshot({ date: dateISO, instruments });
            }
            setSettingsLoaded(true);
        });
    }, [dateISO, mtfSettings]);

    // Set initial active tabs
    useEffect(() => {
        if (!snapshot) return;
        const mapping: Record<string, TF> = {};
        snapshot.instruments.forEach((inst) => {
            // Preserve existing if already set
            if (activeTfBySymbol[inst.symbol]) {
                mapping[inst.symbol] = activeTfBySymbol[inst.symbol];
            } else {
                mapping[inst.symbol] = inst.timeframes[0]?.tf ?? "4H";
            }
        });
        setActiveTfBySymbol(prev => ({ ...prev, ...mapping }));
    }, [snapshot]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!settingsLoaded || !snapshot) {
        return <div style={{ padding: 20 }}>Loading morning analysis for {dateISO}...</div>;
    }

    const updateInstrument = (
        symbol: string,
        updater: (inst: MorningMtfInstrumentSnapshot) => MorningMtfInstrumentSnapshot,
    ) => {
        setSnapshot((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                instruments: prev.instruments.map((inst) =>
                    inst.symbol === symbol ? updater(inst) : inst,
                ),
            };
        });
    };

    const moveInstrument = (index: number, direction: -1 | 1) => {
        setSnapshot((prev) => {
            if (!prev) return prev;
            const newInstruments = [...prev.instruments];
            const targetIndex = index + direction;

            if (targetIndex < 0 || targetIndex >= newInstruments.length) return prev;

            // Swap
            const temp = newInstruments[index];
            newInstruments[index] = newInstruments[targetIndex];
            newInstruments[targetIndex] = temp;

            return { ...prev, instruments: newInstruments };
        });
    };

    const handleSaveAll = async () => {
        if (!snapshot) return;
        await saveMorningForDate(snapshot);
        alert("Morning analysis saved.");
    };

    return (
        <div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
            <div className="page-header">
                <h1 className="page-title">Morning Analysis</h1>
                <p className="page-subtitle">
                    Market context & multi-timeframe bias for {dateISO}
                </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {snapshot.instruments.length === 0 && (
                    <div className="card" style={{ padding: 24 }}>
                        No instruments configured. Go to Settings to add instruments.
                    </div>
                )}

                {snapshot.instruments.map((inst, index) => {
                    const tfs = inst.timeframes;
                    const activeTf = activeTfBySymbol[inst.symbol] ?? tfs[0]?.tf;
                    const active = tfs.find((tf) => tf.tf === activeTf) ?? tfs[0];

                    // Meta info
                    const meta = INSTRUMENTS_META.find(m => m.symbol === inst.symbol);
                    const title = meta ? meta.title : inst.symbol;
                    const subtitle = meta ? meta.subtitle : "Analysis";

                    if (!active) return null;

                    const onChangeDailyBias = (bias: Bias) => {
                        updateInstrument(inst.symbol, (cur) => ({ ...cur, dailyBias: bias }));
                    };

                    const onChangeChartUrl = (tf: TF, val: string) => {
                        updateInstrument(inst.symbol, (cur) => ({
                            ...cur,
                            timeframes: cur.timeframes.map((t) =>
                                t.tf === tf ? { ...t, chartUrl: val } : t,
                            ),
                        }));
                    };

                    const onChangeTfBias = (tf: TF, bias: Bias) => {
                        updateInstrument(inst.symbol, (cur) => ({
                            ...cur,
                            timeframes: cur.timeframes.map((t) =>
                                t.tf === tf ? { ...t, bias } : t,
                            ),
                        }));
                    };

                    const onChangeNotes = (tf: TF, val: string) => {
                        updateInstrument(inst.symbol, (cur) => ({
                            ...cur,
                            timeframes: cur.timeframes.map((t) =>
                                t.tf === tf ? { ...t, notes: val } : t,
                            ),
                        }));
                    };

                    return (
                        <div key={inst.symbol} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                                        <button
                                            type="button"
                                            onClick={() => moveInstrument(index, -1)}
                                            disabled={index === 0}
                                            style={{
                                                border: "none", background: "none", cursor: "pointer",
                                                fontSize: 10, padding: 0, color: index === 0 ? "#E5E7EB" : "var(--text-secondary)"
                                            }}
                                            title="Move Up"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveInstrument(index, 1)}
                                            disabled={index === snapshot.instruments.length - 1}
                                            style={{
                                                border: "none", background: "none", cursor: "pointer",
                                                fontSize: 10, padding: 0, color: index === snapshot.instruments.length - 1 ? "#E5E7EB" : "var(--text-secondary)"
                                            }}
                                            title="Move Down"
                                        >
                                            ▼
                                        </button>
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
                                        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                            {subtitle}
                                        </p>
                                    </div>
                                </div>

                                {/* Daily Bias */}
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                                        Daily bias
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: biasColor[inst.dailyBias] }}>
                                        {biasLabel[inst.dailyBias].toUpperCase()}
                                    </div>
                                    <div style={{ marginTop: 8, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                        {(["long", "neutral", "short"] as Bias[]).map((b) => (
                                            <button
                                                key={b}
                                                type="button"
                                                onClick={() => onChangeDailyBias(b)}
                                                style={{
                                                    padding: "4px 10px",
                                                    borderRadius: 999,
                                                    fontSize: 11,
                                                    border:
                                                        inst.dailyBias === b
                                                            ? "1px solid var(--accent-primary)"
                                                            : "1px solid var(--border-subtle)",
                                                    backgroundColor:
                                                        inst.dailyBias === b ? "#EEF2FF" : "#FFFFFF",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {biasLabel[b]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Timeframe tabs */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    borderBottom: "1px solid var(--border-subtle)",
                                    paddingBottom: 8,
                                    overflowX: "auto"
                                }}
                            >
                                {tfs.map((tf) => {
                                    const isActive = tf.tf === active.tf;
                                    return (
                                        <button
                                            key={tf.tf}
                                            type="button"
                                            onClick={() =>
                                                setActiveTfBySymbol((prev) => ({
                                                    ...prev,
                                                    [inst.symbol]: tf.tf,
                                                }))
                                            }
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: 999,
                                                fontSize: 12,
                                                border: isActive
                                                    ? "1px solid var(--accent-primary)"
                                                    : "1px solid var(--border-subtle)",
                                                backgroundColor: isActive ? "#EEF2FF" : "#FFFFFF",
                                                cursor: "pointer",
                                                whiteSpace: "nowrap"
                                            }}
                                        >
                                            {tf.tf} · {biasLabel[tf.bias]}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Link input + image preview */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>
                                    {active.tf} chart link
                                </div>
                                <input
                                    placeholder="Paste TradingView snapshot URL (.png)"
                                    value={active.chartUrl}
                                    onChange={(e) => onChangeChartUrl(active.tf, e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        borderRadius: 6,
                                        border: "1px solid var(--border-subtle)",
                                        fontSize: 13,
                                        fontFamily: "inherit",
                                    }}
                                />

                                {/* Preview */}
                                {active.chartUrl && (
                                    <div
                                        style={{
                                            borderRadius: 12,
                                            overflow: "hidden",
                                            border: "1px solid #E5E7EB",
                                            cursor: "zoom-in"
                                        }}
                                        onClick={() => setLightboxImage(active.chartUrl)}
                                    >
                                        <img
                                            src={active.chartUrl}
                                            alt={`${inst.symbol} ${active.tf} chart`}
                                            style={{
                                                width: "100%",
                                                maxHeight: 400,
                                                objectFit: "contain",
                                                display: "block",
                                                backgroundColor: "#f9fafb"
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bias + notes */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>Bias for this TF</div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    {(["long", "neutral", "short"] as Bias[]).map((b) => {
                                        const isActive = active.bias === b;
                                        return (
                                            <button
                                                key={b}
                                                type="button"
                                                onClick={() => onChangeTfBias(active.tf, b)}
                                                style={{
                                                    padding: "4px 10px",
                                                    borderRadius: 999,
                                                    fontSize: 11,
                                                    border: isActive
                                                        ? "1px solid var(--accent-primary)"
                                                        : "1px solid var(--border-subtle)",
                                                    backgroundColor: isActive ? "#EEF2FF" : "#FFFFFF",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {biasLabel[b]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>
                                    Notes / commentary ({active.tf})
                                </div>
                                <textarea
                                    placeholder="Bias, key levels, what you expect today..."
                                    value={active.notes}
                                    onChange={(e) => onChangeNotes(active.tf, e.target.value)}
                                    rows={4}
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        border: "1px solid var(--border-subtle)",
                                        resize: "vertical",
                                        fontSize: 13,
                                        fontFamily: "inherit",
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button
                    type="button"
                    onClick={handleSaveAll}
                    style={{
                        backgroundColor: "var(--accent-primary)",
                        color: "#FFFFFF",
                        padding: "8px 18px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        marginBottom: 32
                    }}
                >
                    Save morning snapshot
                </button>
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(12px)",
                        zIndex: 9999,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "zoom-out",
                        animation: "fadeIn 0.25s ease-out"
                    }}
                    onClick={() => setLightboxImage(null)}
                >
                    <img
                        src={lightboxImage}
                        style={{
                            maxWidth: "98vw", maxHeight: "98vh",
                            objectFit: "contain", borderRadius: 4,
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default MorningAnalysisPage;

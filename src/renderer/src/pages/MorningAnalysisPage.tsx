
// src/renderer/src/pages/MorningAnalysisPage.tsx
import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

import {
    fetchMorningForDate,
    saveMorningForDate,
    deleteMorningForDate,
} from "../utils/morningMtfClient";
import type {
    MorningMtfBias,
    MorningMtfDaySnapshot,
    MorningMtfInstrumentSnapshot,
    MorningMtfTimeframeId,
} from "../../../shared/morningMtfTypes";

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
    const { user } = useAuth();

    const [snapshot, setSnapshot] = useState<MorningMtfDaySnapshot | null>(null);
    const [activeTfBySymbol, setActiveTfBySymbol] = useState<Record<string, TF>>({});
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    // Default to view mode if instruments exist, else edit
    const [isViewMode, setIsViewMode] = useState(false);

    useEffect(() => {
        if (snapshot && snapshot.instruments.length > 0) {
            setIsViewMode(true);
        }
    }, [settingsLoaded]);

    const handleAddInstrument = () => {
        const newInst: MorningMtfInstrumentSnapshot = {
            id: crypto.randomUUID(),
            symbol: "",
            dailyBias: "neutral",
            timeframes: [
                { tf: "4H", chartUrl: "", bias: "neutral", notes: "" },
                { tf: "15M", chartUrl: "", bias: "neutral", notes: "" },
                { tf: "5M", chartUrl: "", bias: "neutral", notes: "" },
            ],
        };
        setSnapshot(prev => {
            if (!prev) return null;
            const updated = { ...prev, instruments: [...prev.instruments, newInst] };
            saveMorningForDate(updated).catch(console.error); // Auto-save
            return updated;
        });
    };

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

    useEffect(() => {
        fetchMorningForDate(dateISO).then((existing) => {
            if (existing) {
                // Ensure IDs exist
                const patched = {
                    ...existing,
                    instruments: existing.instruments.map(i => ({
                        ...i,
                        id: i.id || crypto.randomUUID()
                    }))
                };
                setSnapshot(patched);
            } else {
                // Default to empty list as per user request
                setSnapshot({ date: dateISO, instruments: [] });
            }
            setSettingsLoaded(true);
        });
    }, [dateISO]);

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
        index: number,
        updater: (inst: MorningMtfInstrumentSnapshot) => MorningMtfInstrumentSnapshot,
    ) => {
        setSnapshot((prev) => {
            if (!prev) return prev;
            const newInstruments = [...prev.instruments];
            newInstruments[index] = updater(newInstruments[index]);
            const updated = {
                ...prev,
                instruments: newInstruments,
            };
            saveMorningForDate(updated).catch(console.error); // Auto-save on edit
            return updated;
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

            const updated = { ...prev, instruments: newInstruments };
            saveMorningForDate(updated).catch(console.error); // Auto-save on move
            return updated;
        });
    };

    const handleDeleteDay = async () => {
        if (!confirm("Are you sure you want to delete this ENTIRE morning analysis? This cannot be undone.")) return;
        await deleteMorningForDate(dateISO);
        setSnapshot({ date: dateISO, instruments: [] });
        setIsViewMode(false); // Go back to edit mode (empty)
    };

    const handleSaveAll = async () => {
        if (!snapshot) return;
        await saveMorningForDate(snapshot);
        setIsViewMode(true); // Switch to View Mode on save
        alert("Morning analysis saved.");
    };

    const handleShare = async (inst: MorningMtfInstrumentSnapshot, activeTf: TF, activeState: any) => {
        if (!user) {
            alert("Please login to War Room first!");
            return;
        }

        const notes = activeState.notes || `Daily Bias: ${inst.dailyBias}`;

        // Fire and forget (Optimistic update)
        addDoc(collection(db, 'shared_analyses'), {
            user_id: user.uid,
            username: user.displayName || "Unknown",
            pair: inst.symbol || "Unknown",
            timeframe: activeTf,
            bias: activeState.bias === "neutral" ? (inst.dailyBias === "neutral" ? "Neutral" : biasLabel[inst.dailyBias]) : biasLabel[activeState.bias],
            notes: notes,
            image_url: activeState.chartUrl, // We trust this is a valid URL or null
            instrument_data: inst, // Send full snapshot
            likes: 0,
            created_at: new Date().toISOString()
        }).then(() => {
            // Success (server ack), usually silent or small toast
            console.log("Analysis synced to server.");
        }).catch((error) => {
            alert("Failed to share (background): " + error.message);
        });

        alert("Shared to War Room! ⚔️");
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
                    <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)" }}>
                        No instruments added. Click "+ Add Instrument" below to start.
                    </div>
                )}

                {snapshot.instruments.map((inst, index) => {
                    const tfs = inst.timeframes;
                    const activeTf = activeTfBySymbol[inst.symbol] ?? tfs[0]?.tf;
                    const active = tfs.find((tf) => tf.tf === activeTf) ?? tfs[0];

                    // Meta info
                    const meta = INSTRUMENTS_META.find(m => m.symbol === inst.symbol);
                    const title = meta ? meta.title : (inst.symbol || "Instrument");
                    const subtitle = meta ? meta.subtitle : "Analysis";

                    if (!active) return null;

                    const onChangeDailyBias = (bias: Bias) => {
                        updateInstrument(index, (cur) => ({ ...cur, dailyBias: bias }));
                    };

                    const onChangeChartUrl = (tf: TF, val: string) => {
                        updateInstrument(index, (cur) => ({
                            ...cur,
                            timeframes: cur.timeframes.map((t) =>
                                t.tf === tf ? { ...t, chartUrl: val } : t,
                            ),
                        }));
                    };

                    const onChangeTfBias = (tf: TF, bias: Bias) => {
                        updateInstrument(index, (cur) => ({
                            ...cur,
                            timeframes: cur.timeframes.map((t) =>
                                t.tf === tf ? { ...t, bias } : t,
                            ),
                        }));
                    };

                    const onChangeNotes = (tf: TF, val: string) => {
                        updateInstrument(index, (cur) => ({
                            ...cur,
                            timeframes: cur.timeframes.map((t) =>
                                t.tf === tf ? { ...t, notes: val } : t,
                            ),
                        }));
                    };

                    const handleDelete = () => {
                        if (!confirm(`Remove ${inst.symbol || "this instrument"}?`)) return;
                        setSnapshot((prev) => {
                            if (!prev) return prev;
                            const newInst = prev.instruments.filter((i) => i.id !== inst.id);
                            const updated = { ...prev, instruments: newInst };
                            saveMorningForDate(updated).catch(console.error); // Auto-save
                            return updated;
                        });
                    };

                    return (
                        <div key={inst.id || index} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: 'center' }}>
                                    {!isViewMode && (
                                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                                            <button
                                                type="button"
                                                onClick={() => moveInstrument(index, -1)}
                                                disabled={index === 0}
                                                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 10, padding: 0, color: index === 0 ? "#E5E7EB" : "var(--text-secondary)" }}
                                            >▲</button>
                                            <button
                                                type="button"
                                                onClick={() => moveInstrument(index, 1)}
                                                disabled={index === snapshot.instruments.length - 1}
                                                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 10, padding: 0, color: index === snapshot.instruments.length - 1 ? "#E5E7EB" : "var(--text-secondary)" }}
                                            >▼</button>
                                        </div>
                                    )}

                                    {/* Title / Selector */}
                                    <div style={{ minWidth: 200 }}>
                                        {!isViewMode && inst.symbol === "" ? (
                                            <select
                                                autoFocus
                                                value=""
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (!val) return;
                                                    updateInstrument(index, (cur) => ({ ...cur, symbol: val }));
                                                    setActiveTfBySymbol((prev) => ({ ...prev, [val]: "4H" }));
                                                }}
                                                style={{ fontSize: 14, fontWeight: 600, padding: "8px", width: "100%", borderRadius: 6, border: "1px solid var(--accent-primary)", outline: "none", backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }}
                                            >
                                                <option value="">Select Instrument...</option>
                                                {INSTRUMENTS_META.map((m) => (
                                                    <option key={m.symbol} value={m.symbol}>{m.title}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div>
                                                <h2 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                                                    {title}
                                                    {!isViewMode && (
                                                        <button onClick={() => updateInstrument(index, c => ({ ...c, symbol: "" }))} style={{ fontSize: 12, opacity: 0.4, border: "none", background: "none", cursor: "pointer" }} title="Change Instrument">✎</button>
                                                    )}
                                                    {isViewMode && (
                                                        <button
                                                            onClick={() => setIsViewMode(false)}
                                                            style={{
                                                                fontSize: 12, padding: '2px 8px', borderRadius: 4,
                                                                border: '1px solid var(--border-subtle)',
                                                                backgroundColor: 'var(--bg-card)',
                                                                color: 'var(--text-secondary)',
                                                                cursor: 'pointer',
                                                                fontWeight: 400
                                                            }}
                                                            title="Edit Mode"
                                                        >
                                                            ✎ Edit
                                                        </button>
                                                    )}
                                                </h2>
                                                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{subtitle}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Daily Bias + Actions */}
                                <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Daily bias</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: biasColor[inst.dailyBias] }}>
                                            {biasLabel[inst.dailyBias].toUpperCase()}
                                        </div>

                                        {!isViewMode && (
                                            <div style={{ marginTop: 8, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                                {(["long", "neutral", "short"] as Bias[]).map((b) => (
                                                    <button
                                                        key={b}
                                                        type="button"
                                                        onClick={() => onChangeDailyBias(b)}
                                                        style={{
                                                            padding: "4px 10px", borderRadius: 999, fontSize: 11,
                                                            border: inst.dailyBias === b ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                                                            backgroundColor: inst.dailyBias === b ? (b === 'long' ? 'var(--bg-long-subtle)' : b === 'short' ? 'var(--bg-short-subtle)' : 'var(--bg-neutral-subtle)') : "var(--bg-card)",
                                                            color: "var(--text-primary)", cursor: "pointer",
                                                        }}
                                                    >{biasLabel[b]}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {!isViewMode && (
                                        <button onClick={handleDelete} style={{ height: 28, width: 28, borderRadius: 6, border: "none", background: "#FEF2F2", color: "#B91C1C", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "end" }} title="Remove Instrument">×</button>
                                    )}
                                    {isViewMode && inst.symbol && (
                                        <button onClick={() => handleShare(inst, activeTf, active)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', marginTop: 4 }}>🚀 Share</button>
                                    )}
                                </div>
                            </div>

                            {/* Timeframe tabs */}
                            <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 8, overflowX: "auto" }}>
                                {tfs.map((tf) => {
                                    const isActive = tf.tf === active.tf;
                                    return (
                                        <button
                                            key={tf.tf}
                                            type="button"
                                            onClick={() => setActiveTfBySymbol((prev) => ({ ...prev, [inst.symbol]: tf.tf }))}
                                            style={{
                                                padding: "6px 12px", borderRadius: 999, fontSize: 12,
                                                border: isActive ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                                                backgroundColor: isActive ? "var(--bg-element)" : "var(--bg-card)",
                                                color: "var(--text-primary)", cursor: "pointer", whiteSpace: "nowrap",
                                                fontWeight: isActive ? 600 : 400
                                            }}
                                        >
                                            {tf.tf} · {biasLabel[tf.bias]}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* isViewMode Content */}
                            {isViewMode ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                    {/* Read Only View */}
                                    {active.chartUrl ? (
                                        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB", cursor: "zoom-in" }} onClick={() => setLightboxImage(active.chartUrl)}>
                                            <img src={active.chartUrl} loading="lazy" decoding="async" alt={`${inst.symbol} ${active.tf} chart`} style={{ width: "100%", maxHeight: 500, objectFit: "contain", display: "block", backgroundColor: "var(--bg-page)" }} />
                                        </div>
                                    ) : (
                                        <div style={{ padding: 32, textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 12, color: 'var(--text-tertiary)', fontSize: 13 }}>
                                            No chart for {active.tf}
                                        </div>
                                    )}

                                    {active.notes && (
                                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>Strategy / Notes ({active.tf})</div>
                                            <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{active.notes}</div>
                                        </div>
                                    )}

                                    {!active.notes && !active.chartUrl && (
                                        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Empty analysis for this timeframe.</div>
                                    )}
                                </div>
                            ) : (
                                /* Edit Mode Content (Legacy inputs) */
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>{active.tf} chart link</div>
                                    <input placeholder="Paste TradingView snapshot URL (.png)" value={active.chartUrl} onChange={(e) => onChangeChartUrl(active.tf, e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-subtle)", fontSize: 13, fontFamily: "inherit", backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }} />

                                    {active.chartUrl && (
                                        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB", cursor: "zoom-in" }} onClick={() => setLightboxImage(active.chartUrl)}>
                                            <img src={active.chartUrl} loading="lazy" decoding="async" alt={`${inst.symbol} ${active.tf} chart`} style={{ width: "100%", maxHeight: 400, objectFit: "contain", display: "block", backgroundColor: "var(--bg-page)" }} />
                                        </div>
                                    )}

                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>Bias for this TF</div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            {(["long", "neutral", "short"] as Bias[]).map((b) => {
                                                const isActive = active.bias === b;
                                                return (
                                                    <button key={b} type="button" onClick={() => onChangeTfBias(active.tf, b)} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, border: isActive ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)", backgroundColor: isActive ? "var(--bg-element)" : "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer" }}>{biasLabel[b]}</button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>Notes / commentary ({active.tf})</div>
                                        <textarea placeholder="Bias, key levels, what you expect today..." value={active.notes} onChange={(e) => onChangeNotes(active.tf, e.target.value)} rows={4} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)", resize: "vertical", fontSize: 13, fontFamily: "inherit", backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Instrument Section */}
            {!isViewMode && (
                <div style={{ marginTop: 24 }}>
                    <button
                        onClick={handleAddInstrument}
                        style={{
                            width: "100%", padding: 16, borderRadius: 8,
                            border: "2px dashed var(--border-subtle)",
                            color: "var(--text-secondary)", fontWeight: 600,
                            backgroundColor: "transparent", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            fontSize: 13
                        }}
                    >
                        <span>+ Add Instrument</span>
                    </button>
                </div>
            )}

            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
                {!isViewMode && (
                    <button
                        type="button"
                        onClick={handleDeleteDay}
                        style={{
                            backgroundColor: "transparent",
                            color: "#EF4444",
                            padding: "8px 18px",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            border: '1px solid #EF4444'
                        }}
                    >
                        🗑️ Delete Day
                    </button>
                )}

                {snapshot.instruments.length > 0 && !isViewMode && (
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
                            marginLeft: 'auto'
                        }}
                    >
                        Save & View
                    </button>
                )}
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

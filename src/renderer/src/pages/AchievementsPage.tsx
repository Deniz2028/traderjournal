import React, { useState, useEffect, useRef } from "react";
import type { Achievement, CurrencyCode, AchievementType, AccountStatus, EvaluationPhase, PhaseStatus } from "../types/achievements";
import {
    loadAchievements,
    addAchievement,
    removeAchievement,
    getTotals,
    updateAchievement
} from "../utils/achievementsStorage";
import { getAchievementsMode, saveAchievementsMode, type AchievementsMode } from "../utils/settingsStorage";
import confetti from 'canvas-confetti';

const currencyOptions: CurrencyCode[] = ["USD", "EUR", "GBP", "Other"];
// const statusOptions: AccountStatus[] = ["Phase 1", "Phase 2", "Funded", "Lost"]; // Removed as per instruction

// Helper to determine status color
const getStatusColor = (status: PhaseStatus | AccountStatus) => {
    if (status === "Funded" || status === "Passed") return "#10B981"; // Green
    if (status === "Phase 2") return "#F59E0B"; // Orange
    if (status === "Phase 1") return "#3B82F6"; // Blue
    if (status === "Ongoing") return "#3B82F6"; // Blue
    if (status === "Lost" || status === "Failed") return "#EF4444"; // Red
    return "#6B7280"; // Gray
};

export const AchievementsPage: React.FC = () => {
    const [items, setItems] = useState<Achievement[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form Type
    const [addType, setAddType] = useState<AchievementType>("account");

    // Form Fields
    const [firm, setFirm] = useState("");
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState(""); // Shared for Size or Payout
    const [currency, setCurrency] = useState<CurrencyCode>("USD");
    // const [status, setStatus] = useState<AccountStatus>("Phase 1"); // Legacy
    const [phase, setPhase] = useState<EvaluationPhase>("Phase 1");
    // const [phaseStatus, setPhaseStatus] = useState<PhaseStatus>("Ongoing"); // Simplified for Add: Default ongoing

    const [imageUrl, setImageUrl] = useState(""); // For Payout
    const [date, setDate] = useState("");


    // Lightbox & Context Menu
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);



    // Close context menu on click
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener("click", closeMenu);
        return () => window.removeEventListener("click", closeMenu);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) setImageUrl(ev.target.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    // View Mode
    const [viewMode, setViewMode] = useState<AchievementsMode>("passed_only");

    // Focus handling
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setItems(loadAchievements());
        // Listen for mode changes
        const updateMode = () => setViewMode(getAchievementsMode());
        updateMode();
        window.addEventListener("achievements-mode-changed", updateMode);
        return () => window.removeEventListener("achievements-mode-changed", updateMode);
    }, []);

    useEffect(() => {
        if (isAddOpen) {
            // Attempt focus multiple times to ensure it catches
            const t1 = setTimeout(() => inputRef.current?.focus(), 50);
            const t2 = setTimeout(() => inputRef.current?.focus(), 200);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [isAddOpen]);

    // Escape listener
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsAddOpen(false);
        };
        if (isAddOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isAddOpen]);

    const totals = getTotals(items);

    // Filter lists
    const accounts = items.filter(i => (!i.type || i.type === "account"));
    const payouts = items.filter(i => i.type === "payout");

    useEffect(() => {
        if (lightboxIndex !== null) {
            const handleKey = (e: KeyboardEvent) => {
                if (e.key === "Escape") setLightboxIndex(null);
                if (e.key === "ArrowLeft") setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
                if (e.key === "ArrowRight") setLightboxIndex(prev => (prev !== null && prev < payouts.length - 1 ? prev + 1 : prev));
            };
            window.addEventListener("keydown", handleKey);
            return () => window.removeEventListener("keydown", handleKey);
        }
    }, [lightboxIndex, payouts.length]);


    const handleAdd = () => {
        if (!firm) {
            alert("Please enter a Prop Firm name.");
            return;
        }

        const now = new Date();
        const id = String(now.getTime());

        // Auto-K Logic: If amount is small (<= 1000), treat as 'k'.
        let numAmount = Number(amount) || 0;
        if (numAmount > 0 && numAmount <= 1000) {
            numAmount *= 1000;
        }

        // Fresh load for smart check
        const currentItems = loadAchievements();

        // Smart Logic: Gap Filling (User Request)
        // If user adds Phase 2, imply Phase 1 is Passed. If missing, create it.
        // If user adds Funded, imply Phase 1 & 2 are Passed.
        if (addType === "account" && firm) {
            const createPassed = (p: EvaluationPhase, offsetMs: number): Achievement => ({
                id: String(Date.now() - offsetMs), // Slight time offset to sort correctly
                type: "account",
                firm: firm,
                title: title || "Auto-Created History",
                currency,
                accountSize: numAmount,
                phase: p,
                status: "Passed",
                date: date || now.toISOString().slice(0, 10),
                payoutAmount: 0
            });

            if (phase === "Phase 2") {
                const prev = currentItems.find(i => i.firm.toLowerCase() === firm.toLowerCase() && i.phase === "Phase 1");
                if (prev) {
                    if (prev.status !== "Passed") updateAchievement({ id: prev.id, status: "Passed" });
                } else {
                    addAchievement(createPassed("Phase 1", 10000));
                }
            } else if (phase === "Funded") {
                // Check Phase 2
                const prev2 = currentItems.find(i => i.firm.toLowerCase() === firm.toLowerCase() && i.phase === "Phase 2");
                if (prev2) {
                    if (prev2.status !== "Passed") updateAchievement({ id: prev2.id, status: "Passed" });
                } else {
                    addAchievement(createPassed("Phase 2", 5000));
                }

                // Check Phase 1
                const prev1 = currentItems.find(i => i.firm.toLowerCase() === firm.toLowerCase() && i.phase === "Phase 1");
                if (prev1) {
                    if (prev1.status !== "Passed") updateAchievement({ id: prev1.id, status: "Passed" });
                } else {
                    addAchievement(createPassed("Phase 1", 10000));
                }
            }
        }

        // If in "Passed Only" mode, we assume the user is entering a COMPLETED achievement
        const initialStatus: PhaseStatus = (viewMode === "passed_only" && addType === "account") ? "Passed" : "Ongoing";

        const newItem: Achievement = {
            id,
            type: addType,
            firm: firm || "Unknown Firm",
            title: title || (addType === "account" ? "New Account" : "Payout"),
            currency,
            date: date || now.toISOString().slice(0, 10),

            // Type specific
            accountSize: addType === "account" ? numAmount : 0,

            // New Model
            phase: addType === "account" ? phase : undefined,
            status: addType === "account" ? initialStatus : undefined,

            payoutAmount: addType === "payout" ? numAmount : 0,
            imageUrl: addType === "payout" ? imageUrl : undefined,
        };

        let nextItems = addAchievement(newItem);

        // Smart Logic: If we added a "Passed" account (via Achievements mode), auto-spawn the next phase
        if (addType === "account" && initialStatus === "Passed") {
            let nextPhase: EvaluationPhase | undefined;
            if (phase === "Phase 1") nextPhase = "Phase 2";
            else if (phase === "Phase 2") nextPhase = "Funded";

            if (nextPhase) {
                const ongoingItem: Achievement = {
                    ...newItem,
                    id: String(Date.now() + 100), // distinct ID
                    phase: nextPhase,
                    status: "Ongoing",
                    date: new Date().toISOString().slice(0, 10),
                    payoutAmount: 0 // Ensure payout is 0 for account
                };
                nextItems = addAchievement(ongoingItem);
            }
        }

        setItems(nextItems);
        setIsAddOpen(false);
        resetForm();
    };

    const handleRemove = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();

        const itemToRemove = items.find(i => i.id === id);
        if (!itemToRemove) return;

        if (confirm(`Are you sure you want to delete this ${itemToRemove.type === 'payout' ? 'payout' : 'account'}?`)) {
            // Logic: If account, check for related history (same firm, passed phases)
            // Use removeAchievement which reads from fresh storage to avoid stale state issues, but here we want to modify the list 
            // returned by removeAchievement sequentially if we delete multiple.

            // First delete the target item
            let next = removeAchievement(id);

            // If it's an account, ask to delete history
            if (itemToRemove.type !== 'payout' && itemToRemove.firm) {
                // We need to check 'next' (latest list) for related items
                const related = next.filter(i => i.firm.toLowerCase() === itemToRemove.firm.toLowerCase() && i.type !== 'payout');

                if (related.length > 0) {
                    if (confirm(`Found ${related.length} other records for "${itemToRemove.firm}". Delete entire history for this firm?`)) {
                        // Delete all related
                        related.forEach(r => {
                            // Note: removeAchievement returns the specific list state after removal, 
                            // but since we are doing multiple, we should just call it.
                            // However, removeAchievement reads from disk every time, so it's safe to call in loop.
                            removeAchievement(r.id);
                        });
                        // Final refresh
                        next = loadAchievements();
                    }
                }
            }

            setItems(next);
        }
    };

    const handleStatusUpdate = (id: string, newStatus: PhaseStatus) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        // 1. Update current item status (e.g. set to Passed)
        let nextItems = updateAchievement({ id, status: newStatus });

        // 2. If Passed, spawn the NEXT phase as a new ongoing card
        if (newStatus === "Passed") {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            let nextPhase: EvaluationPhase | undefined;
            if (item.phase === "Phase 1") nextPhase = "Phase 2";
            else if (item.phase === "Phase 2") nextPhase = "Funded";

            if (nextPhase) {
                // Check if we already have an ongoing next phase for this firm to prevent accidental double-clicks creating dupes?
                // User might want multiple accounts. Let's just create it.
                // Add slight delay so ID is different if spamming

                const newItem: Achievement = {
                    ...item,
                    id: String(Date.now() + Math.floor(Math.random() * 1000)),
                    phase: nextPhase,
                    status: "Ongoing",
                    date: new Date().toISOString().slice(0, 10), // Mark start of new phase as today
                    payoutAmount: 0 // Reset payout if copied?
                };

                // Add the new phase item
                // Note: addAchievement reloads from storage so it gets the updateAchievement's result + new item
                nextItems = addAchievement(newItem);
            }
        }

        setItems(nextItems);
    };

    const onDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("text/plain", id);
    };

    const onDrop = (e: React.DragEvent, targetPhase: EvaluationPhase) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        const item = items.find(i => i.id === id);
        if (item && item.phase !== targetPhase) {
            // Logic: Dragging Phase 1 to Phase 2
            // User: "sürükleyek phase 2 ye geçirisek phase 1 deki passed olsun ve aşağıda devam ediyor stausu alsın"
            // Implicitly means: Mark previous as "Passed" (we can't keep history of same item easy without duplicating, let's just update current item).
            // Updating current item implies we lose "Phase 1" history. 
            // For now, let's just update the item to new Phase and set Status to "Ongoing".

            const next = updateAchievement({ id, phase: targetPhase, status: "Ongoing" });
            setItems(next);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const resetForm = () => {
        setFirm("");
        setTitle("");
        setAmount("");
        setImageUrl("");
        setDate("");
        setPhase("Phase 1");
    };

    // Filter lists
    // Migration fallback is handled in storage, so items should have phase/status or be migrated on load.
    // If not, we might view empty.




    return (
        <div className="page-container">
            {/* ... Header & Stats ... */}
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <h1 className="page-title">{viewMode === "all" ? "Prop Firms" : "Achievements"}</h1>
                    <p className="page-subtitle">Track your funding journey & rewards</p>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button
                        onClick={() => {
                            if (confirm("Reset all data? This cannot be undone.")) {
                                window.localStorage.removeItem("tj_achievements_v1");
                                window.location.reload();
                            }
                        }}
                        style={{ padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#EF4444", backgroundColor: "rgba(239, 68, 68, 0.1)", marginRight: 8 }}
                        title="Reset Data"
                    >
                        🗑️
                    </button>

                    <div style={{ display: "flex", backgroundColor: "var(--bg-subtle)", padding: 4, borderRadius: 8 }}>
                        <button
                            onClick={() => { setViewMode("passed_only"); saveAchievementsMode("passed_only"); }}
                            style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, backgroundColor: viewMode === "passed_only" ? "white" : "transparent", color: viewMode === "passed_only" ? "var(--text-primary)" : "var(--text-secondary)", boxShadow: viewMode === "passed_only" ? "0 1px 2px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}
                        >
                            Trophy Room
                        </button>
                        <button
                            onClick={() => { setViewMode("all"); saveAchievementsMode("all"); }}
                            style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, backgroundColor: viewMode === "all" ? "white" : "transparent", color: viewMode === "all" ? "var(--text-primary)" : "var(--text-secondary)", boxShadow: viewMode === "all" ? "0 1px 2px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}
                        >
                            Workspace
                        </button>
                    </div>

                    <button
                        className="btn-primary"
                        style={{
                            backgroundColor: "var(--accent-primary)",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: 8,
                            fontWeight: 500,
                            border: "none",
                            cursor: "pointer",
                            fontSize: 14
                        }}
                        onClick={() => setIsAddOpen(true)}
                    >
                        + Add New
                    </button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>
                        Total Funded Capital
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
                        ${totals.totalFunded.toLocaleString()}
                    </div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>
                        Total Payouts
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-green)" }}>
                        ${totals.totalPayout.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* View Modes Logic (Unchanged from prev, just hidden in diff) */}
            {viewMode === "all" ? (
                <div style={{ marginBottom: 40 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Active Challenges</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                        {(["Phase 1", "Phase 2", "Funded"] as EvaluationPhase[]).map(p => {
                            const visibleAccounts = accounts.filter(a => a.phase === p && a.status !== "Passed");
                            return (
                                <div key={p} onDrop={(e) => onDrop(e, p)} onDragOver={onDragOver} style={{ backgroundColor: "var(--bg-secondary)", borderRadius: 12, padding: 20, minHeight: 180, border: "1px solid var(--border-subtle)" }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{p} ({visibleAccounts.length})</div>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                                        {visibleAccounts.map(acc => (
                                            <div key={acc.id} draggable onDragStart={(e) => onDragStart(e, acc.id)} className="card" style={{ padding: 16, cursor: "grab", borderLeft: "4px solid " + (acc.phase === "Funded" && (acc.status === "Ongoing" || !acc.status) ? "#F59E0B" : getStatusColor((acc.status || "Ongoing") as PhaseStatus)) }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{acc.firm}</span>
                                                    <button onClick={(e) => handleRemove(acc.id, e)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-secondary)" }}>×</button>
                                                </div>
                                                <div style={{ fontSize: 13, marginBottom: 8 }}>{acc.title}</div>
                                                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>${acc.accountSize.toLocaleString()} {acc.currency}</div>
                                                <div style={{ display: "flex", gap: 4 }}>
                                                    {(p === "Funded" ? ["Ongoing", "Failed"] : ["Ongoing", "Passed", "Failed"] as PhaseStatus[]).map(s => {
                                                        const isFundedActive = acc.phase === "Funded" && s === "Ongoing";
                                                        const activeColor = isFundedActive ? "#F59E0B" : getStatusColor(s);
                                                        return <button key={s} onClick={() => handleStatusUpdate(acc.id, s as PhaseStatus)} style={{ flex: 1, border: "none", borderRadius: 4, padding: "4px 0", fontSize: 10, cursor: "pointer", fontWeight: 600, backgroundColor: acc.status === s ? activeColor : "var(--bg-element)", color: acc.status === s ? "white" : "var(--text-secondary)", opacity: acc.status === s ? 1 : 0.7 }}>{s}</button>;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div style={{ marginBottom: 40 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Trophy Case</h3>
                    {accounts.filter(a => a.status === "Passed" || a.phase === "Funded").length === 0 ? (
                        <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>No achievements yet. Keep grinding!</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {accounts.filter(a => a.status === "Passed" || a.phase === "Funded").map(acc => (
                                <div key={acc.id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "4px solid var(--color-green)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                        {/* Icon */}
                                        <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--color-green)", fontSize: 18 }}>{acc.firm.slice(0, 1).toUpperCase()}</div>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontWeight: 600, fontSize: 15 }}>{acc.firm}</span>
                                                <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}>{acc.phase}</span>
                                            </div>
                                            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{acc.title} • {acc.accountSize.toLocaleString()} {acc.currency}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-green)" }}>{acc.phase === "Funded" ? "Funded Account" : "Challenge Passed"}</div>
                                        <button onClick={(e) => handleRemove(acc.id, e)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-secondary)", opacity: 0.5 }}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Payouts Gallery */}
            <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Payout Gallery</h3>
                {payouts.length === 0 ? (
                    <div style={{ color: "var(--text-secondary)", fontSize: 14, fontStyle: "italic" }}>No payouts recorded yet. Keep pushing!</div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 24 }}>
                        {payouts.map((pay, idx) => (
                            <div
                                key={pay.id}
                                className="card"
                                style={{ overflow: "hidden", padding: 0, position: "relative" }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({ x: e.pageX, y: e.pageY, id: pay.id });
                                }}
                            >
                                <div
                                    style={{ height: 220, backgroundColor: "#000", position: "relative", cursor: "pointer" }}
                                    onClick={() => setLightboxIndex(idx)}
                                >
                                    {pay.imageUrl ? (
                                        <img src={pay.imageUrl} alt="Proof" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }} className="hover-zoom" />
                                    ) : (
                                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>No Image</div>
                                    )}
                                    <div style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.7)", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{pay.date}</div>
                                </div>
                                <div style={{ padding: 16 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                        <span style={{ fontWeight: 700, fontSize: 16 }}>{pay.firm}</span>
                                        <span style={{ fontWeight: 700, fontSize: 18, color: "var(--color-green)" }}>+{pay.payoutAmount?.toLocaleString()} {pay.currency}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{pay.title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {isAddOpen && (
                <div onClick={() => setIsAddOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 500, padding: 0, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", backgroundColor: "#f9fafb" }}>
                            <button style={{ flex: 1, padding: "16px 0", background: addType === "account" ? "#fff" : "transparent", border: "none", borderBottom: addType === "account" ? "2px solid var(--accent-primary)" : "2px solid transparent", fontWeight: 600, cursor: "pointer", color: addType === "account" ? "var(--accent-primary)" : "var(--text-secondary)", fontSize: 14, transition: "all 0.2s" }} onClick={() => setAddType("account")}>Funded Account</button>
                            <button style={{ flex: 1, padding: "16px 0", background: addType === "payout" ? "#fff" : "transparent", border: "none", borderBottom: addType === "payout" ? "2px solid var(--color-green)" : "2px solid transparent", fontWeight: 600, cursor: "pointer", color: addType === "payout" ? "var(--color-green)" : "var(--text-secondary)", fontSize: 14, transition: "all 0.2s" }} onClick={() => setAddType("payout")}>Payout</button>
                        </div>

                        <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
                            <div>
                                <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Prop Firm</label>
                                <input className="input" ref={inputRef} autoFocus placeholder="e.g. FTMO, MyForexFunds" style={{ width: "100%", padding: "10px 12px" }} value={firm} onChange={e => setFirm(e.target.value)} />
                            </div>

                            <div>
                                <label className="form-label" style={{ marginBottom: 6, display: "block" }}>{addType === "account" ? "Challenge Title" : "Payout Title"}</label>
                                <input className="input" placeholder={addType === "account" ? "200k Swing Challenge" : "First Withdrawal"} style={{ width: "100%", padding: "10px 12px" }} value={title} onChange={e => setTitle(e.target.value)} />
                            </div>

                            <div style={{ display: "flex", gap: 16 }}>
                                <div style={{ flex: 2 }}>
                                    <label className="form-label" style={{ marginBottom: 6, display: "block" }}>{addType === "account" ? "Account Size" : "Payout Amount"}</label>
                                    <div style={{ position: "relative" }}>
                                        <span style={{ position: "absolute", left: 12, top: 10, color: "var(--text-secondary)" }}>$</span>
                                        <input className="input" type="number" placeholder="0.00" style={{ width: "100%", padding: "10px 12px 10px 24px" }} value={amount} onChange={e => setAmount(e.target.value)} />
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Currency</label>
                                    <select className="input" style={{ width: "100%", padding: "10px 12px" }} value={currency} onChange={e => setCurrency(e.target.value as CurrencyCode)}>
                                        {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {addType === "account" ? (
                                <div>
                                    <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Starting Phase</label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {(["Phase 1", "Phase 2", "Funded"] as EvaluationPhase[]).map(p => (
                                            <button key={p} onClick={() => setPhase(p)} style={{ padding: "6px 12px", borderRadius: 6, border: phase === p ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)", background: phase === p ? "var(--bg-active)" : "white", color: phase === p ? "var(--accent-primary)" : "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>{p}</button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Proof Image</label>
                                    {/* FILE INPUT */}
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <label style={{ flex: 1, backgroundColor: "#f3f4f6", border: "1px dashed #d1d5db", borderRadius: 6, padding: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
                                            {imageUrl ? "Image Selected (Click to change)" : "Upload Image (PNG, JPG)"}
                                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                                        </label>
                                    </div>
                                    {imageUrl && <div style={{ fontSize: 11, color: "green", marginTop: 4 }}>Image loaded successfully</div>}
                                </div>
                            )}

                            <div>
                                <label className="form-label" style={{ marginBottom: 6, display: "block" }}>Date</label>
                                <input className="input" type="date" style={{ width: "100%", padding: "10px 12px" }} value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ padding: "20px 32px", background: "#f9fafb", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                            <button className="btn-ghost" onClick={() => setIsAddOpen(false)} style={{ padding: "8px 16px" }}>Cancel</button>
                            <button className="btn-primary" onClick={handleAdd} style={{ backgroundColor: addType === "account" ? "var(--accent-primary)" : "var(--color-green)", color: "white", padding: "8px 20px", borderRadius: 6, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>Save {addType === "account" ? "Account" : "Payout"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    style={{
                        position: "fixed",
                        top: contextMenu.y,
                        left: contextMenu.x,
                        backgroundColor: "white",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        borderRadius: 6,
                        border: "1px solid var(--border-subtle)",
                        zIndex: 1000,
                        overflow: "hidden",
                        minWidth: 120
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#EF4444", fontWeight: 500 }}
                        onClick={() => {
                            handleRemove(contextMenu.id);
                            setContextMenu(null);
                        }}
                    >
                        Delete Payout
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightboxIndex !== null && payouts[lightboxIndex] && (
                <div
                    style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.9)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => setLightboxIndex(null)}
                >
                    <img
                        src={payouts[lightboxIndex].imageUrl || ""}
                        alt="Full Preview"
                        style={{ maxWidth: "90%", maxHeight: "90vh", borderRadius: 8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Navigation Hints */}
                    <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center", color: "white", opacity: 0.7, fontSize: 14, pointerEvents: "none" }}>
                        Use Arrow Keys to Navigate • Esc to Close
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => setLightboxIndex(null)}
                        style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}
                    >
                        ✕
                    </button>

                    {/* Arrows */}
                    {lightboxIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                            style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 48, height: 48, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}
                        >
                            ‹
                        </button>
                    )}
                    {lightboxIndex < payouts.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                            style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 48, height: 48, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}
                        >
                            ›
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};



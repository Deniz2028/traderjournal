import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
// Removed legacy tradeStorage import to fix "ghost trades"
import { getMonthlySummary, MtfTrade } from "../utils/journalStorage";
import { fetchMorningForMonth } from "../utils/morningMtfClient";
import { fetchEodForMonth } from "../utils/eodClient";
import { getDaysInMonth, getMonthName } from "../utils/dateUtils";
import { getAppToday, setAppToday } from "../utils/appDate";
import type { EODReview } from "../../../shared/eodTypes";

export const CalendarPage: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    // Map of date -> journal summary
    const [journalMap, setJournalMap] = useState<Record<string, { count: number; netR: number; trades: MtfTrade[] }>>({});
    const [morningDates, setMorningDates] = useState<string[]>([]);
    const [eodMap, setEodMap] = useState<Record<string, EODReview>>({});
    const [_location, setLocation] = useLocation();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    useEffect(() => {
        loadData();
    }, [year, month]);

    const loadData = async () => {
        try {
            // New: Get data from actual Journal Storage
            const summary = getMonthlySummary(year, month);
            setJournalMap(summary);

            // Morning
            const snapshots = await fetchMorningForMonth(year, month);
            const dates = snapshots.map(s => s.date);
            setMorningDates(dates);

            // EOD
            const yyyyMM = `${year}-${String(month + 1).padStart(2, "0")}`;
            const eodData = await fetchEodForMonth(yyyyMM);
            const map: Record<string, EODReview> = {};
            eodData.forEach(r => map[r.date] = r);
            setEodMap(map);

        } catch (e) {
            console.error("Failed to load calendar data", e);
        }
    };


    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setAppToday(null); // Clear simulation, go to real today
        setCurrentDate(new Date());
    };

    const handleDayClick = (dateStr: string) => {
        setAppToday(dateStr);
        setLocation("/today");
    };

    const renderDays = () => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDayOfMonth = new Date(year, month, 1).getDay();

        // Start offset (Mon=0 via simple math trick if Mon is start, 
        // but let's stick to standard Sun=0 first col for consistency unless requested otherwise)
        // If Mon is first col: (day + 6) % 7
        const startOffset = (firstDayOfMonth + 6) % 7;

        const els: JSX.Element[] = [];

        // Empty slots
        for (let i = 0; i < startOffset; i++) {
            els.push(<div key={`empty-${i}`} style={styles.dayCellEmpty} />);
        }

        // Real "Today" for future check
        const realNow = new Date();
        // Zero out time for clean comparison
        realNow.setHours(0, 0, 0, 0);

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

            // Journal Data
            const jData = journalMap[dateStr];
            const hasTrades = jData && jData.count > 0;
            const netR = jData ? jData.netR : 0;

            const hasMorning = morningDates.includes(dateStr);
            const hasEod = !!eodMap[dateStr];

            // Simulation Date (Highlight)
            const appDateStr = getAppToday();
            const isSimToday = dateStr === appDateStr;

            // Future/Past Logic
            const thisDate = new Date(year, month, d);
            thisDate.setHours(0, 0, 0, 0); // Zero out time for comparison
            const isFuture = thisDate > realNow;
            const isToday = thisDate.getTime() === realNow.getTime();

            els.push(
                <div
                    key={d}
                    style={{
                        ...styles.dayCell,
                        ...(isSimToday ? styles.dayCellToday : {}),
                        // Dim future days slightly?
                        ...(isFuture ? { opacity: 0.5 } : {})
                    }}
                >
                    <div style={styles.dayNumRow}>
                        {/* Day Number */}
                        <button
                            onClick={() => handleDayClick(dateStr)}
                            // Disable click for future if desired? User didn't strictly say disable click, just hide buttons.
                            // But navigating to future to journal makes sense? "Henüz gelmemiş günlerin... daily journal yazmasın"
                            // Let's allow click (planning ahead?) but hide the buttons as requested.
                            style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 700,
                                color: isSimToday ? "var(--accent-primary)" : "var(--text-primary)",
                                textDecoration: isSimToday ? "underline" : "none",
                            }}
                        >
                            {d}
                        </button>
                        {hasTrades && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: netR > 0 ? "var(--color-green)" : netR < 0 ? "var(--color-red)" : "var(--text-secondary)" }}>
                                {netR > 0 ? "+" : ""}
                                {netR.toFixed(1)} R
                            </span>
                        )}
                    </div>

                    {/* Trade Pills */}
                    {hasTrades && jData?.trades.map(t => (
                        <div key={t.id} style={styles.tradePill}>
                            <span style={{ fontWeight: 600 }}>{t.symbol}</span>
                            <span style={{ fontWeight: 700, color: t.outcome === "TP" ? "var(--color-green)" : t.outcome === "SL" ? "var(--color-red)" : "var(--text-secondary)" }}>
                                {t.outcome || "—"}
                            </span>
                            <span>{t.resultR != null ? t.resultR.toFixed(1) : "-"}</span>
                        </div>
                    ))}

                    {/* Bottom Links (pinned to bottom) */}
                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                        {hasMorning && (
                            <Link href={`/morning/${dateStr}`} style={styles.linkPillBlue}>
                                Morning Analysis
                            </Link>
                        )}

                        {hasEod && (
                            <Link href={`/eod/${dateStr}`} style={styles.linkPillTeal}>
                                EOD Review
                            </Link>
                        )}

                        {!hasEod && !isFuture && (
                            <Link href={`/eod/${dateStr}`} style={{
                                padding: "2px 8px",
                                borderRadius: 4,
                                border: "1px dashed #E5E7EB",
                                fontSize: 10,
                                color: "#9CA3AF",
                                cursor: "pointer",
                                width: "100%",
                                textAlign: "center",
                                textDecoration: "none",
                                display: "block"
                            }}>
                                + EOD
                            </Link>
                        )}
                    </div>
                </div>
            );
        }

        return els;
    };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 className="page-title">Calendar</h1>
                        <p className="page-subtitle">Monthly overview</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={handlePrevMonth} style={styles.navBtn}>
                            &lt;
                        </button>
                        <span style={{ fontSize: 16, fontWeight: 600, minWidth: 120, textAlign: "center" }}>
                            {getMonthName(month)} {year}
                        </span>
                        <button onClick={handleNextMonth} style={styles.navBtn}>
                            &gt;
                        </button>
                        <button onClick={handleToday} style={styles.todayBtn}>
                            Today
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid Header */}
            <div style={styles.gridHeader}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} style={styles.headerCell}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid Body */}
            <div style={styles.gridBody}>{renderDays()}</div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    navBtn: {
        background: "transparent",
        border: "1px solid var(--border-subtle)",
        borderRadius: 6,
        padding: "4px 8px",
        cursor: "pointer",
        color: "var(--text-primary)",
    },
    todayBtn: {
        background: "#F3F4F6",
        border: "none",
        borderRadius: 6,
        padding: "4px 12px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-primary)",
    },
    gridHeader: {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 1,
        backgroundColor: "var(--border-subtle)", // grid lines
        borderBottom: "1px solid var(--border-subtle)",
    },
    headerCell: {
        backgroundColor: "#F9FAFB",
        padding: "8px",
        textAlign: "center",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-secondary)",
    },
    gridBody: {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gridAutoRows: "minmax(120px, 1fr)",
        gap: 1,
        backgroundColor: "var(--border-subtle)", // lines
        flex: 1,
        overflowY: "auto",
    },
    dayCell: {
        backgroundColor: "#FFFFFF",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        minHeight: 120,
    },
    dayCellToday: {
        backgroundColor: "#F0F9FF",
    },
    dayCellEmpty: {
        backgroundColor: "#F9FAFB",
    },
    dayNumRow: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    tradePill: {
        fontSize: 10,
        backgroundColor: "#F3F4F6",
        padding: "2px 4px",
        borderRadius: 4,
        display: "flex",
        justifyContent: "space-between",
        gap: 4,
    },
    linkPillBlue: {
        marginTop: 2,
        padding: "2px 8px",
        borderRadius: 4,
        border: "none",
        fontSize: 10,
        backgroundColor: "#EFF6FF",
        color: "#2563EB",
        cursor: "pointer",
        fontWeight: 500,
        width: "100%",
        textAlign: "center",
        textDecoration: "none",
        display: "block"
    },
    linkPillTeal: {
        marginTop: 2,
        padding: "2px 8px",
        borderRadius: 4,
        border: "none",
        fontSize: 10,
        backgroundColor: "#F0FDFA", // tealish
        color: "#0F766E",
        cursor: "pointer",
        fontWeight: 500,
        width: "100%",
        textAlign: "center",
        textDecoration: "none",
        display: "block"
    },
    linkPillGray: {
        marginTop: 2,
        padding: "2px 8px",
        borderRadius: 4,
        border: "1px solid var(--border-subtle)",
        fontSize: 10,
        backgroundColor: "#FFFFFF",
        color: "var(--text-secondary)",
        cursor: "pointer",
        fontWeight: 500,
        width: "100%",
        textAlign: "center",
        textDecoration: "none",
        display: "block",
    }
};

export default CalendarPage;

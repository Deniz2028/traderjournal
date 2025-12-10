import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { getTrades, getTradesForMonth } from "../utils/tradeStorage";
import { fetchMorningForMonth } from "../utils/morningMtfClient";
import { fetchEodForMonth } from "../utils/eodClient";
import { getDaysInMonth, getMonthName } from "../utils/dateUtils";
import { getAppToday } from "../utils/appDate";
import type { Trade } from "../types";
import type { EODReview } from "../../../shared/eodTypes";

export const CalendarPage: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trades, setTrades] = useState<Trade[]>([]);
    const [morningDates, setMorningDates] = useState<string[]>([]);
    const [eodMap, setEodMap] = useState<Record<string, EODReview>>({});
    // location unused

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    useEffect(() => {
        loadData();
    }, [year, month]);

    const loadData = async () => {
        try {
            // Trades
            const mTrades = await getTradesForMonth(year, month);
            setTrades(mTrades);

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
        setCurrentDate(new Date());
    };

    const renderDays = () => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        // Adjust for Monday start if desired, but let's stick to Sun=0 for now or whatever dateUtils/standard JS does.
        // If we want Mon=0, we need to shift. 
        // Standard US calendar: Sun=0.

        // Let's align with "Mon, Tue, Wed..." header usually. 
        // If header is Mon-Sun, handle offset.
        // Let's assume Mon-Sun for trading.
        const startOffset = (firstDayOfMonth + 6) % 7; // Mon=0, Sun=6

        const els: JSX.Element[] = [];

        // Empty slots
        for (let i = 0; i < startOffset; i++) {
            els.push(<div key={`empty-${i}`} style={styles.dayCellEmpty} />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayTrades = trades.filter((t) => t.date === dateStr);
            const netR = dayTrades.reduce((acc, t) => acc + t.resultR, 0);
            const hasMorning = morningDates.includes(dateStr);

            // Check if today
            // Check if today
            // Use simulation date if active
            const appDateStr = getAppToday(); // YYYY-MM-DD
            const isToday = dateStr === appDateStr;

            els.push(
                <div
                    key={d}
                    style={{
                        ...styles.dayCell,
                        ...(isToday ? styles.dayCellToday : {}),
                    }}
                >
                    <div style={styles.dayNumRow}>
                        <span style={styles.dayNum}>{d}</span>
                        {dayTrades.length > 0 && (
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color:
                                        netR >= 0
                                            ? "var(--color-green)"
                                            : "var(--color-red)",
                                }}
                            >
                                {netR > 0 ? "+" : ""}
                                {netR.toFixed(1)} R
                            </span>
                        )}
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
                        {dayTrades.map((t) => (
                            <div key={t.id} style={styles.tradePill}>
                                <span style={{ fontWeight: 600 }}>{t.symbol}</span>
                                <span>{t.dir === "Long" ? "L" : "S"}</span>
                                <span>{t.resultR.toFixed(1)}</span>
                            </div>
                        ))}
                    </div>

                    {hasMorning && (
                        <Link href={`/morning/${dateStr}`} style={{
                            marginTop: 4,
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
                        }}>
                            Morning Analysis
                        </Link>
                    )}

                    {eodMap[dateStr] && (
                        <Link href={`/eod/${dateStr}`} style={{
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
                        }}>
                            EOD Review
                        </Link>
                    )}

                    {!eodMap[dateStr] && isToday && (
                        <Link href={`/eod/${dateStr}`} style={{
                            marginTop: 2,
                            padding: "2px 8px",
                            borderRadius: 4,
                            border: "1px dashed #E5E7EB",
                            fontSize: 10,
                            color: "#6B7280",
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
        gridAutoRows: "minmax(100px, 1fr)",
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
        minHeight: 100,
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
    dayNum: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-secondary)",
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
};

export default CalendarPage;

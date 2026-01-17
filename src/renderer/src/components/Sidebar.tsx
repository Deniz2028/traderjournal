import React from "react";



import { Link, useLocation } from "wouter";
import { useNewsMonitor } from "../hooks/useNewsMonitor";
import { useTheme } from "../context/ThemeContext";

import { getAchievementsMode } from "../utils/settingsStorage";

export const Sidebar: React.FC = () => {
    const [location] = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [achievementsTitle, setAchievementsTitle] = React.useState("Achievements");

    React.useEffect(() => {
        const updateTitle = () => {
            const mode = getAchievementsMode();
            setAchievementsTitle(mode === "all" ? "Prop Firms" : "Achievements");
        };
        updateTitle();
        window.addEventListener("achievements-mode-changed", updateTitle);
        return () => window.removeEventListener("achievements-mode-changed", updateTitle);
    }, []);

    // Helper to determine if active
    const isActive = (path: string) => {
        if (path === "/" || path === "/dashboard") {
            return location === "/" || location === "/dashboard";
        }
        return location.startsWith(path);
    };

    const [isOpen, setIsOpen] = React.useState(false);

    // Close sidebar on route change (mobile)
    React.useEffect(() => {
        setIsOpen(false);
    }, [location]);

    // Close sidebar on ESC
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const [animateNews, setAnimateNews] = React.useState(true);
    const { hasAlert, countdown } = useNewsMonitor();

    React.useEffect(() => {
        const timer = setTimeout(() => setAnimateNews(false), 4000);
        return () => clearTimeout(timer);
    }, []);

    const shouldPulse = hasAlert || animateNews;

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className="mobile-menu-btn"
                onClick={() => setIsOpen(true)}
                aria-label="Open Menu"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <style>{`
                    @keyframes newsPulse {
                        0% { color: var(--text-secondary); transform: scale(1); }
                        50% { color: #EF4444; font-weight: 700; background-color: #FEF2F2; transform: scale(1.02); }
                        100% { color: var(--text-secondary); transform: scale(1); }
                    }
                `}</style>

                {/* Close Button for Mobile (Optional, but good UX) */}
                <div style={{ ...styles.logoArea, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={styles.logoText}>Trade Journal</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            display: window.innerWidth <= 768 ? 'block' : 'none', // Only visual on mobile if needed, but CSS handles layout
                            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
                        }}
                        className="mobile-only-close"
                    >
                        ✕
                    </button>
                </div>

                {/* Top menu items */}
                <nav style={styles.nav}>
                    <Link href="/dashboard" style={{ ...styles.navItem, ...(isActive("/dashboard") ? styles.navItemActive : {}) }}>
                        Dashboard
                    </Link>
                    <Link href="/analytics" style={{ ...styles.navItem, ...(isActive("/analytics") ? styles.navItemActive : {}) }}>
                        Analytics
                    </Link>

                    <Link href="/morning" style={{ ...styles.navItem, ...(isActive("/morning") ? styles.navItemActive : {}) }}>
                        Morning Analysis
                    </Link>
                    <Link href="/today" style={{ ...styles.navItem, ...(isActive("/today") ? styles.navItemActive : {}) }}>
                        Daily Journal
                    </Link>
                    <Link href="/collab" style={{ ...styles.navItem, ...(isActive("/collab") ? styles.navItemActive : {}) }}>
                        War Room ⚔️
                    </Link>
                    <Link href="/calendar" style={{ ...styles.navItem, ...(isActive("/calendar") ? styles.navItemActive : {}) }}>
                        Calendar
                    </Link>

                    <Link href="/advanced" style={{ ...styles.navItem, ...(isActive("/advanced") ? styles.navItemActive : {}) }}>
                        Advanced
                    </Link>
                    <Link href="/news" style={{
                        ...styles.navItem,
                        ...(isActive("/news") ? styles.navItemActive : {}),
                        ...(shouldPulse && !isActive("/news") ? { animation: "newsPulse 1s ease-in-out infinite" } : {}),
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                        <span>News</span>
                        {hasAlert && countdown && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", backgroundColor: "#FFFFFF", padding: "1px 5px", borderRadius: 4, minWidth: 34, textAlign: "center", border: "1px solid #FECACA" }}>
                                {countdown}
                            </span>
                        )}
                    </Link>
                </nav>

                {/* Spacer pushes Settings to the very bottom */}
                <div style={{ flexGrow: 1 }} />

                {/* Bottom Menu Group (Rules & Achievements) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 12px 12px 12px" }}>
                    <Link href="/backtest" style={{ ...styles.navItem, ...(isActive("/backtest") ? styles.navItemActive : {}) }}>
                        Backtest
                    </Link>
                    <Link href="/rules" style={{ ...styles.navItem, ...(isActive("/rules") ? styles.navItemActive : {}) }}>
                        Rules
                    </Link>
                    <Link href="/achievements" style={{ ...styles.navItem, ...(isActive("/achievements") ? styles.navItemActive : {}) }}>
                        {achievementsTitle}
                    </Link>
                </div>

                {/* Settings at bottom */}
                <nav style={styles.navBottom}>
                    <Link href="/settings" style={{ ...styles.navItem, ...(isActive("/settings") ? styles.navItemActive : {}) }}>
                        Settings
                    </Link>
                    <button
                        onClick={toggleTheme}
                        style={{
                            ...styles.navItem,
                            marginTop: 4,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            border: 'none',
                            width: '100%'
                        }}
                    >
                        <span style={{ fontSize: 16 }}>{theme === 'light' ? '🌙' : '☀️'}</span>
                        <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                </nav>
            </div>
        </>
    );
};

const styles: Record<string, React.CSSProperties> = {
    // Styles that are not handled by CSS class
    nav: {
        display: "flex",
        flexDirection: "column",
        padding: "0 12px",
        gap: 4,
    },
    logoArea: {
        padding: "24px",
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: "16px",
    },
    logoText: {
        fontSize: 18,
        fontWeight: 700,
        color: "var(--text-primary)",
    },

    navBottom: {
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        borderTop: "1px solid var(--border-subtle)",
    },
    navItem: {
        textAlign: "left",
        padding: "10px 16px",
        borderRadius: 8,
        backgroundColor: "transparent",
        color: "var(--text-secondary)",
        fontSize: 14,
        fontWeight: 500,
        transition: "all 0.2s ease",
        display: "block",
    },
    navItemActive: {
        backgroundColor: "var(--bg-nav-active)",
        color: "var(--text-primary)",
        fontWeight: 600,
    },
};
